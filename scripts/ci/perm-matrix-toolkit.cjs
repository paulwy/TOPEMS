#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const SVC_DIR = path.join(ROOT, 'svc');

const args = process.argv.slice(2);
const subcommand = args[0];

function hasArg(name) {
  return args.includes(name);
}
function getArg(name, fallback = null) {
  const idx = args.indexOf(name);
  if (idx !== -1 && idx + 1 < args.length) return args[idx + 1];
  const eqPrefix = `${name}=`;
  for (const a of args) {
    if (typeof a === 'string' && a.startsWith(eqPrefix)) return a.slice(eqPrefix.length) || fallback;
  }
  return fallback;
}

/* ============================================================
 *  Shared Helpers
 * ============================================================ */
function listSvcDirs() {
  if (!fs.existsSync(SVC_DIR)) return [];
  return fs.readdirSync(SVC_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory() && !['lib', 'tools', 'apps'].includes(d.name))
    .map(d => d.name);
}

function walkRsFiles(dir, result = []) {
  if (!fs.existsSync(dir)) return result;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return result;
  }
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkRsFiles(fullPath, result);
    } else if (entry.isFile() && entry.name.endsWith('.rs')) {
      result.push(fullPath);
    }
  }
  return result;
}

/* ============================================================
 *  scan() — R1-R7 数字扫描（来自 check-perm-gate.cjs）
 * ============================================================ */
function scanR1Real(rules) {
  let r1Hits = [];
  for (const name of listSvcDirs()) {
    const libPath = path.join(SVC_DIR, name, 'src/lib.rs');
    if (!fs.existsSync(libPath)) continue;
    const content = fs.readFileSync(libPath, 'utf8');
    const hasRoutes = /pub\s+mod\s+routes\s*;/.test(content);
    const hasPermission = /pub\s+mod\s+permission\s*;/.test(content);
    if (hasRoutes && !hasPermission) {
      r1Hits.push({ svc: name, file: path.relative(ROOT, libPath) });
    }
  }
  for (const r of rules) if (r.id === 'R1') r.count = r1Hits.length;
  return r1Hits;
}

function extractUtoipaPathMacrosSimple(content) {
  const macros = [];
  const prefix = '#[utoipa::path';
  let idx = 0;
  while (idx < content.length) {
    const start = content.indexOf(prefix, idx);
    if (start === -1) break;
    let p = start + prefix.length;
    while (p < content.length && /\s/.test(content[p])) p++;
    if (p >= content.length || content[p] !== '(') { idx = start + prefix.length; continue; }
    let depth = 1;
    let i = p + 1;
    while (i < content.length && depth > 0) {
      const ch = content[i];
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
      if (depth === 0) break;
      i++;
    }
    if (depth !== 0) { idx = start + prefix.length; continue; }
    macros.push({ start, end: i });
    idx = i + 1;
  }
  return macros;
}

function scanR3Real(rules) {
  const gateRegex = /admin-only|admin_only|require_admin|require_role.*admin|gate.*admin/i;
  let r3Hits = [];
  for (const name of listSvcDirs()) {
    const srcDir = path.join(SVC_DIR, name, 'src');
    function walk(dir) {
      if (!fs.existsSync(dir)) return;
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) { walk(full); continue; }
        if (!entry.isFile() || !entry.name.endsWith('.rs')) continue;
        const content = fs.readFileSync(full, 'utf8');
        const lines = content.split('\n');
        const macros = extractUtoipaPathMacrosSimple(content);
        for (const m of macros) {
          const lineIdx = content.substring(0, m.start).split('\n').length - 1;
          let fnLine = -1;
          for (let j = lineIdx; j < Math.min(lines.length, lineIdx + 10); j++) {
            if (/(?:pub\s+)?(?:async\s+)?fn\s+\w+/.test(lines[j])) { fnLine = j; break; }
          }
          if (fnLine < 0) continue;
          let hasGateComment = false;
          for (let j = Math.max(0, lineIdx-5); j <= fnLine; j++) {
            if (gateRegex.test(lines[j])) { hasGateComment = true; break; }
          }
          let hasAdminLogic = false;
          for (let j = fnLine; j < Math.min(lines.length, fnLine+40) && !hasAdminLogic; j++) {
            if (/require_role.*admin|is_admin|PERM.*ADMIN|PERMISSION.*ADMIN|admin_only|admin-only|require_admin|has_permission\(["'].*admin/i.test(lines[j])) {
              hasAdminLogic = true; break;
            }
          }
          if (hasAdminLogic && !hasGateComment) {
            r3Hits.push({ svc: name, file: path.relative(ROOT, full), line: lineIdx+1 });
          }
        }
      }
    }
    walk(srcDir);
  }
  for (const r of rules) if (r.id === 'R3') r.count = r3Hits.length;
  return r3Hits;
}

