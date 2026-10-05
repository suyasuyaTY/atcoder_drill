import { describe, expect, it } from "vitest";
import { daysSince, daysUntil, formatJstDate, formatJstDateTime } from "../src/lib/format";
import { DAY_MS } from "../src/lib/scheduler";

describe("JST の表示", () => {
  it("UTC の 15:00 は JST の翌日 0:00", () => {
    expect(formatJstDate("2026-10-03T15:00:00Z")).toBe("10/4");
    expect(formatJstDate("2026-10-03T14:59:59Z")).toBe("10/3");
  });

  it("日時", () => {
    expect(formatJstDateTime("2026-10-03T15:05:00Z")).toBe("10/4 0:05");
    expect(formatJstDateTime(new Date("2026-01-31T03:30:00Z"))).toBe("1/31 12:30");
  });

  it("年をまたぐ", () => {
    expect(formatJstDate("2026-12-31T15:00:00Z")).toBe("1/1");
  });
});

const NOW = new Date("2026-10-01T00:00:00Z");
const at = (days: number) => new Date(NOW.getTime() + days * DAY_MS);

describe("daysUntil（あと N日）", () => {
  it("経過時間で数え、日単位で切り上げる", () => {
    expect(daysUntil(at(30), NOW)).toBe(30);
    expect(daysUntil(at(29.1), NOW)).toBe(30);
    expect(daysUntil(at(0.01), NOW)).toBe(1);
  });

  it("過ぎていたら 0", () => {
    expect(daysUntil(NOW, NOW)).toBe(0);
    expect(daysUntil(at(-2), NOW)).toBe(0);
  });

  it("ISO 文字列も受け付ける", () => {
    expect(daysUntil(at(3).toISOString(), NOW)).toBe(3);
  });
});

describe("daysSince（N日経過）", () => {
  it("経過時間で数え、日単位で切り上げる", () => {
    expect(daysSince(at(-5), NOW)).toBe(5);
    expect(daysSince(at(-4.2), NOW)).toBe(5);
  });

  it("まだなら 0", () => {
    expect(daysSince(NOW, NOW)).toBe(0);
    expect(daysSince(at(1), NOW)).toBe(0);
  });
});
