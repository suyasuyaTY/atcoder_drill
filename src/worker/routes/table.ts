/**
 * 問題表（SPEC §9）
 */

import { Hono } from "hono";
import { tableColumns } from "../../lib/contest";
import { cardStatus } from "../../lib/eligibility";
import { tableQuery } from "../../shared/schema";
import { now } from "../clock";
import { countTableContests, TABLE_PAGE_SIZE, tableContests, tableProblems } from "../db/table";
import type { AppEnv } from "../types";
import { validate } from "../validate";

export const tableRoutes = new Hono<AppEnv>().get("/", validate("query", tableQuery), async (c) => {
  const { kind, page } = c.req.valid("query");
  const db = c.env.DB;
  const [t, total, contests] = await Promise.all([now(c.env), countTableContests(db, kind), tableContests(db, kind, page)]);
  const problems = contests.length > 0 ? await tableProblems(db, contests.map((x) => x.id)) : [];

  const rows = contests.map((contest) => ({
    contestId: contest.id,
    title: contest.title,
    problems: problems
      .filter((p) => p.contestId === contest.id)
      .map((p) => ({
        id: p.id,
        problemIndex: p.problemIndex,
        indexNorm: p.indexNorm,
        title: p.title,
        difficulty: p.difficulty,
        cardId: p.cardId,
        status: cardStatus(
          p.cardId === null ? null : { streak: p.streak!, nextReviewAt: p.nextReviewAt, graduatedAt: p.graduatedAt },
          t,
        ),
      })),
  }));

  return c.json(
    {
      kind,
      page,
      totalPages: Math.max(1, Math.ceil(total / TABLE_PAGE_SIZE)),
      columns: tableColumns(
        kind,
        problems.map((p) => p.indexNorm),
      ),
      rows,
    },
    200,
  );
});
