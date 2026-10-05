import { describe, expect, it } from "vitest";
import {
  DAY_MS,
  apply,
  draw,
  drawWeight,
  isUnlocked,
  pickDistinct,
  planSlots,
  register,
  type DrawableCard,
  type Grade,
  type Rng,
} from "../src/lib/scheduler";

const NOW = new Date("2026-10-01T00:00:00Z");
const daysFrom = (base: Date, days: number) => new Date(base.getTime() + days * DAY_MS);

/** 固定シードの乱数（mulberry32） */
function seeded(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface TestCard extends DrawableCard {
  id: string;
}
const card = (id: string, nextReviewAt: Date | null, graduatedAt: Date | null = null): TestCard => ({
  id,
  nextReviewAt,
  graduatedAt,
});

describe("apply", () => {
  it.each<[number, Grade, number, number | null]>([
    // streak_before, grade, streak_after, 解禁までの日数（null = 卒業）
    [0, "easy", 1, 90],
    [1, "easy", 2, null],
    [0, "hard", 0, 30],
    [1, "hard", 1, 90],
    [0, "failed", 0, 30],
    [1, "failed", 0, 30],
  ])("streak %i + %s → streak %i", (before, grade, after, days) => {
    const r = apply(before, grade, NOW);
    expect(r.streak).toBe(after);
    if (days === null) {
      expect(r.graduated).toBe(true);
      expect(r.nextReviewAt).toBeNull();
    } else {
      expect(r.graduated).toBe(false);
      expect(r.nextReviewAt).toEqual(daysFrom(NOW, days));
    }
  });

  it("卒業済み・範囲外の streak は例外", () => {
    expect(() => apply(2, "easy", NOW)).toThrow(RangeError);
    expect(() => apply(-1, "easy", NOW)).toThrow(RangeError);
    expect(() => apply(0.5, "easy", NOW)).toThrow(RangeError);
  });

  it("不正な grade・不正な Date は例外", () => {
    expect(() => apply(0, "wa" as Grade, NOW)).toThrow(TypeError);
    expect(() => apply(0, "easy", new Date("invalid"))).toThrow(RangeError);
  });

  it("now を変更しない", () => {
    const now = new Date(NOW);
    apply(0, "easy", now);
    expect(now).toEqual(NOW);
  });

  it("シナリオ: easy → hard → failed → easy → easy で卒業", () => {
    let t = NOW;
    let s = 0;
    const log: number[] = [];
    for (const g of ["easy", "hard", "failed", "easy"] as Grade[]) {
      const r = apply(s, g, t);
      if (r.graduated) throw new Error("早すぎる卒業");
      s = r.streak;
      t = r.nextReviewAt;
      log.push(s);
    }
    expect(log).toEqual([1, 1, 0, 1]);
    expect(apply(s, "easy", t).graduated).toBe(true);
  });

  it("hard を何度続けても卒業しない", () => {
    let s = 1;
    for (let i = 0; i < 10; i++) {
      const r = apply(s, "hard", NOW);
      expect(r.graduated).toBe(false);
      s = r.streak;
    }
    expect(s).toBe(1);
  });
});

describe("register", () => {
  it.each<[Grade, number, number]>([
    ["easy", 1, 90],
    ["hard", 0, 30],
    ["failed", 0, 30],
  ])("初回 %s → streak %i、%i日後に解禁", (grade, streak, days) => {
    const r = register(grade, NOW);
    expect(r.streak).toBe(streak);
    expect(r.graduated).toBe(false);
    expect(r.nextReviewAt).toEqual(daysFrom(NOW, days));
  });

  it("初回 easy → 次の easy で卒業（最短2回）", () => {
    const first = register("easy", NOW);
    expect(apply(first.streak, "easy", first.nextReviewAt).graduated).toBe(true);
  });
});

describe("isUnlocked / drawWeight", () => {
  it("解禁日ちょうどは解禁済み、1ms 前は未解禁", () => {
    expect(isUnlocked(card("a", NOW), NOW)).toBe(true);
    expect(isUnlocked(card("a", new Date(NOW.getTime() + 1)), NOW)).toBe(false);
  });

  it("卒業済みは解禁日が過去でも対象外", () => {
    expect(isUnlocked(card("a", daysFrom(NOW, -100), NOW), NOW)).toBe(false);
    expect(isUnlocked(card("a", null, NOW), NOW)).toBe(false);
  });

  it("重みは 1 + 経過日数/30", () => {
    expect(drawWeight(NOW, NOW)).toBe(1);
    expect(drawWeight(daysFrom(NOW, -30), NOW)).toBe(2);
    expect(drawWeight(daysFrom(NOW, -90), NOW)).toBe(4);
    // 未来の解禁日でも 1 を下回らない（防御的）
    expect(drawWeight(daysFrom(NOW, 10), NOW)).toBe(1);
  });
});

describe("draw", () => {
  const cards = [
    card("unlocked-old", daysFrom(NOW, -90)),
    card("unlocked-new", NOW),
    card("unlocked-mid", daysFrom(NOW, -10)),
    card("locked", daysFrom(NOW, 1)),
    card("graduated", daysFrom(NOW, -200), daysFrom(NOW, -5)),
  ];

  it("解禁済み・現役だけを重複なく引く", () => {
    for (let seed = 0; seed < 50; seed++) {
      const got = draw(cards, NOW, 3, seeded(seed)).map((c) => c.id);
      expect(new Set(got).size).toBe(3);
      expect(got).not.toContain("locked");
      expect(got).not.toContain("graduated");
    }
  });

  it("プールが足りなければあるだけ返す", () => {
    expect(draw(cards, NOW, 10, seeded(1))).toHaveLength(3);
    expect(draw([], NOW, 3, seeded(1))).toEqual([]);
    expect(draw(cards, NOW, 0, seeded(1))).toEqual([]);
  });

  it("不正な count は例外", () => {
    expect(() => draw(cards, NOW, -1)).toThrow(RangeError);
    expect(() => draw(cards, NOW, 1.5)).toThrow(RangeError);
  });

  it("rng の値に応じて累積重みで選ぶ", () => {
    // 重み: old=4, new=1, mid=1.333... 合計 6.333...
    expect(draw(cards, NOW, 1, () => 0)[0]!.id).toBe("unlocked-old");
    expect(draw(cards, NOW, 1, () => 0.7)[0]!.id).toBe("unlocked-new");
    expect(draw(cards, NOW, 1, () => 0.9999)[0]!.id).toBe("unlocked-mid");
  });

  it("古い問題ほど重みに比例して引かれやすい", () => {
    // 重み 4 対 1 → old が引かれる確率は 0.8
    const pair = [card("old", daysFrom(NOW, -90)), card("new", NOW)];
    const rng = seeded(42);
    const N = 20000;
    let old = 0;
    for (let i = 0; i < N; i++) {
      if (draw(pair, NOW, 1, rng)[0]!.id === "old") old++;
    }
    expect(old / N).toBeGreaterThan(0.78);
    expect(old / N).toBeLessThan(0.82);
  });

  it("入力配列を変更しない", () => {
    const copy = [...cards];
    draw(cards, NOW, 3, seeded(7));
    expect(cards).toEqual(copy);
  });
});

describe("planSlots", () => {
  it.each<[number, number, number, number]>([
    // 復習の候補, 初見の候補, 復習, 初見（初見の枠 = 既定の 2）
    [0, 500, 0, 3],
    [1, 500, 1, 2],
    [10, 500, 1, 2],
    [10, 1, 2, 1],
    [10, 0, 3, 0],
    [0, 1, 0, 1],
    [0, 0, 0, 0],
  ])("復習 %i・初見 %i → 復習 %i + 初見 %i", (r, f, er, ef) => {
    expect(planSlots(r, f, 3)).toEqual({ review: er, fresh: ef });
  });

  it.each<[number, number, number]>([
    // 初見の枠, 復習, 初見（復習 10・初見 500）
    [0, 3, 0],
    [1, 2, 1],
    [3, 0, 3],
  ])("初見の枠 %i → 復習 %i + 初見 %i", (q, er, ef) => {
    expect(planSlots(10, 500, 3, q)).toEqual({ review: er, fresh: ef });
  });

  it("初見の枠を 0 にしても、復習がなければ初見で埋める", () => {
    expect(planSlots(1, 500, 3, 0)).toEqual({ review: 1, fresh: 2 });
  });

  it("不正な値は例外", () => {
    expect(() => planSlots(-1, 0, 3)).toThrow(RangeError);
    expect(() => planSlots(0, 1.5, 3)).toThrow(RangeError);
    expect(() => planSlots(0, 0, 3, 4)).toThrow(RangeError);
  });
});

describe("pickDistinct（初見の OFFSET）", () => {
  it("0 以上 n 未満から、重複なく k 個", () => {
    for (let seed = 1; seed <= 50; seed++) {
      const r = pickDistinct(10, 3, seeded(seed));
      expect(r).toHaveLength(3);
      expect(new Set(r).size).toBe(3);
      for (const x of r) {
        expect(Number.isInteger(x)).toBe(true);
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThan(10);
      }
    }
  });

  it("k が n 以上なら全部（順は乱数で決まる）", () => {
    expect(pickDistinct(3, 5, seeded(7)).sort()).toEqual([0, 1, 2]);
    expect(pickDistinct(0, 2, seeded(7))).toEqual([]);
  });

  it("大きな n でも偏らない（各値が出る回数がおおむね同じ）", () => {
    const rng = seeded(42);
    const counts = new Array<number>(5).fill(0);
    for (let i = 0; i < 5000; i++) for (const x of pickDistinct(5, 2, rng)) counts[x]!++;
    for (const c of counts) expect(c).toBeGreaterThan(1800); // 期待値 2000
  });

  it("不正な引数は例外", () => {
    expect(() => pickDistinct(-1, 1, seeded(1))).toThrow();
    expect(() => pickDistinct(3, 1.5, seeded(1))).toThrow();
  });
});
