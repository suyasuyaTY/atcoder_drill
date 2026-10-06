import { cn } from "@/lib/utils";

/** セッションの各問題の出題元（DESIGN §3 SourceTag） */
export function SourceTag({ source }: { source: "review" | "fresh" }) {
  return (
    <span
      className={cn(
        "inline-block shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold whitespace-nowrap",
        source === "review" ? "bg-chip text-ink" : "bg-fresh text-fresh-ink",
      )}
    >
      {source === "review" ? "復習" : "初見"}
    </span>
  );
}
