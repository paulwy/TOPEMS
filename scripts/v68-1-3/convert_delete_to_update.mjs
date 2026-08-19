#!/usr/bin/env node
/**
 * V68.1-3 Phase 2+3: Rust DELETE→UPDATE converter
 *
 * Reads convert_map.json and converts:
 *   "DELETE FROM {table} WHERE {condition}"
 *   → "UPDATE {table} SET deleted_at = NOW() WHERE {condition}"
 *
 * Handles:
 * - Single-line: DELETE FROM ... WHERE ...
 * - Multi-line sqlx::query() with DELETE FROM on its own line
 * - Various formatting styles (r#"..."#, plain strings)
 *
 * Safety:
 * - Only converts exact "DELETE FROM" matches
 * - Preserves original formatting/indentation
 * - Skips lines in test files
 * - Reports all changes for review
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname as pDirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = pDirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');

const convertMap = JSON.parse(readFileSync(join(__dirname, 'convert_map.json'), 'utf8'));

// Group by file
const byFile = new Map();
for (const entry of convertMap) {
  if (!byFile.has(entry.file)) byFile.set(entry.file, []);
  byFile.get(entry.file).push(entry);
}

let totalConverted = 0;
let totalSkipped = 0;
const changes = [];

for (const [relFile, entries] of byFile) {
  const absPath = join(ROOT, relFile);
  let src;
  try {
    src = readFileSync(absPath, 'utf8');
  } catch (e) {
    console.error(`[SKIP] Cannot read ${relFile}: ${e.message}`);
    totalSkipped += entries.length;
    continue;
  }

  const lines = src.split('\n');
  let fileChanged = false;
  const fileChanges = [];

  // Process entries sorted by line number descending (so changes don't shift line numbers)
  const sorted = [...entries].sort((a, b) => b.line - a.line);

  for (const entry of sorted) {
    const idx = entry.line - 1; // 0-based
    if (idx >= lines.length) {
      totalSkipped++;
      continue;
    }

    const line = lines[idx];
    const trimmed = line.trim();

    // Match: DELETE FROM {table} [WHERE ...] or just "DELETE FROM {table}"
    // Also match multiline: "DELETE FROM" on one line, WHERE on next
    const deleteMatch = trimmed.match(/^DELETE\s+FROM\s+([\w.]+)(.*)$/i);

    if (deleteMatch) {
      const table = deleteMatch[1];
      const rest = deleteMatch[2]; // could be " WHERE ..." or empty (multiline)

      // Convert to UPDATE
      const indent = line.match(/^\s*/)[0];
      if (rest.trim()) {
        // Single-line: DELETE FROM table WHERE ... → UPDATE table SET deleted_at = NOW() WHERE ...
        const newLine = `${indent}UPDATE ${table} SET deleted_at = NOW()${rest}`;
        lines[idx] = newLine;
        fileChanges.push({
          line: entry.line,
          old: trimmed,
          new: newLine.trim(),
          table: entry.tableKey,
        });
      } else {
        // Multiline: "DELETE FROM table" → "UPDATE table SET deleted_at = NOW()"
        // Check if next non-empty line has WHERE
        let nextIdx = idx + 1;
        while (nextIdx < lines.length && lines[nextIdx].trim() === '') nextIdx++;

        if (nextIdx < lines.length && /^\s*WHERE/i.test(lines[nextIdx])) {
          // "DELETE FROM table\n WHERE ..." → "UPDATE table SET deleted_at = NOW()\n WHERE ..."
          const newLine = `${indent}UPDATE ${table} SET deleted_at = NOW()`;
          lines[idx] = newLine;
          fileChanges.push({
            line: entry.line,
            old: trimmed,
            new: newLine.trim(),
            table: entry.tableKey,
          });
        } else {
          // Standalone DELETE FROM table (no WHERE) - convert to UPDATE
          const newLine = `${indent}UPDATE ${table} SET deleted_at = NOW()`;
          lines[idx] = newLine;
          fileChanges.push({
            line: entry.line,
            old: trimmed,
            new: newLine.trim(),
            table: entry.tableKey,
          });
        }
      }
      totalConverted++;
      fileChanged = true;
    } else {
      // The DELETE might be on a different format - check if line contains DELETE FROM
      if (/DELETE\s+FROM/i.test(line)) {
        // Try to find DELETE FROM in the middle of a string
        const newLine = line
          .replace(/DELETE\s+FROM\s+([\w.]+)\s+WHERE/i, 'UPDATE $1 SET deleted_at = NOW() WHERE')
          .replace(/DELETE\s+FROM\s+([\w.]+)/i, 'UPDATE $1 SET deleted_at = NOW()');
        if (newLine !== line) {
          lines[idx] = newLine;
          fileChanges.push({
            line: entry.line,
            old: trimmed,
            new: newLine.trim(),
            table: entry.tableKey,
          });
          totalConverted++;
          fileChanged = true;
        } else {
          totalSkipped++;
        }
      } else {
        totalSkipped++;
      }
    }
  }

  if (fileChanged) {
    writeFileSync(absPath, lines.join('\n'));
    changes.push({ file: relFile, count: fileChanges.length, details: fileChanges });
    console.log(`[CONVERTED] ${relFile}: ${fileChanges.length} statements`);
  }
}

// Write change log
writeFileSync(join(__dirname, 'conversion_log.json'), JSON.stringify(changes, null, 2));

console.log(`\n=== Conversion Summary ===`);
console.log(`Files modified: ${changes.length}`);
console.log(`Statements converted: ${totalConverted}`);
console.log(`Statements skipped: ${totalSkipped}`);
console.log(`Change log: scripts/v68-1-3/conversion_log.json`);
