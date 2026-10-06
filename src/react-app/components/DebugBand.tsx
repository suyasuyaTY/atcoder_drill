import { Link } from "react-router";

/** DEBUG_TOOLS=1 のときにヘッダーの上に出す帯（DESIGN §6 デバッグの帯） */
export function DebugBand({ offsetDays }: { offsetDays: number }) {
  const sign = offsetDays < 0 ? "−" : "+";
  return (
    <div className="flex h-8 items-center justify-between bg-primary px-4 text-xs font-bold text-surface md:px-10">
      <span>
        DEBUG ・ 時計 {sign}
        {Math.abs(offsetDays)}日
      </span>
      <Link to="/debug" className="inline-flex h-8 items-center text-surface underline hover:text-surface">
        デバッグツール
      </Link>
    </div>
  );
}
