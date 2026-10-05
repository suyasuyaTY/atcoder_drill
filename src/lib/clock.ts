/**
 * デバッグ用の時計のずれ（SPEC §12）。実時刻の取得は src/worker/clock.ts だけで行う。
 */

import { DAY_MS } from "./scheduler";

export function applyClockOffset(real: Date, offsetDays: number): Date {
  return new Date(real.getTime() + offsetDays * DAY_MS);
}

/** app_meta.debug_clock_offset_days の値 → 日数。整数でなければ 0 */
export function parseClockOffsetDays(value: string | null | undefined): number {
  if (value == null || !/^-?\d+$/.test(value)) return 0;
  return Number(value);
}
