import { describe, expect, it } from "vitest";
import { loginBody } from "../src/shared/schema";

describe("loginBody", () => {
  it("トークンを受け付ける", () => {
    expect(loginBody.parse({ token: "abc" })).toEqual({ token: "abc" });
  });

  it("空・長すぎる・型違い・欠けは拒否", () => {
    expect(loginBody.safeParse({ token: "" }).success).toBe(false);
    expect(loginBody.safeParse({ token: "x".repeat(1025) }).success).toBe(false);
    expect(loginBody.safeParse({ token: 1 }).success).toBe(false);
    expect(loginBody.safeParse({}).success).toBe(false);
  });

  it("余計なキーは拒否", () => {
    expect(loginBody.safeParse({ token: "abc", admin: true }).success).toBe(false);
  });
});
