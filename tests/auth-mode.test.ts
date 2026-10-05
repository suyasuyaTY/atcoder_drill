import { describe, expect, it } from "vitest";
import { accessConfig, resolveAuthMode } from "../src/lib/auth-mode";

describe("resolveAuthMode（fail closed）", () => {
  it("token / access はそのまま", () => {
    expect(resolveAuthMode({ AUTH_MODE: "token" })).toEqual({ ok: true, mode: "token" });
    expect(resolveAuthMode({ AUTH_MODE: "access" })).toEqual({ ok: true, mode: "access" });
  });

  it("none は DEBUG_TOOLS=1 のときだけ通す", () => {
    expect(resolveAuthMode({ AUTH_MODE: "none", DEBUG_TOOLS: "1" })).toEqual({ ok: true, mode: "none" });
    expect(resolveAuthMode({ AUTH_MODE: "none" }).ok).toBe(false);
    expect(resolveAuthMode({ AUTH_MODE: "none", DEBUG_TOOLS: "0" }).ok).toBe(false);
    expect(resolveAuthMode({ AUTH_MODE: "none", DEBUG_TOOLS: "true" }).ok).toBe(false);
  });

  it.each([undefined, "", "TOKEN", "None", "off", " token"])("未設定・未知の値は拒否: %j", (mode) => {
    expect(resolveAuthMode({ AUTH_MODE: mode, DEBUG_TOOLS: "1" }).ok).toBe(false);
  });
});

describe("accessConfig（Access の JWT を検証する設定）", () => {
  const AUD = "a".repeat(64);

  it("チーム名から鍵の URL と iss を作る", () => {
    expect(accessConfig({ ACCESS_TEAM_DOMAIN: "suyasuyaty.cloudflareaccess.com", ACCESS_AUD: AUD })).toEqual({
      ok: true,
      certsUrl: "https://suyasuyaty.cloudflareaccess.com/cdn-cgi/access/certs",
      issuer: "https://suyasuyaty.cloudflareaccess.com",
      audience: AUD,
    });
  });

  it("https:// や末尾の / が付いていても受け付ける", () => {
    const r = accessConfig({ ACCESS_TEAM_DOMAIN: "https://team.cloudflareaccess.com/", ACCESS_AUD: AUD });
    expect(r.ok && r.issuer).toBe("https://team.cloudflareaccess.com");
  });

  it.each([
    [{}],
    [{ ACCESS_TEAM_DOMAIN: "team.cloudflareaccess.com" }],
    [{ ACCESS_AUD: AUD }],
    [{ ACCESS_TEAM_DOMAIN: "evil.example.com", ACCESS_AUD: AUD }],
    [{ ACCESS_TEAM_DOMAIN: "team.cloudflareaccess.com.evil.example", ACCESS_AUD: AUD }],
    [{ ACCESS_TEAM_DOMAIN: "team.cloudflareaccess.com", ACCESS_AUD: "short" }],
  ])("足りない・おかしい設定は拒否: %j", (env) => {
    expect(accessConfig(env).ok).toBe(false);
  });
});
