import type { ReactNode } from "react";
import styles from "./Notice.module.css";

/** API のエラーや完了の知らせ（DESIGN §3 Notice） */
export function Notice({ children, role = "status" }: { children: ReactNode; role?: "status" | "alert" }) {
  return (
    <div className={styles.notice} role={role}>
      {children}
    </div>
  );
}
