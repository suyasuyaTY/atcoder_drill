import { DIFFICULTY_BANDS, DIFFICULTY_SOURCE, type DifficultyBand } from "../../lib/difficulty";
import { formatJstDate } from "../../lib/format";
import styles from "./DailyBars.module.css";

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
  return (
    <section className={`panel ${styles.panel}`} aria-labelledby="daily-heading">
      <div className={styles.head}>
        <h2 id="daily-heading">直近30日に自力で解いた問題</h2>
        <p className={styles.total}>
          <span className={styles.totalNum}>{total}</span>問
        </p>
      </div>
      <div className={styles.scroll}>
        <div className={styles.chart}>
          {days.map((d, i) => {
            const n = d.blocks.length;
            const h = n > MAX_FULL_BLOCKS ? HEIGHT / n - GAP : BLOCK;
            const label = `${dayLabel(d.date)}: ${n}問`;
            return (
              <div key={d.date} className={styles.day}>
                <div className={styles.bar} title={label} role="img" aria-label={label}>
                  {d.blocks.map((band, j) => (
                    <span key={j} className={`${styles.block} ${styles[band]}`} style={{ height: h }} />
                  ))}
                </div>
                <span className={styles.date}>{(days.length - 1 - i) % 7 === 0 ? dayLabel(d.date) : ""}</span>
              </div>
            );
          })}
        </div>
      </div>
      <ul className={styles.legend} aria-label="difficulty の色帯">
        {DIFFICULTY_BANDS.map((b) => (
          <li key={b.band}>
            <span className={`${styles.swatch} ${styles[b.band]}`} aria-hidden="true" />
            {BAND_LABELS[b.band]}
          </li>
        ))}
      </ul>
      <p className={styles.note}>difficulty は {DIFFICULTY_SOURCE}です。登録・初見・復習で、AC（余裕・苦戦）と申告した問題を数えます。</p>
    </section>
  );
}
