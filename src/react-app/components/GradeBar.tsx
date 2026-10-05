import type { Grade } from "../../lib/scheduler";
import { GRADE_LABELS, GRADE_ORDER } from "../grades";
import styles from "./GradeBar.module.css";

interface Props {
  value: Grade | null;
  onChange: (grade: Grade | null) => void;
  size?: "compact" | "large";
  /** 2行目に出す結果の文（large で使う）。なければ「解けず」「苦戦」「余裕」 */
  hints?: Partial<Record<Grade, string>>;
  disabled?: boolean;
  /** 読み上げ用のまとまりの名前（「ABC306 D の申告」など） */
  label: string;
}

/**
 * 申告の部品（DESIGN §3 GradeBar）。横一列につながった「WA | AC | AC」。
 * compact（登録画面）は選択中をもう一度押すと null（= 登録しない）に戻る。
 */
export function GradeBar({ value, onChange, size = "compact", hints, disabled, label }: Props) {
  return (
    <div className={`${styles.bar} ${styles[size]}`} role="group" aria-label={label}>
      {GRADE_ORDER.map((g) => {
        const selected = value === g;
        return (
          <button
            key={g}
            type="button"
            className={`${styles.button} ${selected ? styles[g] : ""}`}
            aria-pressed={selected}
            disabled={disabled}
            onClick={() => onChange(selected && size === "compact" ? null : g)}
          >
            <span className={styles.main}>{GRADE_LABELS[g].main}</span>
            <span className={styles.sub}>{hints?.[g] ?? GRADE_LABELS[g].sub}</span>
          </button>
        );
      })}
    </div>
  );
}
