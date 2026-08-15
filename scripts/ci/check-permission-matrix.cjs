#!/usr/bin/env node
'use strict';

/* ==========================================================================
 * Permission Matrix 3-Way Gate — A-Strict (P4 Isomorphic Skeleton v1.0)
 * Single CJS file · 3 Scanners (backend/frontend/constants) · 6 Rules (3 FAIL, 3 WARN)
 * Dry-run DEFAULT: never exit≠1 unless explicit --fail-fast
 * ========================================================================== */

const fs = require('fs');
const path = require('path');

const TOPEMS_ROOT = path.resolve(__dirname, '..', '..');
const ARGS = process.argv.slice(2);

/* ---------- CLI Args (P4 pattern) ---------- */
const argIdx = (name) => ARGS.indexOf(name);
const HAS_ARG = (name) => argIdx(name) !== -1;
const GET_ARG = (name, fallback = null) => {
  const i = argIdx(name);
  return i === -1 ? fallback : (ARGS[i + 1] || fallback);
};

const DRY_RUN = !HAS_ARG('--fail-fast');          // DEFAULT true
const REPORT_JSON = GET_ARG('--report-json');
const SCAN = (GET_ARG('--scan') || 'backend,frontend,constants').split(',').map(s => s.trim());
const FAIL_FAST_THRESHOLDS = Object.assign({
  R1: 1, R2: 1, R3: 1, R4: Infinity, R5: Infinity, R6: Infinity
}, (() => {
  const raw = GET_ARG('--thresholds');
  if (!raw) return {};
  const out = {};
  for (const pair of raw.split(',')) {
    const [k, v] = pair.split(':');
    out[k.trim()] = Number(v);
  }
  return out;
})());

const INTEGRITY_MIN = Object.freeze({
  scannedBackendFiles: 50,
  scannedFrontendConfigs: 20,
  totalBackendCodes: 100,
  totalFrontendNavCodes: 100
});

const REPORT = {
  version: 'perm-matrix-gate@1.0.0',
  createdAt: new Date().toISOString(),
  runConfig: { dryRun: DRY_RUN, failFastThresholds: FAIL_FAST_THRESHOLDS, scan: SCAN },
  scanners: {
    scannedBackendFiles: 0, scannedFrontendConfigs: 0,
    totalBackendCodes: 0,  totalFrontendNavCodes: 0,
    backendCommentSkips: 0, frontendPERMSetSize: 0, backendModuleCodeSize: 0
  },
  integrity: { passed: false, violations: [] },
  summary: { R1: 0, R2: 0, R3: 0, R4: 0, R5: 0, R6: 0 },
  failures: [],   // { rule, level: 'FAIL', file, line, code, msg, crateOrModule? }
  warnings: [],   // { rule, level: 'WARN', file?, line?, code?, msg, details? }
  orphanCodes: [] // R5 detail only
};

/* ---------- Scanner stubs (to be implemented in Commit 2) ---------- */
function walkSync(dir, extOrNull, out = []) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory() && !['node_modules','.git','dist','target','.turbo'].includes(e.name))
      walkSync(p, extOrNull, out);
    else if (e.isFile() && (extOrNull === null || p.endsWith(extOrNull)))
      out.push(p);
  }
  return out;
}
const SCAN_BACKEND = () => ({ files: [], codes: [] });   // Step 2.2 实现
const SCAN_FRONTEND = () => ({ configs: [], codes: [] }); // Step 2.3 实现
const SCAN_CONSTANTS = () => ({ frontendPERMSet: new Set(), backendCartSet: new Set(), allValidSet: new Set(), moduleCodes: [] }); // Step 2.4 实现

/* ---------- Validator stubs (to be implemented in Commit 3) ---------- */
const RUN_VALIDATORS = (scanR, constR) => { /* noop initially */ };

