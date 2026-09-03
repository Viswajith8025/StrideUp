import { describe, it, expect } from "vitest";
import { previewImport } from "@/lib/import-export";

describe("previewImport", () => {
  const csv = `date,steps,distance_km,calories,active_minutes
2026-09-01,5321,3.8,245,48
2026-09-02,7210,5.1,321,65
invalid-row,bad,1,1,1`;

  it("parses valid rows", () => {
    const result = previewImport(csv, new Set());
    expect(result.valid).toHaveLength(2);
    expect(result.invalid).toHaveLength(1);
  });

  it("detects duplicates", () => {
    const result = previewImport(csv, new Set(["2026-09-01"]));
    expect(result.duplicates).toHaveLength(1);
    expect(result.valid).toHaveLength(1);
  });
});
