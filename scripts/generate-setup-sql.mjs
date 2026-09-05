#!/usr/bin/env node
/**
 * Concatenate supabase/migrations/*.sql into supabase/setup.sql.
 * Run after editing migration files: node scripts/generate-setup-sql.mjs
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDir = join(root, "supabase", "migrations");
const setupPath = join(root, "supabase", "setup.sql");

const files = readdirSync(migrationsDir)
  .filter((name) => name.endsWith(".sql"))
  .sort();

const body = files
  .map((name) => readFileSync(join(migrationsDir, name), "utf8").trimEnd())
  .join("\n\n");

const header = `-- =============================================================================
-- StrideUp — Complete Supabase Setup (GENERATED)
-- =============================================================================
-- DO NOT EDIT DIRECTLY. Edit files in supabase/migrations/ then run:
--   node scripts/generate-setup-sql.mjs
-- =============================================================================

`;

writeFileSync(setupPath, `${header}${body}\n`);
console.log(`Wrote ${setupPath} from ${files.length} migration(s).`);
