/**
 * 問題データの同期（SPEC §14.1）の変換と SQL の組み立て。取得と実行は scripts/sync-problems.ts が行う。
 */

import { contestKind, normalizeIndex, type ContestKind } from "./contest";
import { displayDifficulty } from "./difficulty";

/** kenkoooo の contests.json の1件（使う項目だけ） */
export interface RawContest {
  id: string;
  start_epoch_second: number;
  duration_second: number;
  title: string;
}

/** problems.json の1件。contest_id は元のコンテストとは限らない（ADT などの再収録のことがある） */
export interface RawProblem {
  id: string;
  contest_id: string;
  problem_index: string;
  name: string;
  title: string;
}

/** contest-problem.json の1件。1問が複数のコンテストに収録されていることがある */
export interface RawContestProblem {
  contest_id: string;
  problem_id: string;
  problem_index: string;
}

/** problem-models.json（問題 ID → モデル） */
export type RawModels = Record<string, { difficulty?: number; is_experimental?: boolean }>;

export interface ContestRow {
  id: string;
  title: string;
  startEpochSecond: number;
  durationSecond: number;
  kind: ContestKind;
}

export interface ProblemRow {
  id: string;
  contestId: string;
  problemIndex: string;
  indexNorm: string;
  kind: ContestKind;
  title: string;
  difficulty: number | null;
  difficultyDisp: number | null;
  isExperimental: boolean;
}

/**
 * 問題が属するコンテストを1つ決める。
 * 1. 問題 ID の接頭辞と一致するコンテスト（`abc306_d` → `abc306`、`jsc2019_qual_a` → `jsc2019-qual`）
 * 2. なければ、開始がいちばん早いコンテスト（同時刻なら ID 順）
 * ABC と ARC の同時開催の共通問題（`arc058_a`）は 1 で ARC 側になる。
 */
export function homeContest(
  problemId: string,
  memberships: readonly RawContestProblem[],
  startOf: ReadonlyMap<string, number>,
): RawContestProblem | null {
  const byPrefix = memberships.find((m) => problemId.startsWith(`${m.contest_id.replace(/-/g, "_")}_`));
  if (byPrefix) return byPrefix;
  const start = (id: string) => startOf.get(id) ?? Infinity;
  const sorted = [...memberships].sort(
    (a, b) => start(a.contest_id) - start(b.contest_id) || (a.contest_id < b.contest_id ? -1 : 1),
  );
  return sorted[0] ?? null;
}

export function buildRows(input: {
  contests: readonly RawContest[];
  problems: readonly RawProblem[];
  contestProblems: readonly RawContestProblem[];
  models: RawModels;
}): { contests: ContestRow[]; problems: ProblemRow[]; skipped: string[] } {
  const contests: ContestRow[] = input.contests.map((c) => ({
    id: c.id,
    title: c.title,
    startEpochSecond: c.start_epoch_second,
    durationSecond: c.duration_second,
    kind: contestKind(c.id),
  }));
  const startOf = new Map(input.contests.map((c) => [c.id, c.start_epoch_second]));

  const membershipsOf = new Map<string, RawContestProblem[]>();
  for (const m of input.contestProblems) {
    if (!startOf.has(m.contest_id)) continue;
    const list = membershipsOf.get(m.problem_id);
    if (list) list.push(m);
    else membershipsOf.set(m.problem_id, [m]);
  }

  const problems: ProblemRow[] = [];
  const skipped: string[] = [];
  for (const p of input.problems) {
    const fallback = startOf.has(p.contest_id) ? [{ contest_id: p.contest_id, problem_id: p.id, problem_index: p.problem_index }] : [];
    const home = homeContest(p.id, membershipsOf.get(p.id) ?? fallback, startOf);
    if (!home) {
      skipped.push(p.id);
      continue;
    }
    const model = input.models[p.id];
    const difficulty = typeof model?.difficulty === "number" ? model.difficulty : null;
    problems.push({
      id: p.id,
      contestId: home.contest_id,
      problemIndex: home.problem_index,
      indexNorm: normalizeIndex(home.problem_index),
      kind: contestKind(home.contest_id),
      title: p.name,
      difficulty,
      difficultyDisp: displayDifficulty(difficulty),
      isExperimental: model?.is_experimental === true,
    });
  }
  return { contests, problems, skipped };
}

/** SQL のリテラル。同期スクリプトは SQL ファイルを流すので bind() を使えない。文字列はここでだけ埋め込む */
export function sqlLiteral(value: string | number | null): string {
  if (value === null) return "NULL";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new RangeError(`sqlLiteral: 有限でない数値: ${value}`);
    return String(value);
  }
  if (value.includes("\u0000")) throw new RangeError("sqlLiteral: NUL 文字を含む文字列");
  return `'${value.replace(/'/g, "''")}'`;
}

function upsert(
  table: string,
  columns: readonly string[],
  /** 変わっていたら更新する列（synced_at は変わったときだけ更新する） */
  compared: readonly string[],
  rows: readonly (readonly (string | number | null)[])[],
  chunk: number,
): string[] {
  const set = [...compared, "synced_at"].map((c) => `${c} = excluded.${c}`).join(", ");
  const where = compared.map((c) => `${table}.${c} IS NOT excluded.${c}`).join(" OR ");
  const statements: string[] = [];
  for (let i = 0; i < rows.length; i += chunk) {
    const values = rows
      .slice(i, i + chunk)
      .map((r) => `(${r.map(sqlLiteral).join(", ")})`)
      .join(",\n");
    statements.push(
      `INSERT INTO ${table} (${columns.join(", ")}) VALUES\n${values}\nON CONFLICT (id) DO UPDATE SET ${set} WHERE ${where};`,
    );
  }
  return statements;
}

/**
 * 同期の SQL。値が変わった行だけ更新し（ON CONFLICT ... WHERE）、最後に problems_synced_at を更新する。
 * 行は削除しない（AtCoder Problems から消えた問題も残す）。
 * chunk は1文あたりの行数。D1 の1文の長さの上限（100KB）に収まるようにする。
 */
export function buildSyncSql(
  rows: { contests: readonly ContestRow[]; problems: readonly ProblemRow[] },
  syncedAt: string,
  chunk = 100,
): string {
  const contestSql = upsert(
    "contests",
    ["id", "title", "start_epoch_second", "duration_second", "kind", "synced_at"],
    ["title", "start_epoch_second", "duration_second", "kind"],
    rows.contests.map((c) => [c.id, c.title, c.startEpochSecond, c.durationSecond, c.kind, syncedAt]),
    chunk,
  );
  const problemSql = upsert(
    "problems",
    [
      "id",
      "contest_id",
      "problem_index",
      "index_norm",
      "kind",
      "title",
      "difficulty",
      "difficulty_disp",
      "is_experimental",
      "synced_at",
    ],
    ["contest_id", "problem_index", "index_norm", "kind", "title", "difficulty", "difficulty_disp", "is_experimental"],
    rows.problems.map((p) => [
      p.id,
      p.contestId,
      p.problemIndex,
      p.indexNorm,
      p.kind,
      p.title,
      p.difficulty,
      p.difficultyDisp,
      p.isExperimental ? 1 : 0,
      syncedAt,
    ]),
    chunk,
  );
  const meta = `INSERT INTO app_meta (key, value) VALUES ('problems_synced_at', ${sqlLiteral(syncedAt)}) ON CONFLICT (key) DO UPDATE SET value = excluded.value;`;
  return [...contestSql, ...problemSql, meta].join("\n");
}
