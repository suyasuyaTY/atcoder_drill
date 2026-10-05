import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import { SESSION_KINDS, type ContestKind } from "../src/lib/contest";
import {
  DEFAULT_PROFILE,
  buildFreshQuery,
  cardStatus,
  isFreshTarget,
  type FreshProblem,
  type FreshProfile,
} from "../src/lib/eligibility";
import { DAY_MS } from "../src/lib/scheduler";

const NOW = new Date("2026-10-01T00:00:00Z");
const at = (days: number) => new Date(NOW.getTime() + days * DAY_MS).toISOString();

const problem = (id: string, contestId: string, kind: ContestKind, indexNorm: string, difficulty: number | null): FreshProblem => ({
  id,
  contestId,
  kind,
  indexNorm,
  difficulty,
});
const profile = (patch: Partial<FreshProfile> = {}): FreshProfile => ({ ...DEFAULT_PROFILE, ...patch });

describe("isFreshTarget", () => {
  const abcF = problem("abc306_f", "abc306", "ABC", "F", 1557);

  it("既定のプロフィールは ABC の F・G", () => {
    expect(DEFAULT_PROFILE.targets).toEqual({ ABC: ["F", "G"], ARC: [], AGC: [], OTHER: [] });
    expect(DEFAULT_PROFILE.freshQuota).toBe(2);
    expect(isFreshTarget(abcF, DEFAULT_PROFILE, { hasCard: false })).toBe(true);
    expect(isFreshTarget(problem("abc306_e", "abc306", "ABC", "E", 1268), DEFAULT_PROFILE, { hasCard: false })).toBe(false);
  });

  it("カードがある問題は常に偽（登録した問題は復習に出る。初見ではない）", () => {
    expect(isFreshTarget(abcF, DEFAULT_PROFILE, { hasCard: true })).toBe(false);
  });

  it("ARC / AGC は問題記号、その他はコンテスト単位", () => {
    const p = profile({ targets: { ABC: [], ARC: ["C"], AGC: [], OTHER: ["typical90"] } });
    expect(isFreshTarget(problem("arc058_a", "arc058", "ARC", "C", 1174), p, { hasCard: false })).toBe(true);
    expect(isFreshTarget(problem("arc058_b", "arc058", "ARC", "D", 1500), p, { hasCard: false })).toBe(false);
    expect(isFreshTarget(problem("typical90_a", "typical90", "OTHER", "A", 900), p, { hasCard: false })).toBe(true);
    expect(isFreshTarget(problem("dp_a", "dp", "OTHER", "A", 100), p, { hasCard: false })).toBe(false);
    expect(isFreshTarget(abcF, p, { hasCard: false })).toBe(false);
  });

  it("difficulty は下限以上・上限未満。NULL は範囲に関係なく含める", () => {
    const p = profile({ minDifficulty: 1200, maxDifficulty: 2000 });
    const f = (d: number | null) => isFreshTarget(problem("abc1_f", "abc1", "ABC", "F", d), p, { hasCard: false });
    expect(f(1199)).toBe(false);
    expect(f(1200)).toBe(true);
    expect(f(1999)).toBe(true);
    expect(f(2000)).toBe(false);
    expect(f(null)).toBe(true);
    expect(isFreshTarget(problem("abc1_f", "abc1", "ABC", "F", 50), profile({ maxDifficulty: 400 }), { hasCard: false })).toBe(true);
  });
});

