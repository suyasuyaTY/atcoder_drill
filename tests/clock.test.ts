import { describe, expect, it } from "vitest";
import { applyClockOffset, parseClockOffsetDays } from "../src/lib/clock";
import { DAY_MS } from "../src/lib/scheduler";

const REAL = new Date("2026-10-01T00:00:00Z");

describe("applyClockOffset", () => {
  it("日数を足す", () => {
    expect(applyClockOffset(REAL, 45)).toEqual(new Date(REAL.getTime() + 45 * DAY_MS));
    expect(applyClockOffset(REAL, -3)).toEqual(new Date(REAL.getTime() - 3 * DAY_MS));
  });

  it("0 なら同じ時刻（別のオブジェクト）", () => {
    const r = applyClockOffset(REAL, 0);
    expect(r).toEqual(REAL);
    expect(r).not.toBe(REAL);
  });
});

describe("parseClockOffsetDays", () => {
  it.each<[string | null | undefined, number]>([
    ["45", 45],
    ["-3", -3],
    ["0", 0],
    [null, 0],
    [undefined, 0],
    ["", 0],
    ["abc", 0],
    ["1.5", 0],
    ["1e3", 0],
  ])("%j → %i", (value, days) => {
    expect(parseClockOffsetDays(value)).toBe(days);
  });
});
