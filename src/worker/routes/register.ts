/**
 * 登録（SPEC §7、§11.2）
 */

import { Hono } from "hono";
import { contestKind } from "../../lib/contest";
import { guessProblemIndex, parseProblemInput } from "../../lib/problem-id";
import { register } from "../../lib/scheduler";
import { cardIdParam, lookupQuery, registerBody } from "../../shared/schema";
import { now } from "../clock";
import { cardsByProblemIds, insertCard, type NewCard } from "../db/cards";
import { findContest, findProblem, problemsByIds, problemsOfContest, type ProblemWithCard } from "../db/problems";
import {
  closeRegSession,
  closeStale,
  insertRegisterAttempt,
  openIfNone,
  openRegSession,
  regSessionItems,
  undoRegistration,
  type RegisterAttempt,
} from "../db/reg-sessions";
import { apiError } from "../errors";
import type { AppEnv } from "../types";
import { validate } from "../validate";

/** 未同期の問題を手入力で登録するときに、画面に渡す既定値 */
type Manual = { problemId: string; contestId: string; problemIndex: string };

export const registerRoutes = new Hono<AppEnv>()
  .get("/lookup", validate("query", lookupQuery), async (c) => {
    const parsed = parseProblemInput(c.req.valid("query").q);
    if (!parsed) {
      return apiError(c, 400, "invalid_url", "AtCoder の URL を読み取れません（コンテストか問題のページの URL を貼ってください）");
    }
    const db = c.env.DB;

    if (parsed.type === "contest") {
      const contest = await findContest(db, parsed.contestId);
      const problems = contest ? await problemsOfContest(db, contest.id) : [];
      return c.json({ target: "contest" as const, contest, problems, manual: null as Manual | null }, 200);
    }

    const problem = await findProblem(db, parsed.problemId);
    if (problem) {
      return c.json(
        { target: "problem" as const, contest: await findContest(db, problem.contestId), problems: [problem], manual: null },
        200,
      );
    }

    // 問題データが未同期。以前に手入力で登録していればそのカードを出す
    const [card] = await cardsByProblemIds(db, [parsed.problemId]);
    if (card) {
      const fromCard: ProblemWithCard = { ...card, id: card.problemId, difficulty: null, cardId: card.id };
      return c.json({ target: "problem" as const, contest: null, problems: [fromCard], manual: null }, 200);
    }
    const manual: Manual | null = parsed.contestId
      ? { problemId: parsed.problemId, contestId: parsed.contestId, problemIndex: guessProblemIndex(parsed.problemId) }
      : null;
    return c.json({ target: "problem" as const, contest: null, problems: [] as ProblemWithCard[], manual }, 200);
  })

  .post("/", validate("json", registerBody), async (c) => {
    const { items } = c.req.valid("json");
    const db = c.env.DB;
    const t = await now(c.env);
    const at = t.toISOString();

    const ids = items.map((i) => i.problemId);
    const [problems, existing] = await Promise.all([problemsByIds(db, ids), cardsByProblemIds(db, ids)]);
    const existingIds = new Set(existing.map((e) => e.problemId.toLowerCase()));
    const skipped = items.filter((i) => existingIds.has(i.problemId.toLowerCase())).map((i) => i.problemId);
    const todo = items.filter((i) => !existingIds.has(i.problemId.toLowerCase()));

    const unknown = todo.filter((i) => !problems.has(i.problemId) && i.title === undefined).map((i) => i.problemId);
    if (unknown.length > 0) {
      return apiError(c, 400, "unknown_problem", `問題データにない問題です: ${unknown.join(", ")}`);
    }
    if (todo.length === 0) return c.json({ registered: [] as Registered[], skipped }, 200);

    const statements: D1PreparedStatement[] = [closeStale(db, t), openIfNone(db, t)];
    for (const item of todo) {
      const r = register(item.grade, t);
      const p = problems.get(item.problemId);
      const contestId = p?.contestId ?? item.contestId!;
      const card: NewCard = {
        problemId: item.problemId,
        contestId,
        problemIndex: p?.problemIndex ?? guessProblemIndex(item.problemId),
        kind: p?.kind ?? contestKind(contestId),
        title: p?.title ?? item.title!,
        difficulty: p?.difficulty ?? null,
        streak: r.streak,
        nextReviewAt: r.nextReviewAt.toISOString(),
        firstGrade: item.grade,
        origin: "register",
        createdAt: at,
      };
      const attempt: RegisterAttempt = {
        problemId: item.problemId,
        attemptedAt: at,
        grade: item.grade,
        streakAfter: r.streak,
        nextReviewAt: card.nextReviewAt,
        note: item.note?.trim() || null,
      };
      statements.push(insertCard(db, card), insertRegisterAttempt(db, attempt));
    }

    try {
      await db.batch(statements);
    } catch (e) {
      // 同じ問題の登録が同時に届いた（二重送信など）。どれも書き込まれていない
      if (e instanceof Error && e.message.includes("UNIQUE constraint failed: cards.problem_id")) {
        return apiError(c, 409, "conflict", "ほかの登録と重なりました。読み込み直してください");
      }
      throw e;
    }

    const created = await cardsByProblemIds(
      db,
      todo.map((i) => i.problemId),
    );
    const registered: Registered[] = created.map((card) => ({ cardId: card.id, problemId: card.problemId }));
    return c.json({ registered, skipped }, 200);
  })

  .get("/session", async (c) => {
    const session = await openRegSession(c.env.DB);
    const items = session ? await regSessionItems(c.env.DB, session.id) : [];
    return c.json({ session, items }, 200);
  })

  .delete("/items/:cardId", validate("param", cardIdParam), async (c) => {
    const { cardId } = c.req.valid("param");
    if (await undoRegistration(c.env.DB, cardId)) return c.json({ ok: true as const }, 200);
    const exists = await c.env.DB.prepare("SELECT 1 FROM cards WHERE id = ?").bind(cardId).first();
    return exists
      ? apiError(c, 409, "cannot_undo", "この登録は取り消せません（登録を終えたか、すでに申告があります）")
      : apiError(c, 404, "not_found", "カードが見つかりません");
  })

  .post("/session/close", async (c) => {
    await closeRegSession(c.env.DB, await now(c.env));
    return c.json({ ok: true as const }, 200);
  });

type Registered = { cardId: number; problemId: string };
