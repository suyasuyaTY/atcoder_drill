import styles from "./Stat.module.css";

/** 統計の1項目（DESIGN §3 Stat） */
export function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className={styles.stat}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>{value}</span>
    </div>
  );
}
