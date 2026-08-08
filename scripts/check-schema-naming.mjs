#!/usr/bin/env node
/**
 * P2-1 CI Guard: Prevent schemas/_shared directory recreation
 *
 * The `schemas/_shared/` directory was a dead duplicate of `schema/` core files.
 * This script ensures it never comes back, and that `schema/` core files
 * (types.ts, adapterFactory.ts, schemaExtensions.ts, crudPageAdapter.ts)
 * are not duplicated under `schemas/`.
 *
 * Run in CI: node scripts/check-schema-naming.mjs
 * Exit 0 = PASS, Exit 1 = FAIL
 */
import { existsSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const SCHEMA_DIR = join(ROOT, "apps", "web", "src", "schema");
const SCHEMAS_DIR = join(ROOT, "apps", "web", "src", "schemas");

let errors = 0;

// 1. schemas/_shared/ must NOT exist
const sharedDir = join(SCHEMAS_DIR, "_shared");
if (existsSync(sharedDir)) {
  console.error(`❌ FORBIDDEN: ${sharedDir} exists — this is dead duplicate code of schema/ core`);
  errors++;
}

// 2. Core schema files must NOT be duplicated under schemas/
const coreFiles = ["types.ts", "adapterFactory.ts", "schemaExtensions.ts", "crudPageAdapter.ts", "index.ts"];
for (const f of coreFiles) {
  // Check if any file under schemas/ has the same name as a core file (excluding module subdirs)
  // Module subdirs have their own index.ts which is fine
  if (f === "index.ts") continue; // module dirs legitimately have index.ts
  const dupPath = join(SCHEMAS_DIR, f);
  if (existsSync(dupPath)) {
    console.error(`❌ FORBIDDEN: ${dupPath} duplicates schema/${f}`);
    errors++;
  }
}

// 3. Orphaned files in schema/ — admin.ts, iam.ts, wms.ts should not exist
//    (module schemas live in schemas/<module>/)
const orphanedFiles = ["admin.ts", "iam.ts", "wms.ts"];
for (const f of orphanedFiles) {
  const orphanPath = join(SCHEMA_DIR, f);
  if (existsSync(orphanPath)) {
    console.error(`❌ FORBIDDEN: ${orphanPath} is an orphaned module schema — module schemas belong in schemas/<module>/`);
    errors++;
  }
}

// 4. Verify schema/ core files exist (sanity check)
for (const f of coreFiles) {
  const corePath = join(SCHEMA_DIR, f);
  if (!existsSync(corePath)) {
    console.error(`❌ MISSING: ${corePath} — core schema file was deleted`);
    errors++;
  }
}

if (errors === 0) {
  console.log("✅ check-schema-naming: PASS — no duplicate or orphaned schema files");
  process.exit(0);
} else {
  console.error(`\n❌ check-schema-naming: FAIL — ${errors} issue(s) found`);
  process.exit(1);
}
