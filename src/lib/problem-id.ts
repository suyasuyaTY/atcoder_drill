/**
 * 登録画面の入力（AtCoder の URL か短縮形）の解析（SPEC §7.1）。
 */

export type ParsedInput =
  | { type: "contest"; contestId: string }
  /** 短縮形の問題 ID ではコンテストが分からないので null（problems.contest_id から引く） */
  | { type: "problem"; contestId: string | null; problemId: string };

const ID = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;
const URL_PATH = /^\/contests\/([^/]+)(?:\/tasks\/([^/]+))?(?:\/.*)?$/;

export function parseProblemInput(input: string): ParsedInput | null {
  const text = input.trim();
  if (text === "") return null;

  if (/^(https?:\/\/)?atcoder\.jp\//i.test(text)) return parseUrl(text);

  // 短縮形: `ABC306`（コンテスト）、`abc306_d`（問題）。小文字にそろえるので、引くときは大文字小文字を区別しない
  const id = text.toLowerCase();
  if (!ID.test(id)) return null;
  return id.includes("_") ? { type: "problem", contestId: null, problemId: id } : { type: "contest", contestId: id };
}

function parseUrl(text: string): ParsedInput | null {
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    return null;
  }
  if (url.hostname !== "atcoder.jp") return null;

  const m = URL_PATH.exec(url.pathname);
  if (!m) return null;
  // AtCoder の ID は大文字を含むことがある（APG4b）ので、URL の値はそのまま使う
  const contestId = m[1]!;
  const task = m[2];
  if (!ID.test(contestId)) return null;
  if (task === undefined) {
    // `/contests/abc306/tasks/` のように問題 ID が空なら解釈しない
    return /\/tasks\/$/.test(url.pathname) ? null : { type: "contest", contestId };
  }
  if (!ID.test(task)) return null;
  return { type: "problem", contestId, problemId: task };
}
