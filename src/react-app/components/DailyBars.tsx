import { DIFFICULTY_BANDS, DIFFICULTY_SOURCE, type DifficultyBand } from "../../lib/difficulty";
import { formatJstDate } from "../../lib/format";
import { cn } from "@/lib/utils";
import { useScrollToEnd } from "../hooks/useScrollToEnd";
import { BAND_BG } from "../bands";
import { Panel } from "./Layout";

const HEIGHT = 150;
const BLOCK = 24;
const GAP = 2;
/** この数を超える日は、ブロックの高さを縮める */
const MAX_FULL_BLOCKS = 6;

const BAND_LABELS: Record<DifficultyBand, string> = {
  gray: "〜399",
  brown: "400〜",
  green: "800〜",
  cyan: "1200〜",
  blue: "1600〜",
  yellow: "2000〜",
  orange: "2400〜",
  red: "2800〜",
};

const dayLabel = (date: string) => formatJstDate(`${date}T00:00:00+09:00`);

/** 直近30日に自力で解いた問題（DESIGN §5 DailyBars）。1日1本、1問1ブロックで易しい色帯から積む */
export function DailyBars({ days }: { days: { date: string; blocks: DifficultyBand[] }[] }) {
  const total = days.reduce((s, d) => s + d.blocks.length, 0);
  const scrollRef = useScrollToEnd<HTMLDivElement>([days.length]);
  return (
    <Panel aria-labelledby="daily-heading" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="daily-heading">直近30日に自力で解いた問題</h2>
        <p className="text-ink-muted">
          <span className="mr-1 text-[26px] font-black text-ink">{total}</span>問
        </p>
      </div>
      {/* グラフはこの面の中だけ横にスクロールし、最初は今日（右端）を見せる（DESIGN §7） */}
      <div className="overflow-x-auto" ref={scrollRef}>
        <div className="flex w-max gap-[9px]">
          {days.map((d, i) => {
            const n = d.blocks.length;
            const h = n > MAX_FULL_BLOCKS ? HEIGHT / n - GAP : BLOCK;
            const label = `${dayLabel(d.date)}: ${n}問`;
            return (
              <div key={d.date} className="flex w-6 flex-col items-center gap-1">
                <div
                  title={label}
                  role="img"
                  aria-label={label}
                  className="flex h-[150px] w-6 flex-col-reverse gap-0.5 border-b border-line-strong"
                >
                  {d.blocks.map((band, j) => (
                    <span key={j} className={cn("w-6 shrink-0 rounded-[3px]", BAND_BG[band])} style={{ height: h }} />
                  ))}
                </div>
                <span className="h-4 text-[11px] whitespace-nowrap text-ink-muted">
                  {(days.length - 1 - i) % 7 === 0 ? dayLabel(d.date) : ""}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <ul className="flex flex-wrap gap-3 text-xs text-ink-muted" aria-label="difficulty の色帯">
        {DIFFICULTY_BANDS.map((b) => (
          <li key={b.band} className="inline-flex items-center gap-1.5">
            <span className={cn("size-2.5 rounded-[3px]", BAND_BG[b.band])} aria-hidden="true" />
            {BAND_LABELS[b.band]}
          </li>
        ))}
      </ul>
      <p className="text-xs text-ink-muted">
        difficulty は {DIFFICULTY_SOURCE}です。登録・初見・復習で、AC（余裕・苦戦）と申告した問題を数えます。
      </p>
    </Panel>
  );
}
