import { describe, expect, it } from "vitest";
import {
  CONTEST_KINDS,
  KIND_LABELS,
  SESSION_KINDS,
  contestKind,
  isContestKind,
  isSessionKind,
  normalizeIndex,
} from "../src/lib/contest";

describe("contestKind", () => {
  it.each([
    ["abc306", "ABC"],
    ["abc001", "ABC"],
    ["arc160", "ARC"],
    ["agc063", "AGC"],
    ["typical90", "OTHER"],
    ["dp", "OTHER"],
    ["abc306-beta", "OTHER"],
    ["abs", "OTHER"],
    ["abc", "OTHER"],
    ["ABC306", "OTHER"], // id は小文字で保存されている前提。大文字は正規化してから渡す
    ["jsc2019-qual", "OTHER"],
  ] as const)("%s → %s", (id, kind) => {
    expect(contestKind(id)).toBe(kind);
  });
});

describe("種類の一覧", () => {
  it("並び順は ABC / ARC / AGC / OTHER", () => {
    expect(CONTEST_KINDS).toEqual(["ABC", "ARC", "AGC", "OTHER"]);
  });

  it("セッションの種類は一覧に ALL を足したもの", () => {
    expect(SESSION_KINDS).toEqual([...CONTEST_KINDS, "ALL"]);
  });

  it("すべての種類に表示名がある", () => {
    for (const kind of SESSION_KINDS) expect(KIND_LABELS[kind]).toBeTruthy();
    expect(KIND_LABELS.OTHER).toBe("その他");
    expect(KIND_LABELS.ALL).toBe("すべて");
  });

  it("型の判定", () => {
    expect(isContestKind("ABC")).toBe(true);
    expect(isContestKind("ALL")).toBe(false);
    expect(isContestKind("abc")).toBe(false);
    expect(isSessionKind("ALL")).toBe(true);
    expect(isSessionKind(undefined)).toBe(false);
  });
});

describe("normalizeIndex", () => {
  it.each([
    ["A", "A"],
    ["D", "D"],
    ["Ex", "H"],
    ["F2", "F"],
    ["G", "G"],
    ["H", "H"],
    ["1", "1"], // 英大文字がなければ元の値のまま
  ])("%s → %s", (index, norm) => {
    expect(normalizeIndex(index)).toBe(norm);
  });
});
