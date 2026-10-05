/**
 * AUTH_MODE の解釈（SPEC §17）。fail closed: 未設定・未知の値は拒否する。
 */

export type AuthMode = "none" | "token" | "access";

export type AuthModeResult = { ok: true; mode: AuthMode } | { ok: false; reason: string };

export function resolveAuthMode(env: { AUTH_MODE?: string; DEBUG_TOOLS?: string }): AuthModeResult {
  switch (env.AUTH_MODE) {
    case "token":
    case "access":
      return { ok: true, mode: env.AUTH_MODE };
    case "none":
      return env.DEBUG_TOOLS === "1"
        ? { ok: true, mode: "none" }
        : { ok: false, reason: "AUTH_MODE=none はローカル開発（DEBUG_TOOLS=1）でだけ使える" };
    default:
      return { ok: false, reason: `未知の AUTH_MODE: ${JSON.stringify(env.AUTH_MODE ?? null)}` };
  }
}
