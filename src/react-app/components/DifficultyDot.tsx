import { DIFFICULTY_SOURCE, difficultyBand } from "../../lib/difficulty";
import { BAND_BG } from "../bands";
import { cn } from "@/lib/utils";

/** difficulty の色帯の点と数値（DESIGN §3 DifficultyDot）。値は補正後。NULL は「—」 */
export function DifficultyDot({
  value,
  showValue = true,
  className,
}: {
  value: number | null;
  showValue?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap", className)} title={DIFFICULTY_SOURCE}>
      <span className={cn("size-[9px] shrink-0 rounded-full", BAND_BG[difficultyBand(value)])} aria-hidden="true" />
      {showValue && <span className="text-xs text-ink-muted">{value ?? "—"}</span>}
    </span>
  );
}
