import styles from "./SourceTag.module.css";

/** セッションの各問題の出題元（DESIGN §3 SourceTag） */
export function SourceTag({ source }: { source: "review" | "fresh" }) {
  return <span className={`${styles.tag} ${styles[source]}`}>{source === "review" ? "復習" : "初見"}</span>;
}
