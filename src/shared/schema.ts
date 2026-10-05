/**
 * API の入力のスキーマ。サーバーの検証とクライアントの型の両方で使う。
 */

import { z } from "zod";
import { CONTEST_KINDS, FRESH_INDEX_OPTIONS, SESSION_KINDS } from "../lib/contest";
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

const uniqueArray = <T extends z.ZodType>(item: T, max: number) =>
  z
    .array(item)
    .max(max)
    .refine((a) => new Set(a).size === a.length, { message: "同じ値が2回入っている" });

const indexOf = (kind: keyof typeof FRESH_INDEX_OPTIONS) =>
  uniqueArray(z.enum(FRESH_INDEX_OPTIONS[kind] as [string, ...string[]]), FRESH_INDEX_OPTIONS[kind].length);

const difficulty = z.number().int().min(0).max(5000).nullable();

/** プロフィール（SPEC §5） */
export const profileBody = z
  .strictObject({
    /** 表示名に使うだけ（提出データは使わない。SPEC §2.1） */
    atcoderUserId: z
      .string()
      .regex(/^[A-Za-z0-9_]{3,16}$/)
      .nullable(),
    targets: z.strictObject({
      ABC: indexOf("ABC"),
      ARC: indexOf("ARC"),
      AGC: indexOf("AGC"),
      OTHER: uniqueArray(atcoderId, 200),
    }),
    minDifficulty: difficulty,
    maxDifficulty: difficulty,
    freshQuota: z.number().int().min(0).max(3),
  })
  .refine((p) => p.minDifficulty === null || p.maxDifficulty === null || p.minDifficulty < p.maxDifficulty, {
    message: "difficulty の下限は上限より小さくする",
    path: ["maxDifficulty"],
  });
export type ProfileBody = z.infer<typeof profileBody>;

export const contestsQuery = z.object({
  q: z.string().trim().min(1).max(50),
});

/** エラーのレスポンス（SPEC §8） */
export type ErrorBody = { error: { code: string; message: string } };
