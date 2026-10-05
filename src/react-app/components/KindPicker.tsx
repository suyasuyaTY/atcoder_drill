import { Link } from "react-router";
import { KIND_LABELS, SESSION_KINDS, type SessionKind } from "../../lib/contest";
import styles from "./KindPicker.module.css";

type Counts = Record<SessionKind, { review: number; fresh: number }>;

/**
 * 種類の選択（DESIGN §3 KindPicker）。選択は URL の ?kind= に持たせ、Link で切り替える。
 * 復習・初見とも0件の種類は押せない。
 */
export function KindPicker({ value, counts }: { value: SessionKind; counts: Counts }) {
  return (
    <nav className={styles.picker} aria-label="出題する種類">
      {SESSION_KINDS.map((k) => {
        const { review, fresh } = counts[k];
        const body = (
          <>
            <span className={styles.name}>{KIND_LABELS[k]}</span>
            <span className={styles.counts}>
              復習 {review} ・ 初見 {fresh}
            </span>
          </>
        );
        if (review + fresh === 0) {
          return (
            <span key={k} className={`${styles.kind} ${styles.empty}`} aria-disabled="true">
              {body}
            </span>
          );
        }
        return (
          <Link
            key={k}
            to={`/?kind=${k}`}
            className={styles.kind}
            aria-current={k === value ? "true" : undefined}
            replace
          >
            {body}
          </Link>
        );
      })}
    </nav>
  );
}
