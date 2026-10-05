/**
 * プロフィール（SPEC §5）。行は1つだけ（id = 1）。まだなければ既定値として扱う。
 */

import { z } from "zod";
import { CONTEST_KINDS } from "../../lib/contest";
import { DEFAULT_PROFILE, type FreshProfile } from "../../lib/eligibility";
import type { ProfileBody } from "../../shared/schema";

/** 保存してある fresh_targets（JSON）。壊れていたら既定値に戻す */
const storedTargets = z.object(
  Object.fromEntries(CONTEST_KINDS.map((k) => [k, z.array(z.string())])) as Record<
    (typeof CONTEST_KINDS)[number],
    z.ZodArray<z.ZodString>
  >,
);

interface ProfileRow {
  atcoder_user_id: string | null;
  fresh_targets: string;
  min_difficulty: number | null;
  max_difficulty: number | null;
  fresh_quota: number;
}

export interface Profile {
  atcoderUserId: string | null;
  fresh: FreshProfile;
}

export async function getProfile(db: D1Database): Promise<Profile> {
  const row = await db
    .prepare(
      "SELECT atcoder_user_id, fresh_targets, min_difficulty, max_difficulty, fresh_quota FROM profile WHERE id = 1",
    )
    .first<ProfileRow>();
  if (!row) return { atcoderUserId: null, fresh: DEFAULT_PROFILE };

  let targets = DEFAULT_PROFILE.targets;
  try {
    const parsed = storedTargets.safeParse(JSON.parse(row.fresh_targets));
    if (parsed.success) targets = parsed.data;
  } catch {
    // 既定値のまま
  }
  return {
    atcoderUserId: row.atcoder_user_id,
    fresh: {
      targets,
      minDifficulty: row.min_difficulty,
      maxDifficulty: row.max_difficulty,
      freshQuota: row.fresh_quota,
    },
  };
}

export async function getAtcoderUserId(db: D1Database): Promise<string | null> {
  return (await getProfile(db)).atcoderUserId;
}

export async function saveProfile(db: D1Database, p: ProfileBody, now: Date): Promise<void> {
  await db
    .prepare(
      `INSERT INTO profile (id, atcoder_user_id, fresh_targets, min_difficulty, max_difficulty, fresh_quota, updated_at)
       VALUES (1, ?1, ?2, ?3, ?4, ?5, ?6)
       ON CONFLICT (id) DO UPDATE SET atcoder_user_id = ?1, fresh_targets = ?2, min_difficulty = ?3,
         max_difficulty = ?4, fresh_quota = ?5, updated_at = ?6`,
    )
    .bind(p.atcoderUserId, JSON.stringify(p.targets), p.minDifficulty, p.maxDifficulty, p.freshQuota, now.toISOString())
    .run();
}

export interface OtherContest {
  id: string;
  title: string;
  problemCount: number;
}

/** その他のコンテスト（kind = OTHER）を ID で引く。存在しないものは返さない */
export async function otherContestsByIds(db: D1Database, ids: readonly string[]): Promise<OtherContest[]> {
  if (ids.length === 0) return [];
  const { results } = await db
    .prepare(
      `SELECT c.id, c.title, (SELECT count(*) FROM problems p WHERE p.contest_id = c.id) AS problemCount
       FROM contests c WHERE c.kind = 'OTHER' AND c.id IN (SELECT value FROM json_each(?))
       ORDER BY c.start_epoch_second DESC`,
    )
    .bind(JSON.stringify(ids))
    .all<OtherContest>();
  return results;
}

/** その他のコンテストの検索（ID・名前の部分一致。問題が1問以上あるものを、新しい順に20件まで） */
export async function searchOtherContests(db: D1Database, q: string): Promise<OtherContest[]> {
  const pattern = `%${q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
  const { results } = await db
    .prepare(
      `SELECT c.id, c.title, count(p.id) AS problemCount
       FROM contests c JOIN problems p ON p.contest_id = c.id
       WHERE c.kind = 'OTHER' AND (c.id LIKE ?1 ESCAPE '\\' OR c.title LIKE ?1 ESCAPE '\\')
       GROUP BY c.id ORDER BY c.start_epoch_second DESC LIMIT 20`,
    )
    .bind(pattern)
    .all<OtherContest>();
  return results;
}
