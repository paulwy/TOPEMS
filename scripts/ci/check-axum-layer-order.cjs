#!/usr/bin/env node
'use strict';

/* ==========================================================================
 * Axum Middleware Layer Order Static Checker — A-Strict
 * Single CJS file · Line-based scanner + state machine · 3 Rules (1 FAIL + 2 WARN)
 * Dry-run DEFAULT: never exit≠1 unless explicit --fail-fast
 *
 * Axum layer semantics: LAST added via .layer() = OUTERMOST = runs FIRST on request.
 * For TOPEMS services:
 *   - auth_middleware MUST be LAST  (outermost, runs first → injects Claims)
 *   - tenant_middleware MUST be FIRST (innermost, runs last → needs Extension<Claims>)
 * ========================================================================== */

const fs = require('fs');
const path = require('path');

const TOPEMS_ROOT = path.resolve(__dirname, '..', '..');
const ARGS = process.argv.slice(2);

/* ---------- CLI Args (P4 pattern · supports --x=v OR --x v) ---------- */
const argIdx = (name) => {
  const idx = ARGS.indexOf(name);
  if (idx !== -1) return { i: idx, mode: 'space' };
  const eqIdx = ARGS.findIndex(a => typeof a === 'string' && a.startsWith(`${name}=`));
  return eqIdx === -1 ? { i: -1, mode: null } : { i: eqIdx, mode: 'eq' };
};
const HAS_ARG = (name) => argIdx(name).i !== -1;
const GET_ARG = (name, fallback = null) => {
  const { i, mode } = argIdx(name);
  if (i === -1) return fallback;
  if (mode === 'eq') return ARGS[i].slice(name.length + 1) || fallback;
  return ARGS[i + 1] || fallback;
};

const DRY_RUN = !HAS_ARG('--fail-fast');
const REPORT_JSON = GET_ARG('--report-json');
const SCAN = (GET_ARG('--scan') || 'svc/**/*.rs').trim();
const FAIL_FAST_THRESHOLDS = Object.assign({
  R1: 0, R2: Infinity, R3: Infinity
}, (() => {
  const raw = GET_ARG('--thresholds');
  if (!raw) return {};
  if (raw.trim().startsWith('{')) {
    try {
      const obj = JSON.parse(raw);
      const out = {};
      for (const k of Object.keys(obj)) out[k] = Number(obj[k]);
      return out;
    } catch (e) {
      console.warn('[WARN] --thresholds JSON parse failed; falling back to K:V format:', e.message);
    }
  }
  const out = {};
  for (const pair of raw.split(',')) {
    const sep = pair.indexOf(':');
    if (sep === -1) continue;
    const k = pair.slice(0, sep).trim();
    const v = pair.slice(sep + 1).trim();
    out[k] = Number(v);
  }
  return out;
})());

const INTEGRITY_MIN = Object.freeze({
  scannedFiles: 20,
  foundRouters: 10
});

const R2_WHITELIST_ROUTER_VARS = new Set([
  'core_public_routes',
]);
const R2_WHITELIST_FILE_VAR = new Set([
  'svc/plugin-registry/src/main.rs|protected_routes',
]);

const REPORT = {
  version: 'axum-layer-order-gate@1.0.0',
  createdAt: new Date().toISOString(),
  runConfig: { dryRun: DRY_RUN, failFastThresholds: FAIL_FAST_THRESHOLDS, scan: SCAN },
  scanners: {
    scannedFiles: 0,
    foundRouters: 0,
    routersWithBothMiddleware: 0,
    matchedLayers: 0,
    buildApplicationCalls: 0
  },
  integrity: { passed: false, weakPass: false, violations: [] },
  summary: { R1: 0, R2: 0, R3: 0 },
  failures: [],
  warnings: [],
  routers: []
};

/* ---------- Helpers ---------- */
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

