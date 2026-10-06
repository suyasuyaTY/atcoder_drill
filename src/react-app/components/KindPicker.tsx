import { Link } from "react-router";
import { KIND_LABELS, SESSION_KINDS, type SessionKind } from "../../lib/contest";
import { cn } from "@/lib/utils";

type Counts = Record<SessionKind, { review: number; fresh: number }>;

const BASE = "flex h-12 min-w-24 shrink-0 flex-col justify-center rounded-[12px] border px-3.5 leading-snug no-underline";

/**
 * 種類の選択（DESIGN §3 KindPicker）。選択は URL の ?kind= に持たせ、Link で切り替える。
 * 復習・初見とも0件の種類は押せない。
 */
export function KindPicker({ value, counts }: { value: SessionKind; counts: Counts }) {
  return (
    <nav className="flex gap-2 overflow-x-auto [scrollbar-width:none]" aria-label="出題する種類">
      {SESSION_KINDS.map((k) => {
        const { review, fresh } = counts[k];
        const body = (
          <>
            <span className="text-sm font-bold">{KIND_LABELS[k]}</span>
            <span className="text-[11px]">
              復習 {review} ・ 初見 {fresh}
            </span>
          </>
        );
        if (review + fresh === 0) {
          return (
            <span key={k} aria-disabled="true" className={cn(BASE, "cursor-not-allowed border-dashed border-line-strong text-ink-muted")}>
              {body}
            </span>
          );
        }
        const selected = k === value;
        return (
          <Link
            key={k}
            to={`/?kind=${k}`}
            replace
            aria-current={selected ? "true" : undefined}
            className={cn(
              BASE,
              selected
                ? "border-primary bg-primary text-surface hover:text-surface"
                : "border-line-strong bg-surface text-ink hover:border-ink hover:text-ink",
            )}
          >
            {body}
          </Link>
        );
      })}
    </nav>
  );
}
