import { Link, useSearchParams } from "react-router";
import { CONTEST_KINDS, KIND_LABELS, isContestKind, type ContestKind } from "../../lib/contest";
import { DIFFICULTY_SOURCE } from "../../lib/difficulty";
import { cn } from "@/lib/utils";
import { useTable } from "../api";
import { Page, Panel, PanelSkeleton } from "../components/Layout";
import { Notice } from "../components/Notice";
import { Pagination } from "../components/Pagination";
import { ProblemTable } from "../components/ProblemTable";
import { usePageTitle } from "../hooks/usePageTitle";

const LEGEND = [
  { swatch: "bg-surface", label: "未登録・初見に出る" },
  { swatch: "bg-cell-off", label: "未登録・出ない" },
  { swatch: "bg-cell-streak0", label: "streak 0" },
  { swatch: "bg-cell-streak1", label: "streak 1" },
  { swatch: "bg-cell-graduated", label: "卒業" },
  { swatch: "bg-surface shadow-pool", label: "解禁中" },
];

/** 問題表（SPEC §9、DESIGN §4）。種類とページは ?kind=&page= に持たせる */
export function TablePage() {
  usePageTitle("問題表");
  const [params] = useSearchParams();
  const rawKind = params.get("kind");
  const kind: ContestKind = isContestKind(rawKind) ? rawKind : "ABC";
  const rawPage = Number(params.get("page") ?? "1");
  const page = Number.isInteger(rawPage) && rawPage >= 1 ? rawPage : 1;
  const table = useTable(kind, page);
  const href = (k: ContestKind, p: number) => `/table?kind=${k}&page=${p}`;

  return (
    <Page width="table">
      <h1>問題表</h1>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        {/* 種類のタブ（DESIGN §4）。--chip-bg の地に白いピルを乗せたセグメント型 */}
        <nav className="inline-flex gap-1 overflow-x-auto rounded-full bg-chip p-1 [scrollbar-width:none]" aria-label="コンテストの種類">
          {CONTEST_KINDS.map((k) => (
            <Link
              key={k}
              to={href(k, 1)}
              aria-current={k === kind ? "page" : undefined}
              className={cn(
                "inline-flex min-h-10 shrink-0 items-center rounded-full px-4 font-bold no-underline",
                k === kind ? "bg-surface text-ink hover:text-ink" : "text-ink-muted hover:text-ink",
              )}
            >
              {KIND_LABELS[k]}
            </Link>
          ))}
        </nav>
        <ul className="flex flex-wrap gap-3 text-xs text-ink-muted" aria-label="凡例">
          {LEGEND.map((l) => (
            <li key={l.label} className="inline-flex items-center gap-1.5">
              <span className={cn("size-3.5 rounded-[3px] border border-line", l.swatch)} aria-hidden="true" />
              {l.label}
            </li>
          ))}
        </ul>
      </div>

      {table.isError ? (
        <Notice role="alert">{table.error.message}</Notice>
      ) : table.isPending ? (
        <PanelSkeleton className="h-[480px]" />
      ) : table.data.rows.length === 0 ? (
        <Panel>
          <p className="text-ink-muted">
            {kind === "OTHER"
              ? "その他のコンテストは、プロフィールで選んだコンテストと、登録した問題があるコンテストだけを表示します。"
              : "表示するコンテストがありません。問題データを同期してください。"}
          </p>
        </Panel>
      ) : (
        <Panel aria-busy={table.isPlaceholderData}>
          {/* 表はこの囲いの中だけ横にスクロールする（DESIGN §7）。コンテストの列は左に残る */}
          <div className="overflow-x-auto">
            <ProblemTable kind={kind} columns={table.data.columns} rows={table.data.rows} />
          </div>
        </Panel>
      )}

      {table.data && <Pagination page={page} total={table.data.totalPages} href={(p) => href(kind, p)} />}

      <p className="mt-4 text-xs text-ink-muted">
        difficulty は {DIFFICULTY_SOURCE}です。登録した問題は、プロフィールの設定に関係なく復習に出ます。
      </p>
    </Page>
  );
}
