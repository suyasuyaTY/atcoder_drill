/**
 * 復習スケジューラ。DB も HTTP も触らない純粋関数だけを置く。
 * 乱数は引数で注入する（テストでは固定シードを渡す）。
 */

export type Grade = "easy" | "hard" | "failed";
export const GRADES: readonly Grade[] = ["easy", "hard", "failed"];

/** 現役カードが取りうる streak。2 に達した時点で卒業するので現役は 0 か 1 */
export type ActiveStreak = 0 | 1;

export const DAY_MS = 24 * 60 * 60 * 1000;

/** 申告後の streak → 次の解禁までの日数。「1ヶ月」「3ヶ月」は固定日数で扱う */
export const INTERVAL_DAYS: Readonly<Record<ActiveStreak, number>> = {
  0: 30,
  1: 90,
};

export const GRADUATION_STREAK = 2;

/** 抽選の重み: 1 + 経過日数 / WEIGHT_SCALE_DAYS */
export const WEIGHT_SCALE_DAYS = 30;

export type ApplyResult =
  | { streak: ActiveStreak; nextReviewAt: Date; graduated: false }
  | { streak: typeof GRADUATION_STREAK; nextReviewAt: null; graduated: true };

export function isGrade(value: unknown): value is Grade {
  return typeof value === "string" && (GRADES as readonly string[]).includes(value);
}

export function isActiveStreak(value: unknown): value is ActiveStreak {
  return value === 0 || value === 1;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

/**
 * 申告を反映した次の状態を返す。
 * - easy   → streak + 1
 * - hard   → 据え置き
 * - failed → 0
 * 結果が 2 なら卒業。卒業済みカード（streak 2）を渡すのは呼び出し側のバグなので例外。
 */
export function apply(streak: number, grade: Grade, now: Date): ApplyResult {
  if (!isActiveStreak(streak)) {
    throw new RangeError(`apply: 現役カードの streak は 0 か 1（受け取った値: ${streak}）`);
  }
  if (!isGrade(grade)) {
    throw new TypeError(`apply: 不正な grade: ${String(grade)}`);
  }
  if (Number.isNaN(now.getTime())) {
    throw new RangeError("apply: now が不正な Date");
  }

  const next = grade === "easy" ? streak + 1 : grade === "hard" ? streak : 0;

  if (next >= GRADUATION_STREAK) {
    return { streak: GRADUATION_STREAK, nextReviewAt: null, graduated: true };
  }
  const nextStreak = next as ActiveStreak;
  return {
    streak: nextStreak,
    nextReviewAt: addDays(now, INTERVAL_DAYS[nextStreak]),
    graduated: false,
  };
}

/**
 * 初回登録。登録時の申告も1回分として数える（streak 0 に apply するのと同じ）。
 * - easy   → streak 1、90日後に解禁（次の easy で卒業）
 * - hard   → streak 0、30日後に解禁
 * - failed → streak 0、30日後に解禁
 * streak 0 からの apply なので、登録だけで卒業することはない。
 */
export function register(
  firstGrade: Grade,
  now: Date,
): Extract<ApplyResult, { graduated: false }> {
  const r = apply(0, firstGrade, now);
  if (r.graduated) throw new Error("unreachable: 登録で卒業はしない");
  return r;
}

/** draw が見るフィールドだけを要求する。実際の Card 型をそのまま渡せる */
export interface DrawableCard {
  nextReviewAt: Date | null;
  graduatedAt: Date | null;
}

/** [0, 1) を返す乱数 */
export type Rng = () => number;

export function isUnlocked(card: DrawableCard, now: Date): boolean {
  return (
    card.graduatedAt === null &&
    card.nextReviewAt !== null &&
    card.nextReviewAt.getTime() <= now.getTime()
  );
}

/** 解禁からの経過日数による重み。解禁直後が 1、30日で 2、90日で 4 */
export function drawWeight(nextReviewAt: Date, now: Date): number {
  const elapsedDays = Math.max(0, (now.getTime() - nextReviewAt.getTime()) / DAY_MS);
  return 1 + elapsedDays / WEIGHT_SCALE_DAYS;
}

/**
 * 解禁済みプールから重み付きで count 枚を非復元抽出する。
 * プールが count 未満なら全部返す。streak による重み付けはしない（仕様）。
 */
export function draw<T extends DrawableCard>(
  cards: readonly T[],
  now: Date,
  count: number,
  rng: Rng = Math.random,
): T[] {
  if (!Number.isInteger(count) || count < 0) {
    throw new RangeError(`draw: count は 0 以上の整数（受け取った値: ${count}）`);
  }

  const pool = cards
    .filter((card) => isUnlocked(card, now))
    .map((card) => ({ card, weight: drawWeight(card.nextReviewAt as Date, now) }));

  const picked: T[] = [];
  while (picked.length < count && pool.length > 0) {
    const total = pool.reduce((sum, e) => sum + e.weight, 0);
    let r = rng() * total;
    let i = 0;
    // 最後の要素は浮動小数の誤差の受け皿にする
    for (; i < pool.length - 1; i++) {
      r -= pool[i]!.weight;
      if (r < 0) break;
    }
    picked.push(pool[i]!.card);
    pool.splice(i, 1);
  }
  return picked;
}

/** 1セッションのうち、初見に優先して割り当てる枠の既定値 */
export const DEFAULT_FRESH_QUOTA = 2;

/**
 * 1セッションの枠の配分。
 * 1. 初見を freshQuota 枠まで優先して入れる（多くの問題に触れることを優先する）
 * 2. 残りの枠を解禁中の復習で埋める
 * 3. それでも空いた枠は、もう一方の残りで埋める
 * 初見の候補が尽きてくると、自然に復習の割合が増える。
 */
export function planSlots(
  reviewAvailable: number,
  freshAvailable: number,
  count: number,
  freshQuota: number = DEFAULT_FRESH_QUOTA,
): { review: number; fresh: number } {
  for (const [name, v] of [
    ["reviewAvailable", reviewAvailable],
    ["freshAvailable", freshAvailable],
    ["count", count],
    ["freshQuota", freshQuota],
  ] as const) {
    if (!Number.isInteger(v) || v < 0) {
      throw new RangeError(`planSlots: ${name} は 0 以上の整数（受け取った値: ${v}）`);
    }
  }
  if (freshQuota > count) {
    throw new RangeError(`planSlots: freshQuota（${freshQuota}）は count（${count}）以下`);
  }
  let fresh = Math.min(freshAvailable, freshQuota);
  const review = Math.min(reviewAvailable, count - fresh);
  fresh = Math.min(freshAvailable, count - review);
  return { review, fresh };
}

/**
 * 0 以上 n 未満の整数から、重複なく k 個を一様に選ぶ（初見の抽選の OFFSET。SPEC §6.2）。
 * k が n 以上なら全部を返す。乱数は引数で注入する。
 */
export function pickDistinct(n: number, k: number, rng: Rng = Math.random): number[] {
  for (const [name, v] of [
    ["n", n],
    ["k", k],
  ] as const) {
    if (!Number.isInteger(v) || v < 0) {
      throw new RangeError(`pickDistinct: ${name} は 0 以上の整数（受け取った値: ${v}）`);
    }
  }
  const picked = new Set<number>();
  const want = Math.min(n, k);
  // n が大きいので配列を作らず、重複したら引き直す（k は高々 3）
  while (picked.size < want) picked.add(Math.min(n - 1, Math.floor(rng() * n)));
  return [...picked];
}
