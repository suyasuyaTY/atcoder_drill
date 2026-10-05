/**
 * サーバーの現在時刻（SPEC §12）。サーバー側で引数なしの new Date() / Date.now() を呼んでよいのはこのファイルだけ。
 */

import { applyClockOffset, parseClockOffsetDays } from "../lib/clock";
import { getMeta } from "./db/app-meta";

export const isDebug = (env: Env) => env.DEBUG_TOOLS === "1";

/** デバッグの時計のずれ（日）。DEBUG_TOOLS=1 でなければ常に 0 */
export async function clockOffsetDays(env: Env): Promise<number> {
  if (!isDebug(env)) return 0;
  return parseClockOffsetDays(await getMeta(env.DB, "debug_clock_offset_days"));
}

export async function now(env: Env): Promise<Date> {
  const real = new Date();
  if (!isDebug(env)) return real;
  return applyClockOffset(real, await clockOffsetDays(env));
}