/* ---------- Core runGate() (pure · exportable for Vitest) ---------- */
async function runGate(config = {}) {
  const scan = config.scan || SCAN;
  let backendRes = { files: [], codes: [] };
  let frontendRes = { configs: [], codes: [] };
  let constRes = { allValidSet: new Set(), frontendPERMSet: new Set(), backendCartSet: new Set(), moduleCodes: [] };

  if (scan.includes('backend'))  backendRes = SCAN_BACKEND();
  if (scan.includes('frontend')) frontendRes = SCAN_FRONTEND();
  if (scan.includes('constants')) constRes = SCAN_CONSTANTS();

  REPORT.scanners.scannedBackendFiles    = backendRes.files.length;
  REPORT.scanners.scannedFrontendConfigs = frontendRes.configs.length;
  REPORT.scanners.totalBackendCodes      = backendRes.codes.length;
  REPORT.scanners.totalFrontendNavCodes  = frontendRes.codes.length;
  REPORT.scanners.frontendPERMSetSize    = constRes.frontendPERMSet.size;
  REPORT.scanners.backendModuleCodeSize  = (constRes.moduleCodes || []).length;

  /* --- Integrity L2 (anti-false-green · FATAL if fails even in dry-run) --- */
  const integrityFails = [];
  for (const k of Object.keys(INTEGRITY_MIN)) {
    if (REPORT.scanners[k] < INTEGRITY_MIN[k]) {
      integrityFails.push(`[INTEGRITY FAIL] ${k}=${REPORT.scanners[k]} (need ≥ ${INTEGRITY_MIN[k]}) — scanner regex/path likely broken`);
    }
  }
  REPORT.integrity.passed = integrityFails.length === 0;
  REPORT.integrity.violations = integrityFails;

  RUN_VALIDATORS(backendRes, frontendRes, constRes);

  if (REPORT_JSON) {
    const outPath = path.resolve(TOPEMS_ROOT, REPORT_JSON);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    const serialized = JSON.stringify({
      ...REPORT,
      scanners: REPORT.scanners,
      orphanCodes: REPORT.orphanCodes.slice(0, 50),
      failures: REPORT.failures.slice(0, 200),
      warnings: REPORT.warnings.slice(0, 200),
    }, null, 2);
    fs.writeFileSync(outPath, serialized, 'utf8');
  }
  return REPORT;
}

/* ---------- CLI Exit Handler ---------- */
if (require.main === module) {
  (async () => {
    const report = await runGate();
    console.log('\n' + '='.repeat(72));
    console.log('  PERMISSION MATRIX 3-WAY GATE · A-STRICT  ' + (report.integrity.passed ? '' : '⚠️  INTEGRITY FAIL'));
    console.log('='.repeat(72));
    console.log('  Scan scope      :', SCAN.join(', '));
    console.log('  Mode            :', DRY_RUN ? 'DRY-RUN (default, never exit≠1)' : 'FAIL-FAST');
    console.log('  Integrity PASS  :', report.integrity.passed);
    if (!report.integrity.passed) report.integrity.violations.forEach(v => console.log('   -', v));
    console.log('  ── Scanner stats ──');
    for (const k of Object.keys(REPORT.scanners))
      console.log(`   . ${k.padEnd(26)} = ${report.scanners[k]}`);
    console.log('  ── Summary RULES ──');
    for (let i = 1; i <= 6; i++)
      console.log(`   R${i}: ${String(report.summary['R' + i]).padStart(5)} · ${i <= 3 ? 'FAIL' : 'WARN'}`);
    if (report.failures.length) console.log(`\n  ⛔ FAILURES (top 50):`);
    report.failures.slice(0, 50).forEach(f => console.log(`    [${f.rule}] ${f.file}:${f.line} · ${f.code || ''} → ${f.msg}`));
    if (report.warnings.length) console.log(`\n  ⚠️  WARNINGS (top 30):`);
    report.warnings.slice(0, 30).forEach(w => console.log(`    [${w.rule}] ${w.msg}`));
    console.log('\n  Report JSON       :', REPORT_JSON || '(not written · pass --report-json)');
    console.log('='.repeat(72));

    /* Exit logic:
     * - Integrity FAIL (exit=2) → ALWAYS red, even in dry-run (script broken = no trust)
     * - Fail-FAST on: R1/R2/R3 any meet threshold → exit=1
     * - DRY-RUN default: always exit=0
     */
    if (!report.integrity.passed) process.exit(2);
    if (!DRY_RUN) {
      const hardFail = (['R1','R2','R3'].some(r => report.summary[r] >= FAIL_FAST_THRESHOLDS[r]));
      if (hardFail) process.exit(1);
    }
    process.exit(0);
  })().catch(err => { console.error('FATAL:', err); process.exit(3); });
}

module.exports = { runGate, INTEGRITY_MIN, DEFAULT_FAIL_FAST_THRESHOLDS: FAIL_FAST_THRESHOLDS };
