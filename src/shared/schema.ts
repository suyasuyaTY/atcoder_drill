/**
 * API の入力のスキーマ。サーバーの検証とクライアントの型の両方で使う。
 */

import { z } from "zod";
import { CONTEST_KINDS, SESSION_KINDS } from "../lib/contest";
import { GRADES, type Grade } from "../lib/scheduler";

/** AtCoder のコンテスト ID・問題 ID（大文字を含むことがある） */
const atcoderId = z.string().max(100).regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/);

const positiveInt = z
  .string()
  .regex(/^[1-9]\d{0,15}$/)
  .transform(Number);

export const grade = z.enum(GRADES as readonly [Grade, ...Grade[]]);

export const loginBody = z.strictObject({
  token: z.string().min(1).max(1024),
});
export type LoginBody = z.infer<typeof loginBody>;

export const lookupQuery = z.object({
  q: z.string().min(1).max(500),
});

const registerItem = z
  .strictObject({
    problemId: atcoderId,
    grade,
    note: z.string().max(1000).optional(),
    /** 問題データが未同期のときだけ。手入力のタイトルと、その問題のコンテスト */
    title: z.string().trim().min(1).max(200).optional(),
    contestId: atcoderId.optional(),
  })
  .refine((i) => (i.title === undefined) === (i.contestId === undefined), {
    message: "title と contestId は組で渡す",
  });

export const registerBody = z.strictObject({
  items: z
    .array(registerItem)
    .min(1)
    .max(100)
    .refine((items) => new Set(items.map((i) => i.problemId)).size === items.length, {
      message: "同じ問題が2回入っている",
    }),
});
export type RegisterBody = z.infer<typeof registerBody>;
export type RegisterItem = RegisterBody["items"][number];

export const cardIdParam = z.object({ cardId: positiveInt });

export const tableQuery = z.object({
  kind: z.enum(CONTEST_KINDS).default("ABC"),
  page: positiveInt.pipe(z.number().max(10000)).default(1),
});

export const homeQuery = z.object({
  kind: z.enum(SESSION_KINDS).default("ALL"),
});

export const createSessionBody = z.strictObject({
  kind: z.enum(SESSION_KINDS),
});

export const positionParam = z.object({
  position: z
    .string()
    .regex(/^[1-3]$/)
    .transform(Number),
});

export const gradeBody = z.strictObject({
  grade,
  note: z.string().max(1000).optional(),
});
export type GradeBody = z.infer<typeof gradeBody>;

/** デバッグツール（SPEC §13） */
export const debugClockBody = z.strictObject({
  addDays: z
    .number()
    .int()
    .min(-3650)
    .max(3650)
    .refine((d) => d !== 0, { message: "0 日はずらせない" }),
});

export const debugUnlockBody = z.strictObject({
  /** カード ID か問題 ID */
  target: z.string().trim().min(1).max(100),
});

/** エラーのレスポンス（SPEC §8） */
export type ErrorBody = { error: { code: string; message: string } };
