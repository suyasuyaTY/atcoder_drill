/**
 * 初見の候補（SPEC §5・§6.2）。条件は eligibility.ts の buildFreshQuery だけで作る。
 */

import type { SessionKind } from "../../lib/contest";
import { buildFreshQuery, type FreshProfile } from "../../lib/eligibility";

export async function countFresh(db: D1Database, profile: FreshProfile, kind: SessionKind): Promise<number> {
  const q = buildFreshQuery(profile, kind);
  const row = await db
    .prepare(`SELECT count(*) AS n FROM problems p WHERE ${q.where}`)
    .bind(...q.binds)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

/** 候補を ID 順に並べたときの offset 番目の問題（抽選は pickDistinct で選んだ offset を渡す） */
export async function freshAt(
  db: D1Database,
  profile: FreshProfile,
  kind: SessionKind,
  offset: number,
): Promise<{ id: string } | null> {
  const q = buildFreshQuery(profile, kind);
  return db
    .prepare(`SELECT p.id FROM problems p WHERE ${q.where} ORDER BY p.id LIMIT 1 OFFSET ?`)
    .bind(...q.binds, offset)
    .first<{ id: string }>();
}
