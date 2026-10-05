/**
 * 問題データの同期（SPEC §14.1）。AtCoder Problems（kenkoooo）から取得し、UPSERT の SQL を D1 に流す。
 *
 *   npm run sync:problems -- --local     ローカルの D1
 *   npm run sync:problems -- --remote    本番の D1（人か GitHub Actions が実行する）
 *   npm run sync:problems -- --local --dry-run   SQL を作るだけで流さない
 *
 * ログには件数だけを出す（DB の中身は出さない。SPEC §16）。
 */

import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { z } from "zod";
import { buildRows, buildSyncSql } from "../src/lib/problem-sync";

const BASE = "https://kenkoooo.com/atcoder/resources";
const USER_AGENT = "atcoder-drill-sync (+https://github.com/suyasuyaTY/atcoder_drill)";
/** これより少なければ取得がおかしいとみなして止める */
const MIN_PROBLEMS = 1000;

const contestsSchema = z.array(
  z.object({ id: z.string(), start_epoch_second: z.number(), duration_second: z.number(), title: z.string() }),
);
const problemsSchema = z.array(
  z.object({ id: z.string(), contest_id: z.string(), problem_index: z.string(), name: z.string(), title: z.string() }),
);
const contestProblemsSchema = z.array(
  z.object({ contest_id: z.string(), problem_id: z.string(), problem_index: z.string() }),
);
const modelsSchema = z.record(
  z.string(),
  z.object({ difficulty: z.number().optional(), is_experimental: z.boolean().optional() }),
);

function parseArgs(argv: readonly string[]) {
  const local = argv.includes("--local");
  const remote = argv.includes("--remote");
  const unknown = argv.filter((a) => !["--local", "--remote", "--dry-run"].includes(a));
  if (local === remote || unknown.length > 0) {
    console.error("usage: sync-problems.ts (--local | --remote) [--dry-run]");
    process.exit(2);
  }
  return { target: local ? ("--local" as const) : ("--remote" as const), dryRun: argv.includes("--dry-run") };
}

async function fetchJson<T>(name: string, schema: z.ZodType<T>): Promise<T> {
  const res = await fetch(`${BASE}/${name}`, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
  return schema.parse(await res.json());
}

async function main() {
  const { target, dryRun } = parseArgs(process.argv.slice(2));

  console.log("取得中: contests / problems / contest-problem / problem-models");
  const [contests, problems, contestProblems, models] = await Promise.all([
    fetchJson("contests.json", contestsSchema),
    fetchJson("problems.json", problemsSchema),
    fetchJson("contest-problem.json", contestProblemsSchema),
    fetchJson("problem-models.json", modelsSchema),
  ]);

  const rows = buildRows({ contests, problems, contestProblems, models });
  console.log(
    `コンテスト ${rows.contests.length} 件、問題 ${rows.problems.length} 件（所属が見つからず飛ばした問題 ${rows.skipped.length} 件）`,
  );
  if (rows.problems.length < MIN_PROBLEMS) {
    throw new Error(`問題が ${rows.problems.length} 件しかない。取得に失敗した可能性があるので止める`);
  }

  const dir = mkdtempSync(join(tmpdir(), "atcoder-drill-sync-"));
  const file = join(dir, "sync.sql");
  try {
    writeFileSync(file, buildSyncSql(rows, new Date().toISOString()));
    if (dryRun) {
      console.log(`--dry-run: SQL を ${file} に書いた（流していない）`);
      return;
    }
    console.log(`D1 に流す（${target}）`);
    const r = spawnSync("npx", ["wrangler", "d1", "execute", "DB", target, "--file", file, "--yes"], {
      stdio: "inherit",
    });
    if (r.status !== 0) throw new Error(`wrangler d1 execute が失敗した（終了コード ${r.status}）`);
    console.log("完了");
  } finally {
    if (!dryRun) rmSync(dir, { recursive: true, force: true });
  }
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
