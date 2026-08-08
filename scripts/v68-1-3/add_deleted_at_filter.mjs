#!/usr/bin/env node
/**
 * V68.1-3 Phase 3: Add `deleted_at IS NULL` to SELECT queries
 *
 * For each table that was converted from DELETE to UPDATE SET deleted_at,
 * find SELECT queries that reference the table and add `deleted_at IS NULL`
 * to the WHERE clause (or add WHERE if none exists).
 *
 * Safety rules:
 * - Only modify SELECT/SELECT COUNT queries (not INSERT/UPDATE/DELETE)
 * - Don't modify subqueries (only main FROM clause)
 * - Skip queries that already have deleted_at
 * - Skip queries in comments
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve, dirname as pDirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = pDirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");

// Read conversion log to get modified files and their tables
const conversionLog = JSON.parse(readFileSync(join(__dirname, "conversion_log.json"), "utf8"));

// Build map: file → Set of table names (lowercase)
const fileTables = new Map();
for (const entry of conversionLog) {
  if (!fileTables.has(entry.file)) fileTables.set(entry.file, new Set());
  // The table name from the DELETE statement (already converted to UPDATE)
  // Extract from the stmt which is now "UPDATE {table} SET deleted_at..."
  const m = entry.details[0]?.new?.match(/UPDATE\s+([\w.]+)\s+SET/i);
  if (m) {
    fileTables.get(entry.file).add(m[1].toLowerCase());
  }
  // Also add the tableKey
  for (const d of entry.details) {
    fileTables.get(entry.file).add(d.table.toLowerCase());
  }
}

let totalPatched = 0;
let totalSkipped = 0;
const patched = [];

for (const [relFile, tables] of fileTables) {
  const absPath = join(ROOT, relFile);
  let src;
  try {
    src = readFileSync(absPath, "utf8");
  } catch {
    continue;
  }

  const lines = src.split("\n");
  let fileModified = false;
  const fileChanges = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip comment lines
    if (trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*")) {
      continue;
    }

    // Look for SELECT ... FROM {table} patterns
    // Match: SELECT ... FROM {table} WHERE ... or SELECT ... FROM {table}
    const selectMatch = line.match(/SELECT\s+.*?\s+FROM\s+([\w.]+)/i);

    if (!selectMatch) continue;

    const tableName = selectMatch[1].toLowerCase();

    // Check if this table is in our soft-delete list
    let matched = false;
    for (const t of tables) {
      if (tableName === t || tableName.endsWith("." + t) || t.endsWith("." + tableName)) {
        matched = true;
        break;
      }
    }
    if (!matched) continue;

    // Check if already has deleted_at in this line
    if (/deleted_at/i.test(line)) {
      totalSkipped++;
      continue;
    }

    // Check if it's a SELECT (not INSERT INTO ... SELECT)
    if (/INSERT\s+INTO/i.test(line)) {
      totalSkipped++;
      continue;
    }

    // Check the rest of the line for WHERE clause
    // The query might span multiple lines, so check this line and next few lines
    const fullLine = line;

    // Pattern 1: SELECT ... FROM table WHERE condition
    // → SELECT ... FROM table WHERE deleted_at IS NULL AND condition
    if (/FROM\s+[\w.]+\s+WHERE\s+/i.test(fullLine)) {
      // Insert "deleted_at IS NULL AND " after WHERE
      const newLine = fullLine.replace(
        /(FROM\s+[\w.]+\s+WHERE\s+)/i,
        "$1deleted_at IS NULL AND "
      );
      if (newLine !== fullLine) {
        lines[i] = newLine;
        fileChanges.push({ line: i + 1, table: tableName, type: "WHERE→AND" });
        totalPatched++;
        fileModified = true;
        continue;
      }
    }

    // Pattern 2: SELECT ... FROM table (no WHERE on this line)
    // Check if WHERE is on a subsequent line
    let whereLineIdx = -1;
    for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
      if (/^\s*WHERE\s+/i.test(lines[j])) {
        whereLineIdx = j;
        break;
      }
      // If we hit a semicolon or another query, stop
      if (/;/i.test(lines[j]) || /SELECT\s+/i.test(lines[j])) break;
    }

    if (whereLineIdx >= 0) {
      // Add "deleted_at IS NULL AND " at the beginning of the WHERE clause
      const whereLine = lines[whereLineIdx];
      const newWhereLine = whereLine.replace(
        /(\s*WHERE\s+)/i,
        "$1deleted_at IS NULL AND "
      );
      if (newWhereLine !== whereLine && !/deleted_at/i.test(whereLine)) {
        lines[whereLineIdx] = newWhereLine;
        fileChanges.push({ line: whereLineIdx + 1, table: tableName, type: "WHERE(next line)→AND" });
        totalPatched++;
        fileModified = true;
        continue;
      }
    }

    // Pattern 3: SELECT ... FROM table" (end of string, no WHERE)
    // → SELECT ... FROM table WHERE deleted_at IS NULL"
    if (/FROM\s+[\w.]+\s*"/.test(fullLine) || /FROM\s+[\w.]+\s*$/.test(fullLine)) {
      // Check if there's a WHERE in the next few lines before the closing quote
      let hasWhere = false;
      for (let j = i + 1; j < Math.min(i + 15, lines.length); j++) {
        if (/WHERE/i.test(lines[j])) { hasWhere = true; break; }
        if (/"#?,/.test(lines[j])) break; // end of query string
      }
      if (!hasWhere) {
        // Add WHERE deleted_at IS NULL before the closing quote/paren
        const newLine = fullLine.replace(
          /(FROM\s+[\w.]+)(\s*")/,
          '$1 WHERE deleted_at IS NULL$2'
        ).replace(
          /(FROM\s+[\w.]+)(\s*$)/,
          '$1 WHERE deleted_at IS NULL$2'
        );
        if (newLine !== fullLine) {
          lines[i] = newLine;
          fileChanges.push({ line: i + 1, table: tableName, type: "no-WHERE→add WHERE" });
          totalPatched++;
          fileModified = true;
          continue;
        }
      }
    }

    totalSkipped++;
  }

  if (fileModified) {
    writeFileSync(absPath, lines.join("\n"));
    patched.push({ file: relFile, changes: fileChanges.length });
    console.log(`[PATCHED] ${relFile}: ${fileChanges.length} SELECT queries`);
  }
}

console.log(`\n=== SELECT Filter Summary ===`);
console.log(`Files patched: ${patched.length}`);
console.log(`SELECT queries patched: ${totalPatched}`);
console.log(`Queries skipped: ${totalSkipped}`);
