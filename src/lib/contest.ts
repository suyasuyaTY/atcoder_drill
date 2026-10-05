/**
 * コンテストの種類（kind）。種類の一覧はこのファイルだけで定義する（SPEC §4）。
 */

export const CONTEST_KINDS = ["ABC", "ARC", "AGC", "OTHER"] as const;
export type ContestKind = (typeof CONTEST_KINDS)[number];

/** セッションの種類。コンテストの種類に「すべて」を足したもの */
export const SESSION_KINDS = [...CONTEST_KINDS, "ALL"] as const;
export type SessionKind = (typeof SESSION_KINDS)[number];

export const KIND_LABELS: Readonly<Record<SessionKind, string>> = {
  ABC: "ABC",
  ARC: "ARC",
  AGC: "AGC",
  OTHER: "その他",
  ALL: "すべて",
};

/** OTHER 以外の判定。上から順に試す */
const KIND_PATTERNS: readonly (readonly [Exclude<ContestKind, "OTHER">, RegExp])[] = [
  ["ABC", /^abc\d+$/],
  ["ARC", /^arc\d+$/],
  ["AGC", /^agc\d+$/],
];

export function contestKind(contestId: string): ContestKind {
  for (const [kind, pattern] of KIND_PATTERNS) {
    if (pattern.test(contestId)) return kind;
  }
  return "OTHER";
}

export function isContestKind(value: unknown): value is ContestKind {
  return typeof value === "string" && (CONTEST_KINDS as readonly string[]).includes(value);
}

export function isSessionKind(value: unknown): value is SessionKind {
  return typeof value === "string" && (SESSION_KINDS as readonly string[]).includes(value);
}

/**
 * 問題記号の正規化（SPEC §4.1）。`Ex` は `H`、それ以外は先頭の英大文字1文字（`F2` → `F`）。
 * 英大文字がない記号はそのまま返す。
 */
export function normalizeIndex(problemIndex: string): string {
  if (problemIndex === "Ex") return "H";
  const m = /[A-Z]/.exec(problemIndex);
  return m ? m[0] : problemIndex;
}

/** 問題表の基本の列（SPEC §9）。表示中のコンテストにほかの記号があれば足す */
const TABLE_BASE_COLUMNS: Readonly<Record<Exclude<ContestKind, "OTHER">, readonly string[]>> = {
  ABC: ["A", "B", "C", "D", "E", "F", "G"],
  ARC: ["A", "B", "C", "D", "E", "F"],
  AGC: ["A", "B", "C", "D", "E", "F"],
};

/**
 * 問題表の列（index_norm）。OTHER は記号がコンテストごとにばらばらなので列を持たない（null）。
 * 同じ列に複数の問題が入ることがある（`F` と `F2`）。
 */
export function tableColumns(kind: ContestKind, indexNorms: readonly string[]): string[] | null {
  if (kind === "OTHER") return null;
  const cols = new Set([...TABLE_BASE_COLUMNS[kind], ...indexNorms]);
  return [...cols].sort((a, b) => a.length - b.length || (a < b ? -1 : a > b ? 1 : 0));
}
