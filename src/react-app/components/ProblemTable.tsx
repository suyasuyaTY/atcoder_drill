import { Link } from "react-router";
import type { ContestKind } from "../../lib/contest";
import type { CellStatus } from "../../lib/eligibility";
import { problemUrl } from "../../lib/problem-id";
import { DifficultyDot } from "./DifficultyDot";
import styles from "./ProblemTable.module.css";

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

/**
 * 問題表（DESIGN §4）。ABC / ARC / AGC は問題記号の列にそろえる。
 * その他は記号がコンテストごとにばらばらなので、行の中に問題を並べて折り返す。
 */
export function ProblemTable({ kind, columns, rows }: { kind: ContestKind; columns: string[] | null; rows: Row[] }) {
  const contestLabel = (id: string) => (kind === "OTHER" ? id : id.toUpperCase());

  if (columns === null) {
    return (
      <table className={`${styles.table} ${styles.other}`}>
        <thead>
          <tr>
            <th scope="col" className={styles.contestCol}>
              コンテスト
            </th>
            <th scope="col">問題</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.contestId}>
              <th scope="row" className={styles.contest} title={r.title}>
                {contestLabel(r.contestId)}
              </th>
              <td className={styles.flow}>
                {r.problems.map((p) => (
                  <ProblemCell key={p.id} contestId={r.contestId} cell={p} showIndex />
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  return (
    <table className={styles.table} style={{ minWidth: 84 + columns.length * 120 }}>
      <colgroup>
        <col className={styles.contestCol} />
        {columns.map((c) => (
          <col key={c} />
        ))}
      </colgroup>
      <thead>
        <tr>
          <th scope="col">コンテスト</th>
          {columns.map((c) => (
            <th key={c} scope="col">
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.contestId}>
            <th scope="row" className={styles.contest} title={r.title}>
              {contestLabel(r.contestId)}
            </th>
            {columns.map((c) => {
              const cells = r.problems.filter((p) => p.indexNorm === c);
              return (
                <td key={c} className={styles.td}>
                  {cells.map((p) => (
                    <ProblemCell key={p.id} contestId={r.contestId} cell={p} showIndex={cells.length > 1} />
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

function statusClass(s: CellStatus): string {
  switch (s.state) {
    case "fresh":
      return styles.fresh!;
    case "off":
      return styles.off!;
    case "waiting":
      return s.streak === 0 ? styles.streak0! : styles.streak1!;
    case "unlocked":
      return `${s.streak === 0 ? styles.streak0 : styles.streak1} ${styles.unlocked}`;
    case "graduated":
      return styles.graduated!;
  }
}

function ProblemCell({ contestId, cell, showIndex }: { contestId: string; cell: Cell; showIndex: boolean }) {
  const to = cell.cardId !== null ? `/cards/${cell.cardId}` : `/register?q=${encodeURIComponent(problemUrl(contestId, cell.id))}`;
  const streak = "streak" in cell.status ? ` ・ streak ${cell.status.streak}` : "";
  return (
    <Link
      to={to}
      className={`${styles.cell} ${statusClass(cell.status)}`}
      title={`${cell.problemIndex}. ${cell.title}（${statusText(cell.status)}${streak}）`}
    >
      <span className={styles.line1}>
        <DifficultyDot value={cell.difficulty} showValue={false} />
        <span className={styles.cellTitle}>
          {showIndex && <span className={styles.cellIndex}>{cell.problemIndex}</span>}
          {cell.title}
        </span>
      </span>
      <span className={styles.line2}>{statusText(cell.status)}</span>
    </Link>
  );
}
