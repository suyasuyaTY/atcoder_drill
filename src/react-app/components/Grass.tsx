import { formatJstDate } from "../../lib/format";
import { useScrollToEnd } from "../hooks/useScrollToEnd";
import styles from "./Grass.module.css";

interface Cell {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

const LEVEL_CLASS = [styles.l0, styles.l1, styles.l2, styles.l3, styles.l4];
const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

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
    <section className={`panel ${styles.panel}`} aria-labelledby="grass-heading">
      <div className={styles.head}>
        <h2 id="grass-heading">取り組みの記録</h2>
        <p className={styles.total}>
          1年で<span className={styles.totalNum}>{total}</span>回
        </p>
      </div>
      <div className={styles.scroll} ref={scrollRef}>
        <div className={styles.grid}>
          <div className={styles.weekdays} aria-hidden="true">
            <span />
            {WEEKDAYS.map((w, i) => (
              <span key={w}>{i % 2 === 1 ? w : ""}</span>
            ))}
          </div>
          {weeks.map((week, i) => (
            <div key={week.find((c) => c !== null)?.date ?? i} className={styles.week}>
              <span className={styles.month} aria-hidden="true">
                {monthLabel(week, i)}
              </span>
              {week.map((c, d) =>
                c === null ? (
                  <span key={d} className={styles.future} />
                ) : (
                  <span
                    key={c.date}
                    className={`${styles.cell} ${LEVEL_CLASS[c.level]}`}
                    title={`${formatJstDate(`${c.date}T00:00:00+09:00`)}: ${c.count}回`}
                  />
                ),
              )}
            </div>
          ))}
        </div>
      </div>
      <p className={styles.legend}>
        少ない
        {LEVEL_CLASS.map((cls, i) => (
          <span key={i} className={`${styles.cell} ${cls}`} aria-hidden="true" />
        ))}
        多い
      </p>
    </section>
  );
}
