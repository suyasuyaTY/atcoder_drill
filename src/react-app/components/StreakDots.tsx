import { GRADUATION_STREAK } from "../../lib/scheduler";
import { cn } from "@/lib/utils";

/** streak の丸（DESIGN §3 StreakDots）。横に「あと N回の余裕で卒業」 */
export function StreakDots({ streak, size = "small" }: { streak: number; size?: "small" | "large" }) {
  const rest = Math.max(0, GRADUATION_STREAK - streak);
  return (
    <span className="inline-flex items-center gap-2">
      <span className="inline-flex gap-1" aria-hidden="true">
        {Array.from({ length: GRADUATION_STREAK }, (_, i) => (
          <span
            key={i}
            className={cn(
              "rounded-full border-[1.5px]",
              size === "small" ? "size-2.5" : "size-3.5",
              i < streak ? "border-grade-easy bg-grade-easy" : "border-ink-faint",
            )}
          />
        ))}
      </span>
      <span className="text-xs text-ink-muted">{rest === 0 ? "卒業" : `あと ${rest}回の余裕で卒業`}</span>
    </span>
  );
}
