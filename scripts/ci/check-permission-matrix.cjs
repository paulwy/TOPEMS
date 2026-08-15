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
  // NOTE: Total backend require_permission() real calls across svc+lib is ~49
  // (includes 1 fn definition + doc comments). So effective midbound = 25
  // is a conservative minimum above which scanner regex is known to work.
  totalBackendCodes: 25,
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
/* ---------- Scanner 1: Backend require_permission(CODE) · TEXT-LEVEL match + row反查 ---------- */
function stripRustComments(text) {
  // Remove line comments (// ... \n) and block comments (/* ... */) preserving newlines so line offsets remain correct.
  // We replace comment content with whitespace (keeping \n intact) so char offsets to newlines don't shift.
  const out = [];
  let i = 0;
  let inBlock = false;
  while (i < text.length) {
    const ch = text[i];
    const nx = text[i + 1];
    if (inBlock) {
      if (ch === '*' && nx === '/') { inBlock = false; out.push('  '); i += 2; continue; }
      if (ch === '\n') out.push('\n'); else out.push(' ');
      i++; continue;
    }
    if (ch === '/' && nx === '*') { inBlock = true; out.push('  '); i += 2; continue; }
    if (ch === '/' && nx === '/') {
      // line comment: consume to end-of-line or EOF
      while (i < text.length && text[i] !== '\n') { out.push(' '); i++; }
      continue;
    }
    out.push(ch); i++;
  }
  return out.join('');
}
function lineOfOffset(text, offset) {
  // 1-indexed line number at char position
  let line = 1;
  for (let i = 0; i < offset && i < text.length; i++) if (text[i] === '\n') line++;
  return line;
}
function SCAN_BACKEND() {
  const files = walkSync(path.join(TOPEMS_ROOT, 'svc'), '.rs');
  // Also scan lib/ crates (shared-auth etc.) if they mount routes with permissions
  const libFiles = walkSync(path.join(TOPEMS_ROOT, 'lib'), '.rs').filter(f => !f.includes('/target/'));
  const allFiles = files.concat(libFiles);
  // Multi-line tolerant regex: allow whitespace (including \n) between tokens,
  // allow optional comma after string (Rust closure argument pattern):
  //   require_permission("foo:bar")     — form A
  //   require_permission("settlement:approve",)  — form B (Rust trailing comma)
  //   require_permission(\n    "settlement:approve",\n  )  — form C (multi-line)
  const codeRegex = /require_permission\s*\(\s*"([A-Za-z0-9_:.\\-]+)"\s*,?\s*\)/g;
  const codes = [];
  let commentSkips = 0;

  for (const filePath of allFiles) {
    const parts = filePath.split(path.sep);
    const topIdx = parts.findIndex(p => p === 'svc' || p === 'lib');
    const srcIdx = parts.indexOf('src');
    let crateName = 'unknown-crate';
    if (topIdx !== -1) {
      if (srcIdx !== -1 && srcIdx > topIdx + 1) crateName = parts.slice(topIdx + 1, srcIdx).join('/');
      else if (parts.length > topIdx + 1) crateName = parts[topIdx + 1];
      if (parts[topIdx] === 'lib') crateName = `lib::${crateName}`;
    }

    const raw = fs.readFileSync(filePath, 'utf8');
    const clean = stripRustComments(raw);
    let m;
    while ((m = codeRegex.exec(clean)) !== null) {
      // m[1] is the code. m.index is char offset of the "require_permission" start.
      codes.push({
        crateName,
        filePath: path.relative(TOPEMS_ROOT, filePath),
        lineNo: lineOfOffset(raw, m.index),
        code: m[1]
      });
    }
    // Rough estimate of comment skips: raw has matches but clean doesn't in same region
    const rawMatches = (raw.match(/require_permission\s*\(/g) || []).length;
    const cleanMatches = (clean.match(/require_permission\s*\(/g) || []).length;
    commentSkips += Math.max(0, rawMatches - cleanMatches);
  }
  REPORT.scanners.backendCommentSkips = commentSkips;
  return { files: allFiles.map(f => path.relative(TOPEMS_ROOT, f)), codes };
}
/* ---------- Scanner 2: Frontend Nav / Routes / ModuleConfig permissions ---------- */
function SCAN_FRONTEND() {
  const root = path.join(TOPEMS_ROOT, 'apps', 'web', 'src');
  const moduleConfigs = walkSync(path.join(root, 'modules'), '.ts')
    .filter(f => f.endsWith('/config.ts'));
  const navTreePath = path.join(root, 'layouts', 'navTree.ts');
  const v2RoutePaths = walkSync(path.join(root, 'routes', 'v2'), '.ts');
  const allConfigFiles = moduleConfigs.concat([navTreePath]).concat(v2RoutePaths).filter(fs.existsSync);

  const codes = [];
  const permsRegex1 = /requiredPermissions\s*:\s*\[([^\]]*)\]/g;
  const permsRegex2 = /permission\s*:\s*(['"])([A-Za-z0-9_:.\\-]+)\1/g;
  const singleQuotePerm = /['"]([A-Za-z0-9_:.\\-]+)['"]/g;

  const deriveModule = (filePathAbs) => {
    const rel = path.relative(root, filePathAbs).split(path.sep);
    if (rel[0] === 'modules' && rel.length >= 2) return rel[1];
    if (rel[0] === 'layouts') return 'layouts';
    if (rel[0] === 'routes' && rel[1] === 'v2') return 'routes:v2';
    return 'unknown-frontend';
  };

  for (const fileAbs of allConfigFiles) {
    let text;
    try { text = fs.readFileSync(fileAbs, 'utf8'); } catch { continue; }
    const mod = deriveModule(fileAbs);
    const fileRel = path.relative(TOPEMS_ROOT, fileAbs);
    text.split('\n').forEach((line, i) => {
      let m;
      const rg2 = new RegExp(permsRegex2.source, 'g');
      while ((m = rg2.exec(line)) !== null) codes.push({
        module: mod, navPathOrRoutePath: `${mod}/${i+1}`,
        filePath: fileRel, lineNo: i+1, perms: [m[2]]
      });
      const rg1 = new RegExp(permsRegex1.source, 'g');
      while ((m = rg1.exec(line)) !== null) {
        const arrStr = m[1];
        const perms = [];
        let mm;
        const sq = new RegExp(singleQuotePerm.source, 'g');
        while ((mm = sq.exec(arrStr)) !== null) perms.push(mm[1]);
        if (perms.length) codes.push({
          module: mod, navPathOrRoutePath: `${mod}/${i+1}`,
          filePath: fileRel, lineNo: i+1, perms
        });
      }
    });
  }
  return { configs: allConfigFiles.map(f => path.relative(TOPEMS_ROOT, f)), codes };
}
/* ---------- Scanner 3: Constants Tables ---------- */
function SCAN_CONSTANTS() {
  const frontendPERMSet = new Set();
  const backendCartSet = new Set();
  const moduleCodes = [];
  const actionCodes = [];

  /* Part A: apps/web/src/config/permissions.ts PERMISSIONS object keys */
  const permTsPath = path.join(TOPEMS_ROOT, 'apps', 'web', 'src', 'config', 'permissions.ts');
  try {
    const text = fs.readFileSync(permTsPath, 'utf8');
    // Match quoted 2-4 segment keys with colon separator, followed by ':' (object key pattern)
    const keyRegA = /['"]([a-z][a-z0-9_\-]*\:[a-z0-9_:\-]+)['"]\s*:/g;
    let m;
    while ((m = keyRegA.exec(text)) !== null) frontendPERMSet.add(m[1]);
    // Brutal fallback: also capture all "<word>:<word>:<word>" colon triplet quoted strings in the file
    // (PERMISSIONS keys are the only such patterns)
    const brutal = /['"]([a-z][a-z0-9_\-]*(?:\:[a-z0-9_\-]+){1,3})['"]/g;
    while ((m = brutal.exec(text)) !== null) frontendPERMSet.add(m[1]);
  } catch {}

  /* Part B: lib/shared-auth/src/permission.rs ModuleCode × PermissionAction */
  const permRsPath = path.join(TOPEMS_ROOT, 'lib', 'shared-auth', 'src', 'permission.rs');
  try {
    const text = fs.readFileSync(permRsPath, 'utf8');
    const enumReg = /enum\s+(ModuleCode|PermissionAction)\s*\{([^}]*)\}/g;
    let me;
    while ((me = enumReg.exec(text)) !== null) {
      const [_, name, body] = me;
      const variants = body.split('\n')
        .map(l => l.trim())
        .filter(l => l && !l.startsWith('//') && !l.startsWith('#') && !l.startsWith('['))
        .map(l => l.replace(/,$/, '').trim())
        .map(l => l.split(/\s/)[0])
        .filter(Boolean);
      if (name === 'ModuleCode') moduleCodes.push(...variants);
      if (name === 'PermissionAction') actionCodes.push(...variants);
    }
  } catch {}

  const toSnake = (s) => s.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase().replace(/^_/, '');
  moduleCodes.forEach(mc => {
    const mcLow = toSnake(mc);
    actionCodes.forEach(ac => {
      const acLow = toSnake(ac);
      backendCartSet.add(`${mcLow}:${acLow}`);
    });
  });

  /* Part C: optional scripts/data/permission-metadata.json cache */
  const metadataPath = path.join(TOPEMS_ROOT, 'scripts', 'data', 'permission-metadata.json');
  const metadataSet = new Set();
  try {
    const data = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    (Array.isArray(data) ? data : (data.codes || data.permissions || [])).forEach(c => typeof c === 'string' && metadataSet.add(c));
  } catch { /* optional, skip */ }

  const allValidSet = new Set([...frontendPERMSet, ...backendCartSet, ...metadataSet]);
  return { frontendPERMSet, backendCartSet, allValidSet, moduleCodes, actionCodes, _metadataSetSize: metadataSet.size };
}

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
