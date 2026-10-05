import type { Grade } from "../../lib/scheduler";
import { GRADE_LABELS } from "../grades";
import styles from "./GradeChip.module.css";

/** 申告の小さいラベル（DESIGN §3 GradeChip） */
export function GradeChip({ grade }: { grade: Grade }) {
  const l = GRADE_LABELS[grade];
  return (
    <span className={`${styles.chip} ${styles[grade]}`}>
      {l.main} {l.sub}
    </span>
  );
}
