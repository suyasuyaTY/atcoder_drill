import type { Grade } from "../lib/scheduler";

/** 申告の表示（SPEC §2.2）。GradeBar の並び順（WA | AC 苦戦 | AC 余裕） */
export const GRADE_ORDER: readonly Grade[] = ["failed", "hard", "easy"];

export const GRADE_LABELS: Readonly<Record<Grade, { main: string; sub: string }>> = {
  failed: { main: "WA", sub: "解けず" },
  hard: { main: "AC", sub: "苦戦" },
  easy: { main: "AC", sub: "余裕" },
};

/** 申告欄の近くに常に出す判断基準（SPEC §2.2） */
export const GRADE_CRITERION = "自力で WA を直して AC できたら『AC 苦戦』。解説・ヒントを見た、または撤退したら『WA』。";
