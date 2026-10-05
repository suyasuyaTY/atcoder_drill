import { describe, expect, it } from "vitest";
import { cardStatus } from "../src/lib/eligibility";
import { DAY_MS } from "../src/lib/scheduler";

const NOW = new Date("2026-10-01T00:00:00Z");
const at = (days: number) => new Date(NOW.getTime() + days * DAY_MS).toISOString();

describe("cardStatus（問題表のセルの状態）", () => {
  it("カードがなければ未登録", () => {
    expect(cardStatus(null, NOW)).toEqual({ state: "unregistered" });
  });

  it("現役・未解禁は待機中。あと N日（切り上げ）", () => {
    expect(cardStatus({ streak: 0, nextReviewAt: at(29.5), graduatedAt: null }, NOW)).toEqual({
      state: "waiting",
      streak: 0,
      days: 30,
    });
    expect(cardStatus({ streak: 1, nextReviewAt: at(1), graduatedAt: null }, NOW)).toEqual({
      state: "waiting",
      streak: 1,
      days: 1,
    });
  });

  it("現役・解禁済みは解禁中。解禁から N日（切り上げ）", () => {
    expect(cardStatus({ streak: 1, nextReviewAt: at(-3.2), graduatedAt: null }, NOW)).toEqual({
      state: "unlocked",
      streak: 1,
      days: 4,
    });
    // ちょうど解禁日なら解禁中（draw の isUnlocked と同じ境界）
    expect(cardStatus({ streak: 0, nextReviewAt: at(0), graduatedAt: null }, NOW)).toEqual({
      state: "unlocked",
      streak: 0,
      days: 0,
    });
  });

  it("卒業", () => {
    expect(cardStatus({ streak: 2, nextReviewAt: null, graduatedAt: at(-10) }, NOW)).toEqual({ state: "graduated" });
  });

  it("壊れた行（現役なのに解禁日がない、streak が範囲外）は例外", () => {
    expect(() => cardStatus({ streak: 0, nextReviewAt: null, graduatedAt: null }, NOW)).toThrow();
    expect(() => cardStatus({ streak: 2, nextReviewAt: at(1), graduatedAt: null }, NOW)).toThrow();
  });
});
