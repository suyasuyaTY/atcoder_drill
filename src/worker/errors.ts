import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { ErrorBody } from "../shared/schema";

/** エラーのレスポンス（SPEC §8）: `{ error: { code, message } }` */
export function apiError<S extends ContentfulStatusCode>(c: Context, status: S, code: string, message: string) {
  return c.json({ error: { code, message } } satisfies ErrorBody, status);
}

/** HTTP ステータスだけが分かっているとき（ミドルウェアが投げた例外など）の既定の code */
export function codeForStatus(status: number): string {
  switch (status) {
    case 400:
      return "invalid_request";
    case 401:
      return "unauthorized";
    case 403:
      return "forbidden";
    case 404:
      return "not_found";
    case 409:
      return "conflict";
    default:
      return status >= 500 ? "internal" : "error";
  }
}
