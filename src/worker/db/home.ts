import type { ContestKind, SessionKind } from "../../lib/contest";

/** 種類ごとの、解禁中の復習の数 */
export async function unlockedCountsByKind(db: D1Database, now: Date): Promise<Partial<Record<ContestKind, number>>> {
  const { results } = await db
    .prepare(
      "SELECT kind, count(*) AS n FROM cards WHERE graduated_at IS NULL AND next_review_at <= ? GROUP BY kind",
    )
    .bind(now.toISOString())
    .all<{ kind: ContestKind; n: number }>();
  return Object.fromEntries(results.map((r) => [r.kind, r.n]));
}

export interface CardStats {
  active: number;
  unlocked: number;
  graduated: number;
}

export async function cardStats(db: D1Database, now: Date): Promise<CardStats> {
  const row = await db
    .prepare(
      `SELECT count(*) FILTER (WHERE graduated_at IS NULL) AS active,
              count(*) FILTER (WHERE graduated_at IS NULL AND next_review_at <= ?) AS unlocked,
              count(*) FILTER (WHERE graduated_at IS NOT NULL) AS graduated
       FROM cards`,
    )
    .bind(now.toISOString())
    .first<CardStats>();
  return row ?? { active: 0, unlocked: 0, graduated: 0 };
}

/** その種類で、次に解禁される日時（解禁中のものは除く） */
export async function nextUnlockAt(db: D1Database, kind: SessionKind, now: Date): Promise<string | null> {
  const row = await db
    .prepare(
      `SELECT min(next_review_at) AS at FROM cards
       WHERE graduated_at IS NULL AND next_review_at > ?1 AND (?2 = 'ALL' OR kind = ?2)`,
    )
    .bind(now.toISOString(), kind)
    .first<{ at: string | null }>();
  return row?.at ?? null;
}

export async function sessionProgress(db: D1Database, sessionId: number): Promise<{ total: number; graded: number }> {
  const row = await db
    .prepare(
      `SELECT count(*) AS total,
              count(*) FILTER (WHERE EXISTS (SELECT 1 FROM attempts a WHERE a.session_id = si.session_id AND a.card_id = si.card_id)) AS graded
       FROM session_items si WHERE si.session_id = ?`,
    )
    .bind(sessionId)
    .first<{ total: number; graded: number }>();
  return row ?? { total: 0, graded: 0 };
}
