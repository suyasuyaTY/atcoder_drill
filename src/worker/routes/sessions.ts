/**
 * 抽選・セッション・申告（SPEC §6、§11.1）
 */

import { Hono, type Context } from "hono";
import { apply, draw, isActiveStreak, pickDistinct, planSlots, register } from "../../lib/scheduler";
import { createSessionBody, gradeBody, positionParam } from "../../shared/schema";
import { now } from "../clock";
import { countFresh, freshAt } from "../db/fresh";
import { problemsByIds } from "../db/problems";
import { getProfile } from "../db/profile";
import { createSession, gradeFresh, gradeReview, isClosed, openSession, reviewPool, sessionItems } from "../db/sessions";
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
    const { fresh: profile } = await getProfile(db);
    const [pool, freshCount] = await Promise.all([reviewPool(db, kind, t), countFresh(db, profile, kind)]);
    const plan = planSlots(pool.length, freshCount, SESSION_SIZE, profile.freshQuota);
    const picked = draw(
      pool.map((p) => ({ ...p, nextReviewAt: new Date(p.nextReviewAt), graduatedAt: null })),
      t,
      plan.review,
      cryptoRng,
    );
    // 初見は候補が多いので、重複のない OFFSET を選んで1問ずつ取る（SPEC §6.2）
    const offsets = pickDistinct(freshCount, plan.fresh, cryptoRng);
    const fresh = (await Promise.all(offsets.map((o) => freshAt(db, profile, kind, o)))).filter((p) => p !== null);
    if (picked.length + fresh.length === 0) {
      return c.json({ error: { code: "empty_pool", message: "出せる問題がありません" }, session: null }, 409);
    }

    try {
      // 並び順は 初見 → 復習（それぞれ引いた順）
      await createSession(db, kind, t, [
        ...fresh.map((p) => ({ problemId: p.id, cardId: null })),
        ...picked.map((p) => ({ problemId: p.problemId, cardId: p.id })),
      ]);
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

    const t = await now(c.env);
    const at = t.toISOString();
    const note = body.note?.trim() || null;

    // 初見: register() でカードを作る（SPEC §11.1 の 3）
    if (item.cardId === null) {
      const problem = (await problemsByIds(db, [item.problemId])).get(item.problemId);
      if (!problem) return apiError(c, 409, "conflict", "問題データが見つかりません");
      const r = register(body.grade, t);
      try {
        await gradeFresh(db, {
          sessionId: latest.id,
          position,
          card: {
            problemId: problem.id,
            contestId: problem.contestId,
            problemIndex: problem.problemIndex,
            kind: problem.kind,
            title: problem.title,
            difficulty: problem.difficulty,
            streak: r.streak,
            nextReviewAt: r.nextReviewAt.toISOString(),
            firstGrade: body.grade,
            origin: "fresh",
            createdAt: at,
          },
          attemptedAt: at,
          grade: body.grade,
          note,
          streakAfter: r.streak,
          nextReviewAt: r.nextReviewAt.toISOString(),
        });
      } catch (e) {
        // 二重送信なら最初の申告の結果を返す。登録画面では出題中の問題を登録しないので、ほかの理由では起きない
        if (isUniqueError(e, "cards") || isUniqueError(e, "attempts")) {
          const res = await recorded();
          if (res) return res;
          return apiError(c, 409, "conflict", "この問題はすでに登録されています");
        }
        throw e;
      }
      return (await recorded())!;
    }

    if (!isActiveStreak(item.streak)) return apiError(c, 409, "conflict", "このカードはもう卒業しています");
    const r = apply(item.streak, body.grade, t);
    let outcome: { written: boolean };
    try {
      outcome = await gradeReview(db, {
        sessionId: latest.id,
        cardId: item.cardId,
        attemptedAt: at,
        grade: body.grade,
        note,
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
