/**
 * プロフィール（SPEC §5）と、その他のコンテストの検索
 */

import { Hono } from "hono";
import { contestsQuery, profileBody } from "../../shared/schema";
import { now } from "../clock";
import { countFresh } from "../db/fresh";
import { getProfile, otherContestsByIds, saveProfile, searchOtherContests } from "../db/profile";
import { apiError } from "../errors";
import type { AppEnv } from "../types";
import { validate } from "../validate";

async function profileResponse(db: D1Database) {
  const p = await getProfile(db);
  const [otherContests, freshCandidates] = await Promise.all([
    otherContestsByIds(db, p.fresh.targets.OTHER),
    countFresh(db, p.fresh, "ALL"),
  ]);
  return { atcoderUserId: p.atcoderUserId, ...p.fresh, otherContests, freshCandidates };
}

export const profileRoutes = new Hono<AppEnv>()
  .get("/", async (c) => c.json(await profileResponse(c.env.DB), 200))

  .put("/", validate("json", profileBody), async (c) => {
    const body = c.req.valid("json");
    const known = await otherContestsByIds(c.env.DB, body.targets.OTHER);
    if (known.length !== body.targets.OTHER.length) {
      const ids = new Set(known.map((k) => k.id));
      const unknown = body.targets.OTHER.filter((id) => !ids.has(id));
      return apiError(c, 400, "unknown_contest", `その他のコンテストにないコンテストです: ${unknown.join(", ")}`);
    }
    await saveProfile(c.env.DB, body, await now(c.env));
    return c.json(await profileResponse(c.env.DB), 200);
  });

export const contestRoutes = new Hono<AppEnv>().get("/", validate("query", contestsQuery), async (c) =>
  c.json({ contests: await searchOtherContests(c.env.DB, c.req.valid("query").q) }, 200),
);
