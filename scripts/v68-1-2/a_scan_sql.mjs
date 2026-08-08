#!/usr/bin/env node
/**
 * V68.1-2 Stage A — SQL migrations → (tableKey, col) -> varchar_length map
 *
 * Reads all *.sql files under svc/* /migrations and database/migrations,
 * parses every CREATE TABLE (with optional pg_schema prefix → `pg_table`)
 * as well as every ALTER TABLE ADD COLUMN ... VARCHAR(n).
 *
 * Output: JSON object, keys = "table_key.col_snake_lower", values = N.
 * For duplicate keys across migrations, KEEPS THE LARGEST N (honors last
 * ALTER enlarge).
 */
import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, extname, dirname as pDirname, basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = pDirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
const OUT_DIR = join(__dirname, ".run");
const OUT_FILE = join(OUT_DIR, "table-col-varchar.map.json");

const MAP = new Map(); // "table.col" -> max N across all migrations

function walk(dir, visitor) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, visitor);
    else if (e.isFile()) visitor(p);
  }
}

function procSql(p) {
  const src = readFileSync(p, "utf8");

  // --- CREATE TABLE ---
  // split on statement end ';' followed by newline/EOF.
  const buf = "\n" + src + "\n";
  const stmts = [];
  {
    let start = 1, inStr = null, esc = false, lc = false, bc = false, inDol = false;
    for (let i = 1; i < buf.length; i++) {
      const ch = buf[i], n = buf[i+1];
      if (lc) { if (ch === "\n") lc = false; continue; }
      if (bc) { if (ch === "*" && n === "/") { bc = false; i++; } continue; }
      if (inDol) { if (ch === "$" && buf.slice(i,i+3) === "$$") { inDol = false; i += 2; } continue; }
      if (inStr) { if (esc){esc=false;continue;} if (ch === "\\") { esc=true; continue; } if (ch === inStr) inStr = null; continue; }
      if (ch === "/" && n === "/") { lc = true; i++; continue; }
      if (ch === "/" && n === "*") { bc = true; i++; continue; }
      if (ch === "$" && buf.slice(i,i+3) === "$$") { inDol = true; i += 2; continue; }
      if (ch === "'" || ch === '"' || ch === "`") { inStr = ch; continue; }
      if (ch === ";") {
        stmts.push(buf.slice(start, i));
        start = i + 1;
      }
    }
    if (start < buf.length - 1) stmts.push(buf.slice(start, -1));
  }

  for (const sRaw of stmts) {
    const s = sRaw.trim();
    if (!s) continue;
    const h = s.match(/^CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:([\w]+)\.)?([\w]+)\s*\(/i);
    if (!h) continue;
    const pg = (h[1] || "").toLowerCase();
    const tbl = h[2].toLowerCase();
    const tableKey = pg ? `${pg}_${tbl}` : tbl;
    const bs = s.indexOf("("); if (bs < 0) continue;
    // balanced )
    let d = 0, inS = null, end = -1;
    for (let i = bs; i < s.length; i++) {
      const ch = s[i];
      if (inS) { if (ch === inS) inS = null; else if (ch === "\\") i++; continue; }
      if (ch === "'" || ch === '"' || ch === "`") { inS = ch; continue; }
      if (ch === "(") d++;
      else if (ch === ")") { d--; if (d === 0) { end = i; break; } }
    }
    if (end < 0) continue;
    const body = s.slice(bs + 1, end);
    const lines = body.split(/,(?![^()]*\))/);
    for (const cl of lines) {
      const col = cl.trim();
      if (/^(CONSTRAINT|PRIMARY\s+KEY|FOREIGN\s+KEY|UNIQUE|CHECK|INDEX|KEY|FULLTEXT|SPATIAL|EXCLUDE)\b/i.test(col)) continue;
      const m = col.match(/^[`""]?([\w]+)[`""]?\s+VARCHAR\s*\(\s*(\d+)\s*\)/i);
      if (!m) continue;
      const cn = m[1].toLowerCase();
      const n = parseInt(m[2], 10);
      const k = `${tableKey}.${cn}`;
      if (!MAP.has(k) || MAP.get(k) < n) MAP.set(k, n);
    }
  }

  // --- ALTER TABLE ADD COLUMN VARCHAR(n) ---
  const addRe = /ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:([\w]+)\.)?([\w]+)\s+ADD\s+(?:COLUMN\s+)?[`""]?([\w]+)[`""]?\s+VARCHAR\s*\(\s*(\d+)\s*\)/gi;
  let ma;
  while ((ma = addRe.exec(src)) !== null) {
    const pg = (ma[1] || "").toLowerCase();
    const tbl = ma[2].toLowerCase();
    const tableKey = pg ? `${pg}_${tbl}` : tbl;
    const cn = ma[3].toLowerCase();
    const n = parseInt(ma[4], 10);
    const k = `${tableKey}.${cn}`;
    if (!MAP.has(k) || MAP.get(k) < n) MAP.set(k, n);
  }
}

const roots = [join(ROOT,"svc"), join(ROOT,"lib"), join(ROOT,"database")];
for (const r of roots) { try { statSync(r); } catch { continue; } walk(r, (p) => {
  if (extname(p) !== ".sql") return;
  if (basename(pDirname(p)) !== "migrations") return;
  procSql(p);
}); }

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
const obj = Object.fromEntries([...MAP.entries()].sort());
writeFileSync(OUT_FILE, JSON.stringify(obj, null, 2) + "\n", "utf8");

console.log(`[Stage A] visited migrations -> produced ${MAP.size} (table.col) → VARCHAR(n) mappings`);
console.log(`            saved to: ${OUT_FILE}`);
process.exit(0);
