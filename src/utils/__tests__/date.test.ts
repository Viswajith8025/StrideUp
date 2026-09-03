import { describe, it, expect } from "vitest";
import { toLocalDateString, getWeekRange, getRelativeDayLabel } from "@/utils/date";

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
