import { formatJstDate } from "../../lib/format";
import { cn } from "@/lib/utils";
import { useScrollToEnd } from "../hooks/useScrollToEnd";
import { Panel } from "./Layout";

interface Cell {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

const LEVEL_BG = ["bg-grass-0", "bg-grass-1", "bg-grass-2", "bg-grass-3", "bg-grass-4"];
const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];
const SQUARE = "block size-[13px] rounded-[3px]";

/** その週に月の1日があれば、その月のラベル（最初の列は必ず出す） */
function monthLabel(week: (Cell | null)[], i: number): string {
  const days = week.filter((c): c is Cell => c !== null);
  const first = days.find((c) => c.date.endsWith("-01")) ?? (i === 0 ? days[0] : undefined);
  return first ? `${Number(first.date.slice(5, 7))}月` : "";
}

/** 取り組みの記録（DESIGN §5 Grass）。列が週（日曜始まり）、行が曜日。数字は title にも書く */
export function Grass({ weeks, total }: { weeks: (Cell | null)[][]; total: number }) {
  const scrollRef = useScrollToEnd<HTMLDivElement>([weeks.length]);
  return (
    <Panel aria-labelledby="grass-heading" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="grass-heading">取り組みの記録</h2>
        <p className="text-ink-muted">
          1年で<span className="mx-1 text-[26px] font-black text-ink">{total}</span>回
        </p>
      </div>
      {/* 草はこの面の中だけ横にスクロールし、最初は今週（右端）を見せる（DESIGN §7） */}
      <div className="overflow-x-auto" ref={scrollRef}>
        <div className="flex w-max gap-1">
          <div className="flex flex-col gap-1" aria-hidden="true">
            <span className="h-3.5" />
            {WEEKDAYS.map((w, i) => (
              <span key={w} className="h-[13px] text-[10px] leading-[13px] text-ink-muted">
                {i % 2 === 1 ? w : ""}
              </span>
            ))}
          </div>
          {weeks.map((week, i) => (
            <div key={week.find((c) => c !== null)?.date ?? i} className="flex flex-col gap-1">
              <span className="h-3.5 w-[13px] overflow-visible text-[11px] leading-[14px] whitespace-nowrap text-ink-muted" aria-hidden="true">
                {monthLabel(week, i)}
              </span>
              {week.map((c, d) =>
                c === null ? (
                  <span key={d} className={SQUARE} />
                ) : (
                  <span
                    key={c.date}
                    className={cn(SQUARE, LEVEL_BG[c.level])}
                    title={`${formatJstDate(`${c.date}T00:00:00+09:00`)}: ${c.count}回`}
                  />
                ),
              )}
            </div>
          ))}
        </div>
      </div>
      <p className="flex items-center justify-end gap-1 text-xs text-ink-muted">
        少ない
        {LEVEL_BG.map((bg) => (
          <span key={bg} className={cn(SQUARE, "inline-block", bg)} aria-hidden="true" />
        ))}
        多い
      </p>
    </Panel>
  );
}
