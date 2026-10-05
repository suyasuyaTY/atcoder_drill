import { Link } from "react-router";
import styles from "./DebugBand.module.css";

/** DEBUG_TOOLS=1 のときにヘッダーの上に出す帯（DESIGN §6 デバッグの帯） */
export function DebugBand({ offsetDays }: { offsetDays: number }) {
  const sign = offsetDays < 0 ? "−" : "+";
  return (
    <div className={styles.band}>
      <span>
        DEBUG ・ 時計 {sign}
        {Math.abs(offsetDays)}日
      </span>
      <Link to="/debug" className={styles.link}>
        デバッグツール
      </Link>
    </div>
  );
}
