import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import {
  buildRows,
  buildSyncSql,
  homeContest,
  sqlLiteral,
  type RawContest,
  type RawContestProblem,
  type RawModels,
  type RawProblem,
} from "../src/lib/problem-sync";

const contest = (id: string, start: number, title = id.toUpperCase()): RawContest => ({
  id,
  start_epoch_second: start,
  duration_second: 6000,
  title,
});
const problem = (id: string, contestId: string, index: string, name = `${id} の問題`): RawProblem => ({
  id,
  contest_id: contestId,
  problem_index: index,
  name,
  title: `${index}. ${name}`,
});
const member = (contestId: string, problemId: string, index: string): RawContestProblem => ({
  contest_id: contestId,
  problem_id: problemId,
  problem_index: index,
});

describe("homeContest（問題がどのコンテストに属するか）", () => {
  const start = new Map([
    ["abc042", 100],
    ["arc058", 100],
    ["abc306", 200],
    ["adt_all_20231128_1", 300],
    ["math-and-algorithm", 50],
    ["abc007", 60],
    ["jsc2019-qual", 70],
    ["DEGwer2023", 80],
    ["JAG2013Spring", 90],
    ["later", 95],
  ]);

  it("問題 ID の接頭辞と一致するコンテストを選ぶ（ADT などの再収録より優先）", () => {
    const m = [member("adt_all_20231128_1", "abc306_d", "G"), member("abc306", "abc306_d", "D")];
    expect(homeContest("abc306_d", m, start)).toEqual(member("abc306", "abc306_d", "D"));
  });

  it("ABC と ARC の同時開催の共通問題は ARC 側", () => {
    const m = [member("abc042", "arc058_a", "C"), member("arc058", "arc058_a", "C")];
    expect(homeContest("arc058_a", m, start)?.contest_id).toBe("arc058");
  });

  it("開始が早い再収録より、接頭辞の一致を優先する", () => {
    const m = [member("math-and-algorithm", "abc007_3", "AB"), member("abc007", "abc007_3", "C")];
    expect(homeContest("abc007_3", m, start)?.contest_id).toBe("abc007");
  });

  it("ハイフンは問題 ID ではアンダースコアになる", () => {
    const m = [member("jsc2019-qual", "jsc2019_qual_a", "A")];
    expect(homeContest("jsc2019_qual_a", m, start)?.contest_id).toBe("jsc2019-qual");
  });

  it("接頭辞が一致しなければ、開始がいちばん早いコンテスト（同時刻なら ID 順）", () => {
    expect(homeContest("1202Contest_a", [member("later", "1202Contest_a", "A"), member("DEGwer2023", "1202Contest_a", "A")], start)?.contest_id).toBe("DEGwer2023");
    expect(homeContest("x_a", [member("arc058", "x_a", "A"), member("abc042", "x_a", "A")], start)?.contest_id).toBe("abc042");
  });

  it("開始時刻が分からないコンテストは後回し", () => {
    expect(homeContest("y_a", [member("unknown", "y_a", "A"), member("JAG2013Spring", "y_a", "A")], start)?.contest_id).toBe("JAG2013Spring");
  });

  it("所属がなければ null", () => {
    expect(homeContest("z_a", [], start)).toBeNull();
  });
});

describe("buildRows", () => {
  const contests = [contest("abc306", 200), contest("adt_all_20231128_1", 300), contest("arc058", 100), contest("abc042", 100)];
  const problems = [
    problem("abc306_d", "adt_all_20231128_1", "G", "Poisonous Full-Course"),
    problem("abc306_h", "abc306", "Ex"),
    problem("arc058_a", "arc058", "C"),
    problem("orphan_a", "nowhere", "A"),
  ];
  const memberships = [
    member("abc306", "abc306_d", "D"),
    member("adt_all_20231128_1", "abc306_d", "G"),
    member("abc306", "abc306_h", "Ex"),
    member("abc042", "arc058_a", "C"),
    member("arc058", "arc058_a", "C"),
  ];
  const models: RawModels = {
    abc306_d: { difficulty: 596, is_experimental: false },
    abc306_h: { difficulty: 3200.4, is_experimental: true },
    arc058_a: { difficulty: -120 },
  };

  const rows = buildRows({ contests, problems, contestProblems: memberships, models });

  it("コンテストに kind を付ける", () => {
    expect(rows.contests.find((c) => c.id === "abc306")).toEqual({
      id: "abc306",
      title: "ABC306",
      startEpochSecond: 200,
      durationSecond: 6000,
      kind: "ABC",
    });
    expect(rows.contests.find((c) => c.id === "adt_all_20231128_1")?.kind).toBe("OTHER");
  });

  it("問題は元のコンテストと記号で入れる（problems.json の contest_id は使わない）", () => {
    expect(rows.problems.find((p) => p.id === "abc306_d")).toEqual({
      id: "abc306_d",
      contestId: "abc306",
      problemIndex: "D",
      indexNorm: "D",
      kind: "ABC",
      title: "Poisonous Full-Course",
      difficulty: 596,
      difficultyDisp: 596,
      isExperimental: false,
    });
  });

  it("Ex は index_norm が H、difficulty は補正して丸める", () => {
    const h = rows.problems.find((p) => p.id === "abc306_h");
    expect(h).toMatchObject({ problemIndex: "Ex", indexNorm: "H", difficulty: 3200.4, difficultyDisp: 3200, isExperimental: true });
    const arc = rows.problems.find((p) => p.id === "arc058_a");
    expect(arc).toMatchObject({ contestId: "arc058", kind: "ARC", difficulty: -120, difficultyDisp: Math.round(400 / Math.exp(520 / 400)) });
  });

  it("所属するコンテストが見つからない問題は飛ばす", () => {
    expect(rows.problems.some((p) => p.id === "orphan_a")).toBe(false);
    expect(rows.skipped).toEqual(["orphan_a"]);
  });

  it("所属の一覧になくても、problems.json のコンテストが存在すればそれを使う", () => {
    const r = buildRows({ contests, problems: [problem("abc306_a", "abc306", "A")], contestProblems: [], models: {} });
    expect(r.problems[0]).toMatchObject({ contestId: "abc306", problemIndex: "A", difficulty: null, difficultyDisp: null, isExperimental: false });
  });
});

