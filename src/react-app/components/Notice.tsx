import type { ReactNode } from "react";

/** API のエラーや完了の知らせ（DESIGN §3 Notice） */
export function Notice({ children, role = "status" }: { children: ReactNode; role?: "status" | "alert" }) {
  return (
    <div className="rounded-lg border border-notice-line bg-notice px-4 py-3" role={role}>
      {children}
    </div>
  );
}