function globToFiles(pattern) {
  const parts = pattern.split(/[\\/]/);
  const baseParts = [];
  let globStart = -1;
  for (let i = 0; i < parts.length; i++) {
    if (parts[i].includes('*') || parts[i].includes('?')) { globStart = i; break; }
    baseParts.push(parts[i]);
  }
  let baseDir;
  if (globStart === -1) {
    const abs = path.isAbsolute(pattern) ? pattern : path.join(TOPEMS_ROOT, pattern);
    return fs.existsSync(abs) && fs.statSync(abs).isFile() ? [abs] : [];
  } else {
    baseDir = path.isAbsolute(baseParts[0]) ? path.join(...baseParts) : path.join(TOPEMS_ROOT, ...baseParts);
  }
  const globPart = parts.slice(globStart).join('/');
  const extMatch = globPart.match(/\.([a-zA-Z0-9]+)$/);
  const ext = extMatch ? '.' + extMatch[1] : null;
  const all = walkSync(baseDir, ext);
  if (globPart === '**/*' + ext) return all;
  const minimatch = (filePath, glob) => {
    const fRel = path.relative(baseDir, filePath).split(path.sep).join('/');
    const rx = new RegExp('^' + glob
      .replace(/\./g, '\\.')
      .replace(/\*\*/g, '<<**>>')
      .replace(/\*/g, '[^/]*')
      .replace(/<<\*\*>>/g, '.*')
      .replace(/\?/g, '.') + '$');
    return rx.test(fRel);
  };
  return all.filter(f => minimatch(f, globPart));
}

function stripRustComments(text) {
  const out = [];
  let i = 0;
  let inBlock = false;
  let inStr = false;
  let strCh = '';
  while (i < text.length) {
    const ch = text[i];
    const nx = text[i + 1];
    if (inStr) {
      out.push(ch);
      if (ch === '\\') { out.push(nx || ''); i += 2; continue; }
      if (ch === strCh) inStr = false;
      i++; continue;
    }
    if (!inBlock && (ch === '"' || ch === "'")) {
      inStr = true; strCh = ch; out.push(ch); i++; continue;
    }
    if (inBlock) {
      if (ch === '*' && nx === '/') { inBlock = false; out.push('  '); i += 2; continue; }
      if (ch === '\n') out.push('\n'); else out.push(' ');
      i++; continue;
    }
    if (ch === '/' && nx === '*') { inBlock = true; out.push('  '); i += 2; continue; }
    if (ch === '/' && nx === '/') {
      while (i < text.length && text[i] !== '\n') { out.push(' '); i++; }
      continue;
    }
    out.push(ch); i++;
  }
  return out.join('');
}

