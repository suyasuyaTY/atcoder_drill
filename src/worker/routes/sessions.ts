/**
 * 抽選・セッション・申告（SPEC §6、§11.1）。この時点では復習だけ。初見はステップ6で足す
 */

import { Hono, type Context } from "hono";
import { DEFAULT_FRESH_QUOTA, apply, draw, isActiveStreak, planSlots } from "../../lib/scheduler";
import { createSessionBody, gradeBody, positionParam } from "../../shared/schema";
import { now } from "../clock";
import { createSession, gradeReview, isClosed, openSession, reviewPool, sessionItems } from "../db/sessions";
import { apiError } from "../errors";
import { cryptoRng } from "../random";
import type { AppEnv } from "../types";
import { validate } from "../validate";
import { SESSION_SIZE } from "./home";

async function currentSession(c: Context<AppEnv>) {
  const s = await openSession(c.env.DB);
  return s ? { ...s, items: await sessionItems(c.env.DB, s.id) } : null;
}

const isUniqueError = (e: unknown, index: string) => e instanceof Error && e.message.includes("UNIQUE constraint failed") && e.message.includes(index);

export const sessionRoutes = new Hono<AppEnv>()
  .post("/", validate("json", createSessionBody), async (c) => {
    const { kind } = c.req.valid("json");
    const db = c.env.DB;

    const open = await currentSession(c);
    if (open) {
      return c.json({ error: { code: "session_open", message: "開いているセッションがあります" }, session: open }, 409);
    }

    const t = await now(c.env);
    const pool = await reviewPool(db, kind, t);
    const plan = planSlots(pool.length, 0, SESSION_SIZE, DEFAULT_FRESH_QUOTA);
    const picked = draw(
      pool.map((p) => ({ ...p, nextReviewAt: new Date(p.nextReviewAt), graduatedAt: null })),
      t,
      plan.review,
      cryptoRng,
    );
    if (picked.length === 0) {
      return c.json({ error: { code: "empty_pool", message: "出せる問題がありません" }, session: null }, 409);
    }

    try {
      // 並び順は 初見 → 復習（それぞれ引いた順）。初見はステップ6で足す
      await createSession(
        db,
        kind,
        t,
        picked.map((p) => ({ problemId: p.problemId, cardId: p.id })),
      );
    } catch (e) {
      if (isUniqueError(e, "sessions")) {
        return c.json(
          { error: { code: "session_open", message: "開いているセッションがあります" }, session: await currentSession(c) },
          409,
        );
      }
      throw e;
    }
    return c.json({ session: (await currentSession(c))! }, 201);
  })

  .get("/current", async (c) => c.json({ session: await currentSession(c) }, 200))

  .post("/current/items/:position/grade", validate("param", positionParam), validate("json", gradeBody), async (c) => {
    const { position } = c.req.valid("param");
    const body = c.req.valid("json");
    const db = c.env.DB;

    // 最後の1問の二重送信ではセッションがもう閉じているので、直近のセッションを見る
    const latest = await db
      .prepare("SELECT id, closed_at AS closedAt FROM sessions ORDER BY id DESC LIMIT 1")
      .first<{ id: number; closedAt: string | null }>();
    const items = latest ? await sessionItems(db, latest.id) : [];
    const item = items.find((i) => i.position === position);
    if (!latest || !item || (latest.closedAt !== null && item.result === null)) {
      return apiError(c, 404, "not_found", "開いているセッションにその問題がありません");
    }

    const recorded = async () => {
      const again = (await sessionItems(db, latest.id)).find((i) => i.position === position);
      return again?.result ? c.json({ position, result: again.result, sessionClosed: await isClosed(db, latest.id) }, 200) : null;
    };

    // すでに申告済みなら、記録された結果を返す（二重送信。SPEC §11.1 の 4）
    if (item.result) return (await recorded())!;

    if (item.cardId === null) return apiError(c, 409, "not_supported", "初見の申告はまだ作っていません");
    if (!isActiveStreak(item.streak)) return apiError(c, 409, "conflict", "このカードはもう卒業しています");

    const t = await now(c.env);
    const r = apply(item.streak, body.grade, t);
    const at = t.toISOString();
    let outcome: { written: boolean };
    try {
      outcome = await gradeReview(db, {
        sessionId: latest.id,
        cardId: item.cardId,
        attemptedAt: at,
        grade: body.grade,
        elapsedSec: body.elapsedSec ?? null,
        note: body.note?.trim() || null,
        streakBefore: item.streak,
        streakAfter: r.streak,
        nextReviewAt: r.nextReviewAt?.toISOString() ?? null,
        graduatedAt: r.graduated ? at : null,
      });
    } catch (e) {
      if (isUniqueError(e, "attempts")) {
        const res = await recorded();
        if (res) return res;
      }
      throw e;
    }
    if (!outcome.written) {
      return (await recorded()) ?? apiError(c, 409, "conflict", "カードの状態が変わりました。読み込み直してください");
    }
    return (await recorded())!;
  });
