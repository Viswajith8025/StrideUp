import { describe, it, expect } from "vitest";
import { toLocalDateString, getWeekRange, getRelativeDayLabel, toDateStringInTimezone } from "@/utils/date";

describe("date utils", () => {
  it("formats local date string", () => {
    const d = new Date(2026, 8, 3);
    expect(toLocalDateString(d)).toBe("2026-09-03");
  });

  it("returns week range", () => {
    const range = getWeekRange(new Date(2026, 8, 3), 0);
    expect(range.start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(range.end).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("labels today", () => {
    const today = toLocalDateString();
    expect(getRelativeDayLabel(today)).toBe("Today");
  });
});

describe("toDateStringInTimezone", () => {
  it("resolves Asia/Kolkata local date from UTC instant", () => {
    const instant = new Date("2026-09-05T18:30:00.000Z");
    expect(toDateStringInTimezone(instant, "Asia/Kolkata")).toBe("2026-09-06");
  });

  it("resolves America/Los_Angeles local date from UTC instant", () => {
    const instant = new Date("2026-09-06T06:00:00.000Z");
    expect(toDateStringInTimezone(instant, "America/Los_Angeles")).toBe("2026-09-05");
  });

  it("handles US DST spring-forward boundary in America/New_York", () => {
    const afterDst = new Date("2026-03-08T07:30:00.000Z");
    expect(toDateStringInTimezone(afterDst, "America/New_York")).toBe("2026-03-08");

    const beforeDst = new Date("2026-03-08T05:30:00.000Z");
    expect(toDateStringInTimezone(beforeDst, "America/New_York")).toBe("2026-03-08");
  });

  it("falls back to UTC for invalid timezone names", () => {
    const instant = new Date("2026-09-05T12:00:00.000Z");
    expect(toDateStringInTimezone(instant, "Not/A_Real_Zone")).toBe("2026-09-05");
  });
});
