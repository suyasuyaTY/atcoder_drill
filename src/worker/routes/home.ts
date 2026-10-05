/**
 * ホーム（SPEC §6.1、§8.3）。30日グラフと草はステップ8で足す
 */

import { Hono } from "hono";
import { CONTEST_KINDS, SESSION_KINDS, type SessionKind } from "../../lib/contest";
import { planSlots } from "../../lib/scheduler";
import { homeQuery } from "../../shared/schema";
import { now } from "../clock";
import { countFresh } from "../db/fresh";
import { cardStats, nextUnlockAt, sessionProgress, unlockedCountsByKind } from "../db/home";
import { getProfile } from "../db/profile";
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

  const { fresh: profile } = await getProfile(db);
  const [unlocked, stats, next, session, ...freshCounts] = await Promise.all([
    unlockedCountsByKind(db, t),
    cardStats(db, t),
    nextUnlockAt(db, kind, t),
    openSession(db),
    ...CONTEST_KINDS.map((k) => countFresh(db, profile, k)),
  ]);
  const freshOf = Object.fromEntries(CONTEST_KINDS.map((k, i) => [k, freshCounts[i] ?? 0])) as Record<
    (typeof CONTEST_KINDS)[number],
    number
  >;
  const sum = (f: (k: (typeof CONTEST_KINDS)[number]) => number) => CONTEST_KINDS.reduce((s, k) => s + f(k), 0);

  const kinds = Object.fromEntries(
    SESSION_KINDS.map((k): [SessionKind, Counts] => [
      k,
      {
        review: k === "ALL" ? sum((ck) => unlocked[ck] ?? 0) : (unlocked[k] ?? 0),
        fresh: k === "ALL" ? sum((ck) => freshOf[ck]) : freshOf[k],
      },
    ]),
  ) as Record<SessionKind, Counts>;
  const selected = kinds[kind];

  return c.json(
    {
      kind,
      kinds,
      plan: planSlots(selected.review, selected.fresh, SESSION_SIZE, profile.freshQuota),
      freshQuota: profile.freshQuota,
      stats: { ...stats, freshCandidates: kinds.ALL.fresh },
      nextUnlockAt: next,
      openSession: session ? { ...session, ...(await sessionProgress(db, session.id)) } : null,
    },
    200,
  );
});
