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

export type AccessConfig =
  | { ok: true; certsUrl: string; issuer: string; audience: string }
  | { ok: false; reason: string };

/**
 * AUTH_MODE=access で Cf-Access-Jwt-Assertion を検証する設定（SPEC §17）。
 * チーム名は `<team>.cloudflareaccess.com` だけを受け付ける（鍵を取りに行く先なので、ほかのホストは許さない）。
 */
export function accessConfig(env: { ACCESS_TEAM_DOMAIN?: string; ACCESS_AUD?: string }): AccessConfig {
  const domain = (env.ACCESS_TEAM_DOMAIN ?? "")
    .trim()
    .replace(/^https:\/\//, "")
    .replace(/\/+$/, "");
  if (!/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(domain)) {
    return { ok: false, reason: "ACCESS_TEAM_DOMAIN は <team>.cloudflareaccess.com の形で設定する" };
  }
  const audience = (env.ACCESS_AUD ?? "").trim();
  if (!/^[0-9a-f]{64}$/.test(audience)) {
    return { ok: false, reason: "ACCESS_AUD は Access アプリの AUD タグ（16進64文字）を設定する" };
  }
  const issuer = `https://${domain}`;
  return { ok: true, certsUrl: `${issuer}/cdn-cgi/access/certs`, issuer, audience };
}
