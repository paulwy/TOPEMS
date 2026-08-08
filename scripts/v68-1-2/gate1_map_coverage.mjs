#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs";
import { join, dirname as pDirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = pDirname(fileURLToPath(import.meta.url));
const MAP_FILE = join(__dirname, ".run", "table-col-varchar.map.json");
const ALIAS_FILE = join(__dirname, "entity-table-map.json");
if (!existsSync(MAP_FILE) || !existsSync(ALIAS_FILE)) { console.error("Run Stage A/B first."); process.exit(2); }
const V = JSON.parse(readFileSync(MAP_FILE, "utf8")); const A = JSON.parse(readFileSync(ALIAS_FILE, "utf8"));
const all = Object.keys(V);
const longCols = all.filter(k => V[k] >= 500);
const tableKeysFromAlias = new Set(Object.values(A).filter(v => typeof v === "object" && v.tableKey).map(v => v.tableKey));
const received = new Set();
for (const k of all) { const t = k.split(".")[0]; if (tableKeysFromAlias.has(t)) received.add(k); }
const rate = received.size / all.length;
const longHit = longCols.filter(k => received.has(k)).length;
const longRate = longCols.length ? longHit / longCols.length : 1;
console.log(`[GATE1] total varchar=${all.length}  received_by_alias=${received.size}  rate=${(rate*100).toFixed(1)}%`);
console.log(`[GATE1] long_col(>=500)=${longCols.length}  received=${longHit}  rate=${(longRate*100).toFixed(1)}%`);
let ok = true;
if (rate < 0.90) { console.error(`[GATE1 FAIL] overall coverage <90%.`); ok=false; }
if (longRate < 1.0) { console.error(`[GATE1 FAIL] long columns 100% receiving expected.`); ok=false; }
if (ok) console.log(`[GATE1 PASSED] coverage=${(rate*100).toFixed(1)}%  longcols=100%`);
process.exit(ok?0:1);
