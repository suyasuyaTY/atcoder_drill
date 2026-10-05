import { zValidator } from "@hono/zod-validator";
import type { ValidationTargets } from "hono";
import type { ZodType } from "zod";
import { apiError } from "./errors";

/** zod で入力を検証する。失敗したら 400 と `{ error }`（SPEC §8） */
export const validate = <T extends ZodType, Target extends keyof ValidationTargets>(target: Target, schema: T) =>
  zValidator(target, schema, (result, c) => {
    if (!result.success) {
      const issue = result.error.issues[0];
      const where = issue && issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
      return apiError(c, 400, "invalid_request", `入力が正しくありません（${where}${issue?.message ?? "不明"}）`);
    }
  });
