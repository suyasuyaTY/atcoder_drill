import { GRADUATION_STREAK } from "../../lib/scheduler";
import styles from "./StreakDots.module.css";

/** streak の丸（DESIGN §3 StreakDots）。横に「あと N回の余裕で卒業」 */
export function StreakDots({ streak, size = "small" }: { streak: number; size?: "small" | "large" }) {
  const rest = Math.max(0, GRADUATION_STREAK - streak);
  return (
    <span className={`${styles.wrap} ${styles[size]}`}>
      <span className={styles.dots} aria-hidden="true">
        {Array.from({ length: GRADUATION_STREAK }, (_, i) => (
          <span key={i} className={`${styles.dot} ${i < streak ? styles.done : ""}`} />
        ))}
      </span>
      <span className={styles.text}>{rest === 0 ? "卒業" : `あと ${rest}回の余裕で卒業`}</span>
    </span>
  );
}
