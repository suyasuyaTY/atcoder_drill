import { ExternalLinkIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** 外部リンク（DESIGN §3 ExternalLink）。新しいタブで開く */
export function ExternalLink({
  href,
  children,
  className,
  onClick,
}: {
  href: string;
  children: ReactNode;
  className?: string;
  /** 開いたときにしたいこと（セッションでは挑戦中にする） */
  onClick?: () => void;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      className={cn("inline-flex min-h-10 min-w-0 items-center gap-1 underline", className)}
      onClick={onClick}
    >
      {children}
      <ExternalLinkIcon className="size-[13px] shrink-0" aria-hidden="true" />
      <span className="sr-only">（新しいタブで開く）</span>
    </a>
  );
}
