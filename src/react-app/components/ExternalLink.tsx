import type { ReactNode } from "react";
import styles from "./ExternalLink.module.css";

/** 外部リンク（DESIGN §3 ExternalLink）。新しいタブで開く */
export function ExternalLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <a href={href} target="_blank" rel="noopener" className={`${styles.link} ${className ?? ""}`}>
      {children}
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M14 4h6v6" />
        <path d="M20 4 10 14" />
        <path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" />
      </svg>
      <span className={styles.sr}>（新しいタブで開く）</span>
    </a>
  );
}
