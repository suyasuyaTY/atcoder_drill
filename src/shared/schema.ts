/**
 * API の入力のスキーマ。サーバーの検証とクライアントの型の両方で使う。
 */

import { z } from "zod";

export const loginBody = z.strictObject({
  token: z.string().min(1).max(1024),
});
export type LoginBody = z.infer<typeof loginBody>;

/** エラーのレスポンス（SPEC §8） */
export type ErrorBody = { error: { code: string; message: string } };
