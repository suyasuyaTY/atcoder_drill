import type { Grade } from "../../lib/scheduler";
import { cn } from "@/lib/utils";
import { GRADE_LABELS } from "../grades";

const COLOR: Record<Grade, string> = {
  failed: "border border-line-strong bg-grade-failed text-ink",
  hard: "bg-grade-hard text-ink",
  easy: "bg-grade-easy text-surface",
};

/** 申告の小さいラベル（DESIGN §3 GradeChip） */
export function GradeChip({ grade }: { grade: Grade }) {
  const l = GRADE_LABELS[grade];
  return (
    <span className={cn("inline-block rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap", COLOR[grade])}>
      {l.main} {l.sub}
    </span>
  );
}