/* ---------- Scanner: find Router blocks + .layer() calls ---------- */
function SCAN_ROUTERS(filePaths) {
  const routers = [];
  let matchedLayers = 0;
  let buildApplicationCalls = 0;
  const protectedVarByFile = {};
  const publicVarByFile = {};
  const fileHasGlobalAuth = {};

  const routerDefRegex = /(?:let|const)\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(?:[A-Za-z_][A-Za-z0-9_]*::)?Router::new\s*\(\s*\)/;
  const layerStartRegex = /\.layer\s*\(/;
  const authMwRegex = /auth_middleware|jwt_auth_middleware/;
  const tenantMwRegex = /tenant_middleware/;
  const withStateRegex = /\.with_state\s*\(/;
  const mergeRegex = /\.merge\s*\(/;
  const buildAppRegex = /build_application\s*\(\s*([^,]+),\s*([^,]+),\s*([A-Za-z_][A-Za-z0-9_]*)\s*,\s*([A-Za-z_][A-Za-z0-9_]*)/;
  const applicationStructRegex = /Application\s*\{/;

  function detectLayerKindInWindow(cleanLines, rawLines, startLn, maxLookAhead = 5) {
    const maxLn = Math.min(cleanLines.length, startLn + maxLookAhead);
    // 以 startLn 本行第一个 `(` 的深度为基线，避免与后续新的 `.layer(` 新开括号串到一起
    // 导致 from_fn(tenant)) <同一行闭合> 误吞下一行的 from_fn_with_state(auth...)。
    let parenDepth = 0;
    let baselineSet = false;
    const buf = [];
    const rawBuf = [];
    const firstLn = startLn + 1;
    for (let i = startLn; i < maxLn; i++) {
      const cl = cleanLines[i];
      const rl = rawLines[i];
      let localFirstOpenFoundInLine = false;
      for (const ch of cl) {
        if (ch === '(') {
          if (!baselineSet) baselineSet = true;
          parenDepth++;
        } else if (ch === ')') {
          if (baselineSet) parenDepth--;
        }
      }
      buf.push(cl);
      rawBuf.push(rl.trim());
      // 基线已建立（遇到过第一个 `(`）且深度回到 0 或负值 → 本 .layer() 调用闭合
      if (baselineSet && parenDepth <= 0) break;
    }
    // 逐行扫描，找到最早出现的关键词 —— 避免同一窗口中同时包含相邻两个 .layer 的内容时，
    // 因 auth if-else 优先导致 tenant 被误判为 auth（例：.layer(from_fn(tenant)) 单行
    // 紧接着 multiline .layer(from_fn_with_state(auth_middleware, state)) 时，
    // 第一行窗口 paren 深度可能尚未归零，导致 combined 同时吞两个关键词）。
    let kind = null;
    let earliest = Infinity;
    for (let li = 0; li < buf.length; li++) {
      const line = buf[li];
      const authIdx = line.search(authMwRegex);
      const tenantIdx = line.search(tenantMwRegex);
      if (authIdx >= 0 && authIdx < earliest) { earliest = authIdx; kind = 'auth'; }
      if (tenantIdx >= 0 && tenantIdx < earliest) { earliest = tenantIdx; kind = 'tenant'; }
    }
    const snippet = rawBuf.join(' ').slice(0, 200);
    return { kind, firstLn, snippet };
  }

  for (const filePath of filePaths) {
    const raw = fs.readFileSync(filePath, 'utf8');
    const clean = stripRustComments(raw);
    const lines = clean.split('\n');
    const rawLines = raw.split('\n');
    const fileRel = path.relative(TOPEMS_ROOT, filePath);

    if (!protectedVarByFile[fileRel]) protectedVarByFile[fileRel] = new Set();
    if (!publicVarByFile[fileRel]) publicVarByFile[fileRel] = new Set();
    fileHasGlobalAuth[fileRel] = false;

    const baMatch = clean.match(buildAppRegex);
    if (baMatch) {
      buildApplicationCalls++;
      const publicArg = baMatch[3];
      const protectedArg = baMatch[4];
      publicVarByFile[fileRel].add(publicArg);
      protectedVarByFile[fileRel].add(protectedArg);
    }

    const baseIndentOfLine = (lineText) => {
      const m = lineText.match(/^(\s*)/);
      return m ? m[1].length : 0;
    };

    let activeCtx = null;
    let afterApplicationStruct = false;

    for (let ln = 0; ln < lines.length; ln++) {
      const line = lines[ln];
      const lineNo = ln + 1;

      if (applicationStructRegex.test(line)) {
        afterApplicationStruct = true;
      }
      if (afterApplicationStruct && authMwRegex.test(line)) {
        fileHasGlobalAuth[fileRel] = true;
      }

      const newRouterMatch = line.match(routerDefRegex);
      if (newRouterMatch) {
        if (activeCtx) {
          routers.push(activeCtx);
          REPORT.scanners.foundRouters++;
        }
        const varName = newRouterMatch[1];
        const ignoreR2Regex = /checker\s*:\s*ignore\s+R2/i;
        const curLineHasIgnore = ignoreR2Regex.test(rawLines[ln] || '');
        const prevLineHasIgnore = ln > 0 && ignoreR2Regex.test(rawLines[ln - 1] || '');
        activeCtx = {
          file: fileRel,
          routerVar: varName,
          startLine: lineNo,
          startIndent: baseIndentOfLine(rawLines[ln]),
          layers: [],
          closed: false,
          buildAppProtected: protectedVarByFile[fileRel].has(varName),
          fileHasGlobalAuthRef: fileHasGlobalAuth,
          ignoreR2: curLineHasIgnore || prevLineHasIgnore
        };
        continue;
      }

      if (!activeCtx) continue;

      const currentIndent = baseIndentOfLine(rawLines[ln]);
      const trimmed = line.trim();
      if (currentIndent < activeCtx.startIndent && currentIndent > 0 && trimmed.length > 0) {
        routers.push(activeCtx);
        REPORT.scanners.foundRouters++;
        activeCtx = null;
        continue;
      }

      if (layerStartRegex.test(line)) {
        const res = detectLayerKindInWindow(lines, rawLines, ln, 6);
        if (res.kind) {
          activeCtx.layers.push({ kind: res.kind, line: res.firstLn, snippet: res.snippet });
          matchedLayers++;
        }
      }

      const endOfChain =
        (withStateRegex.test(line) && currentIndent <= activeCtx.startIndent + 8) ||
        trimmed.endsWith(';');

      if (endOfChain && (activeCtx.layers.length > 0 || withStateRegex.test(line))) {
        activeCtx.endLine = lineNo;
        routers.push(activeCtx);
        REPORT.scanners.foundRouters++;
        activeCtx = null;
        continue;
      }
    }

    if (activeCtx) {
      routers.push(activeCtx);
      REPORT.scanners.foundRouters++;
    }
  }

  REPORT.scanners.matchedLayers = matchedLayers;
  REPORT.scanners.buildApplicationCalls = buildApplicationCalls;
  return { routers, protectedVarByFile, publicVarByFile, fileHasGlobalAuth };
}

/* ---------- Validator: 3 Rules ---------- */
function RUN_VALIDATORS(routers, extra = {}) {
  const { fileHasGlobalAuth = {} } = extra;
  REPORT.routers = routers.slice(0, 500);

  let bothCount = 0;

  for (const r of routers) {
    const authLayers = r.layers.filter(l => l.kind === 'auth');
    const tenantLayers = r.layers.filter(l => l.kind === 'tenant');
    const hasAuth = authLayers.length > 0;
    const hasTenant = tenantLayers.length > 0;

    if (hasAuth && hasTenant) {
      bothCount++;
      const lastAuth = authLayers[authLayers.length - 1];
      const lastTenant = tenantLayers[tenantLayers.length - 1];
      const authLine = lastAuth.line;
      const tenantLine = lastTenant.line;
      const CORRECT = authLine > tenantLine;
      if (!CORRECT) {
        REPORT.summary.R1++;
        REPORT.failures.push({
          rule: 'R1', level: 'FAIL', file: r.file, line: r.startLine,
          routerVar: r.routerVar,
          authLine, tenantLine,
          msg: `Layer order WRONG for Router '${r.routerVar}'. ` +
               `tenant_middleware at line ${tenantLine} appears AFTER auth_middleware at line ${authLine}. ` +
               `Axum LAST-added = OUTERMOST = runs FIRST. ` +
               `Auth injects Claims → must be LAST (outermost). Tenant needs Claims → must be FIRST (innermost). ` +
               `Swap order: put .layer(tenant) FIRST, then .layer(auth) LAST.`,
          authSnippet: lastAuth.snippet,
          tenantSnippet: lastTenant.snippet
        });
      }
    } else if (hasAuth && !hasTenant) {
      const dismiss_by_var = R2_WHITELIST_ROUTER_VARS.has(r.routerVar);
      const dismiss_by_fileVar = R2_WHITELIST_FILE_VAR.has(`${r.file}|${r.routerVar}`);
      const dismiss_by_buildAppPublic = extra.publicVarByFile && extra.publicVarByFile[r.file] && extra.publicVarByFile[r.file].has(r.routerVar) === true;
      const dismiss_by_ignoreComment = !!r.ignoreR2;
      if (dismiss_by_var || dismiss_by_fileVar || dismiss_by_buildAppPublic || dismiss_by_ignoreComment) {
        REPORT.warnings.push({
          rule: 'R2', level: 'INFO', file: r.file, line: r.startLine,
          routerVar: r.routerVar, dismissed: true,
          reason:
            dismiss_by_var ? `routerVar in R2_WHITELIST_ROUTER_VARS (${r.routerVar})` :
            dismiss_by_fileVar ? 'file|var in R2_WHITELIST_FILE_VAR' :
            dismiss_by_buildAppPublic ? 'build_application public_routes arg (3rd parameter)' :
            'checker:ignore R2 inline comment',
          msg: `[DISMISSED R2] Router '${r.routerVar}' intentionally bypasses tenant isolation.`
        });
      } else {
        REPORT.summary.R2++;
        REPORT.warnings.push({
          rule: 'R2', level: 'WARN', file: r.file, line: r.startLine,
          routerVar: r.routerVar,
          authLine: authLayers[0].line,
          msg: `Router '${r.routerVar}' has auth_middleware but NO tenant_middleware. ` +
               `May be OK if this router intentionally bypasses tenant isolation (public / system routes). ` +
               `Verify: does this Router handle tenant-scoped data? If yes, tenant_middleware is MISSING.`
        });
      }
    } else if (!hasAuth && hasTenant) {
      const isBuildAppProtected = r.buildAppProtected === true;
      const globalAuthDismiss = fileHasGlobalAuth[r.file] === true;
      if (isBuildAppProtected || globalAuthDismiss) {
        REPORT.warnings.push({
          rule: 'R3', level: 'INFO', file: r.file, line: r.startLine,
          routerVar: r.routerVar,
          tenantLine: tenantLayers[0].line,
          dismissed: true,
          reason: isBuildAppProtected
            ? 'build_application wraps auth globally'
            : 'file has global auth_middleware near Application construction',
          msg: `[DISMISSED] Router '${r.routerVar}' has tenant_middleware but NO auth_middleware locally — dismissed because ${isBuildAppProtected ? 'build_application wraps auth globally' : 'file appears to apply auth_middleware at Application level'}.`
        });
      } else {
        REPORT.summary.R3++;
        REPORT.warnings.push({
          rule: 'R3', level: 'WARN', file: r.file, line: r.startLine,
          routerVar: r.routerVar,
          tenantLine: tenantLayers[0].line,
          msg: `Router '${r.routerVar}' has tenant_middleware but NO auth_middleware. ` +
               `HIGH RISK: tenant_middleware depends on Extension<Claims> injected by auth_middleware. ` +
               `Without auth, tenant_middleware will panic with "Missing Claims" (500). ` +
               `Add auth_middleware as the LAST .layer() call (outermost).`
        });
      }
    }
  }

  REPORT.scanners.routersWithBothMiddleware = bothCount;
}

/* ---------- Core runGate() ---------- */
async function runGate(config = {}) {
  const scan = config.scan || SCAN;
  const files = globToFiles(scan);
  REPORT.scanners.scannedFiles = files.length;

  const routersResult = SCAN_ROUTERS(files);
  const routers = routersResult.routers;

  const integrityFails = [];
  for (const k of Object.keys(INTEGRITY_MIN)) {
    if (REPORT.scanners[k] < INTEGRITY_MIN[k]) {
      integrityFails.push(`[INTEGRITY WEAK_PASS] ${k}=${REPORT.scanners[k]} (need ≥ ${INTEGRITY_MIN[k]}) — scanner coverage may be incomplete`);
    }
  }
  REPORT.integrity.passed = integrityFails.length === 0;
  REPORT.integrity.weakPass = integrityFails.length > 0;
  REPORT.integrity.violations = integrityFails;

  RUN_VALIDATORS(routers, { fileHasGlobalAuth: routersResult.fileHasGlobalAuth, publicVarByFile: routersResult.publicVarByFile });

  if (REPORT_JSON) {
    const outPath = path.resolve(TOPEMS_ROOT, REPORT_JSON);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    const serialized = JSON.stringify({
      ...REPORT,
      failures: REPORT.failures.slice(0, 200),
      warnings: REPORT.warnings.slice(0, 200),
      routers: REPORT.routers.map(r => ({
        ...r,
        layers: r.layers
      })).slice(0, 500)
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
    console.log('  AXUM MIDDLEWARE LAYER ORDER CHECKER · A-STRICT  ' +
      (report.integrity.passed ? '' : (report.integrity.weakPass ? '⚠️  WEAK_PASS' : '❌  INTEGRITY FAIL')));
    console.log('='.repeat(72));
    console.log('  Scan scope      :', SCAN);
    console.log('  Mode            :', DRY_RUN ? 'DRY-RUN (default, never exit≠1)' : 'FAIL-FAST');
    console.log('  Integrity PASS  :', report.integrity.passed);
    if (!report.integrity.passed) report.integrity.violations.forEach(v => console.log('   -', v));
    console.log('  ── Scanner stats ──');
    const r2Dismissed = report.warnings.filter(w => w.rule === 'R2' && w.level === 'INFO' && w.dismissed === true).length;
    const r3Dismissed = report.warnings.filter(w => w.rule === 'R3' && w.level === 'INFO' && w.dismissed === true).length;
    console.log(`   . scannedFiles               = ${report.scanners.scannedFiles}`);
    console.log(`   . foundRouters               = ${report.scanners.foundRouters}`);
    console.log(`   . routersWithBothMiddleware  = ${report.scanners.routersWithBothMiddleware}`);
    console.log(`   . matchedLayers (auth|tenant)= ${report.scanners.matchedLayers}`);
    console.log(`   . build_application calls    = ${report.scanners.buildApplicationCalls}`);
    console.log(`   . R2 dismissed               = ${r2Dismissed}`);
    console.log(`   . R3 dismissed               = ${r3Dismissed}`);
    console.log('  ── Summary RULES ──');
    console.log(`   R1: ${String(report.summary.R1).padStart(5)} · FAIL · Layer order wrong (tenant AFTER auth → 500 Missing Claims)`);
    console.log(`   R2: ${String(report.summary.R2).padStart(5)} · WARN · auth_middleware only (no tenant isolation? verify)`);
    console.log(`   R3: ${String(report.summary.R3).padStart(5)} · WARN · tenant_middleware only (NO auth → Missing Claims panic)`);

    if (report.failures.length) {
      console.log(`\n  ⛔ FAILURES (R1 — top 50):`);
      report.failures.slice(0, 50).forEach(f => {
        console.log(`    [${f.rule}] ${f.file}:${f.line}  Router='${f.routerVar}'`);
        console.log(`         auth@L${f.authLine} vs tenant@L${f.tenantLine}  auth>tenant? ${f.authLine > f.tenantLine}`);
        if (f.tenantSnippet) console.log(`         tenant: ${f.tenantSnippet}`);
        if (f.authSnippet)   console.log(`         auth  : ${f.authSnippet}`);
        console.log(`         → ${f.msg.split('. ')[0]}.`);
      });
    }
    if (report.warnings.length) {
      console.log(`\n  ⚠️  WARNINGS (R2+R3 — top 30):`);
      report.warnings.slice(0, 30).forEach(w => {
        console.log(`    [${w.rule}] ${w.file}:${w.line}  Router='${w.routerVar}'`);
        console.log(`         → ${w.msg.split('. ')[0]}. ${w.msg.split('. ')[1] || ''}`);
      });
    }
    console.log('\n  Report JSON       :', REPORT_JSON || '(not written · pass --report-json)');
    console.log('  Integrity conclusion :',
      report.integrity.passed ? 'STRONG_PASS (scanner regex covered sufficient files/routers)'
                              : 'WEAK_PASS (below threshold — treat results as best-effort hints only)'
    );
    console.log('='.repeat(72));

    /* Exit logic:
     * - Integrity FAIL → never exit≠2 in this script (WEAK_PASS is advisory only).
     * - Fail-FAST on: R1 > threshold → exit=1
     * - DRY-RUN default: always exit=0
     */
    if (!DRY_RUN) {
      const hardFail = (report.summary.R1 > FAIL_FAST_THRESHOLDS.R1);
      if (hardFail) process.exit(1);
    }
    process.exit(0);
  })().catch(err => { console.error('FATAL:', err); process.exit(3); });
}

module.exports = { runGate, INTEGRITY_MIN, DEFAULT_FAIL_FAST_THRESHOLDS: FAIL_FAST_THRESHOLDS };