describe("buildFreshQuery（isFreshTarget と同じ結果になる）", () => {
  const migration = readFileSync(new URL("../migrations/0001_init.sql", import.meta.url), "utf8");
  const db = new DatabaseSync(":memory:");
  db.exec(migration);

  const problems: FreshProblem[] = [
    problem("abc306_e", "abc306", "ABC", "E", 1268),
    problem("abc306_f", "abc306", "ABC", "F", 1557),
    problem("abc306_g", "abc306", "ABC", "G", 2563),
    problem("abc306_h", "abc306", "ABC", "H", 3335),
    problem("abc306_a", "abc306", "ABC", "A", null),
    problem("abc305_f", "abc305", "ABC", "F", 1800),
    problem("arc058_a", "arc058", "ARC", "C", 1174),
    problem("arc058_b", "arc058", "ARC", "D", 1400),
    problem("agc028_f", "agc028", "AGC", "F", 3600),
    problem("agc028_f2", "agc028", "AGC", "F", null),
    problem("typical90_a", "typical90", "OTHER", "A", 900),
    problem("typical90_b", "typical90", "OTHER", "B", 1700),
    problem("dp_a", "dp", "OTHER", "A", 100),
    problem("APG4b_a", "APG4b", "OTHER", "A", null),
  ];
  const insert = db.prepare(
    `INSERT INTO problems (id, contest_id, problem_index, index_norm, kind, title, difficulty, difficulty_disp, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, '2026-01-01T00:00:00Z')`,
  );
  for (const p of problems) insert.run(p.id, p.contestId, p.indexNorm, p.indexNorm, p.kind, p.id, p.difficulty, p.difficulty);
  // abc306_f にはカードがある
  db.exec(
    `INSERT INTO cards (problem_id, contest_id, problem_index, kind, title, streak, next_review_at, first_grade, origin, created_at)
     VALUES ('abc306_f', 'abc306', 'F', 'ABC', 'x', 0, '2026-11-01T00:00:00Z', 'hard', 'register', '2026-10-01T00:00:00Z')`,
  );
  const carded = new Set(["abc306_f"]);

  const profiles: FreshProfile[] = [
    DEFAULT_PROFILE,
    profile({ targets: { ABC: [], ARC: [], AGC: [], OTHER: [] } }),
    profile({ targets: { ABC: ["E", "F", "G", "H"], ARC: ["C", "D"], AGC: ["F"], OTHER: ["typical90", "APG4b"] } }),
    profile({ targets: { ABC: ["A", "F"], ARC: ["C"], AGC: [], OTHER: ["dp"] }, minDifficulty: 1000 }),
    profile({ targets: { ABC: ["E", "F", "G", "H"], ARC: ["C", "D"], AGC: ["F"], OTHER: ["typical90"] }, minDifficulty: 1200, maxDifficulty: 2600 }),
    profile({ targets: { ABC: ["G"], ARC: [], AGC: ["F"], OTHER: [] }, maxDifficulty: 3000 }),
  ];

  for (const [i, prof] of profiles.entries()) {
    for (const kind of SESSION_KINDS) {
      it(`プロフィール ${i} ・ ${kind}`, () => {
        const q = buildFreshQuery(prof, kind);
        const rows = db
          .prepare(`SELECT p.id FROM problems p WHERE ${q.where} ORDER BY p.id`)
          .all(...(q.binds as (string | number | null)[])) as { id: string }[];
        const expected = problems
          .filter((p) => kind === "ALL" || p.kind === kind)
          .filter((p) => isFreshTarget(p, prof, { hasCard: carded.has(p.id) }))
          .map((p) => p.id)
          .sort();
        expect(rows.map((r) => r.id)).toEqual(expected);
      });
    }
  }

  it("値は bind で渡す（WHERE 句に利用者の値を埋め込まない）", () => {
    const q = buildFreshQuery(profile({ targets: { ABC: ["F"], ARC: [], AGC: [], OTHER: ["'; DROP TABLE problems; --"] } }), "ALL");
    expect(q.where).not.toContain("DROP");
    expect(() => db.prepare(`SELECT count(*) FROM problems p WHERE ${q.where}`).get(...(q.binds as string[]))).not.toThrow();
  });
});

describe("cardStatus（問題表のセルの状態）", () => {
  const p = problem("abc306_f", "abc306", "ABC", "F", 1557);

  it("カードがなければ、初見に出るか出ないか", () => {
    expect(cardStatus(p, null, DEFAULT_PROFILE, NOW)).toEqual({ state: "fresh" });
    expect(cardStatus({ ...p, indexNorm: "E" }, null, DEFAULT_PROFILE, NOW)).toEqual({ state: "off" });
  });

  it("現役・未解禁は待機中。あと N日（切り上げ）", () => {
    expect(cardStatus(p, { streak: 0, nextReviewAt: at(29.5), graduatedAt: null }, DEFAULT_PROFILE, NOW)).toEqual({
      state: "waiting",
      streak: 0,
      days: 30,
    });
    expect(cardStatus(p, { streak: 1, nextReviewAt: at(1), graduatedAt: null }, DEFAULT_PROFILE, NOW)).toEqual({
      state: "waiting",
      streak: 1,
      days: 1,
    });
  });

  it("現役・解禁済みは解禁中。解禁から N日（切り上げ）", () => {
    expect(cardStatus(p, { streak: 1, nextReviewAt: at(-3.2), graduatedAt: null }, DEFAULT_PROFILE, NOW)).toEqual({
      state: "unlocked",
      streak: 1,
      days: 4,
    });
    // ちょうど解禁日なら解禁中（draw の isUnlocked と同じ境界）
    expect(cardStatus(p, { streak: 0, nextReviewAt: at(0), graduatedAt: null }, DEFAULT_PROFILE, NOW)).toEqual({
      state: "unlocked",
      streak: 0,
      days: 0,
    });
  });

  it("卒業。カードがある問題はプロフィールに関係ない", () => {
    const none = profile({ targets: { ABC: [], ARC: [], AGC: [], OTHER: [] } });
    expect(cardStatus(p, { streak: 2, nextReviewAt: null, graduatedAt: at(-10) }, none, NOW)).toEqual({ state: "graduated" });
    expect(cardStatus(p, { streak: 0, nextReviewAt: at(3), graduatedAt: null }, none, NOW).state).toBe("waiting");
  });

  it("壊れた行（現役なのに解禁日がない、streak が範囲外）は例外", () => {
    expect(() => cardStatus(p, { streak: 0, nextReviewAt: null, graduatedAt: null }, DEFAULT_PROFILE, NOW)).toThrow();
    expect(() => cardStatus(p, { streak: 2, nextReviewAt: at(1), graduatedAt: null }, DEFAULT_PROFILE, NOW)).toThrow();
  });
});
