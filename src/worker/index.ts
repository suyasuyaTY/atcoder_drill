import { Hono } from "hono";
import { csrf } from "hono/csrf";
import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { auth } from "./auth";
import { apiError, codeForStatus } from "./errors";
import { debugRoutes } from "./routes/debug";
import { homeRoutes } from "./routes/home";
import { loginRoutes } from "./routes/login";
import { meRoutes } from "./routes/me";
import { registerRoutes } from "./routes/register";
import { sessionRoutes } from "./routes/sessions";
import { tableRoutes } from "./routes/table";
import type { AppEnv } from "./types";

// Worker に来るのは /api/* だけ（wrangler.jsonc の run_worker_first）。画面のパスは静的アセットが返す
// RPC の型（AppType）にルートが載るよう、つないで書く
const app = new Hono<AppEnv>()
  .basePath("/api")
  // CSRF: 状態を変えるリクエストは、同じオリジンからでなければ 403（SPEC §17）
  .use(csrf())
  .use(auth)
  .route("/login", loginRoutes)
  .route("/me", meRoutes)
  .route("/register", registerRoutes)
  .route("/table", tableRoutes)
  .route("/home", homeRoutes)
  .route("/sessions", sessionRoutes)
  .route("/debug", debugRoutes);

app.notFound((c) => apiError(c, 404, "not_found", "見つかりません"));

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    const status = err.status as ContentfulStatusCode;
    return apiError(c, status, codeForStatus(status), err.message || "リクエストを処理できません");
  }
  console.error(err);
  return apiError(c, 500, "internal", "サーバーでエラーが起きました");
});

export type AppType = typeof app;
export default app;
