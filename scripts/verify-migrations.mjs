#!/usr/bin/env node
/**
 * Verify supabase/migrations/*.sql concatenation matches supabase/setup.sql body.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDir = join(root, "supabase", "migrations");
const setupPath = join(root, "supabase", "setup.sql");

const files = readdirSync(migrationsDir)
  .filter((name) => name.endsWith(".sql"))
  .sort();

const expected = files
  .map((name) => readFileSync(join(migrationsDir, name), "utf8").trimEnd())
  .join("\n\n");

const setup = readFileSync(setupPath, "utf8");
const generatedMarker = "-- DO NOT EDIT DIRECTLY.";
const start = setup.indexOf(generatedMarker);
const actualBody = start === -1
  ? setup.replace(/^-- =+\n-- StrideUp[\s\S]*?-- =+\n\n/, "").trimEnd()
  : setup.slice(setup.indexOf("\n\n", start) + 2).trimEnd();

if (actualBody !== expected) {
  console.error("Migration concat does NOT match setup.sql body.");
  console.error(`Expected length: ${expected.length}, actual: ${actualBody.length}`);
  process.exit(1);
}

console.log(`OK: ${files.length} migrations reproduce setup.sql.`);
