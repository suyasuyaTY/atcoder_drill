import styles from "./FreshTag.module.css";

/** 「初見の対象」（DESIGN §3 FreshTag）。登録しなくても初見に出る問題の印 */
export function FreshTag() {
  return (
    <span className={styles.tag} title="登録しなくても、プロフィールの設定で初見として出題される問題です">
      初見の対象
    </span>
  );
}
