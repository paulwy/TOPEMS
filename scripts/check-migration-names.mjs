#!/usr/bin/env node
/**
 * scripts/check-migration-names.mjs
 *
 * Migration naming convention quality gate.
 *
 * Expected (new) canonical format:
 *   YYYYMMDDHHMMSS_{topic}_{summary}.sql
 *   e.g. "20260808120000_iam_add_user_last_login.sql"
 *
 * Transitional-historical formats (allowed by default, fail in --strict):
 *   YYYYMMDDHHMM_{summary}.sql   (12-digit ts, no topic)
 *   YYYYMMDD_{summary}.sql       (8-digit ts,  no topic)
 *
 * Forbidden (always fail CI):
 *   V{NN}_{summary}.sql          (sequential-version style,
 *                                 timestamp-truth-source broken)
 *   any other name pattern
 *
 * Exit 0 = pass, non-zero = CI should fail.
 */

import { readdirSync, statSync } from "node:fs";
import { join, basename, extname } from "node:path";

const ROOTS = ["svc", "lib"];

// --- Regex catalogue --------------------------------------------------------
// Canonical = 14-digit monotonic timestamp + underscore + kebab/snake summary.
//   Two variants, both accepted:
//     Full (preferred): YYYYMMDDHHMMSS_{topic}_{summary}.sql
//     Short (allowed):  YYYYMMDDHHMMSS_{summary}.sql        → advisory warn
const RE_CANONICAL_FULL = /^(\d{14})_([A-Za-z0-9]+)_([A-Za-z0-9][A-Za-z0-9_-]*)\.sql$/;
const RE_CANONICAL_SHORT = /^(\d{14})_([A-Za-z0-9][A-Za-z0-9_-]*)\.sql$/;
const RE_HIST_12   = /^(\d{12})_([A-Za-z0-9_][A-Za-z0-9_-]*)\.sql$/;
const RE_HIST_08   = /^(\d{8})_([A-Za-z0-9_][A-Za-z0-9_-]*)\.sql$/;
const RE_FORBIDDEN = /^V\d+_.*\.sql$/;

const strict = process.argv.includes("--strict");

// --- Collect migration SQL files --------------------------------------------
const all = [];
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (entry.isFile() && extname(entry.name) === ".sql" &&
             basename(dir) === "migrations") {
      all.push(p);
    }
  }
}
for (const r of ROOTS) {
  try { statSync(r); walk(r); } catch { /* noop if missing */ }
}

function validTimestamp14(s) {
  const y = +s.slice(0, 4), m = +s.slice(4, 6), d = +s.slice(6, 8),
        H = +s.slice(8, 10), M = +s.slice(10, 12), S = +s.slice(12, 14);
  if (y < 2020 || y > 2100) return false;
  const dt = new Date(Date.UTC(y, m - 1, d, H, M, S));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 &&
         dt.getUTCDate() === d && dt.getUTCHours() === H &&
         dt.getUTCMinutes() === M && dt.getUTCSeconds() === S;
}
function validTimestamp12(s) {
  return validTimestamp14(s + "00");
}
function validTimestamp08(s) {
  return validTimestamp14(s + "000000");
}

// --- Classify ---------------------------------------------------------------
const counts = { canonical_full: 0, canonical_short: 0,
                 hist12: 0, hist08: 0, forbidden: 0, other: 0 };
const errors = [];
const warnings = [];
const badTs = [];

