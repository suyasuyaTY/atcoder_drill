import { Hono } from "hono";
import { clockOffsetDays, isDebug } from "../clock";
import { getAtcoderUserId } from "../db/profile";
import type { AppEnv } from "../types";

export const meRoutes = new Hono<AppEnv>().get("/", async (c) => {
  const [atcoderUserId, offset] = await Promise.all([getAtcoderUserId(c.env.DB), clockOffsetDays(c.env)]);
  return c.json({ atcoderUserId, debugTools: isDebug(c.env), clockOffsetDays: offset }, 200);
});
