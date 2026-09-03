import type { Profile } from "@/types/database";
import { importRowSchema } from "@/lib/validation/schemas";
import { setSteps } from "@/lib/steps/service";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface ImportRow {
  date: string;
  steps: number;
  distance_km?: number;
  calories?: number;
  active_minutes?: number;
}

export interface ImportPreview {
  rows: ImportRow[];
  valid: ImportRow[];
  invalid: { row: number; data: string; error: string }[];
  duplicates: ImportRow[];
}

export function parseCSV(text: string): string[][] {
  return text
    .trim()
    .split(/\r?\n/)
    .map((line) => line.split(",").map((c) => c.trim()));
}

export function previewImport(csvText: string, existingDates: Set<string>): ImportPreview {
  const lines = parseCSV(csvText);
  if (lines.length < 2) {
    return { rows: [], valid: [], invalid: [{ row: 0, data: "", error: "No data rows found" }], duplicates: [] };
  }

  const headers = lines[0].map((h) => h.toLowerCase());
  const dateIdx = headers.indexOf("date");
  const stepsIdx = headers.indexOf("steps");

  if (dateIdx === -1 || stepsIdx === -1) {
    return { rows: [], valid: [], invalid: [{ row: 0, data: lines[0].join(","), error: "Missing date or steps column" }], duplicates: [] };
  }

  const distIdx = headers.indexOf("distance_km");
  const calIdx = headers.indexOf("calories");
  const minIdx = headers.indexOf("active_minutes");

  const valid: ImportRow[] = [];
  const invalid: ImportPreview["invalid"] = [];
  const duplicates: ImportRow[] = [];
  const rows: ImportRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.length || !line[0]) continue;

    const raw = {
      date: line[dateIdx],
      steps: parseInt(line[stepsIdx], 10),
      distance_km: distIdx >= 0 ? parseFloat(line[distIdx]) : undefined,
      calories: calIdx >= 0 ? parseInt(line[calIdx], 10) : undefined,
      active_minutes: minIdx >= 0 ? parseInt(line[minIdx], 10) : undefined,
    };

    const result = importRowSchema.safeParse(raw);
    if (!result.success) {
      invalid.push({ row: i + 1, data: line.join(","), error: result.error.issues[0]?.message ?? "Invalid" });
      continue;
    }

    rows.push(result.data);
    if (existingDates.has(result.data.date)) {
      duplicates.push(result.data);
    } else {
      valid.push(result.data);
    }
  }

  return { rows, valid, invalid, duplicates };
}

export async function executeImport(
  supabase: SupabaseClient,
  userId: string,
  profile: Profile,
  rows: ImportRow[]
) {
  let imported = 0;
  for (const row of rows) {
    await setSteps(supabase, userId, profile, row.date, row.steps, "import");
    imported++;
  }
  return imported;
}

export function exportToCSV(activities: { date: string; steps: number; distance_km: number; calories: number; active_minutes: number; source: string }[]): string {
  const header = "date,steps,distance_km,calories,active_minutes,source";
  const lines = activities.map(
    (a) => `${a.date},${a.steps},${a.distance_km},${a.calories},${a.active_minutes},${a.source}`
  );
  return [header, ...lines].join("\n");
}

export function exportToJSON(activities: unknown[]): string {
  return JSON.stringify(activities, null, 2);
}
