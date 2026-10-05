export type MetaKey = "problems_synced_at" | "user_ac_synced_epoch" | "debug_clock_offset_days";

export async function getMeta(db: D1Database, key: MetaKey): Promise<string | null> {
  const row = await db.prepare("SELECT value FROM app_meta WHERE key = ?").bind(key).first<{ value: string }>();
  return row?.value ?? null;
}
