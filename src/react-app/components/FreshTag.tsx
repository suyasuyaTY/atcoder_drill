/** 「初見の対象」（DESIGN §3 FreshTag）。登録しなくても初見に出る問題の印 */
export function FreshTag() {
  return (
    <span
      className="inline-block shrink-0 rounded-full bg-fresh px-2.5 py-0.5 text-[11px] font-bold whitespace-nowrap text-fresh-ink"
      title="登録しなくても、プロフィールの設定で初見として出題される問題です"
    >
      初見の対象
    </span>
  );
}
