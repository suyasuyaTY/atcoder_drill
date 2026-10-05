import { describe, expect, it } from "vitest";
import { resolveAuthMode } from "../src/lib/auth-mode";

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
