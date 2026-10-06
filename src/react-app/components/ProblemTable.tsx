import { Link } from "react-router";
import type { ContestKind } from "../../lib/contest";
import type { CellStatus } from "../../lib/eligibility";
import { problemUrl } from "../../lib/problem-id";
import { cn } from "@/lib/utils";
import { DifficultyDot } from "./DifficultyDot";

interface Cell {
  id: string;
  problemIndex: string;
  indexNorm: string;
  title: string;
  difficulty: number | null;
  cardId: number | null;
  status: CellStatus;
}

interface Row {
  contestId: string;
  title: string;
  problems: Cell[];
}

/** 見出しと、横にスクロールしても左に残るコンテストの列 */
const HEAD = "h-10 border-b border-line bg-surface-sub px-2.5 text-left text-xs font-bold text-ink-muted";
const STICKY = "sticky left-0 z-[1] shadow-[1px_0_0_var(--line-row)]";
const CONTEST = cn(STICKY, "truncate border-b border-line-row bg-surface px-2.5 text-left text-xs font-bold whitespace-nowrap");

/**
 * 問題表（DESIGN §4）。ABC / ARC / AGC は問題記号の列にそろえる。
 * その他は記号がコンテストごとにばらばらなので、行の中に問題を並べて折り返す。
 */
export function ProblemTable({ kind, columns, rows }: { kind: ContestKind; columns: string[] | null; rows: Row[] }) {
  const contestLabel = (id: string) => (kind === "OTHER" ? id : id.toUpperCase());

  if (columns === null) {
    return (
      <table className="w-full table-fixed border-collapse text-xs">
        <thead>
          <tr>
            <th scope="col" className={cn(HEAD, STICKY, "w-[84px]")}>
              コンテスト
            </th>
            <th scope="col" className={HEAD}>
              問題
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.contestId}>
              <th scope="row" className={cn(CONTEST, "pt-[18px] align-top")} title={r.title}>
                {contestLabel(r.contestId)}
              </th>
              <td className="flex flex-wrap gap-px border-b border-line-row bg-line-row">
                {r.problems.map((p) => (
                  <ProblemCell key={p.id} contestId={r.contestId} cell={p} showIndex className="w-40" />
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  return (
    // 列の数で表の最小幅が変わる（動的な値なのでインラインで渡す）
    <table className="w-full table-fixed border-collapse text-xs" style={{ minWidth: 84 + columns.length * 120 }}>
      <colgroup>
        <col className="w-[84px]" />
        {columns.map((c) => (
          <col key={c} />
        ))}
      </colgroup>
      <thead>
        <tr>
          <th scope="col" className={cn(HEAD, STICKY)}>
            コンテスト
          </th>
          {columns.map((c) => (
            <th key={c} scope="col" className={HEAD}>
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.contestId}>
            <th scope="row" className={CONTEST} title={r.title}>
              {contestLabel(r.contestId)}
            </th>
            {columns.map((c) => {
              const cells = r.problems.filter((p) => p.indexNorm === c);
              return (
                <td key={c} className="border-b border-l border-line-row p-0 align-top">
                  {cells.map((p) => (
                    <ProblemCell
                      key={p.id}
                      contestId={r.contestId}
                      cell={p}
                      showIndex={cells.length > 1}
                      className="not-first:border-t not-first:border-line-row"
                    />
                  ))}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function statusText(s: CellStatus): string {
  switch (s.state) {
    case "fresh":
      return "初見に出る";
    case "off":
      return "未登録";
    case "waiting":
      return `あと ${s.days}日`;
    case "unlocked":
      return `解禁 ${s.days}日`;
    case "graduated":
      return "卒業";
  }
}

/** セルの地（SPEC §9）。解禁中は streak の色に濃い枠 */
function statusClass(s: CellStatus): string {
  switch (s.state) {
    case "fresh":
      return "bg-surface";
    case "off":
      return "bg-cell-off text-ink-muted hover:text-ink-muted";
    case "waiting":
      return s.streak === 0 ? "bg-cell-streak0" : "bg-cell-streak1";
    case "unlocked":
      return cn(s.streak === 0 ? "bg-cell-streak0" : "bg-cell-streak1", "shadow-pool");
    case "graduated":
      return "bg-cell-graduated";
  }
}

function ProblemCell({
  contestId,
  cell,
  showIndex,
  className,
}: {
  contestId: string;
  cell: Cell;
  showIndex: boolean;
  className?: string;
}) {
  const to = cell.cardId !== null ? `/cards/${cell.cardId}` : `/register?q=${encodeURIComponent(problemUrl(contestId, cell.id))}`;
  const streak = "streak" in cell.status ? ` ・ streak ${cell.status.streak}` : "";
  const off = cell.status.state === "off";
  return (
    <Link
      to={to}
      title={`${cell.problemIndex}. ${cell.title}（${statusText(cell.status)}${streak}）`}
      className={cn(
        "group flex h-14 flex-col justify-center gap-0.5 px-2.5 text-ink no-underline hover:text-ink",
        "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-link",
        statusClass(cell.status),
        className,
      )}
    >
      <span className="flex min-w-0 items-center gap-1.5">
        <DifficultyDot value={cell.difficulty} showValue={false} className={cn(off && "opacity-50")} />
        <span className={cn("min-w-0 truncate group-hover:underline", off ? "font-normal" : "font-bold")}>
          {showIndex && <span className="mr-1 text-ink-muted">{cell.problemIndex}</span>}
          {cell.title}
        </span>
      </span>
      <span className="text-[11px] text-ink-muted">{statusText(cell.status)}</span>
    </Link>
  );
}
