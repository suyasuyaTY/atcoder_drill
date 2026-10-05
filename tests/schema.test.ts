import { describe, expect, it } from "vitest";
import {
  cardIdParam,
  createSessionBody,
  debugClockBody,
  debugUnlockBody,
  gradeBody,
  homeQuery,
  loginBody,
  positionParam,
  registerBody,
  tableQuery,
} from "../src/shared/schema";

describe("loginBody", () => {
  it("トークンを受け付ける", () => {
    expect(loginBody.parse({ token: "abc" })).toEqual({ token: "abc" });
  });

  it("空・長すぎる・型違い・欠けは拒否", () => {
    expect(loginBody.safeParse({ token: "" }).success).toBe(false);
    expect(loginBody.safeParse({ token: "x".repeat(1025) }).success).toBe(false);
    expect(loginBody.safeParse({ token: 1 }).success).toBe(false);
    expect(loginBody.safeParse({}).success).toBe(false);
  });

  it("余計なキーは拒否", () => {
    expect(loginBody.safeParse({ token: "abc", admin: true }).success).toBe(false);
  });
});

describe("registerBody", () => {
  const item = { problemId: "abc306_d", grade: "easy" };

  it("最小の形と、任意の項目", () => {
    expect(registerBody.parse({ items: [item] })).toEqual({ items: [item] });
    const full = { ...item, elapsedSec: 600, note: "メモ", title: "新しい問題", contestId: "abc999" };
    expect(registerBody.parse({ items: [full] })).toEqual({ items: [full] });
  });

  it("空・多すぎる・重複は拒否", () => {
    expect(registerBody.safeParse({ items: [] }).success).toBe(false);
    const many = Array.from({ length: 101 }, (_, i) => ({ problemId: `x_${i}`, grade: "hard" }));
    expect(registerBody.safeParse({ items: many }).success).toBe(false);
    expect(registerBody.safeParse({ items: [item, { ...item, grade: "failed" }] }).success).toBe(false);
  });

  it("不正な grade・ID・時間・メモ", () => {
    const bad = (patch: object) => registerBody.safeParse({ items: [{ ...item, ...patch }] }).success;
    expect(bad({ grade: "perfect" })).toBe(false);
    expect(bad({ problemId: "abc 306" })).toBe(false);
    expect(bad({ problemId: "../x" })).toBe(false);
    expect(bad({ elapsedSec: -1 })).toBe(false);
    expect(bad({ elapsedSec: 1.5 })).toBe(false);
    expect(bad({ note: "x".repeat(1001) })).toBe(false);
    expect(bad({ extra: 1 })).toBe(false);
  });

  it("手入力のタイトルは、コンテストと組で渡す", () => {
    const bad = (patch: object) => registerBody.safeParse({ items: [{ ...item, ...patch }] }).success;
    expect(bad({ title: "新しい問題" })).toBe(false);
    expect(bad({ contestId: "abc999" })).toBe(false);
    expect(bad({ title: "   ", contestId: "abc999" })).toBe(false);
  });
});

describe("tableQuery", () => {
  it("既定は ABC の1ページ目", () => {
    expect(tableQuery.parse({})).toEqual({ kind: "ABC", page: 1 });
    expect(tableQuery.parse({ kind: "OTHER", page: "3" })).toEqual({ kind: "OTHER", page: 3 });
  });

  it("ALL や不正なページは拒否", () => {
    expect(tableQuery.safeParse({ kind: "ALL" }).success).toBe(false);
    expect(tableQuery.safeParse({ page: "0" }).success).toBe(false);
    expect(tableQuery.safeParse({ page: "1.5" }).success).toBe(false);
  });
});

describe("cardIdParam", () => {
  it("正の整数だけ", () => {
    expect(cardIdParam.parse({ cardId: "12" })).toEqual({ cardId: 12 });
    expect(cardIdParam.safeParse({ cardId: "0" }).success).toBe(false);
    expect(cardIdParam.safeParse({ cardId: "abc" }).success).toBe(false);
  });
});

describe("homeQuery / createSessionBody", () => {
  it("種類は ALL を含む。ホームの既定は ALL", () => {
    expect(homeQuery.parse({})).toEqual({ kind: "ALL" });
    expect(homeQuery.parse({ kind: "ARC" })).toEqual({ kind: "ARC" });
    expect(homeQuery.safeParse({ kind: "abc" }).success).toBe(false);
    expect(createSessionBody.parse({ kind: "ALL" })).toEqual({ kind: "ALL" });
    expect(createSessionBody.safeParse({}).success).toBe(false);
  });
});

describe("gradeBody / positionParam", () => {
  it("申告", () => {
    expect(gradeBody.parse({ grade: "hard" })).toEqual({ grade: "hard" });
    expect(gradeBody.parse({ grade: "easy", elapsedSec: 300, note: "x" })).toEqual({ grade: "easy", elapsedSec: 300, note: "x" });
    expect(gradeBody.safeParse({ grade: "ok" }).success).toBe(false);
    expect(gradeBody.safeParse({ grade: "easy", streak: 1 }).success).toBe(false);
  });

  it("位置は 1〜3", () => {
    expect(positionParam.parse({ position: "1" })).toEqual({ position: 1 });
    expect(positionParam.parse({ position: "3" })).toEqual({ position: 3 });
    expect(positionParam.safeParse({ position: "0" }).success).toBe(false);
    expect(positionParam.safeParse({ position: "4" }).success).toBe(false);
  });
});

describe("デバッグツール", () => {
  it("時計は ±3650日の整数（0 は意味がないので拒否）", () => {
    expect(debugClockBody.parse({ addDays: -7 })).toEqual({ addDays: -7 });
    expect(debugClockBody.safeParse({ addDays: 0 }).success).toBe(false);
    expect(debugClockBody.safeParse({ addDays: 1.5 }).success).toBe(false);
    expect(debugClockBody.safeParse({ addDays: 3651 }).success).toBe(false);
  });

  it("解禁するカードは ID か問題 ID", () => {
    expect(debugUnlockBody.parse({ target: " abc306_d " })).toEqual({ target: "abc306_d" });
    expect(debugUnlockBody.safeParse({ target: "" }).success).toBe(false);
  });
});
