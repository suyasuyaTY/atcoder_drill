import type { Grade } from "../../lib/scheduler";
import { cn } from "@/lib/utils";
import { GRADE_LABELS, GRADE_ORDER } from "../grades";

interface Props {
  value: Grade | null;
  onChange: (grade: Grade | null) => void;
  size?: "compact" | "large";
  /** 2行目に出す結果の文（large で使う）。なければ「解けず」「苦戦」「余裕」 */
  hints?: Partial<Record<Grade, string>>;
  disabled?: boolean;
  /** 読み上げ用のまとまりの名前（「ABC306 D の申告」など） */
  label: string;
}

const SELECTED: Record<Grade, string> = {
  failed: "bg-primary text-surface",
  hard: "bg-grade-hard text-ink",
  easy: "bg-grade-easy text-surface",
};

/**
 * 申告の部品（DESIGN §3 GradeBar）。横一列につながった「WA | AC | AC」。
 * compact（登録画面）は選択中をもう一度押すと null（= 登録しない）に戻る。
 * large（セッション画面）は 720px 以下で縦1列に並べる（DESIGN §7）。
 */
export function GradeBar({ value, onChange, size = "compact", hints, disabled, label }: Props) {
  const large = size === "large";
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "flex overflow-hidden rounded-lg border border-line-strong bg-surface",
        large ? "w-full max-md:flex-col md:h-[72px]" : "h-11 w-[300px] max-w-full shrink-0",
      )}
    >
      {GRADE_ORDER.map((g) => {
        const selected = value === g;
        return (
          <button
            key={g}
            type="button"
            aria-pressed={selected}
            disabled={disabled}
            onClick={() => onChange(selected && !large ? null : g)}
            className={cn(
              "flex flex-1 flex-col items-center justify-center border-line-strong px-1 leading-tight not-first:border-l",
              "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-link disabled:cursor-not-allowed",
              large && "max-md:min-h-14 max-md:flex-row max-md:justify-start max-md:gap-3 max-md:px-4 max-md:not-first:border-t max-md:not-first:border-l-0",
              selected ? SELECTED[g] : "text-ink hover:enabled:bg-surface-sub",
            )}
          >
            <span className={cn("font-bold", large ? "text-lg" : "text-[13px]")}>{GRADE_LABELS[g].main}</span>
            <span
              className={cn(
                large ? "text-xs" : "text-[11px]",
                selected ? (g === "hard" ? "text-ink" : "text-surface") : "text-ink-muted",
              )}
            >
              {hints?.[g] ?? GRADE_LABELS[g].sub}
            </span>
          </button>
        );
      })}
    </div>
  );
}
