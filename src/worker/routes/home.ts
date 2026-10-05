/**
 * ホーム（SPEC §6.1、§8.3）。30日グラフと草はステップ8、初見の件数はステップ6で足す
 */

import { Hono } from "hono";
import { CONTEST_KINDS, SESSION_KINDS, type SessionKind } from "../../lib/contest";
import { DEFAULT_FRESH_QUOTA, planSlots } from "../../lib/scheduler";
import { homeQuery } from "../../shared/schema";
import { now } from "../clock";
import { cardStats, nextUnlockAt, sessionProgress, unlockedCountsByKind } from "../db/home";
import { openSession } from "../db/sessions";
import type { AppEnv } from "../types";
import { validate } from "../validate";

/** 1セッションの問題数 */
export const SESSION_SIZE = 3;

type Counts = { review: number; fresh: number };

export const homeRoutes = new Hono<AppEnv>().get("/", validate("query", homeQuery), async (c) => {
  const { kind } = c.req.valid("query");
  const db = c.env.DB;
  const t = await now(c.env);

  const [unlocked, stats, next, session] = await Promise.all([
    unlockedCountsByKind(db, t),
    cardStats(db, t),
    nextUnlockAt(db, kind, t),
    openSession(db),
  ]);

  const kinds = Object.fromEntries(
    SESSION_KINDS.map((k): [SessionKind, Counts] => [
      k,
      {
        review: k === "ALL" ? CONTEST_KINDS.reduce((sum, ck) => sum + (unlocked[ck] ?? 0), 0) : (unlocked[k] ?? 0),
        fresh: 0,
      },
    ]),
  ) as Record<SessionKind, Counts>;
  const selected = kinds[kind];

  return c.json(
    {
      kind,
      kinds,
      plan: planSlots(selected.review, selected.fresh, SESSION_SIZE, DEFAULT_FRESH_QUOTA),
      stats: { ...stats, freshCandidates: 0 },
      nextUnlockAt: next,
      openSession: session ? { ...session, ...(await sessionProgress(db, session.id)) } : null,
    },
    200,
  );
});
