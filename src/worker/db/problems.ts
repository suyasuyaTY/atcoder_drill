import type { ContestKind } from "../../lib/contest";

export interface ContestRow {
  id: string;
  title: string;
  kind: ContestKind;
}

/** 問題と、その問題のカードの ID（なければ null） */
export interface ProblemWithCard {
  id: string;
  contestId: string;
  problemIndex: string;
  title: string;
  /** 補正後の値（SPEC §10.1） */
  difficulty: number | null;
  cardId: number | null;
}

const PROBLEM_WITH_CARD = `
  SELECT p.id, p.contest_id AS contestId, p.problem_index AS problemIndex, p.title,
         p.difficulty_disp AS difficulty, c.id AS cardId
  FROM problems p LEFT JOIN cards c ON c.problem_id = p.id`;

/** 問題記号順（`B` < `AA`、`G` < `Ex`） */
export const ORDER_BY_INDEX = "ORDER BY length(p.problem_index), p.problem_index";

/** ID は大文字小文字を区別せずに引く（短縮形は小文字にそろえて渡ってくる。SPEC §7.1） */
export async function findContest(db: D1Database, id: string): Promise<ContestRow | null> {
  return db.prepare("SELECT id, title, kind FROM contests WHERE id = ? COLLATE NOCASE").bind(id).first<ContestRow>();
}

export async function problemsOfContest(db: D1Database, contestId: string): Promise<ProblemWithCard[]> {
  const { results } = await db
    .prepare(`${PROBLEM_WITH_CARD} WHERE p.contest_id = ? ${ORDER_BY_INDEX}`)
    .bind(contestId)
    .all<ProblemWithCard>();
  return results;
}

export async function findProblem(db: D1Database, id: string): Promise<ProblemWithCard | null> {
  return db.prepare(`${PROBLEM_WITH_CARD} WHERE p.id = ? COLLATE NOCASE`).bind(id).first<ProblemWithCard>();
}

export interface ProblemForCard {
  id: string;
  contestId: string;
  problemIndex: string;
  kind: ContestKind;
  title: string;
  /** 生の値（cards.difficulty のスナップショット用） */
  difficulty: number | null;
}

export async function problemsByIds(db: D1Database, ids: readonly string[]): Promise<Map<string, ProblemForCard>> {
  const { results } = await db
    .prepare(
      `SELECT id, contest_id AS contestId, problem_index AS problemIndex, kind, title, difficulty
       FROM problems WHERE id IN (SELECT value FROM json_each(?))`,
    )
    .bind(JSON.stringify(ids))
    .all<ProblemForCard>();
  return new Map(results.map((p) => [p.id, p]));
}
