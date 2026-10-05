/** プロフィールの行がまだなければ null（プロフィールの保存はステップ6で作る） */
export async function getAtcoderUserId(db: D1Database): Promise<string | null> {
  const row = await db
    .prepare("SELECT atcoder_user_id FROM profile WHERE id = 1")
    .first<{ atcoder_user_id: string | null }>();
  return row?.atcoder_user_id ?? null;
}
