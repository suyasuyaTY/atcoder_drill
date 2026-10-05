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
