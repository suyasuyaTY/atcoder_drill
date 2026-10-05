import { DIFFICULTY_SOURCE, difficultyBand } from "../../lib/difficulty";
import styles from "./DifficultyDot.module.css";

/** difficulty の色帯の点と数値（DESIGN §3 DifficultyDot）。値は補正後。NULL は「—」 */
export function DifficultyDot({ value, showValue = true }: { value: number | null; showValue?: boolean }) {
  const band = difficultyBand(value);
  return (
    <span className={styles.wrap} title={DIFFICULTY_SOURCE}>
      <span className={styles.dot} style={{ background: `var(--diff-${band})` }} aria-hidden="true" />
      {showValue && <span className={styles.value}>{value ?? "—"}</span>}
    </span>
  );
}