for (const p of all) {
  const name = basename(p);
  if (RE_FORBIDDEN.test(name)) {
    counts.forbidden++;
    errors.push(`FORBIDDEN V{NN} style: ${p}`);
    continue;
  }
  const mFull = name.match(RE_CANONICAL_FULL);
  if (mFull) {
    counts.canonical_full++;
    if (!validTimestamp14(mFull[1])) badTs.push(`invalid 14-digit ts "${mFull[1]}": ${p}`);
    continue;
  }
  const mShort = name.match(RE_CANONICAL_SHORT);
  if (mShort) {
    counts.canonical_short++;
    if (!validTimestamp14(mShort[1])) badTs.push(`invalid 14-digit ts "${mShort[1]}": ${p}`);
    warnings.push(`canonical but no topic prefix (single segment): ${p}`);
    continue;
  }
  const m12 = name.match(RE_HIST_12);
  if (m12) {
    counts.hist12++;
    if (!validTimestamp12(m12[1])) badTs.push(`invalid 12-digit ts "${m12[1]}": ${p}`);
    (strict ? errors : warnings).push(`HIST 12-digit: ${p}`);
    continue;
  }
  const m08 = name.match(RE_HIST_08);
  if (m08) {
    counts.hist08++;
    if (!validTimestamp08(m08[1])) badTs.push(`invalid 08-digit ts "${m08[1]}": ${p}`);
    (strict ? errors : warnings).push(`HIST 08-digit: ${p}`);
    continue;
  }
  counts.other++;
  errors.push(`UNKNOWN pattern: ${p}`);
}

// --- Timestamp monotonic per-service check (loose: within a migrations dir) -
const monoWarn = [];
for (const r of ROOTS) {
  try { statSync(r); } catch { continue; }
  for (const entry of readdirSync(r, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const mg = join(r, entry.name, "migrations");
    let files;
    try { files = readdirSync(mg).filter(f => f.endsWith(".sql")).sort(); } catch { continue; }
    let lastTs = "0".repeat(14);
    for (const f of files) {
      const m = f.match(/^(\d{14})/) || f.match(/^(\d{12})/) || f.match(/^(\d{8})/);
      if (!m) continue;
      let ts = m[1];
      while (ts.length < 14) ts += "0";
      if (ts < lastTs) monoWarn.push(`NON-MONOTONIC in ${mg}: ${f} (${ts}) <= previous ${lastTs}`);
      lastTs = ts;
    }
  }
}

// --- Report -----------------------------------------------------------------
const total = counts.canonical_full + counts.canonical_short +
              counts.hist12 + counts.hist08 + counts.forbidden + counts.other;
console.log(`\
Migration naming gate (mode: ${strict ? "STRICT" : "default"})
---------------------------
Scanned roots      : ${ROOTS.join(", ")}
Total SQL files    : ${total}
  canonical FULL    (14+topic+summary) : ${counts.canonical_full}
  canonical SHORT   (14+summary only)  : ${counts.canonical_short} (advisory)
  historical 12-digit                : ${counts.hist12}${strict ? " (strict → ERR)" : " (WARN)"}
  historical  8-digit                : ${counts.hist08}${strict ? " (strict → ERR)" : " (WARN)"}
  forbidden  V{NN}_...               : ${counts.forbidden} (ALWAYS ERR)
  other / unmatched                  : ${counts.other} (ALWAYS ERR)
Invalid timestamps : ${badTs.length}
Non-monotonic      : ${monoWarn.length}
Warnings           : ${warnings.length}
Errors             : ${errors.length}
`);

for (const w of warnings) console.log("  ⚠️  " + w);
for (const b of badTs)    console.log("  ❌ " + b);
for (const m of monoWarn) console.log("  ❌ " + m);
for (const e of errors)   console.log("  ❌ " + e);

const fatal = errors.length + badTs.length + monoWarn.length;
if (fatal > 0) {
  console.log(`FAIL: ${fatal} blocking issue(s).`);
  process.exit(1);
}
if (strict) {
  const histHits = warnings.filter(w => /^HIST (12|08)-digit:/.test(w)).length;
  if (histHits > 0) {
    console.log(`FAIL (--strict): ${histHits} historical 8/12-digit migration names remain.`);
    process.exit(2);
  }
}
console.log(`PASS${strict ? " (strict mode)" : ""}.`);
process.exit(0);
