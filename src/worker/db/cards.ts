import type { ContestKind } from "../../lib/contest";
import type { Grade } from "../../lib/scheduler";

export interface CardRef {
  id: number;
  problemId: string;
  contestId: string;
  problemIndex: string;
  title: string;
}

/** 問題 ID → カード（ID は大文字小文字を区別しない） */
export async function cardsByProblemIds(db: D1Database, problemIds: readonly string[]): Promise<CardRef[]> {
  const { results } = await db
    .prepare(
      `SELECT id, problem_id AS problemId, contest_id AS contestId, problem_index AS problemIndex, title
       FROM cards WHERE problem_id COLLATE NOCASE IN (SELECT value FROM json_each(?))`,
    )
    .bind(JSON.stringify(problemIds))
    .all<CardRef>();
  return results;
}

export interface NewCard {
  problemId: string;
  contestId: string;
  problemIndex: string;
  kind: ContestKind;
  title: string;
  difficulty: number | null;
  streak: number;
  nextReviewAt: string;
  firstGrade: Grade;
  origin: "register" | "fresh";
  createdAt: string;
}

export function insertCard(db: D1Database, c: NewCard): D1PreparedStatement {
  return db
    .prepare(
      `INSERT INTO cards (problem_id, contest_id, problem_index, kind, title, difficulty, streak, next_review_at,
                          graduated_at, first_grade, origin, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?)`,
    )
    .bind(
      c.problemId,
      c.contestId,
      c.problemIndex,
      c.kind,
      c.title,
      c.difficulty,
      c.streak,
      c.nextReviewAt,
      c.firstGrade,
      c.origin,
      c.createdAt,
    );
}

export interface CardDetail {
  id: number;
  problemId: string;
  contestId: string;
  problemIndex: string;
  indexNorm: string;
  kind: ContestKind;
  title: string;
  /** 補正後の値。problems を優先し、未同期ならスナップショットを補正する（呼び出し側で） */
  problemDifficulty: number | null;
  cardDifficulty: number | null;
  streak: number;
  nextReviewAt: string | null;
  graduatedAt: string | null;
  firstGrade: Grade;
  origin: "register" | "fresh";
  createdAt: string;
  /** 開いているセッションに出題中か（0 / 1） */
  inSession: number;
}

const IN_OPEN_SESSION = (card: string) =>
  `EXISTS (SELECT 1 FROM session_items si JOIN sessions s ON s.id = si.session_id
           WHERE s.closed_at IS NULL AND si.card_id = ${card})`;

export async function cardDetail(db: D1Database, id: number): Promise<CardDetail | null> {
  return db
    .prepare(
      `SELECT c.id, c.problem_id AS problemId, c.contest_id AS contestId,
              COALESCE(p.problem_index, c.problem_index) AS problemIndex, COALESCE(p.index_norm, c.problem_index) AS indexNorm,
              c.kind, COALESCE(p.title, c.title) AS title, p.difficulty_disp AS problemDifficulty, c.difficulty AS cardDifficulty,
              c.streak, c.next_review_at AS nextReviewAt, c.graduated_at AS graduatedAt, c.first_grade AS firstGrade,
              c.origin, c.created_at AS createdAt, ${IN_OPEN_SESSION("c.id")} AS inSession
       FROM cards c LEFT JOIN problems p ON p.id = c.problem_id WHERE c.id = ?`,
    )
    .bind(id)
    .first<CardDetail>();
}

export interface CardAttempt {
  id: number;
  kind: "register" | "fresh" | "review";
  attemptedAt: string;
  grade: Grade;
  streakBefore: number;
  streakAfter: number;
  nextReviewAt: string | null;
  note: string | null;
}

/** 申告の履歴（新しい順） */
export async function cardAttempts(db: D1Database, cardId: number): Promise<CardAttempt[]> {
  const { results } = await db
    .prepare(
      `SELECT id, kind, attempted_at AS attemptedAt, grade, streak_before AS streakBefore, streak_after AS streakAfter,
              next_review_at AS nextReviewAt, note
       FROM attempts WHERE card_id = ? ORDER BY attempted_at DESC, id DESC`,
    )
    .bind(cardId)
    .all<CardAttempt>();
  return results;
}

/**
 * カードを削除する（申告は ON DELETE CASCADE で消える。SPEC §11）。
 * 開いているセッションに出題中なら何もしない（申告を済ませるまで削除できない）。
 */
export async function deleteCard(db: D1Database, id: number): Promise<boolean> {
  const r = await db.prepare(`DELETE FROM cards WHERE id = ?1 AND NOT ${IN_OPEN_SESSION("?1")}`).bind(id).run();
  return r.meta.changes > 0;
}
