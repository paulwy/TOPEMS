#!/usr/bin/env node
/**
 * scripts/verify-entity-schema-maxlength.mjs
 *
 * EntitySchema maxLength truth-source quality gate (V68.2-2).
 *
 * Closes the "three-way length mismatch" gap surfaced by the V67.1 data-layer
 * audit (P0-4 / P1-5): SQL columns declared as VARCHAR(n) must have a matching
 * `maxLength` validation rule on the corresponding EntitySchema field, so the
 * frontend rejects over-length input before the API call (avoiding 500s).
 *
 * Truth source: every `CREATE TABLE` / `ALTER TABLE ... ADD COLUMN` statement
 * across svc/<service>/migrations/*.sql that declares a `VARCHAR(n)` column.
 *
 * Checks (per schema file under apps/web/src/schemas/):
 *   1. HARD FAIL — text/textarea/email field whose name exactly matches a
 *      VARCHAR(n) column of the entity's table, but the field has no
 *      `maxLength` validation rule.
 *   2. SOFT WARN — field has `maxLength` but the value differs from the SQL
 *      VARCHAR(n) bound. Only a warning: schemas may legitimately tighten the
 *      bound. Printed to stderr; does not fail CI.
 *
 * Scope:
 *   - Only fields of type 'text' | 'textarea' | 'email' are checked.
 *   - Fields with `hideInForm: true` are skipped (not user-editable).
 *   - Field name matching is case-insensitive and exact (no fuzzy _id
 *     stripping — that produced false positives in earlier revisions).
 *
 * Exit 0 = pass, non-zero = CI should fail.
 *
 * Usage:
 *   node scripts/verify-entity-schema-maxlength.mjs
 *   node scripts/verify-entity-schema-maxlength.mjs --strict   # warnings → errors
 */

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, extname } from "node:path";

const strict = process.argv.includes("--strict");

const SVC_ROOT = "svc";
const SCHEMAS_DIR = "apps/web/src/schemas";

// ============================================================
// 1. Build VARCHAR(n) truth source from migrations
// ============================================================

/** @type {Map<string, Map<string, number>>} table(lower) -> field(lower) -> n */
const truthByLower = new Map();

function walkSql(dir, out) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) walkSql(p, out);
    else if (entry.isFile() && entry.name.endsWith(".sql")) out.push(p);
  }
}

const sqlFiles = [];
walkSql(SVC_ROOT, sqlFiles);

for (const file of sqlFiles) {
  const src = readFileSync(file, "utf8");
  // CREATE TABLE blocks
  const createRe = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?["`]?([a-zA-Z0-9_]+)["`]?\s*\(([\s\S]*?)\)\s*(?:;|$)/gi;
  let cm;
  while ((cm = createRe.exec(src)) !== null) {
    const tableName = cm[1].toLowerCase();
    const body = cm[2];
    const lineRe = /^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s+([A-Za-z][A-Za-z0-9_]*(?:\s*\([^)]*\))?)/gm;
    let lm;
    while ((lm = lineRe.exec(body)) !== null) {
      const fieldName = lm[1];
      if (/^(PRIMARY|FOREIGN|UNIQUE|CHECK|CONSTRAINT|KEY|INDEX)/i.test(fieldName)) continue;
      const vm = lm[2].match(/\bVARCHAR\s*\(\s*(\d+)\s*\)/i);
      if (vm) {
        const n = parseInt(vm[1], 10);
        if (!truthByLower.has(tableName)) truthByLower.set(tableName, new Map());
        truthByLower.get(tableName).set(fieldName.toLowerCase(), n);
      }
    }
  }
  // ALTER TABLE ADD COLUMN
  const alterRe = /ALTER\s+TABLE\s+(?:public\.)?["`]?([a-zA-Z0-9_]+)["`]?\s+ADD\s+(?:COLUMN\s+)?["`]?([a-zA-Z0-9_]+)["`]?\s+([A-Za-z][A-Za-z0-9_]*(?:\s*\([^)]*\))?)/gi;
  let am;
  while ((am = alterRe.exec(src)) !== null) {
    const tableName = am[1].toLowerCase();
    const fieldName = am[2].toLowerCase();
    const vm = am[3].match(/\bVARCHAR\s*\(\s*(\d+)\s*\)/i);
    if (vm) {
      const n = parseInt(vm[1], 10);
      if (!truthByLower.has(tableName)) truthByLower.set(tableName, new Map());
      truthByLower.get(tableName).set(fieldName, n);
    }
  }
}

// ============================================================
// 2. Resolve entity -> table fields (singular/plural variants)
// ============================================================

