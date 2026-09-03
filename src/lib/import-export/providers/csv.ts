import type { ImportProvider } from "./base";
import { previewImport } from "../index";

export const csvProvider: ImportProvider = {
  name: "csv",
  label: "CSV File",
  description: "Import from a CSV file with date, steps columns",
  isAvailable: () => true,
  parse(text: string) {
    const result = previewImport(text, new Set());
    return {
      rows: result.valid,
      errors: result.invalid.map((i) => `Row ${i.row}: ${i.error}`),
    };
  },
};
