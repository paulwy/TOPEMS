#!/usr/bin/env node
/**
 * V68.1-3 Phase 2: Add deleted_at to Rust runtime DDL CREATE TABLE statements
 *
 * Scans Rust files for CREATE TABLE IF NOT EXISTS statements,
 * and adds `deleted_at TIMESTAMP` column if missing.
 *
 * Strategy:
 * - Find CREATE TABLE IF NOT EXISTS {table} ( ... )
 * - Check if deleted_at already exists in the column list
 * - If not, insert before closing )
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve, dirname as pDirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = pDirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");

// Tables that need deleted_at (from Phase 2 scan, excluding junction/cleanup tables)
// We'll match by the table name in CREATE TABLE
const NEEDS_DELETED_AT = new Set();

// Read the convert map to get all tables that had DELETE converted
const convertMap = JSON.parse(readFileSync(join(__dirname, "convert_map.json"), "utf8"));
for (const entry of convertMap) {
  // Extract table name from the DELETE statement (already converted to UPDATE)
  // The tableKey is the lowercased table name
  NEEDS_DELETED_AT.add(entry.tableKey);
}

// Also add Phase 3 tables (already have deleted_at in SQL but CREATE TABLE might not)
// These are fine - they already have deleted_at

// Tables to explicitly skip (junction, session, mv, etc.)
const SKIP_TABLES = new Set([
  "core_user_roles", "core_role_permissions", "document_categories",
  "iam_user_positions", "iam_position_roles", "iam_position_permissions",
  "rs_project_members", "rs_document_relations", "pm_project_members",
  "core_chat_members", "core_chat_messages",
  "iam_sessions", "unified_core_password_resets", "core_migration_locks",
  "mv_voucher_summary", "mv_receivable_aging",
  "schema_registry", "dynamic_data",
]);

// Scan Rust files for CREATE TABLE
import { readdirSync, statSync } from "node:fs";
import { extname } from "node:path";

const rustFiles = [];
function walkRust(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "target" || e.name === "node_modules") continue;
      walkRust(p);
    } else if (e.isFile() && extname(p) === ".rs") {
      rustFiles.push(p);
    }
  }
}
walkRust(join(ROOT, "svc"));
walkRust(join(ROOT, "lib"));

let totalPatched = 0;
let totalSkipped = 0;
const patched = [];

for (const filePath of rustFiles) {
  let src = readFileSync(filePath, "utf8");
  const relPath = filePath.replace(ROOT + "/", "");

  // Find all CREATE TABLE IF NOT EXISTS statements
  // Pattern: CREATE TABLE IF NOT EXISTS [schema.]table (
  const regex = /CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+(?:([\w]+)\.)?([\w]+)\s*\(/gi;
  let match;
  const matches = [];

  while ((match = regex.exec(src)) !== null) {
    const schema = (match[1] || "").toLowerCase();
    const tableName = (match[2] || "").toLowerCase();
    const tableKey = schema ? `${schema}_${tableName}` : tableName;
    const startPos = match.index;
    const parenStart = match.index + match[0].length - 1; // position of '('

    // Find matching closing paren
    let depth = 1;
    let pos = parenStart + 1;
    let inStr = null;
    let escaped = false;
    while (pos < src.length && depth > 0) {
      const ch = src[pos];
      if (inStr) {
        if (escaped) { escaped = false; }
        else if (ch === "\\") { escaped = true; }
        else if (ch === inStr) { inStr = null; }
      } else {
        if (ch === "'" || ch === '"') { inStr = ch; }
        else if (ch === "(") { depth++; }
        else if (ch === ")") { depth--; }
      }
      pos++;
    }

    if (depth === 0) {
      const tableDef = src.slice(parenStart, pos); // includes ( and )
      matches.push({
        tableKey,
        tableName,
        schema,
        startPos,
        parenStart,
        endPos: pos, // position after closing )
        tableDef,
      });
    }
  }

  if (matches.length === 0) continue;

  // Process matches in reverse order (to not mess up positions)
  let modified = false;
  const fileChanges = [];

  for (let i = matches.length - 1; i >= 0; i--) {
    const m = matches[i];

    // Skip if table is in skip list
    if (SKIP_TABLES.has(m.tableKey)) {
      totalSkipped++;
      continue;
    }

    // Check if this table needs deleted_at
    // Match by tableKey or just tableName
    const needsIt = NEEDS_DELETED_AT.has(m.tableKey) ||
      NEEDS_DELETED_AT.has(m.tableName) ||
      [...NEEDS_DELETED_AT].some(k => k === m.tableKey || k.endsWith("." + m.tableName) || k === m.tableName);

    if (!needsIt) {
      continue;
    }

    // Check if deleted_at already exists in the table definition
    if (/deleted_at/i.test(m.tableDef)) {
      totalSkipped++;
      continue;
    }

    // Find the last column definition before closing )
    // We need to insert "deleted_at TIMESTAMP," before the closing )
    const def = m.tableDef;
    // Find the last non-whitespace before )
    let insertPos = def.length - 1; // position of )
    // Skip backwards past whitespace
    while (insertPos > 0 && /\s/.test(def[insertPos - 1])) {
      insertPos--;
    }

    // Check if the last column ends with comma
    const lastChar = def[insertPos - 1] || "";
    let insertion;
    if (lastChar === ",") {
      // Already has trailing comma, just add the column
      insertion = "\n                deleted_at TIMESTAMP";
    } else {
      // Need to add comma before the new column
      insertion = ",\n                deleted_at TIMESTAMP";
    }

    // Build new table definition
    const newDef = def.slice(0, insertPos) + insertion + def.slice(insertPos);

    // Replace in source
    src = src.slice(0, m.parenStart) + newDef + src.slice(m.endPos);

    fileChanges.push({
      table: m.tableKey,
      tableDef: m.tableDef.substring(0, 80) + "...",
    });
    totalPatched++;
    modified = true;
  }

  if (modified) {
    writeFileSync(filePath, src);
    patched.push({ file: relPath, changes: fileChanges });
    console.log(`[PATCHED] ${relPath}: ${fileChanges.length} tables`);
  }
}

console.log(`\n=== DDL Patch Summary ===`);
console.log(`Files patched: ${patched.length}`);
console.log(`CREATE TABLE statements patched: ${totalPatched}`);
console.log(`Tables skipped (already have deleted_at or in skip list): ${totalSkipped}`);
