import { Link, useSearchParams } from "react-router";
import { CONTEST_KINDS, KIND_LABELS, isContestKind, type ContestKind } from "../../lib/contest";
import { DIFFICULTY_SOURCE } from "../../lib/difficulty";
import { useTable } from "../api";
import { Notice } from "../components/Notice";
import { ProblemTable } from "../components/ProblemTable";
import { usePageTitle } from "../hooks/usePageTitle";
import styles from "./TablePage.module.css";

const LEGEND = [
  { cls: "fresh", label: "未登録・初見に出る" },
  { cls: "off", label: "未登録・出ない" },
  { cls: "streak0", label: "streak 0" },
  { cls: "streak1", label: "streak 1" },
  { cls: "graduated", label: "卒業" },
  { cls: "unlocked", label: "解禁中" },
] as const;

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
    <main className="page page-table">
      <h1>問題表</h1>
      <div className={styles.toolbar}>
        <nav className={styles.tabs} aria-label="コンテストの種類">
          {CONTEST_KINDS.map((k) => (
            <Link key={k} to={href(k, 1)} className={styles.tab} aria-current={k === kind ? "page" : undefined}>
              {KIND_LABELS[k]}
            </Link>
          ))}
        </nav>
        <ul className={styles.legend} aria-label="凡例">
          {LEGEND.map((l) => (
            <li key={l.cls}>
              <span className={`${styles.swatch} ${styles[l.cls]}`} aria-hidden="true" />
              {l.label}
            </li>
          ))}
        </ul>
      </div>

      {table.isError ? (
        <Notice role="alert">{table.error.message}</Notice>
      ) : table.isPending ? (
        <div className={`panel ${styles.skeleton}`} aria-busy="true" />
      ) : table.data.rows.length === 0 ? (
        <section className="panel">
          <p className="muted">
            {kind === "OTHER"
              ? "その他のコンテストは、プロフィールで選んだコンテストと、登録した問題があるコンテストだけを表示します。"
              : "表示するコンテストがありません。問題データを同期してください。"}
          </p>
        </section>
      ) : (
        <section className="panel" aria-busy={table.isPlaceholderData}>
          {/* 表はこの囲いの中だけ横にスクロールする（DESIGN §7）。コンテストの列は左に残る */}
          <div className={styles.scroll}>
            <ProblemTable kind={kind} columns={table.data.columns} rows={table.data.rows} />
          </div>
        </section>
      )}

      {table.data && (
        <nav className={styles.pager} aria-label="ページ">
          {page > 1 ? <Link to={href(kind, page - 1)}>新しい 20件</Link> : <span className="muted">新しい 20件</span>}
          <span className="muted">
            {page} / {table.data.totalPages}
          </span>
          {page < table.data.totalPages ? (
            <Link to={href(kind, page + 1)}>古い 20件</Link>
          ) : (
            <span className="muted">古い 20件</span>
          )}
        </nav>
      )}

      <p className={styles.note}>
        difficulty は {DIFFICULTY_SOURCE}です。登録した問題は、プロフィールの設定に関係なく復習に出ます。
      </p>
    </main>
  );
}
