import type { ContestKind } from "../../lib/contest";
import { ORDER_BY_INDEX } from "./problems";

export const TABLE_PAGE_SIZE = 20;

/**
 * 問題表に出すコンテスト（SPEC §9）。問題が1問もないコンテストは出さない。
 * その他は、カードが1枚以上あるコンテストだけ（プロフィールで選んだコンテストはステップ6で足す）。
 */
const CONTEST_FILTER = `
  kind = ?1
  AND EXISTS (SELECT 1 FROM problems p WHERE p.contest_id = contests.id)
  AND (kind != 'OTHER' OR id IN (SELECT contest_id FROM cards))`;

export async function countTableContests(db: D1Database, kind: ContestKind): Promise<number> {
  const row = await db.prepare(`SELECT count(*) AS n FROM contests WHERE ${CONTEST_FILTER}`).bind(kind).first<{ n: number }>();
  return row?.n ?? 0;
}

export interface TableContest {
  id: string;
  title: string;
}

/** 新しいコンテストから順に */
export async function tableContests(db: D1Database, kind: ContestKind, page: number): Promise<TableContest[]> {
  const { results } = await db
    .prepare(
      `SELECT id, title FROM contests WHERE ${CONTEST_FILTER}
       ORDER BY start_epoch_second DESC, id LIMIT ?2 OFFSET ?3`,
    )
    .bind(kind, TABLE_PAGE_SIZE, (page - 1) * TABLE_PAGE_SIZE)
    .all<TableContest>();
  return results;
}

export interface TableProblem {
  id: string;
  contestId: string;
  problemIndex: string;
  indexNorm: string;
  title: string;
  difficulty: number | null;
  cardId: number | null;
  streak: number | null;
  nextReviewAt: string | null;
  graduatedAt: string | null;
}

export async function tableProblems(db: D1Database, contestIds: readonly string[]): Promise<TableProblem[]> {
  const { results } = await db
    .prepare(
      `SELECT p.id, p.contest_id AS contestId, p.problem_index AS problemIndex, p.index_norm AS indexNorm, p.title,
              p.difficulty_disp AS difficulty, c.id AS cardId, c.streak, c.next_review_at AS nextReviewAt,
              c.graduated_at AS graduatedAt
       FROM problems p LEFT JOIN cards c ON c.problem_id = p.id
       WHERE p.contest_id IN (SELECT value FROM json_each(?))
       ${ORDER_BY_INDEX}`,
    )
    .bind(JSON.stringify(contestIds))
    .all<TableProblem>();
  return results;
}
