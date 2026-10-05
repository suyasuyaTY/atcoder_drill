import { describe, expect, it } from "vitest";
import { parseProblemInput } from "../src/lib/problem-id";

describe("parseProblemInput", () => {
  it.each([
    "https://atcoder.jp/contests/abc306",
    "https://atcoder.jp/contests/abc306/",
    "https://atcoder.jp/contests/abc306/tasks",
    "https://atcoder.jp/contests/abc306/submissions/me",
    "https://atcoder.jp/contests/abc306?lang=ja",
    "http://atcoder.jp/contests/abc306",
    "  https://atcoder.jp/contests/abc306  ",
    "atcoder.jp/contests/abc306",
    "ABC306",
    "abc306",
  ])("コンテスト: %s", (input) => {
    expect(parseProblemInput(input)).toEqual({ type: "contest", contestId: "abc306" });
  });

  it.each([
    "https://atcoder.jp/contests/abc306/tasks/abc306_d",
    "https://atcoder.jp/contests/abc306/tasks/abc306_d?lang=en",
    "https://atcoder.jp/contests/abc306/tasks/abc306_d#editorial",
  ])("問題（URL）: %s", (input) => {
    expect(parseProblemInput(input)).toEqual({
      type: "problem",
      contestId: "abc306",
      problemId: "abc306_d",
    });
  });

  it("URL のコンテストと問題 ID の接頭辞が違ってもよい（ARC と同時開催の ABC など）", () => {
    expect(parseProblemInput("https://atcoder.jp/contests/abc042/tasks/arc058_a")).toEqual({
      type: "problem",
      contestId: "abc042",
      problemId: "arc058_a",
    });
  });

  it("短縮形の問題 ID は、コンテストを決めずに返す（問題表から引く）", () => {
    expect(parseProblemInput("abc306_d")).toEqual({ type: "problem", contestId: null, problemId: "abc306_d" });
    expect(parseProblemInput("ABC306_D")).toEqual({ type: "problem", contestId: null, problemId: "abc306_d" });
    expect(parseProblemInput("typical90_a")).toEqual({
      type: "problem",
      contestId: null,
      problemId: "typical90_a",
    });
  });

  it("URL の ID は大文字小文字をそのまま残す（APG4b など大文字を含むコンテストがある）", () => {
    expect(parseProblemInput("https://atcoder.jp/contests/APG4b")).toEqual({ type: "contest", contestId: "APG4b" });
    expect(parseProblemInput("https://atcoder.jp/contests/DEGwer2023/tasks/1202Contest_a")).toEqual({
      type: "problem",
      contestId: "DEGwer2023",
      problemId: "1202Contest_a",
    });
  });

  it("ハイフンを含むコンテスト", () => {
    expect(parseProblemInput("https://atcoder.jp/contests/jsc2019-qual/tasks/jsc2019_qual_a")).toEqual({
      type: "problem",
      contestId: "jsc2019-qual",
      problemId: "jsc2019_qual_a",
    });
  });

  it.each([
    "",
    "   ",
    "https://example.com/contests/abc306",
    "https://atcoder.jp/",
    "https://atcoder.jp/contests/",
    "https://atcoder.jp/users/someone",
    "https://atcoder.jp/contests/abc306/tasks/",
    "abc 306",
    "abc306;drop",
    "https://atcoder.jp.evil.example/contests/abc306",
  ])("解釈できない: %j", (input) => {
    expect(parseProblemInput(input)).toBeNull();
  });
});
