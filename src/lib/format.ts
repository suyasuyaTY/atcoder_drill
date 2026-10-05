/**
 * 表示用の整形。日時は UTC の ISO 文字列で受け取り、JST で表示する。
 */

import { DAY_MS } from "./scheduler";

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

type DateLike = Date | string;

const toDate = (d: DateLike) => (typeof d === "string" ? new Date(d) : d);

/** JST の暦の値を UTC のフィールドで読めるようにずらした Date */
function jst(d: DateLike): Date {
  return new Date(toDate(d).getTime() + JST_OFFSET_MS);
}

/** 「10/4」 */
export function formatJstDate(d: DateLike): string {
  const j = jst(d);
  return `${j.getUTCMonth() + 1}/${j.getUTCDate()}`;
}

/** 「10/4 0:05」 */
export function formatJstDateTime(d: DateLike): string {
  const j = jst(d);
  const mm = String(j.getUTCMinutes()).padStart(2, "0");
  return `${formatJstDate(d)} ${j.getUTCHours()}:${mm}`;
}

/** 「あと N日」の N。経過時間で数え、日単位で切り上げる。過ぎていたら 0 */
export function daysUntil(target: DateLike, now: Date): number {
  return Math.max(0, Math.ceil((toDate(target).getTime() - now.getTime()) / DAY_MS));
}

/** 「N日経過」の N。経過時間で数え、日単位で切り上げる。まだなら 0 */
export function daysSince(from: DateLike, now: Date): number {
  return Math.max(0, Math.ceil((now.getTime() - toDate(from).getTime()) / DAY_MS));
}
