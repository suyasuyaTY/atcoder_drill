import { DAY_MS, apply, type Grade } from "../lib/scheduler";

/** 申告の表示（SPEC §2.2）。GradeBar の並び順（WA | AC 苦戦 | AC 余裕） */
export const GRADE_ORDER: readonly Grade[] = ["failed", "hard", "easy"];

export const GRADE_LABELS: Readonly<Record<Grade, { main: string; sub: string }>> = {
  failed: { main: "WA", sub: "解けず" },
  hard: { main: "AC", sub: "苦戦" },
  easy: { main: "AC", sub: "余裕" },
};

/** 申告欄の近くに常に出す判断基準（SPEC §2.2） */
export const GRADE_CRITERION = "自力で WA を直して AC できたら『AC 苦戦』。解説・ヒントを見た、または撤退したら『WA』。";

/**
 * 申告したらどうなるかの補足文（DESIGN §3 GradeBar の large）。表示用: 確定はサーバーが返した結果で表示し直す。
 * 「解けず ・ 0 に戻る」「苦戦 ・ 3ヶ月後にまた」「余裕 ・ 卒業」
 */
export function gradeHints(streak: number): Record<Grade, string> {
  const now = new Date();
  const hint = (g: Grade) => {
    const r = apply(streak, g, now);
    if (r.graduated) return "卒業";
    if (g === "failed" && streak > 0) return "0 に戻る";
    const months = Math.round((r.nextReviewAt.getTime() - now.getTime()) / DAY_MS / 30);
    return `${months}ヶ月後にまた`;
  };
  return Object.fromEntries(GRADE_ORDER.map((g) => [g, `${GRADE_LABELS[g].sub} ・ ${hint(g)}`])) as Record<Grade, string>;
}
