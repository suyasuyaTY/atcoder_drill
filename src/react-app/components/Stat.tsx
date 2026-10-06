/** 統計の1項目（DESIGN §3 Stat） */
export function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-ink-muted">{label}</span>
      <span className="text-[26px] leading-tight font-black">{value}</span>
    </div>
  );
}
