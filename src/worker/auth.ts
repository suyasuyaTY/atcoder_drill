/**
 * 認証（SPEC §17）。/api/* の全ルートにかける。fail closed: 判断できないときは通さない。
 */

import type { Context } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import { resolveAuthMode } from "../lib/auth-mode";
import { apiError } from "./errors";
import type { AppEnv } from "./types";

const COOKIE_NAME = "drill_auth";
const COOKIE_MAX_AGE_SEC = 400 * 24 * 60 * 60;
/** cookie の値は AUTH_TOKEN そのものではなく、AUTH_TOKEN を鍵にしたこの文字列の HMAC にする */
const COOKIE_MESSAGE = "drill_auth:v1";

/** 認証なしで通すルート */
const PUBLIC_ROUTES = [{ method: "POST", path: "/api/login" }];

export const auth = createMiddleware<AppEnv>(async (c, next) => {
  const mode = resolveAuthMode(c.env);
  if (!mode.ok) {
    console.error(`auth: ${mode.reason}`);
    return apiError(c, 500, "auth_misconfigured", "認証の設定が正しくありません");
  }

  if (PUBLIC_ROUTES.some((r) => r.method === c.req.method && r.path === c.req.path)) return next();

  switch (mode.mode) {
    case "none":
      return next();
    case "token": {
      if (!c.env.AUTH_TOKEN) {
        console.error("auth: AUTH_MODE=token なのに AUTH_TOKEN が設定されていない");
        return apiError(c, 500, "auth_misconfigured", "認証の設定が正しくありません");
      }
      const cookie = getCookie(c, COOKIE_NAME);
      if (cookie && (await equalsConstantTime(cookie, await cookieValue(c.env.AUTH_TOKEN)))) return next();
      return apiError(c, 401, "unauthorized", "ログインしてください");
    }
    case "access":
      // Access の JWT の検証は SPEC §19 のステップ11で作る。それまでは通さない
      return apiError(c, 500, "auth_misconfigured", "AUTH_MODE=access はまだ使えません");
  }
});

/** POST /api/login の照合。一致したら cookie を発行して true を返す */
export async function login(c: Context<AppEnv>, token: string): Promise<boolean> {
  const secret = c.env.AUTH_TOKEN;
  if (!secret || !(await equalsConstantTime(token, secret))) return false;
  setCookie(c, COOKIE_NAME, await cookieValue(secret), {
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    maxAge: COOKIE_MAX_AGE_SEC,
  });
  return true;
}

async function cookieValue(secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const mac = await crypto.subtle.sign("HMAC", key, enc.encode(COOKIE_MESSAGE));
  return btoa(String.fromCharCode(...new Uint8Array(mac)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** 長さの違いも漏らさないよう、SHA-256 にそろえてから定数時間で比べる */
async function equalsConstantTime(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder();
  const [da, db] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(a)),
    crypto.subtle.digest("SHA-256", enc.encode(b)),
  ]);
  return crypto.subtle.timingSafeEqual(da, db);
}
