import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const WIDTHS = {
  /** ホーム・登録 */
  wide: "max-w-[1120px]",
  /** 問題表 */
  table: "max-w-[1200px]",
  /** セッション・詳細 */
  narrow: "max-w-[960px]",
  /** プロフィール */
  profile: "max-w-[840px]",
} as const;

/** 本文（DESIGN §2 レイアウト）。上下 36px / 56px、左右 40px（720px 以下は 16px） */
export function Page({ width, className, ...props }: ComponentProps<"main"> & { width: keyof typeof WIDTHS }) {
  return <main className={cn("mx-auto px-4 pt-9 pb-14 md:px-10", WIDTHS[width], className)} {...props} />;
}

/** 面（DESIGN §2）。白、1px の線、角丸 14px、内側の余白 24〜28px */
export function Panel({ className, ...props }: ComponentProps<"section">) {
  return (
    <section
      className={cn("rounded-xl border border-line bg-surface px-4 py-5 md:px-7 md:py-6", className)}
      {...props}
    />
  );
}

/** 読み込み中の面。形を保ったまま薄い灰色で出す（DESIGN §8） */
export function PanelSkeleton({ className }: { className?: string }) {
  return <div aria-busy="true" className={cn("animate-pulse rounded-xl border border-line bg-surface-sub", className)} />;
}
