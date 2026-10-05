/**
 * 抽選のセッション（SPEC §6.3、§11.1）。開いているセッションは同時に1つまで（sessions_one_open）。
 */

import type { SessionKind } from "../../lib/contest";
import type { Grade } from "../../lib/scheduler";

const KIND_FILTER = "(?2 = 'ALL' OR kind = ?2)";

export interface PoolCard {
  id: number;
  problemId: string;
  nextReviewAt: string;
}

/** 復習のプール: 現役・解禁済み・種類が一致（SPEC §6.2） */
export async function reviewPool(db: D1Database, kind: SessionKind, now: Date): Promise<PoolCard[]> {
  const { results } = await db
    .prepare(
      `SELECT id, problem_id AS problemId, next_review_at AS nextReviewAt FROM cards
       WHERE graduated_at IS NULL AND next_review_at <= ?1 AND ${KIND_FILTER}`,
    )
    .bind(now.toISOString(), kind)
    .all<PoolCard>();
  return results;
}

export interface OpenSession {
  id: number;
  kind: SessionKind;
  drawnAt: string;
}

export async function openSession(db: D1Database): Promise<OpenSession | null> {
  return db
    .prepare("SELECT id, kind, drawn_at AS drawnAt FROM sessions WHERE closed_at IS NULL")
    .first<OpenSession>();
}

export interface NewItem {
  problemId: string;
  cardId: number | null;
}

/** セッションと項目を1回の batch で作る。開いているセッションがあれば一意制約で失敗する */
export async function createSession(
  db: D1Database,
  kind: SessionKind,
  now: Date,
  items: readonly NewItem[],
): Promise<void> {
  await db.batch([
    db.prepare("INSERT INTO sessions (kind, drawn_at) VALUES (?, ?)").bind(kind, now.toISOString()),
    ...items.map((item, i) =>
      db
        .prepare(
          `INSERT INTO session_items (session_id, position, problem_id, card_id)
           VALUES ((SELECT id FROM sessions WHERE closed_at IS NULL), ?, ?, ?)`,
        )
        .bind(i + 1, item.problemId, item.cardId),
    ),
  ]);
}

export interface ItemResult {
  grade: Grade;
  streakBefore: number;
  streakAfter: number;
  nextReviewAt: string | null;
  elapsedSec: number | null;
  note: string | null;
}

export interface SessionItem {
  position: number;
  problemId: string;
  contestId: string;
  problemIndex: string;
  title: string;
  difficulty: number | null;
  source: "review" | "fresh";
  cardId: number | null;
  /** いまのカードの streak（初見は 0） */
  streak: number;
  result: ItemResult | null;
}

type ItemRow = Omit<SessionItem, "source" | "result" | "streak"> & {
  streak: number | null;
  grade: Grade | null;
  streakBefore: number | null;
  streakAfter: number | null;
  resultNextReviewAt: string | null;
  elapsedSec: number | null;
  note: string | null;
};

export async function sessionItems(db: D1Database, sessionId: number): Promise<SessionItem[]> {
  const { results } = await db
    .prepare(
      `SELECT si.position, si.problem_id AS problemId,
              COALESCE(p.contest_id, c.contest_id) AS contestId, COALESCE(p.problem_index, c.problem_index) AS problemIndex,
              COALESCE(p.title, c.title) AS title, p.difficulty_disp AS difficulty, si.card_id AS cardId, c.streak,
              a.grade, a.streak_before AS streakBefore, a.streak_after AS streakAfter,
              a.next_review_at AS resultNextReviewAt, a.elapsed_sec AS elapsedSec, a.note
       FROM session_items si
       LEFT JOIN problems p ON p.id = si.problem_id
       LEFT JOIN cards c ON c.id = si.card_id
       LEFT JOIN attempts a ON a.session_id = si.session_id AND a.card_id = si.card_id
       WHERE si.session_id = ?
       ORDER BY si.position`,
    )
    .bind(sessionId)
    .all<ItemRow>();
  return results.map((r) => ({
    position: r.position,
    problemId: r.problemId,
    contestId: r.contestId,
    problemIndex: r.problemIndex,
    title: r.title,
    difficulty: r.difficulty,
    // 初見の項目は申告するまで card_id が NULL（SPEC §11）。初見はステップ6で足す
    source: r.cardId === null ? "fresh" : "review",
    cardId: r.cardId,
    streak: r.grade !== null ? r.streakBefore! : (r.streak ?? 0),
    result:
      r.grade === null
        ? null
        : {
            grade: r.grade,
            streakBefore: r.streakBefore!,
            streakAfter: r.streakAfter!,
            nextReviewAt: r.resultNextReviewAt,
            elapsedSec: r.elapsedSec,
            note: r.note,
          },
  }));
}

export interface ReviewGrade {
  sessionId: number;
  cardId: number;
  attemptedAt: string;
  grade: Grade;
  elapsedSec: number | null;
  note: string | null;
  streakBefore: number;
  streakAfter: number;
  nextReviewAt: string | null;
  graduatedAt: string | null;
}

/**
 * 復習の申告（SPEC §11.1 の 2）。読んだ streak で楽観ロックする:
 * 申告の INSERT もカードの UPDATE も「streak がまだ streakBefore のとき」だけ効く。
 * 全問申告済みならセッションを閉じる。戻り値は、書き込めたかと、セッションが閉じたか。
 */
export async function gradeReview(db: D1Database, g: ReviewGrade): Promise<{ written: boolean; closed: boolean }> {
  const [insert, , close] = await db.batch([
    db
      .prepare(
        `INSERT INTO attempts (card_id, kind, session_id, reg_session_id, attempted_at, grade, elapsed_sec,
                               streak_before, streak_after, next_review_at, note)
         SELECT ?1, 'review', ?2, NULL, ?3, ?4, ?5, ?6, ?7, ?8, ?9
         WHERE EXISTS (SELECT 1 FROM cards WHERE id = ?1 AND streak = ?6 AND graduated_at IS NULL)`,
      )
      .bind(
        g.cardId,
        g.sessionId,
        g.attemptedAt,
        g.grade,
        g.elapsedSec,
        g.streakBefore,
        g.streakAfter,
        g.nextReviewAt,
        g.note,
      ),
    db
      .prepare(
        "UPDATE cards SET streak = ?, next_review_at = ?, graduated_at = ? WHERE id = ? AND streak = ? AND graduated_at IS NULL",
      )
      .bind(g.streakAfter, g.nextReviewAt, g.graduatedAt, g.cardId, g.streakBefore),
    closeIfDone(db, g.sessionId, g.attemptedAt),
  ]);
  return { written: (insert?.meta.changes ?? 0) > 0, closed: (close?.meta.changes ?? 0) > 0 };
}

/** 全項目に申告があればセッションを閉じる */
function closeIfDone(db: D1Database, sessionId: number, at: string): D1PreparedStatement {
  return db
    .prepare(
      `UPDATE sessions SET closed_at = ?1 WHERE id = ?2 AND closed_at IS NULL
       AND NOT EXISTS (
         SELECT 1 FROM session_items si WHERE si.session_id = ?2
         AND NOT EXISTS (SELECT 1 FROM attempts a WHERE a.session_id = si.session_id AND a.card_id = si.card_id)
       )`,
    )
    .bind(at, sessionId);
}

export async function isClosed(db: D1Database, sessionId: number): Promise<boolean> {
  const row = await db.prepare("SELECT closed_at FROM sessions WHERE id = ?").bind(sessionId).first<{ closed_at: string | null }>();
  return row?.closed_at != null;
}