function lookupFieldsForEntity(entity) {
  const e = entity.toLowerCase();
  const tries = [
    e,
    e + "s",
    e + "es",
    e.endsWith("s") ? e.slice(0, -1) : null,
    e.endsWith("ies") ? e.slice(0, -3) + "y" : null,
  ].filter(Boolean);
  for (const t of tries) {
    if (truthByLower.has(t)) return truthByLower.get(t);
  }
  // Last resort: ignore underscores
  for (const [t, fields] of truthByLower) {
    if (t.replace(/_/g, "") === e.replace(/_/g, "")) return fields;
  }
  return null;
}

// ============================================================
// 3. Scan schema files
// ============================================================

function walkSchemas(dir, out) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "_shared" || entry.name.startsWith(".")) continue;
    const p = join(dir, entry.name);
    if (entry.isDirectory()) walkSchemas(p, out);
    else if (entry.isFile() && /\.[tj]sx?$/.test(extname(entry.name))) out.push(p);
  }
}

const schemaFiles = [];
walkSchemas(SCHEMAS_DIR, schemaFiles);

const errors = [];
const warnings = [];
let checkedFields = 0;
let checkedFiles = 0;
let matchedTables = 0;

for (const file of schemaFiles) {
  const src = readFileSync(file, "utf8");
  const entityMatch = src.match(/entity:\s*['"`]([^'"`]+)['"`]/);
  if (!entityMatch) continue;
  const entity = entityMatch[1];
  const fields = lookupFieldsForEntity(entity);
  if (!fields) continue;
  matchedTables++;

  // Extract field blocks: starts at `    {` followed by `name: 'xxx'`
  // and ends at next `    },` or `    }` at 4-space indent.
  const fieldRegex = /\{\s*\n\s*name:\s*['"`]([^'"`]+)['"`]\s*,[\s\S]*?\n\s{4}\},?/g;
  let m;
  while ((m = fieldRegex.exec(src)) !== null) {
    const block = m[0];
    const fieldName = m[1];
    const tm = block.match(/type:\s*['"`]([^'"`]+)['"`]/);
    const type = tm ? tm[1] : "";
    if (!["text", "textarea", "email"].includes(type)) continue;
    if (/hideInForm:\s*true/.test(block)) continue;
    checkedFields++;

    // Must match a VARCHAR column exactly (case-insensitive)
    const truthN = fields.get(fieldName.toLowerCase());
    if (truthN === undefined) continue; // field has no VARCHAR bound in DB → skip

    const hasMaxLength = /maxLength/.test(block);
    if (!hasMaxLength) {
      const line = src.slice(0, m.index).split("\n").length;
      errors.push({
        file: file.replace(SCHEMAS_DIR + "/", ""),
        entity,
        field: fieldName,
        type,
        expected: truthN,
        line,
        reason: "VARCHAR(n) column has no matching maxLength validation",
      });
      continue;
    }

    // Has maxLength — verify value matches (warn-only)
    const vm = block.match(/maxLength['"]?\s*[:,]\s*(\d+)/);
    if (vm) {
      const actual = parseInt(vm[1], 10);
      if (actual !== truthN) {
        warnings.push({
          file: file.replace(SCHEMAS_DIR + "/", ""),
          entity,
          field: fieldName,
          expected: truthN,
          actual,
          reason: "maxLength differs from SQL VARCHAR(n)",
        });
      }
    }
  }
  checkedFiles++;
}

// ============================================================
// 4. Report & exit
// ============================================================

const rel = (s) => s;
console.log(`[verify-entity-schema-maxlength] schemas scanned: ${schemaFiles.length}`);
console.log(`[verify-entity-schema-maxlength] schemas matched to a SQL table: ${matchedTables}`);
console.log(`[verify-entity-schema-maxlength] text/textarea/email fields checked: ${checkedFields}`);
console.log(`[verify-entity-schema-maxlength] errors:   ${errors.length}`);
console.log(`[verify-entity-schema-maxlength] warnings: ${warnings.length}`);

if (warnings.length) {
  console.log("\n--- warnings (maxLength ≠ VARCHAR(n)) ---");
  for (const w of warnings) {
    console.log(`  ${rel(w.file)} :: ${w.entity}.${w.field}  expected=${w.expected} actual=${w.actual}`);
  }
}

if (errors.length) {
  console.log("\n--- errors (missing maxLength for VARCHAR column) ---");
  for (const e of errors) {
    console.log(`  ${rel(e.file)}:${e.line} :: ${e.entity}.${e.field}  expected maxLength=${e.expected}`);
  }
  process.exit(1);
}

if (strict && warnings.length) {
  console.log("\n--strict mode: warnings treated as errors.");
  process.exit(1);
}

process.exit(0);
