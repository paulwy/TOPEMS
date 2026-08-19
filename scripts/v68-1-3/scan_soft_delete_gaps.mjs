#!/usr/bin/env node
/**
 * V68.1-3 Phase 2 Scanner — Find tables that use DELETE FROM in Rust
 * but don't have a deleted_at column in SQL.
 *
 * Strategy:
 * 1. Scan all SQL migrations → build set of (tableKey) that HAVE deleted_at
 * 2. Scan all Rust .rs files → extract DELETE FROM table references
 * 3. Cross-reference: tables with DELETE but no deleted_at
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname, dirname as pDirname, basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = pDirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');

// --- 1. Scan SQL for tables WITH deleted_at ---
const tablesWithDeletedAt = new Set();
const allTables = new Map(); // tableKey → { schema, name, file }

function scanSql(p) {
  const src = readFileSync(p, 'utf8');
  const buf = '\n' + src + '\n';
  const stmts = [];
  {
    let start = 1,
      inStr = null,
      esc = false,
      lc = false,
      bc = false,
      inDol = false;
    for (let i = 1; i < buf.length; i++) {
      const ch = buf[i],
        n = buf[i + 1];
      if (lc) {
        if (ch === '\n') lc = false;
        continue;
      }
      if (bc) {
        if (ch === '*' && n === '/') {
          bc = false;
          i++;
        }
        continue;
      }
      if (inDol) {
        if (ch === '$' && buf.slice(i, i + 3) === '$$') {
          inDol = false;
          i += 2;
        }
        continue;
      }
      if (inStr) {
        if (esc) {
          esc = false;
          continue;
        }
        if (ch === '\\') {
          esc = true;
          continue;
        }
        if (ch === inStr) inStr = null;
        continue;
      }
      if ((ch === '-' && n === '-') || (ch === '/' && n === '/')) {
        lc = true;
        i++;
        continue;
      }
      if (ch === '/' && n === '*') {
        bc = true;
        i++;
        continue;
      }
      if (ch === '$' && buf.slice(i, i + 3) === '$$') {
        inDol = true;
        i += 2;
        continue;
      }
      if (ch === "'" || ch === '"' || ch === '`') {
        inStr = ch;
        continue;
      }
      if (ch === ';') {
        stmts.push(buf.slice(start, i));
        start = i + 1;
      }
    }
    if (start < buf.length - 1) stmts.push(buf.slice(start, -1));
  }
  for (const sRaw of stmts) {
    const s = sRaw.replace(/^--[^\n]*\n/gm, '').trim();
    if (!s) continue;
    const h = s.match(/^CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:([\w]+)\.)?([\w]+)\s*\(/i);
    if (!h) continue;
    const pg = (h[1] || '').toLowerCase();
    const tbl = h[2].toLowerCase();
    const tableKey = pg ? `${pg}_${tbl}` : tbl;
    allTables.set(tableKey, { schema: pg, name: tbl, file: p });
    if (/\bdeleted_at\b/i.test(s)) {
      tablesWithDeletedAt.add(tableKey);
    }
  }
}
function walkSql(dir, fn) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walkSql(p, fn);
    else if (e.isFile() && extname(p) === '.sql' && basename(pDirname(p)) === 'migrations') fn(p);
    else if (e.isFile() && extname(p) === '.sql' && p.includes('/init/')) fn(p);
    else if (e.isFile() && extname(p) === '.sql' && p.includes('/database/migrations/')) fn(p);
  }
}
for (const r of [join(ROOT, 'svc'), join(ROOT, 'lib'), join(ROOT, 'database')]) {
  try {
    statSync(r);
    walkSql(r, scanSql);
  } catch {}
}

// --- 2. Scan Rust for DELETE FROM ---
const deleteTables = new Map(); // tableKey → [{ file, line, fullStatement }]

function scanRust(p) {
  const src = readFileSync(p, 'utf8');
  const lines = src.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Match DELETE FROM with optional schema prefix
    const m = line.match(/DELETE\s+FROM\s+(?:([\w]+)\.)?([\w]+)/i);
    if (!m) continue;
    // Skip test files and comments
    if (p.includes('/tests/') || p.includes('#[test]')) continue;
    const pg = (m[1] || '').toLowerCase();
    const tbl = m[2].toLowerCase();
    const tableKey = pg ? `${pg}_${tbl}` : tbl;
    if (!deleteTables.has(tableKey)) deleteTables.set(tableKey, []);
    deleteTables.get(tableKey).push({ file: p.replace(ROOT + '/', ''), line: i + 1, stmt: line.trim() });
  }
}
function walkRust(dir, fn) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'target' || e.name === 'node_modules') continue;
      walkRust(p, fn);
    } else if (e.isFile() && extname(p) === '.rs') fn(p);
  }
}
walkRust(join(ROOT, 'svc'), scanRust);
walkRust(join(ROOT, 'lib'), scanRust);

// --- 3. Cross-reference ---
const needsMigration = []; // tables with DELETE but no deleted_at
const hasDeletedAtButStillDeletes = []; // tables with deleted_at but code uses DELETE

for (const [tableKey, occurrences] of deleteTables) {
  // Try to match table key variations
  const hasDeletedAt =
    tablesWithDeletedAt.has(tableKey) ||
    [...tablesWithDeletedAt].some((t) => t.endsWith('.' + tableKey) || t === tableKey);

  if (hasDeletedAt) {
    hasDeletedAtButStillDeletes.push({ tableKey, count: occurrences.length, occurrences: occurrences.slice(0, 3) });
  } else {
    // Check if table exists in SQL at all
    const sqlTable = allTables.get(tableKey);
    needsMigration.push({ tableKey, count: occurrences.length, sqlTable, occurrences: occurrences.slice(0, 3) });
  }
}

// --- Report ---
console.log('=== V68.1-3 Phase 2 Scanner ===\n');
console.log(`SQL tables total: ${allTables.size}`);
console.log(`SQL tables WITH deleted_at: ${tablesWithDeletedAt.size}`);
console.log(`Tables referenced in DELETE FROM: ${deleteTables.size}\n`);

console.log(`\n--- Phase 2: Tables needing deleted_at column (${needsMigration.length}) ---\n`);
needsMigration.sort((a, b) => b.count - a.count);
for (const t of needsMigration) {
  const svc = t.occurrences[0].file.split('/')[1] || '?';
  const sqlInfo = t.sqlTable ? `SQL: ${t.sqlTable.file.replace(ROOT + '/', '')}` : 'NO SQL TABLE FOUND';
  console.log(`  ${t.tableKey} (${t.count} DELETEs, svc=${svc}) — ${sqlInfo}`);
  t.occurrences.forEach((o) => console.log(`    ${o.file}:${o.line}`));
}

console.log(`\n--- Phase 3: Tables with deleted_at but code uses DELETE (${hasDeletedAtButStillDeletes.length}) ---\n`);
hasDeletedAtButStillDeletes.sort((a, b) => b.count - a.count);
for (const t of hasDeletedAtButStillDeletes) {
  const svc = t.occurrences[0].file.split('/')[1] || '?';
  console.log(`  ${t.tableKey} (${t.count} DELETEs, svc=${svc})`);
  t.occurrences.forEach((o) => console.log(`    ${o.file}:${o.line}`));
}

// Summary by service
console.log('\n--- Summary by service ---\n');
const bySvc = new Map();
for (const t of [...needsMigration, ...hasDeletedAtButStillDeletes]) {
  const svc = t.occurrences[0].file.split('/')[1] || '?';
  if (!bySvc.has(svc)) bySvc.set(svc, { phase2: 0, phase3: 0 });
  if (needsMigration.includes(t)) bySvc.get(svc).phase2++;
  else bySvc.get(svc).phase3++;
}
[...bySvc.entries()].sort().forEach(([svc, counts]) => {
  console.log(`  ${svc}: Phase2=${counts.phase2} tables, Phase3=${counts.phase3} tables`);
});
