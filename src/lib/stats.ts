/**
 * ホームのグラフと草の集計（SPEC §10）。日付の区切りは JST。
 */

import { DIFFICULTY_BANDS, difficultyBand, type DifficultyBand } from "./difficulty";
import { DAY_MS, type Grade } from "./scheduler";

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

export const DAILY_DAYS = 30;
export const GRASS_WEEKS = 53;

/** JST の日付（"2026-10-01"） */
export function jstDayKey(d: Date): string {
  return new Date(d.getTime() + JST_OFFSET_MS).toISOString().slice(0, 10);
}

/** その日（JST）の 0 時 */
function jstMidnight(d: Date): Date {
  const shifted = d.getTime() + JST_OFFSET_MS;
  return new Date(shifted - (shifted % DAY_MS) - JST_OFFSET_MS);
}

/** JST の曜日（0 = 日曜） */
function jstWeekday(d: Date): number {
  return new Date(d.getTime() + JST_OFFSET_MS).getUTCDay();
}

export interface DailyAttempt {
  attemptedAt: string;
  grade: Grade;
  /** 補正後の difficulty */
  difficulty: number | null;
}

export interface DailyBar {
  date: string;
  /** その日に自力で解いた問題の色帯。易しい順（下から積む順） */
  blocks: DifficultyBand[];
}

const BAND_ORDER = new Map(DIFFICULTY_BANDS.map((b, i) => [b.band, i]));

/** 直近30日（今日を含む）に自力で解いた問題（easy / hard）。古い日から順に */
export function dailySolved(attempts: readonly DailyAttempt[], now: Date): DailyBar[] {
  const today = jstMidnight(now);
  const days: DailyBar[] = Array.from({ length: DAILY_DAYS }, (_, i) => ({
    date: jstDayKey(new Date(today.getTime() - (DAILY_DAYS - 1 - i) * DAY_MS)),
    blocks: [],
  }));
  const byDate = new Map(days.map((d) => [d.date, d]));
  for (const a of attempts) {
    if (a.grade === "failed") continue;
    byDate.get(jstDayKey(new Date(a.attemptedAt)))?.blocks.push(difficultyBand(a.difficulty));
  }
  for (const d of days) d.blocks.sort((x, y) => BAND_ORDER.get(x)! - BAND_ORDER.get(y)!);
  return days;
}

/** 濃さ5段階: 0 / 1 / 2〜3 / 4〜5 / 6以上 */
export function grassLevel(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 5) return 3;
  return 4;
}

/** 草の始まり: 今週の日曜から 52 週前の日曜（JST の 0 時） */
export function grassStart(now: Date): Date {
  const today = jstMidnight(now);
  return new Date(today.getTime() - (jstWeekday(today) + (GRASS_WEEKS - 1) * 7) * DAY_MS);
}

export interface GrassCell {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

/** 直近53週の申告の数（grade は問わない）。weeks[列][曜日]、未来の日は null */
export function grass(
  attempts: readonly { attemptedAt: string }[],
  now: Date,
): { weeks: (GrassCell | null)[][]; total: number } {
  const start = grassStart(now);
  const todayKey = jstDayKey(now);
  const counts = new Map<string, number>();
  for (const a of attempts) {
    const key = jstDayKey(new Date(a.attemptedAt));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let total = 0;
  const weeks = Array.from({ length: GRASS_WEEKS }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const date = jstDayKey(new Date(start.getTime() + (w * 7 + d) * DAY_MS));
      if (date > todayKey) return null;
      const count = counts.get(date) ?? 0;
      total += count;
      return { date, count, level: grassLevel(count) };
    }),
  );
  return { weeks, total };
}
