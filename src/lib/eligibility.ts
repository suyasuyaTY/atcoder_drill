/**
 * 初見の対象と、問題表の状態の判定（SPEC §5・§9）。この判定はこのファイルだけに書く。
 * カードがある問題は、プロフィールに関係なく復習に出る。プロフィールが決めるのは、カードのない問題が初見に出るかどうかだけ。
 */

import { CONTEST_KINDS, type ContestKind, type SessionKind } from "./contest";
import { daysSince, daysUntil } from "./format";
import { DEFAULT_FRESH_QUOTA, isActiveStreak, isUnlocked, type ActiveStreak } from "./scheduler";

/** 初見で出す問題の設定（SPEC §5）。difficulty は補正後の値 */
export interface FreshProfile {
  /** ABC / ARC / AGC は問題記号（index_norm）、OTHER はコンテスト ID */
  targets: Record<ContestKind, string[]>;
  minDifficulty: number | null;
  /** この値未満 */
  maxDifficulty: number | null;
  freshQuota: number;
}

export const DEFAULT_PROFILE: FreshProfile = {
  targets: { ABC: ["F", "G"], ARC: [], AGC: [], OTHER: [] },
  minDifficulty: null,
  maxDifficulty: null,
  freshQuota: DEFAULT_FRESH_QUOTA,
};

/** isFreshTarget が見る問題の項目。difficulty は補正後の値 */
export interface FreshProblem {
  id: string;
  contestId: string;
  kind: ContestKind;
  indexNorm: string;
  difficulty: number | null;
}

function inDifficultyRange(d: number | null, profile: FreshProfile): boolean {
  if (d === null) return true;
  if (profile.minDifficulty !== null && d < profile.minDifficulty) return false;
  if (profile.maxDifficulty !== null && d >= profile.maxDifficulty) return false;
  return true;
}

/** 1問が初見の対象か。カードがある問題は常に偽 */
export function isFreshTarget(problem: FreshProblem, profile: FreshProfile, opts: { hasCard: boolean }): boolean {
  if (opts.hasCard) return false;
  const targets = profile.targets[problem.kind];
  const selected = problem.kind === "OTHER" ? targets.includes(problem.contestId) : targets.includes(problem.indexNorm);
  return selected && inDifficultyRange(problem.difficulty, profile);
}

/**
 * isFreshTarget と同じ条件を D1 の SQL にする（problems の別名は p）。件数の集計と抽選に使う。
 * 値はすべて binds で渡す（WHERE 句に利用者の値を埋め込まない）。
 */
export function buildFreshQuery(profile: FreshProfile, kind: SessionKind): { where: string; binds: unknown[] } {
  const kinds = kind === "ALL" ? CONTEST_KINDS : [kind];
  const ors: string[] = [];
  const binds: unknown[] = [];
  for (const k of kinds) {
    const targets = profile.targets[k];
    if (targets.length === 0) continue;
    const column = k === "OTHER" ? "p.contest_id" : "p.index_norm";
    ors.push(`(p.kind = ? AND ${column} IN (SELECT value FROM json_each(?)))`);
    binds.push(k, JSON.stringify(targets));
  }
  if (ors.length === 0) return { where: "0", binds: [] };

  const where = [`(${ors.join(" OR ")})`, "NOT EXISTS (SELECT 1 FROM cards c WHERE c.problem_id = p.id)"];
  if (profile.minDifficulty !== null) {
    where.push("(p.difficulty_disp IS NULL OR p.difficulty_disp >= ?)");
    binds.push(profile.minDifficulty);
  }
  if (profile.maxDifficulty !== null) {
    where.push("(p.difficulty_disp IS NULL OR p.difficulty_disp < ?)");
    binds.push(profile.maxDifficulty);
  }
  return { where: where.join(" AND "), binds };
}

/** cardStatus が見るカードの項目。日時は ISO 文字列 */
export interface StatusCard {
  streak: number;
  nextReviewAt: string | null;
  graduatedAt: string | null;
}

export type CellStatus =
  /** カードなし・初見に出る */
  | { state: "fresh" }
  /** カードなし・初見に出ない */
  | { state: "off" }
  /** 現役・未解禁。days = あと N日 */
  | { state: "waiting"; streak: ActiveStreak; days: number }
  /** 現役・解禁済み。days = 解禁から N日 */
  | { state: "unlocked"; streak: ActiveStreak; days: number }
  | { state: "graduated" };

export function cardStatus(problem: FreshProblem, card: StatusCard | null, profile: FreshProfile, now: Date): CellStatus {
  if (card === null) return isFreshTarget(problem, profile, { hasCard: false }) ? { state: "fresh" } : { state: "off" };
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
