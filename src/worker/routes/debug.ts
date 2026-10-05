/**
 * デバッグツール（SPEC §13）。DEBUG_TOOLS=1（.dev.vars にだけ書く）のときだけ動き、それ以外は全部 404。
 */

import { Hono } from "hono";
import { createMiddleware } from "hono/factory";
import { DAY_MS } from "../../lib/scheduler";
import { debugClockBody, debugUnlockBody } from "../../shared/schema";
import { clockOffsetDays, isDebug, now } from "../clock";
import { apiError } from "../errors";
import type { AppEnv } from "../types";
import { validate } from "../validate";

const MAX_OFFSET_DAYS = 3650;
const SAMPLE_SIZE = 12;

const debugOnly = createMiddleware<AppEnv>(async (c, next) => {
  if (!isDebug(c.env)) return apiError(c, 404, "not_found", "見つかりません");
  return next();
});

async function setOffset(db: D1Database, days: number) {
  await db
    .prepare(
      "INSERT INTO app_meta (key, value) VALUES ('debug_clock_offset_days', ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value",
    )
    .bind(String(days))
    .run();
}

export const debugRoutes = new Hono<AppEnv>()
  .use(debugOnly)

  /** 時計を ±N 日ずらす（いまのずれに足す） */
  .post("/clock", validate("json", debugClockBody), async (c) => {
    const { addDays } = c.req.valid("json");
    const next = (await clockOffsetDays(c.env)) + addDays;
    if (Math.abs(next) > MAX_OFFSET_DAYS) {
      return apiError(c, 400, "invalid_request", `ずれは ±${MAX_OFFSET_DAYS}日までです`);
    }
    await setOffset(c.env.DB, next);
    return c.json({ clockOffsetDays: next }, 200);
  })

  .post("/clock/reset", async (c) => {
    await setOffset(c.env.DB, 0);
    return c.json({ clockOffsetDays: 0 }, 200);
  })

  /** 指定したカードを今すぐ解禁する（next_review_at = now()） */
  .post("/unlock", validate("json", debugUnlockBody), async (c) => {
    const { target } = c.req.valid("json");
    const t = await now(c.env);
    const r = await c.env.DB.prepare(
      `UPDATE cards SET next_review_at = ?1
       WHERE graduated_at IS NULL AND (id = CAST(?2 AS INTEGER) OR problem_id = ?2 COLLATE NOCASE)`,
    )
      .bind(t.toISOString(), target)
      .run();
    if (r.meta.changes === 0) return apiError(c, 404, "not_found", "現役のカードが見つかりません");
    return c.json({ unlocked: r.meta.changes }, 200);
  })

  /**
   * サンプルデータ（ローカル D1 だけ。DEBUG_TOOLS=1 はローカルにしかない）。
   * カードのない ABC / ARC / AGC の C〜F から選び、解禁中・待機中・卒業を混ぜて入れる
   */
  .post("/sample", async (c) => {
    const db = c.env.DB;
    const t = await now(c.env);
    const { results: problems } = await db
      .prepare(
        `SELECT id, contest_id AS contestId, problem_index AS problemIndex, kind, title, difficulty FROM problems p
         WHERE kind IN ('ABC', 'ARC', 'AGC') AND index_norm IN ('C', 'D', 'E', 'F')
           AND NOT EXISTS (SELECT 1 FROM cards c WHERE c.problem_id = p.id)
         ORDER BY random() LIMIT ?`,
      )
      .bind(SAMPLE_SIZE)
      .all<{ id: string; contestId: string; problemIndex: string; kind: string; title: string; difficulty: number | null }>();
    if (problems.length === 0) {
      return apiError(c, 409, "no_problems", "問題データがありません。先に npm run sync:problems -- --local を実行してください");
    }

    const iso = (days: number) => new Date(t.getTime() + days * DAY_MS).toISOString();
    const statements = problems.flatMap((p, i) => {
      // 0: streak 0 解禁中 / 1: streak 1 解禁中 / 2: streak 0 待機中 / 3: 卒業
      const variant = i % 4;
      const created = iso(-120 - i);
      const streak = variant === 1 ? 1 : variant === 3 ? 2 : 0;
      const next = variant === 0 ? iso(-1 - i) : variant === 1 ? iso(-5 - i * 3) : variant === 2 ? iso(5 + i) : null;
      const graduatedAt = variant === 3 ? iso(-i) : null;
      const firstGrade = variant === 0 ? "failed" : variant === 2 ? "hard" : "easy";
      const card = db
        .prepare(
          `INSERT INTO cards (problem_id, contest_id, problem_index, kind, title, difficulty, streak, next_review_at,
                              graduated_at, first_grade, origin, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'register', ?)`,
        )
        .bind(p.id, p.contestId, p.problemIndex, p.kind, p.title, p.difficulty, streak, next, graduatedAt, firstGrade, created);
      const attempt = (kind: string, at: string, grade: string, before: number, after: number, nextAt: string | null) =>
        db
          .prepare(
            `INSERT INTO attempts (card_id, kind, attempted_at, grade, streak_before, streak_after, next_review_at)
             VALUES ((SELECT id FROM cards WHERE problem_id = ?), ?, ?, ?, ?, ?, ?)`,
          )
          .bind(p.id, kind, at, grade, before, after, nextAt);
      const registerAfter = firstGrade === "easy" ? 1 : 0;
      const stmts = [card, attempt("register", created, firstGrade, 0, registerAfter, iso(-120 - i + (registerAfter ? 90 : 30)))];
      if (variant === 3) stmts.push(attempt("review", graduatedAt!, "easy", 1, 2, null));
      return stmts;
    });
    await db.batch(statements);
    return c.json({ inserted: problems.length }, 200);
  });