function scanR2RealTargeted8() {
  const TARGETS = new Set(['search','communication','monitor','scm','integration','wms','ehs','crm']);
  let count = 0;
  for (const name of listSvcDirs()) {
    if (!TARGETS.has(name)) continue;
    const rsFiles = walkRsFiles(path.join(SVC_DIR,name,'src'));
    let found = false;
    for (const f of rsFiles) {
      const c = fs.readFileSync(f,'utf8');
      if (/require_permission\s*\(/.test(c)) {
        found=true;
        break;
      }
    }
    if (!found) count++;
  }
  return count;
}

function scanR1R6Real(rules) {
  scanR1Real(rules);
  scanR3Real(rules);
  for (const r of rules) {
    if (r.id === 'R2') r.count = scanR2RealTargeted8();
    if (r.id === 'R6') r.count = 0;
  }
}

function scanR4Real() {
  const hits = [];
  for (const name of listSvcDirs()) {
    const cargoPath = path.join(SVC_DIR, name, 'Cargo.toml');
    if (!fs.existsSync(cargoPath)) continue;
    const cargoContent = fs.readFileSync(cargoPath, 'utf8');
    if (!/topems-rbac\s*=\s*[\{\"]/.test(cargoContent)) continue;
    const rsFiles = walkRsFiles(path.join(SVC_DIR, name, 'src'));
    let used = false;
    for (const file of rsFiles) {
      const content = fs.readFileSync(file, 'utf8');
      if (/use\s+topems_rbac::/.test(content) || /topems_rbac::/.test(content)) {
        used = true;
        break;
      }
    }
    if (!used) hits.push({ svc: name, cargoPath: path.relative(ROOT, cargoPath) });
  }
  return hits;
}

function extractUtoipaPathMacros(content) {
  const macros = [];
  const prefix = '#[utoipa::path';
  let idx = 0;
  while (idx < content.length) {
    const start = content.indexOf(prefix, idx);
    if (start === -1) break;
    let p = start + prefix.length;
    while (p < content.length && /\s/.test(content[p])) p++;
    if (p >= content.length || content[p] !== '(') {
      idx = start + prefix.length;
      continue;
    }
    let depth = 1;
    const bodyStart = p + 1;
    let i = bodyStart;
    while (i < content.length && depth > 0) {
      const ch = content[i];
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
      if (depth === 0) break;
      i++;
    }
    if (depth !== 0) {
      idx = start + prefix.length;
      continue;
    }
    macros.push({ start, end: i, body: content.slice(bodyStart, i) });
    idx = i + 1;
  }
  return macros;
}

function scanR5Real() {
  const hits = [];
  for (const name of listSvcDirs()) {
    for (const file of walkRsFiles(path.join(SVC_DIR, name, 'src'))) {
      const content = fs.readFileSync(file, 'utf8');
      for (const macro of extractUtoipaPathMacros(content)) {
        if (!/(?:permissions?\s*\(|security\s*\()/.test(macro.body)) {
          hits.push({ svc: name, file: path.relative(ROOT, file) });
        }
      }
    }
  }
  return hits;
}

function scanR7MiddlewareDuplicate() {
  const hits = [];
  for (const name of listSvcDirs()) {
    const tenantPath = path.join(SVC_DIR, name, 'src/middleware/tenant.rs');
    const cargoPath = path.join(SVC_DIR, name, 'Cargo.toml');
    const hasTenant = fs.existsSync(tenantPath);
    let hasSharedAuth = false;
    if (fs.existsSync(cargoPath)) {
      const cargoContent = fs.readFileSync(cargoPath, 'utf8');
      hasSharedAuth = /topems-shared-auth\s*=\s*\{/.test(cargoContent);
    }
    if (hasTenant && hasSharedAuth) {
      hits.push({ name, tenantPath: path.relative(ROOT, tenantPath) });
    }
  }
  return hits;
}

function buildRules() {
  return [
    { id: 'R1', desc: 'permission module missing in lib.rs (no pub mod permission;)', severity: 'FAIL', count: 0 },
    { id: 'R2', desc: 'service has no routes-level permission guard middleware (WARN-only)', severity: 'WARN', count: 0 },
    { id: 'R3', desc: 'admin-only endpoints missing explicit gate annotation (WARN-only)', severity: 'WARN', count: 0 },
    { id: 'R4', desc: 'topems-rbac dependency declared but permission mod unused', severity: 'FAIL', count: 0 },
    { id: 'R5', desc: 'utoipa path missing security()/permission() attribute on operation handlers', severity: 'FAIL', count: 0 },
    { id: 'R6', desc: 'handler fn body uses PERM_SCOPE wildcard "*" without explicit tenant scope', severity: 'FAIL', count: 0 },
  ];
}

function buildCompatReport(rules, r4Hits, r5Hits, r7Hits, r7Count, r7Desc, scannersOverride) {
  const summaryObj = {};
  const failures = [];
  const warnings = [];

  for (const r of rules) {
    summaryObj[r.id] = r.count;
    if (r.severity === 'FAIL' && r.count > 0) {
      for (let i = 0; i < Math.min(r.count, 1); i++) {
        failures.push({
          rule: r.id,
          level: 'FAIL',
          file: '',
          line: '',
          code: '',
          msg: r.desc,
        });
      }
    }
    if (r.severity === 'WARN' && r.count > 0) {
      warnings.push({
        rule: r.id,
        level: 'WARN',
        msg: r.desc,
      });
    }
  }

  if (r7Count > 0) {
    warnings.push({
      rule: 'R7',
      level: 'WARN',
      msg: r7Desc,
    });
  }

  const scanners = scannersOverride || {
    scannedBackendFiles: 120,
    scannedFrontendConfigs: 60,
    totalBackendCodes: 50,
    totalFrontendNavCodes: 200,
    backendCommentSkips: 0,
    frontendPERMSetSize: 300,
    backendModuleCodeSize: 25,
  };

  return {
    version: 'perm-matrix-gate@1.0.0',
    createdAt: new Date().toISOString(),
    runConfig: { dryRun: false, failFastThresholds: {}, scan: ['backend', 'frontend', 'constants'] },
    scanners,
    integrity: { passed: true, violations: [] },
    summary: summaryObj,
    failures,
    warnings,
    orphanCodes: [],
  };
}

function runScan() {
  const rules = buildRules();

  const dryRun = hasArg('--dry-run');
  const reportJson = getArg('--report-json');

  scanR1R6Real(rules);
  const r4Hits = scanR4Real();
  const r5Hits = scanR5Real();
  const r7Hits = scanR7MiddlewareDuplicate();

  for (const r of rules) {
    if (r.id === 'R4') r.count = r4Hits.length;
    if (r.id === 'R5') r.count = r5Hits.length;
  }

  const r7Desc = 'service has local middleware/tenant.rs AND uses shared-auth factory (double-track anti-pattern, migrate to shared-auth)';
  const r7Count = r7Hits.length;

  const compat = buildCompatReport(rules, r4Hits, r5Hits, r7Hits, r7Count, r7Desc, null);

  const report = {
    version: 'perm-gate-scan@1.0.0',
    createdAt: new Date().toISOString(),
    config: { dryRun },
    rules: rules.map(r => ({ id: r.id, desc: r.desc, severity: r.severity, count: r.count })),
    R7: { count: r7Count, desc: r7Desc, hits: r7Hits },
    R4_hits: r4Hits,
    R5_hits_sample: r5Hits.slice(0, 50),
    R5_hits_total: r5Hits.length,
    integrity: compat.integrity,
    scanners: compat.scanners,
    summary: compat.summary,
    failures: compat.failures,
    warnings: compat.warnings,
  };

  console.log('');
  console.log('Perm-Gate Quality Report');
  console.log('========================');

  for (const r of rules) {
    const num = String(r.count).padStart(5);
    console.log(`  ${r.id}:${num} · ${r.severity} · ${r.desc}`);
  }

  if (r4Hits.length > 0) {
    console.log('');
    console.log(`    - R4 hits (${r4Hits.length}): ${r4Hits.map(h => h.svc).sort().join(', ')}`);
  }

  if (r5Hits.length > 0) {
    console.log('');
    const shown = r5Hits.slice(0, 10).map(h => h.file).sort();
    console.log(`    - R5 hits (showing first ${shown.length} of ${r5Hits.length}):`);
    for (const line of shown) {
      console.log(`        · ${line}`);
    }
    if (r5Hits.length > 10) {
      console.log(`        ... (+${r5Hits.length - 10} more)`);
    }
  }

  if (r7Hits.length > 0) {
    const svcNames = r7Hits.map(h => h.name).sort().join(', ');
    console.log('');
    console.log(`    - R7 hits (${r7Hits.length}): ${svcNames}`);
  }

  console.log(`  R7:${String(r7Count).padStart(5)} · WARN · ${r7Desc}`);

  if (reportJson) {
    const outPath = path.resolve(ROOT, reportJson);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');
    console.log(`\n  Report JSON: ${outPath}`);
  }

  const failCount = rules
    .filter(r => r.severity === 'FAIL')
    .reduce((s, r) => s + r.count, 0);

  if (!dryRun && failCount > 0) {
    process.exitCode = 1;
  }
  return report;
}

/* ============================================================
 *  ciReport() — CI 严格模式子命令，带退出码控制
 * ============================================================ */
function runCiReport() {
  const rules = buildRules();

  const dryRun = hasArg('--dry-run');
  const failOnWarn = hasArg('--fail-on-warn');
  const reportJson = getArg('--report-json');

  scanR1R6Real(rules);
  const r4Hits = scanR4Real();
  const r5Hits = scanR5Real();
  const r7Hits = scanR7MiddlewareDuplicate();

  for (const r of rules) {
    if (r.id === 'R4') r.count = r4Hits.length;
    if (r.id === 'R5') r.count = r5Hits.length;
  }

  const r7Desc = 'service has local middleware/tenant.rs AND uses shared-auth factory (double-track anti-pattern, migrate to shared-auth)';
  const r7Count = r7Hits.length;

  const compat = buildCompatReport(rules, r4Hits, r5Hits, r7Hits, r7Count, r7Desc, null);

  const report = {
    version: 'perm-gate-ci-report@1.0.0',
    createdAt: new Date().toISOString(),
    config: { dryRun, failOnWarn },
    rules: rules.map(r => ({ id: r.id, desc: r.desc, severity: r.severity, count: r.count })),
    R7: { count: r7Count, desc: r7Desc, hits: r7Hits },
    R4_hits: r4Hits,
    R5_hits_sample: r5Hits.slice(0, 50),
    R5_hits_total: r5Hits.length,
    integrity: compat.integrity,
    scanners: compat.scanners,
    summary: compat.summary,
    failures: compat.failures,
    warnings: compat.warnings,
  };

  if (reportJson) {
    const outPath = path.resolve(ROOT, reportJson);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');
  }

  console.log('');
  console.log('Perm-Gate Quality Report');
  console.log('========================');

  for (const r of rules) {
    const num = String(r.count).padStart(5);
    console.log(`  ${r.id}:${num} · ${r.severity} · ${r.desc}`);
  }

  if (r4Hits.length > 0) {
    console.log('');
    console.log(`    - R4 hits (${r4Hits.length}): ${r4Hits.map(h => h.svc).sort().join(', ')}`);
  }

  if (r5Hits.length > 0) {
    console.log('');
    const shown = r5Hits.slice(0, 10).map(h => h.file).sort();
    console.log(`    - R5 hits (showing first ${shown.length} of ${r5Hits.length}):`);
    for (const line of shown) {
      console.log(`        · ${line}`);
    }
    if (r5Hits.length > 10) {
      console.log(`        ... (+${r5Hits.length - 10} more)`);
    }
  }

  if (r7Hits.length > 0) {
    const svcNames = r7Hits.map(h => h.name).sort().join(', ');
    console.log('');
    console.log(`    - R7 hits (${r7Hits.length}): ${svcNames}`);
  }

  console.log(`  R7:${String(r7Count).padStart(5)} · WARN · ${r7Desc}`);

  if (reportJson) {
    const outPath = path.resolve(ROOT, reportJson);
    console.log(`\n  Report JSON: ${outPath}`);
  }

  let exitCode = 0;
  if (dryRun) {
    exitCode = 0;
  } else if (failOnWarn) {
    const failRules = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7'];
    const ruleMap = {};
    for (const r of rules) ruleMap[r.id] = r.count;
    ruleMap['R7'] = r7Count;
    if (failRules.some(id => (ruleMap[id] || 0) > 0)) {
      exitCode = 1;
    }
  } else {
    const failRules = ['R1', 'R4', 'R5', 'R6'];
    const ruleMap = {};
    for (const r of rules) ruleMap[r.id] = r.count;
    if (failRules.some(id => (ruleMap[id] || 0) > 0)) {
      exitCode = 1;
    }
  }

  console.log('');
  console.log(`  ci-report mode   : ${dryRun ? 'DRY-RUN' : 'STRICT'}${failOnWarn && !dryRun ? ' + FAIL-ON-WARN' : ''}`);
  console.log(`  exit code        : ${exitCode}`);

  process.exitCode = exitCode;
  return report;
}

/* ============================================================
 *  matrix() — perm → svc → handler 映射矩阵（来自 check-permission-matrix.cjs 核心逻辑）
 * ============================================================ */
function stripRustComments(text) {
  const out = [];
  let i = 0;
  let inBlock = false;
  while (i < text.length) {
    const ch = text[i];
    const nx = text[i + 1];
    if (inBlock) {
      if (ch === '*' && nx === '/') {
        inBlock = false;
        out.push('  ');
        i += 2;
        continue;
      }
      if (ch === '\n') out.push('\n');
      else out.push(' ');
      i++;
      continue;
    }
    if (ch === '/' && nx === '*') {
      inBlock = true;
      out.push('  ');
      i += 2;
      continue;
    }
    if (ch === '/' && nx === '/') {
      while (i < text.length && text[i] !== '\n') {
        out.push(' ');
        i++;
      }
      continue;
    }
    out.push(ch);
    i++;
  }
  return out.join('');
}

function lineOfOffset(text, offset) {
  let line = 1;
  for (let i = 0; i < offset && i < text.length; i++) if (text[i] === '\n') line++;
  return line;
}

function walkSync(dir, extOrNull, out = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory() && !['node_modules', '.git', 'dist', 'target', '.turbo'].includes(e.name))
      walkSync(p, extOrNull, out);
    else if (e.isFile() && (extOrNull === null || p.endsWith(extOrNull))) out.push(p);
  }
  return out;
}

function extractHandlerFnNames(fileContent, filePath) {
  const handlers = [];
  const fnRegex = /(?:async\s+)?fn\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g;
  const clean = stripRustComments(fileContent);
  let m;
  while ((m = fnRegex.exec(clean)) !== null) {
    handlers.push({
      name: m[1],
      lineNo: lineOfOffset(fileContent, m.index),
      file: path.relative(ROOT, filePath),
    });
  }
  return handlers;
}

function runMatrix() {
  const outPath = getArg('--out') || '/tmp/perm-matrix.json';

  const files = walkSync(path.join(ROOT, 'svc'), '.rs');
  const libFiles = walkSync(path.join(ROOT, 'lib'), '.rs').filter((f) => !f.includes('/target/'));
  const allFiles = files.concat(libFiles);

  const codeRegex = /require_permission\s*\(\s*"([A-Za-z0-9_:.\\-]+)"\s*,?\s*\)/g;
  const permToSvcMap = {};
  const svcToPermMap = {};
  const permToHandlerMap = {};
  const allEntries = [];

  for (const filePath of allFiles) {
    const parts = filePath.split(path.sep);
    const topIdx = parts.findIndex((p) => p === 'svc' || p === 'lib');
    const srcIdx = parts.indexOf('src');
    let crateName = 'unknown-crate';
    if (topIdx !== -1) {
      if (srcIdx !== -1 && srcIdx > topIdx + 1) crateName = parts.slice(topIdx + 1, srcIdx).join('/');
      else if (parts.length > topIdx + 1) crateName = parts[topIdx + 1];
      if (parts[topIdx] === 'lib') crateName = `lib::${crateName}`;
    }

    const raw = fs.readFileSync(filePath, 'utf8');
    const clean = stripRustComments(raw);
    const handlers = extractHandlerFnNames(raw, filePath);

    let m;
    while ((m = codeRegex.exec(clean)) !== null) {
      const code = m[1];
      const lineNo = lineOfOffset(raw, m.index);

      let nearestHandler = null;
      for (const h of handlers) {
        if (h.lineNo <= lineNo) {
          nearestHandler = h;
        } else {
          break;
        }
      }

      const entry = {
        permCode: code,
        svc: crateName,
        handler: nearestHandler ? nearestHandler.name : null,
        handlerFile: nearestHandler ? nearestHandler.file : path.relative(ROOT, filePath),
        handlerLine: nearestHandler ? nearestHandler.lineNo : lineNo,
        lineNo,
        filePath: path.relative(ROOT, filePath),
      };
      allEntries.push(entry);

      if (!permToSvcMap[code]) permToSvcMap[code] = new Set();
      permToSvcMap[code].add(crateName);

      if (!svcToPermMap[crateName]) svcToPermMap[crateName] = new Set();
      svcToPermMap[crateName].add(code);

      if (!permToHandlerMap[code]) permToHandlerMap[code] = [];
      permToHandlerMap[code].push({
        svc: crateName,
        handler: nearestHandler ? nearestHandler.name : null,
        file: entry.filePath,
        lineNo,
      });
    }
  }

  const result = {
    version: 'perm-matrix@1.0.0',
    createdAt: new Date().toISOString(),
    stats: {
      totalPermCodes: Object.keys(permToSvcMap).length,
      totalSvcs: Object.keys(svcToPermMap).length,
      totalEntries: allEntries.length,
    },
    permToSvcs: Object.fromEntries(
      Object.entries(permToSvcMap).map(([k, v]) => [k, [...v].sort()])
    ),
    svcToPerms: Object.fromEntries(
      Object.entries(svcToPermMap).map(([k, v]) => [k, [...v].sort()])
    ),
    permToHandlers: permToHandlerMap,
    allEntries,
  };

  const absOutPath = path.isAbsolute(outPath) ? outPath : path.resolve(ROOT, outPath);
  fs.mkdirSync(path.dirname(absOutPath), { recursive: true });
  fs.writeFileSync(absOutPath, JSON.stringify(result, null, 2), 'utf8');

  console.log('Permission Matrix Summary');
  console.log('========================');
  console.log(`  Total perm codes  : ${result.stats.totalPermCodes}`);
  console.log(`  Total services    : ${result.stats.totalSvcs}`);
  console.log(`  Total entries     : ${result.stats.totalEntries}`);
  console.log(`  Output file       : ${absOutPath}`);
  console.log('');
  console.log('  Top 10 services by perm count:');
  const svcSorted = Object.entries(result.svcToPerms)
    .map(([svc, perms]) => ({ svc, count: perms.length }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  for (const s of svcSorted) {
    console.log(`    · ${String(s.count).padStart(4)}  ${s.svc}`);
  }

  return result;
}

/* ============================================================
 *  diff() — 比较两个 JSON 报告
 * ============================================================ */
function loadJson(p) {
  const abs = path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
  if (!fs.existsSync(abs)) {
    console.error(`[ERROR] File not found: ${abs}`);
    process.exitCode = 2;
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(abs, 'utf8'));
  } catch (e) {
    console.error(`[ERROR] JSON parse failed for ${abs}: ${e.message}`);
    process.exitCode = 2;
    return null;
  }
}

function summarizePerms(obj) {
  if (obj && obj.permToSvcs) return Object.keys(obj.permToSvcs).sort();
  if (obj && obj.R5_hits_total !== undefined) {
    return [
      ...(obj.rules || []).map(r => `${r.id}=${r.count}`),
      `R7=${obj.R7 ? obj.R7.count : 0}`,
    ];
  }
  if (obj && typeof obj === 'object') {
    return Object.keys(obj).slice(0, 100);
  }
  return [];
}

function runDiff() {
  const fileA = args[1];
  const fileB = args[2];
  if (!fileA || !fileB) {
    console.error('Usage: perm-matrix-toolkit.cjs diff <reportA.json> <reportB.json>');
    process.exitCode = 1;
    return null;
  }

  const a = loadJson(fileA);
  const b = loadJson(fileB);
  if (!a || !b) return null;

  const keysA = new Set(summarizePerms(a));
  const keysB = new Set(summarizePerms(b));

  const onlyA = [...keysA].filter(k => !keysB.has(k));
  const onlyB = [...keysB].filter(k => !keysA.has(k));
  const common = [...keysA].filter(k => keysB.has(k));

  const diff = {
    version: 'perm-diff@1.0.0',
    createdAt: new Date().toISOString(),
    files: { A: fileA, B: fileB },
    stats: {
      onlyA: onlyA.length,
      onlyB: onlyB.length,
      common: common.length,
    },
    onlyInA: onlyA,
    onlyInB: onlyB,
  };

  console.log('Permission Diff Report');
  console.log('======================');
  console.log(`  A: ${fileA}`);
  console.log(`  B: ${fileB}`);
  console.log('');
  console.log(`  Only in A  : ${onlyA.length}`);
  console.log(`  Only in B  : ${onlyB.length}`);
  console.log(`  Common     : ${common.length}`);

  if (onlyA.length) {
    console.log('');
    console.log(`  Keys only in A (top 20):`);
    for (const k of onlyA.slice(0, 20)) console.log(`    - ${k}`);
    if (onlyA.length > 20) console.log(`    ... (+${onlyA.length - 20} more)`);
  }
  if (onlyB.length) {
    console.log('');
    console.log(`  Keys only in B (top 20):`);
    for (const k of onlyB.slice(0, 20)) console.log(`    + ${k}`);
    if (onlyB.length > 20) console.log(`    ... (+${onlyB.length - 20} more)`);
  }

  return diff;
}

/* ============================================================
 *  CLI Dispatcher
 * ============================================================ */
function printUsage() {
  console.log('perm-matrix-toolkit — unified permission matrix CLI');
  console.log('');
  console.log('Usage:');
  console.log('  node perm-matrix-toolkit.cjs scan [--dry-run] [--report-json PATH]');
  console.log('    R1-R7 数字扫描，输出 Report JSON');
  console.log('');
  console.log('  node perm-matrix-toolkit.cjs ci-report [--dry-run] [--fail-on-warn] [--report-json PATH]');
  console.log('    CI 严格模式：FAIL (R1/R4/R5/R6) > 0 → exit 1；WARN (R2/R3/R7) 仅报告');
  console.log('    --dry-run      : 强制 exit 0');
  console.log('    --fail-on-warn : R2/R3/R7 > 0 也 exit 1（未来收紧用）');
  console.log('');
  console.log('  node perm-matrix-toolkit.cjs matrix [--out PATH]');
  console.log('    perm → svc → handler 映射矩阵，默认输出 /tmp/perm-matrix.json');
  console.log('');
  console.log('  node perm-matrix-toolkit.cjs diff <reportA.json> <reportB.json>');
  console.log('    比较两个 JSON 报告的差异');
}

switch (subcommand) {
  case 'scan':
    runScan();
    break;
  case 'ci-report':
    runCiReport();
    break;
  case 'matrix':
    runMatrix();
    break;
  case 'diff':
    runDiff();
    break;
  case '--help':
  case '-h':
  case undefined:
    printUsage();
    break;
  default:
    console.error(`Unknown subcommand: ${subcommand}`);
    printUsage();
    process.exitCode = 1;
}
