/**
 * 登録セッション（SPEC §7.4）。開いている登録セッションは同時に1つまで（reg_sessions_one_open）。
 */

import type { Grade } from "../../lib/scheduler";

/** 開いてからこの時間がたった登録セッションは、次に登録したときに閉じる */
export const REG_SESSION_TTL_MS = 24 * 60 * 60 * 1000;

const OPEN_ID = "(SELECT id FROM reg_sessions WHERE closed_at IS NULL)";

export interface RegSession {
  id: number;
  startedAt: string;
}

export async function openRegSession(db: D1Database): Promise<RegSession | null> {
  return db
    .prepare("SELECT id, started_at AS startedAt FROM reg_sessions WHERE closed_at IS NULL")
    .first<RegSession>();
}

/** 開いてから24時間たった登録セッションを閉じる */
export function closeStale(db: D1Database, now: Date): D1PreparedStatement {
  const cutoff = new Date(now.getTime() - REG_SESSION_TTL_MS).toISOString();
  return db
    .prepare("UPDATE reg_sessions SET closed_at = ? WHERE closed_at IS NULL AND started_at <= ?")
    .bind(now.toISOString(), cutoff);
}

/** 開いている登録セッションがなければ開く */
export function openIfNone(db: D1Database, now: Date): D1PreparedStatement {
  return db
    .prepare(
      "INSERT INTO reg_sessions (started_at) SELECT ? WHERE NOT EXISTS (SELECT 1 FROM reg_sessions WHERE closed_at IS NULL)",
    )
    .bind(now.toISOString());
}

export interface RegisterAttempt {
  problemId: string;
  attemptedAt: string;
  grade: Grade;
  streakAfter: number;
  nextReviewAt: string;
  note: string | null;
}

/** 登録の申告。カードと開いている登録セッションは、同じ batch の前の文で作ったものを引く */
export function insertRegisterAttempt(db: D1Database, a: RegisterAttempt): D1PreparedStatement {
  return db
    .prepare(
      `INSERT INTO attempts (card_id, kind, session_id, reg_session_id, attempted_at, grade,
                             streak_before, streak_after, next_review_at, note)
       VALUES ((SELECT id FROM cards WHERE problem_id = ?), 'register', NULL, ${OPEN_ID}, ?, ?, 0, ?, ?, ?)`,
    )
    .bind(a.problemId, a.attemptedAt, a.grade, a.streakAfter, a.nextReviewAt, a.note);
}

export interface RegSessionItem {
  cardId: number;
  problemId: string;
  contestId: string;
  problemIndex: string;
  title: string;
  grade: Grade;
  nextReviewAt: string | null;
  canUndo: boolean;
}

/** 取り消せる条件（SPEC §7.4）: 登録セッションが開いていて、カードに登録時の申告しかない。出題中のカードも除く */
const UNDOABLE = (card: string) => `
  EXISTS (SELECT 1 FROM attempts a JOIN reg_sessions r ON r.id = a.reg_session_id
          WHERE a.card_id = ${card} AND a.kind = 'register' AND r.closed_at IS NULL)
  AND (SELECT count(*) FROM attempts WHERE card_id = ${card}) = 1
  AND NOT EXISTS (SELECT 1 FROM session_items WHERE card_id = ${card})`;

/** 登録セッションで登録した問題（新しい順） */
export async function regSessionItems(db: D1Database, regSessionId: number): Promise<RegSessionItem[]> {
  const { results } = await db
    .prepare(
      `SELECT c.id AS cardId, c.problem_id AS problemId, c.contest_id AS contestId,
              COALESCE(p.problem_index, c.problem_index) AS problemIndex, COALESCE(p.title, c.title) AS title,
              a.grade, c.next_review_at AS nextReviewAt, (${UNDOABLE("c.id")}) AS canUndo
       FROM attempts a JOIN cards c ON c.id = a.card_id LEFT JOIN problems p ON p.id = c.problem_id
       WHERE a.reg_session_id = ? AND a.kind = 'register'
       ORDER BY a.id DESC`,
    )
    .bind(regSessionId)
    .all<Omit<RegSessionItem, "canUndo"> & { canUndo: number }>();
  return results.map((r) => ({ ...r, canUndo: r.canUndo === 1 }));
}

/** 取り消す。条件を満たさなければ何もしない。申告は cards の ON DELETE CASCADE で消える */
export async function undoRegistration(db: D1Database, cardId: number): Promise<boolean> {
  const r = await db.prepare(`DELETE FROM cards WHERE id = ?1 AND ${UNDOABLE("?1")}`).bind(cardId).run();
  return r.meta.changes > 0;
}

export async function closeRegSession(db: D1Database, now: Date): Promise<void> {
  await db.prepare("UPDATE reg_sessions SET closed_at = ? WHERE closed_at IS NULL").bind(now.toISOString()).run();
}
