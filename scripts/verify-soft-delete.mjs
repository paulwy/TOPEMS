#!/usr/bin/env node
/**
 * scripts/verify-soft-delete.mjs
 *
 * Soft-delete strategy unification quality gate (V68.2-3).
 *
 * The V67.1 data-layer audit (P1-4) found three soft-delete modes coexisting:
 *   1. deleted_at: Option<NaiveDateTime>  ← target pattern (majority)
 *   2. is_deleted: bool                     ← legacy (4 tables, now migrated)
 *   3. direct DELETE FROM                   ← legitimate for cascade/cleanup
 *
 * This gate ensures the codebase never re-introduces the `is_deleted BOOLEAN`
 * column pattern. After V68.2-3, all soft-delete must use `deleted_at TIMESTAMP`
 * with `deleted_at IS NULL` as the "not deleted" predicate.
 *
 * Checks:
 *   1. HARD FAIL — any SQL migration file (*.sql) that declares a column
 *      `is_deleted BOOLEAN` (case-insensitive). Historical files are exempt
 *      if listed in the allowlist below (files that pre-date V68.2-3 and
 *      cannot be rewritten per V68.2-1 naming convention).
 *   2. HARD FAIL — any Rust source (*.rs) that contains `is_deleted BOOLEAN`
 *      in a CREATE TABLE string literal (runtime table creation).
 *   3. WARN — any Rust source (*.rs) that references `is_deleted` in a SQL
 *      query string (SELECT/UPDATE/WHERE). These are warnings, not errors,
 *      because the `SoftDelete` trait's `is_deleted()` method is a legitimate
 *      Rust API (not a SQL column reference).
 *
 * Allowlist: migration files that historically declared is_deleted and are
 * exempt from this check (they are superseded by the drop-column migration
 * 20260808160000_unify_soft_drop_is_deleted.sql).
 *
 * Exit 0 = pass, non-zero = CI should fail.
 */

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();

// Files that historically contained is_deleted and have been cleaned up.
// They are exempt because rewriting historical migrations violates V68.2-1.
// The drop-column migration supersedes them.
const ALLOWLIST = new Set([
  // (empty after V68.2-3 cleanup — all historical files were edited in-place
  //  since they are init/migration scripts, not immutable applied migrations)
]);

// ============================================================
// Walk helpers
// ============================================================

function walk(dir, out, predicate) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'target') continue;
    const p = join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out, predicate);
    else if (entry.isFile() && predicate(entry.name)) out.push(p);
  }
}

const isSql = (name) => name.endsWith('.sql');
const isRust = (name) => name.endsWith('.rs');

const sqlFiles = [];
const rustFiles = [];

walk(join(ROOT, 'svc'), sqlFiles, isSql);
walk(join(ROOT, 'database'), sqlFiles, isSql);
walk(join(ROOT, 'lib'), rustFiles, isRust);
walk(join(ROOT, 'svc'), rustFiles, isRust);

// ============================================================
// Check 1: SQL migrations declaring is_deleted BOOLEAN
// ============================================================

const sqlErrors = [];
const isDeletedColumnRe = /\bis_deleted\s+BOOLEAN\b/gi;

for (const file of sqlFiles) {
  const rel = relative(ROOT, file);
  if (ALLOWLIST.has(rel)) continue;
  const src = readFileSync(file, 'utf8');
  isDeletedColumnRe.lastIndex = 0;
  const m = isDeletedColumnRe.exec(src);
  if (m) {
    // Find line number
    const lines = src.slice(0, m.index).split('\n');
    sqlErrors.push({ file: rel, line: lines.length, match: m[0] });
  }
}

// ============================================================
// Check 2: Rust CREATE TABLE with is_deleted BOOLEAN
// ============================================================

const rustCreateErrors = [];
const rustQueryWarnings = [];

for (const file of rustFiles) {
  const rel = relative(ROOT, file);
  const src = readFileSync(file, 'utf8');
  const lines = src.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check 2: CREATE TABLE string with is_deleted BOOLEAN
    if (/is_deleted\s+BOOLEAN/i.test(line) && /CREATE\s+TABLE|is_deleted\s+BOOLEAN/i.test(line)) {
      // Only flag if this is inside a SQL string (CREATE TABLE context)
      if (/BOOLEAN/i.test(line)) {
        rustCreateErrors.push({ file: rel, line: i + 1, match: line.trim() });
      }
    }

    // Check 3: SQL query referencing is_deleted (warn only)
    // Look for patterns like "is_deleted = FALSE", "is_deleted = TRUE", "WHERE is_deleted"
    // but NOT the SoftDelete trait method `is_deleted()` or `fn is_deleted`
    if (
      /is_deleted\s*=\s*(true|false|TRUE|FALSE)/i.test(line) ||
      /WHERE\s+is_deleted/i.test(line) ||
      /SELECT\s+.*\bis_deleted\b/i.test(line)
    ) {
      // Skip trait method definitions and calls
      if (/fn\s+is_deleted/.test(line)) continue;
      if (/\.is_deleted\(\)/.test(line)) continue;
      if (/\/\/.*is_deleted/.test(line)) continue; // comment
      if (/\/\/!.*is_deleted/.test(line)) continue;
      if (/^\s*\/\//.test(line)) continue;
      rustQueryWarnings.push({ file: rel, line: i + 1, match: line.trim() });
    }
  }
}

// ============================================================
// Report & exit
// ============================================================

console.log(`[verify-soft-delete] SQL files scanned:   ${sqlFiles.length}`);
console.log(`[verify-soft-delete] Rust files scanned: ${rustFiles.length}`);
console.log(`[verify-soft-delete] SQL is_deleted BOOLEAN errors: ${sqlErrors.length}`);
console.log(`[verify-soft-delete] Rust CREATE TABLE errors:      ${rustCreateErrors.length}`);
console.log(`[verify-soft-delete] Rust query warnings:           ${rustQueryWarnings.length}`);

if (rustQueryWarnings.length) {
  console.log('\n--- warnings (Rust SQL query references is_deleted) ---');
  for (const w of rustQueryWarnings) {
    console.log(`  ${w.file}:${w.line}  ${w.match.slice(0, 100)}`);
  }
}

if (sqlErrors.length) {
  console.log('\n--- errors (SQL migration declares is_deleted BOOLEAN) ---');
  for (const e of sqlErrors) {
    console.log(`  ${e.file}:${e.line}  ${e.match}`);
  }
}

if (rustCreateErrors.length) {
  console.log('\n--- errors (Rust CREATE TABLE declares is_deleted BOOLEAN) ---');
  for (const e of rustCreateErrors) {
    console.log(`  ${e.file}:${e.line}  ${e.match.slice(0, 100)}`);
  }
}

if (sqlErrors.length > 0 || rustCreateErrors.length > 0) {
  console.log('\nFAIL: is_deleted BOOLEAN column detected. Use deleted_at TIMESTAMP instead.');
  process.exit(1);
}

console.log('\nPASS: no is_deleted BOOLEAN columns found.');
process.exit(0);
