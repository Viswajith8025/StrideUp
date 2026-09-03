import type { ImportProvider } from "./base";

export const googleFitProvider: ImportProvider = {
  name: "google-fit",
  label: "Google Fit",
  description: "Direct Google Fit integration requires native APIs. Export your data from Google Fit and import via CSV.",
  isAvailable: () => false,
  parse() {
    return { rows: [], errors: ["Google Fit direct import is not available in browser PWAs. Use CSV import instead."] };
  },
};
