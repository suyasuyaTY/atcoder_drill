/**
 * カード詳細とカード削除（SPEC §8.2）
 */

import { Hono } from "hono";
import { displayDifficulty } from "../../lib/difficulty";
import { cardStatus } from "../../lib/eligibility";
import { cardIdParam } from "../../shared/schema";
import { now } from "../clock";
import { cardAttempts, cardDetail, deleteCard } from "../db/cards";
import { getProfile } from "../db/profile";
import { apiError } from "../errors";
import type { AppEnv } from "../types";
import { validate } from "../validate";

export const cardRoutes = new Hono<AppEnv>()
  .get("/:cardId", validate("param", cardIdParam), async (c) => {
    const { cardId } = c.req.valid("param");
    const db = c.env.DB;
    const card = await cardDetail(db, cardId);
    if (!card) return apiError(c, 404, "not_found", "カードが見つかりません");

    const [attempts, profile, t] = await Promise.all([cardAttempts(db, cardId), getProfile(db), now(c.env)]);
    const difficulty = card.problemDifficulty ?? displayDifficulty(card.cardDifficulty);
    const status = cardStatus(
      { id: card.problemId, contestId: card.contestId, kind: card.kind, indexNorm: card.indexNorm, difficulty },
      card,
      profile.fresh,
      t,
    );
    return c.json(
      {
        card: {
          id: card.id,
          problemId: card.problemId,
          contestId: card.contestId,
          problemIndex: card.problemIndex,
          kind: card.kind,
          title: card.title,
          difficulty,
          streak: card.streak,
          nextReviewAt: card.nextReviewAt,
          graduatedAt: card.graduatedAt,
          origin: card.origin,
          createdAt: card.createdAt,
          inSession: card.inSession === 1,
          status,
        },
        attempts,
      },
      200,
    );
  })

  .delete("/:cardId", validate("param", cardIdParam), async (c) => {
    const { cardId } = c.req.valid("param");
    if (await deleteCard(c.env.DB, cardId)) return c.json({ ok: true as const }, 200);
    const exists = await c.env.DB.prepare("SELECT 1 FROM cards WHERE id = ?").bind(cardId).first();
    return exists
      ? apiError(c, 409, "in_session", "出題中のカードは削除できません。セッションで申告を済ませてください")
      : apiError(c, 404, "not_found", "カードが見つかりません");
  });