describe("sqlLiteral", () => {
  it("文字列はシングルクォートを重ねる", () => {
    expect(sqlLiteral("Iroha's Obsession")).toBe("'Iroha''s Obsession'");
    expect(sqlLiteral("'; DROP TABLE problems; --")).toBe("'''; DROP TABLE problems; --'");
  });

  it("数値と NULL", () => {
    expect(sqlLiteral(12)).toBe("12");
    expect(sqlLiteral(-0.5)).toBe("-0.5");
    expect(sqlLiteral(null)).toBe("NULL");
  });

  it("有限でない数値と NUL 文字は拒否", () => {
    expect(() => sqlLiteral(Number.NaN)).toThrow();
    expect(() => sqlLiteral(Number.POSITIVE_INFINITY)).toThrow();
    expect(() => sqlLiteral("a\u0000b")).toThrow();
  });
});

describe("buildSyncSql（マイグレーション 0001 を当てた SQLite で流す）", () => {
  const migration = readFileSync(new URL("../migrations/0001_init.sql", import.meta.url), "utf8");
  const freshDb = () => {
    const db = new DatabaseSync(":memory:");
    db.exec(migration);
    return db;
  };
  const input = {
    contests: [contest("abc306", 200, "ABC 306"), contest("arc058", 100)],
    problems: [problem("abc306_d", "abc306", "D", "Poisonous Full-Course"), problem("arc058_a", "arc058", "C", "Iroha's Obsession")],
    contestProblems: [] as RawContestProblem[],
    models: { abc306_d: { difficulty: 596 } } as RawModels,
  };

  it("入れて、もう一度流すと変わった行だけ更新する", () => {
    const db = freshDb();
    db.exec(buildSyncSql(buildRows(input), "2026-10-01T00:00:00.000Z", 1));

    expect(db.prepare("SELECT id, kind, title, synced_at FROM contests ORDER BY id").all()).toEqual([
      { id: "abc306", kind: "ABC", title: "ABC 306", synced_at: "2026-10-01T00:00:00.000Z" },
      { id: "arc058", kind: "ARC", title: "ARC058", synced_at: "2026-10-01T00:00:00.000Z" },
    ]);
    expect(db.prepare("SELECT * FROM problems WHERE id = 'arc058_a'").get()).toMatchObject({
      title: "Iroha's Obsession",
      difficulty: null,
      difficulty_disp: null,
      is_experimental: 0,
    });
    expect(db.prepare("SELECT value FROM app_meta WHERE key = 'problems_synced_at'").get()).toEqual({
      value: "2026-10-01T00:00:00.000Z",
    });

    // 2回目: abc306_d の difficulty だけ変わる
    const changed = { ...input, models: { abc306_d: { difficulty: 610 } } };
    db.exec(buildSyncSql(buildRows(changed), "2026-10-08T00:00:00.000Z"));
    const rows = db.prepare("SELECT id, difficulty, synced_at FROM problems ORDER BY id").all();
    expect(rows).toEqual([
      { id: "abc306_d", difficulty: 610, synced_at: "2026-10-08T00:00:00.000Z" },
      { id: "arc058_a", difficulty: null, synced_at: "2026-10-01T00:00:00.000Z" },
    ]);
    expect(db.prepare("SELECT synced_at FROM contests WHERE id = 'abc306'").get()).toEqual({
      synced_at: "2026-10-01T00:00:00.000Z",
    });
    expect(db.prepare("SELECT value FROM app_meta WHERE key = 'problems_synced_at'").get()).toEqual({
      value: "2026-10-08T00:00:00.000Z",
    });
  });

  it("何も変わらなければ、どの行も更新しない", () => {
    const db = freshDb();
    const sql = buildSyncSql(buildRows(input), "2026-10-01T00:00:00.000Z");
    db.exec(sql);
    const before = db.prepare("SELECT total_changes() AS n").get() as { n: number };
    db.exec(buildSyncSql(buildRows(input), "2026-10-08T00:00:00.000Z"));
    const after = db.prepare("SELECT total_changes() AS n").get() as { n: number };
    expect(after.n - before.n).toBe(1); // app_meta の1行だけ
  });
});
