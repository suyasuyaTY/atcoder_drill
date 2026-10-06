import { UserIcon } from "lucide-react";
import { Link, NavLink } from "react-router";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "ホーム", end: true },
  { to: "/register", label: "登録", end: false },
  { to: "/table", label: "問題表", end: false },
];

/** ヘッダー（DESIGN §2 レイアウト、§3 Header）。選択中のナビには NavLink が aria-current="page" を付ける */
export function Header({ atcoderUserId }: { atcoderUserId: string | null }) {
  return (
    <header className="flex h-[60px] items-center gap-3 border-b border-line bg-surface px-4 md:gap-7 md:px-10">
      <Link to="/" className="inline-flex min-h-10 shrink-0 items-center text-[17px] font-black text-ink no-underline hover:text-ink">
        復習ドリル
      </Link>
      <nav className="flex min-w-0 gap-1 overflow-x-auto [scrollbar-width:none]" aria-label="メイン">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            className={({ isActive }) =>
              cn(
                "inline-flex min-h-10 shrink-0 items-center rounded-md px-3 no-underline",
                isActive ? "bg-chip font-bold text-ink hover:text-ink" : "text-ink-muted hover:text-ink",
              )
            }
          >
            {n.label}
          </NavLink>
        ))}
      </nav>
      <NavLink
        to="/profile"
        className={({ isActive }) =>
          cn(
            "ml-auto inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center gap-1.5 rounded-full border bg-surface text-[13px] text-ink no-underline hover:text-ink md:px-3",
            isActive ? "border-ink" : "border-line hover:border-line-strong",
          )
        }
      >
        <UserIcon className="size-3.5" aria-hidden="true" />
        {/* 狭い画面ではナビを優先し、名前のピルはアイコンだけにする（名前は読み上げには残す） */}
        <span className="max-md:sr-only">{atcoderUserId ?? "プロフィール"}</span>
      </NavLink>
    </header>
  );
}
