import { Hono } from "hono";
import { resolveAuthMode } from "../../lib/auth-mode";
import { loginBody } from "../../shared/schema";
import { login } from "../auth";
import { apiError } from "../errors";
import type { AppEnv } from "../types";
import { validate } from "../validate";

export const loginRoutes = new Hono<AppEnv>().post("/", validate("json", loginBody), async (c) => {
  const mode = resolveAuthMode(c.env);
  if (!mode.ok || mode.mode !== "token") return apiError(c, 404, "not_found", "この認証方式ではログインを使いません");

  if (!(await login(c, c.req.valid("json").token))) {
    return apiError(c, 401, "invalid_token", "トークンが違います");
  }
  return c.json({ ok: true as const }, 200);
});
