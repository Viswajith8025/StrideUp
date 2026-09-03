import type { ImportProvider } from "./base";
import { importRowSchema } from "@/lib/validation/schemas";

export const jsonProvider: ImportProvider = {
  name: "json",
  label: "JSON File",
  description: "Import from a JSON export file",
  isAvailable: () => true,
  parse(text: string) {
    const errors: string[] = [];
    try {
      const data = JSON.parse(text);
      const rows = Array.isArray(data) ? data : data.activities ?? [];
      const valid = [];
      for (let i = 0; i < rows.length; i++) {
        const result = importRowSchema.safeParse(rows[i]);
        if (result.success) valid.push(result.data);
        else errors.push(`Row ${i + 1}: ${result.error.issues[0]?.message}`);
      }
      return { rows: valid, errors };
    } catch {
      return { rows: [], errors: ["Invalid JSON format"] };
    }
  },
};
