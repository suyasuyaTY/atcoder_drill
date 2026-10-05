/**
 * 初見の対象と、問題表の状態の判定（SPEC §5・§9）。この判定はこのファイルだけに書く。
 * 初見の対象（isFreshTarget / buildFreshQuery）は SPEC §19 のステップ6で足す。
 */

import { daysSince, daysUntil } from "./format";
import { isActiveStreak, isUnlocked, type ActiveStreak } from "./scheduler";

/** cardStatus が見るカードの項目。日時は ISO 文字列 */
export interface StatusCard {
  streak: number;
  nextReviewAt: string | null;
  graduatedAt: string | null;
}

export type CellStatus =
  /** カードなし。ステップ6で「初見に出る / 出ない」に分ける */
  | { state: "unregistered" }
  /** 現役・未解禁。days = あと N日 */
  | { state: "waiting"; streak: ActiveStreak; days: number }
  /** 現役・解禁済み。days = 解禁から N日 */
  | { state: "unlocked"; streak: ActiveStreak; days: number }
  | { state: "graduated" };

export function cardStatus(card: StatusCard | null, now: Date): CellStatus {
  if (card === null) return { state: "unregistered" };
  if (card.graduatedAt !== null) return { state: "graduated" };

  const { streak, nextReviewAt } = card;
  if (!isActiveStreak(streak) || nextReviewAt === null) {
    throw new RangeError(`cardStatus: 現役カードの streak と解禁日が不正（streak ${streak}, next ${nextReviewAt}）`);
  }
  const next = new Date(nextReviewAt);
  return isUnlocked({ nextReviewAt: next, graduatedAt: null }, now)
    ? { state: "unlocked", streak, days: daysSince(next, now) }
    : { state: "waiting", streak, days: daysUntil(next, now) };
}
