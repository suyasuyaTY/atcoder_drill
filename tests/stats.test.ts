import { describe, expect, it } from "vitest";
import { GRASS_WEEKS, dailySolved, grass, grassLevel, grassStart, jstDayKey } from "../src/lib/stats";

/** JST の日時（"2026-10-01 09:00"）→ Date */
const jst = (s: string) => new Date(`${s.replace(" ", "T")}:00+09:00`);

describe("jstDayKey", () => {
  it("JST の日付で区切る", () => {
    expect(jstDayKey(new Date("2026-09-30T14:59:59Z"))).toBe("2026-09-30");
    expect(jstDayKey(new Date("2026-09-30T15:00:00Z"))).toBe("2026-10-01");
  });
});

describe("dailySolved（直近30日に自力で解いた問題）", () => {
  const now = jst("2026-10-01 12:00");

  it("今日を含む30日を古い順に並べる", () => {
    const days = dailySolved([], now);
    expect(days).toHaveLength(30);
    expect(days[0]!.date).toBe("2026-09-02");
    expect(days[29]!.date).toBe("2026-10-01");
    expect(days.every((d) => d.blocks.length === 0)).toBe(true);
  });

  it("easy / hard だけを数え、色帯の易しい順に積む", () => {
    const days = dailySolved(
      [
        { attemptedAt: jst("2026-10-01 08:00").toISOString(), grade: "easy", difficulty: 2100 },
        { attemptedAt: jst("2026-10-01 09:00").toISOString(), grade: "hard", difficulty: 300 },
        { attemptedAt: jst("2026-10-01 10:00").toISOString(), grade: "failed", difficulty: 900 },
        { attemptedAt: jst("2026-10-01 11:00").toISOString(), grade: "hard", difficulty: null },
        { attemptedAt: jst("2026-10-01 11:30").toISOString(), grade: "easy", difficulty: 1300 },
        { attemptedAt: jst("2026-09-30 23:59").toISOString(), grade: "easy", difficulty: 900 },
      ],
      now,
    );
    expect(days[29]!.blocks).toEqual(["gray", "gray", "cyan", "yellow"]);
    expect(days[28]!.blocks).toEqual(["green"]);
  });

  it("30日より前と、未来の申告は数えない", () => {
    const days = dailySolved(
      [
        { attemptedAt: jst("2026-09-01 23:00").toISOString(), grade: "easy", difficulty: 900 },
        { attemptedAt: jst("2026-10-02 00:30").toISOString(), grade: "easy", difficulty: 900 },
      ],
      now,
    );
    expect(days.flatMap((d) => d.blocks)).toEqual([]);
  });
});

describe("grassLevel（濃さ5段階）", () => {
  it.each([
    [0, 0],
    [1, 1],
    [2, 2],
    [3, 2],
    [4, 3],
    [5, 3],
    [6, 4],
    [40, 4],
  ])("%i 回 → %i", (count, level) => {
    expect(grassLevel(count)).toBe(level);
  });
});

describe("grass（取り組みの記録）", () => {
  // 2026-10-01 は木曜
  const now = jst("2026-10-01 12:00");

  it("開始は 52 週前の日曜", () => {
    expect(jstDayKey(grassStart(now))).toBe("2025-09-28");
    expect(grassStart(now).getTime()).toBe(jst("2025-09-28 00:00").getTime());
  });

  it("53 週 × 7 日。列は日曜始まり、未来の日は null", () => {
    const g = grass([], now);
    expect(g.weeks).toHaveLength(GRASS_WEEKS);
    expect(g.weeks.every((w) => w.length === 7)).toBe(true);
    expect(g.weeks[0]![0]!.date).toBe("2025-09-28");
    const last = g.weeks[52]!;
    expect(last[0]!.date).toBe("2026-09-27"); // 日曜
    expect(last[4]!.date).toBe("2026-10-01"); // 木曜 = 今日
    expect(last[5]).toBeNull();
    expect(last[6]).toBeNull();
  });

  it("申告の数を日ごとに数える（grade は問わない）。合計も出す", () => {
    const g = grass(
      [
        { attemptedAt: jst("2026-10-01 08:00").toISOString() },
        { attemptedAt: jst("2026-10-01 23:00").toISOString() },
        { attemptedAt: jst("2026-09-27 00:00").toISOString() },
        { attemptedAt: jst("2025-09-27 23:59").toISOString() }, // 範囲より前
      ],
      now,
    );
    expect(g.weeks[52]![4]).toEqual({ date: "2026-10-01", count: 2, level: 2 });
    expect(g.weeks[52]![0]).toEqual({ date: "2026-09-27", count: 1, level: 1 });
    expect(g.total).toBe(3);
  });
});
