import { describe, expect, it } from "vitest";
import { DIFFICULTY_BANDS, difficultyBand, displayDifficulty } from "../src/lib/difficulty";

describe("displayDifficulty", () => {
  it("400 以上はそのまま（整数に丸める）", () => {
    expect(displayDifficulty(400)).toBe(400);
    expect(displayDifficulty(1234.4)).toBe(1234);
    expect(displayDifficulty(1234.5)).toBe(1235);
    expect(displayDifficulty(3500)).toBe(3500);
  });

  it("400 未満は 400 / exp((400 - d) / 400) で補正する", () => {
    expect(displayDifficulty(0)).toBe(Math.round(400 / Math.E)); // 147
    expect(displayDifficulty(-400)).toBe(Math.round(400 / Math.E ** 2)); // 54
    expect(displayDifficulty(399)).toBe(399);
  });

  it("補正後はいつも正の値", () => {
    expect(displayDifficulty(-3000)).toBeGreaterThanOrEqual(0);
  });

  it("NULL は NULL", () => {
    expect(displayDifficulty(null)).toBeNull();
  });
});

describe("difficultyBand", () => {
  it.each<[number | null, string]>([
    [null, "gray"],
    [0, "gray"],
    [399, "gray"],
    [400, "brown"],
    [799, "brown"],
    [800, "green"],
    [1200, "cyan"],
    [1600, "blue"],
    [2000, "yellow"],
    [2400, "orange"],
    [2800, "red"],
    [4000, "red"],
  ])("%s → %s", (d, band) => {
    expect(difficultyBand(d)).toBe(band);
  });

  it("色帯は易しい順に並ぶ", () => {
    const mins = DIFFICULTY_BANDS.map((b) => b.min);
    expect(mins).toEqual([...mins].sort((a, b) => a - b));
    expect(DIFFICULTY_BANDS[0]?.band).toBe("gray");
  });
});
