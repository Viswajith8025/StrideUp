export interface ImportProvider {
  name: string;
  label: string;
  description: string;
  isAvailable(): boolean;
  parse(text: string): { rows: unknown[]; errors: string[] };
}
