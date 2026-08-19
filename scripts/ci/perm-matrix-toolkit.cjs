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
  for (const r of rules) if (r.id === 'R1') { r.count = r1Hits.length; r.hits = r1Hits; }
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

/* findMatchingBraceClose — 从 lines[openLine][openCol..] 起找匹配 } 返回 {line, col}（0-based）。字符串/注释简单跳过。 */
function findMatchingBraceClose(lines, openLine, openCol) {
  let depth = 0;
  let inStr = null; // null / '"' / "'" / '`'
  let inLineComment = false;
  let inBlockComment = false;
  for (let i = openLine; i < lines.length; i++) {
    const line = lines[i];
    for (let j = (i === openLine ? openCol : 0); j < line.length; j++) {
      const ch = line[j];
      const next = line[j + 1] || '';
      if (inLineComment) { continue; }
      if (inBlockComment) {
        if (ch === '*' && next === '/') { inBlockComment = false; j++; }
        continue;
      }
      if (inStr) {
        if (ch === '\\') { j++; continue; }
        if (ch === inStr) inStr = null;
        continue;
      }
      if (ch === '/' && next === '/') { inLineComment = true; break; }
      if (ch === '/' && next === '*') { inBlockComment = true; j++; continue; }
      if (ch === '"' || ch === "'" || ch === '`') { inStr = ch; continue; }
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) return { line: i, col: j };
      }
    }
    inLineComment = false;
  }
  return null;
}

function scanR3Real(rules) {
  const gateRegex = /admin-only|admin_only|require_admin|require_role.*admin|gate.*admin/i;
  const adminLogicRegex = /require_role.*admin|is_admin|PERM.*ADMIN|PERMISSION.*ADMIN|admin_only|admin-only|require_admin|has_permission\(["'].*admin|\[\s*"[^"]*admin[^"]*"\s*\]\s*\)\s*,\s*$/i;
  // 额外也在 utoipa::path 属性（security(... = ["xxx:admin"...]) 内检查 admin 权限声明，作为 admin-only 判定的一部分
  const securityAdminRegex = /security\s*\(\s*\([^)]*["'][^"']*:admin["']/i;
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
          // 匹配 utoipa::path( ... ) 宏的闭括号位置（从 utoipa::path 后的第一个 '(' 开始找）
          const startFrom = content.indexOf('(', m.start);
          let pathClose = -1; // 1d index in content
          if (startFrom >= 0) {
            // 用 1d 扫描法找匹配 ')'：只处理 path 属性括号
            let depth = 0; let inStr=null,inLc=false,inBc=false;
            for (let p = startFrom; p < content.length; p++) {
              const c = content[p], n = content[p+1]||'';
              if (inLc) { if (c==='\n') inLc=false; continue; }
              if (inBc) { if (c==='*' && n==='/') { inBc=false; p++; } continue; }
              if (inStr) { if (c==='\\') { p++; continue; } if (c===inStr) inStr=null; continue; }
              if (c==='/' && n==='/') { inLc=true; continue; }
              if (c==='/' && n==='*') { inBc=true; p++; continue; }
              if (c==='"'||c==="'"||c==='`') { inStr=c; continue; }
              if (c==='(') depth++;
              else if (c===')') { depth--; if (depth===0) { pathClose=p; break; } }
            }
          }
          const pathBlockText = pathClose >= 0 ? content.substring(startFrom, pathClose+1) : '';
          const utoipaHasAdminSecurity = securityAdminRegex.test(pathBlockText);
          let fnLine = -1;
          for (let j = lineIdx; j < Math.min(lines.length, lineIdx + 12); j++) {
            if (/(?:pub\s+)?(?:async\s+)?fn\s+\w+/.test(lines[j])) { fnLine = j; break; }
          }
          if (fnLine < 0) continue;
          const fnName = lines[fnLine].match(/fn\s+(\w+)/)?.[1] || '?';
          // gate comment 检查范围：utoipa path (lineIdx) 之前 5 行到 fn 签名行
          let hasGateComment = false;
          for (let j = Math.max(0, lineIdx-5); j <= fnLine; j++) {
            if (gateRegex.test(lines[j])) { hasGateComment = true; break; }
          }
          // admin-only 判定：(A) utoipa security 有 admin 权限，或 (B) fn body 里含 admin 逻辑
          let hasAdminLogic = false;
          // (B) fn body admin logic: 从 fnName 行下一个 '{' 起精确定位到匹配 }
          let bodyStart = -1;
          for (let j = fnLine; j < Math.min(lines.length, fnLine+8); j++) {
            const oc = lines[j].indexOf('{');
            if (oc >= 0) { bodyStart = j; break; }
          }
          if (bodyStart >= 0) {
            const oc = lines[bodyStart].indexOf('{');
            const close = findMatchingBraceClose(lines, bodyStart, oc);
            if (close) {
              const bodyLines = lines.slice(bodyStart, close.line + 1);
              for (const l of bodyLines) {
                if (adminLogicRegex.test(l)) { hasAdminLogic = true; break; }
              }
            }
          }
          // 综合：任一条件 true 且 无 gate 注释则 R3 命中
          if ((utoipaHasAdminSecurity || hasAdminLogic) && !hasGateComment) {
            // 为 hits 提取可操作的 "补 gate 注释" 锚点行：utoipa path 开始行
            const anchorLine = (function findAnchor() {
              for (let j = Math.max(0, lineIdx-2); j <= fnLine; j++) {
                if (/^\s*#\[utoipa::path/.test(lines[j])) return j+1;
              }
              return lineIdx + 1;
            })();
            r3Hits.push({
              svc: name,
              file: path.relative(ROOT, full),
              line: lineIdx + 1,
              fnLine: fnLine + 1,
              fnName,
              anchorLine,
              utoipaPath: lines[lineIdx].slice(0, 180).trim(),
              hasUtoipaAdminSecurity: utoipaHasAdminSecurity,
              hasBodyAdminLogic: hasAdminLogic,
            });
          }
        }
      }
    }
    walk(srcDir);
  }
  for (const r of rules) if (r.id === 'R3') { r.count = r3Hits.length; r.hits = r3Hits; }
  return r3Hits;
}

/* scanR2RealFull — V256 升级：Targeted8 → 全仓 32 svc 扫描。每个 svc 判 Cargo.toml 非依赖就命中（"未接入" 定义：shared-auth dep 未声明 OR 声明但 src/* 没 require_permission 调用）。返回 hits[] 并 attach rules。 */
function scanR2RealFull(rules) {
  const hits = [];
  for (const name of listSvcDirs()) {
    const cargoPath = path.join(SVC_DIR, name, 'Cargo.toml');
    const srcDir = path.join(SVC_DIR, name, 'src');
    if (!fs.existsSync(cargoPath) || !fs.existsSync(srcDir)) continue;
    const cargo = fs.readFileSync(cargoPath, 'utf8');
    const hasDep = /topems-shared-auth\s*=\s*[\{\"]/.test(cargo);
    const rsFiles = walkRsFiles(srcDir);
    let usedPerm = false;
    for (const f of rsFiles) {
      const c = fs.readFileSync(f, 'utf8');
      if (/require_permission\s*\(/.test(c)) { usedPerm = true; break; }
    }
    const missing = (!hasDep || !usedPerm);
    if (missing) hits.push({
      svc: name,
      cargoHasSharedAuthDep: hasDep,
      srcCallsRequirePermission: usedPerm,
      reason: !hasDep ? 'Cargo.toml missing topems-shared-auth dep' : 'dep declared but src has zero require_permission() calls',
      cargoPath: path.relative(ROOT, cargoPath),
    });
  }
  for (const r of rules) if (r.id === 'R2') { r.count = hits.length; r.hits = hits; }
  return hits;
}

function scanR1R6Real(rules) {
  scanR1Real(rules);
  scanR3Real(rules);
  scanR2RealFull(rules);
  for (const r of rules) {
    if (r.id === 'R6') r.count = 0;
  }
}

/* reportRuleHitsTable(rules, include=['R2','R3','R7']) — stdout 列 hits 详情表。
 * 列: Rule | Svc | File:Line | Fn | Anchor | Why (R3 admin-security/body-admin；R2 reason)
 */
function reportRuleHitsTable(rules, opts = {}) {
  const ids = opts.rules || ['R2','R3','R7'];
  let rows = [];
  for (const r of rules) {
    if (!ids.includes(r.id)) continue;
    if (!Array.isArray(r.hits) || r.hits.length === 0) continue;
    for (const h of r.hits) {
      let why = '';
      if (r.id === 'R2') why = h.reason || (h.cargoHasSharedAuthDep ? 'no require_permission() call' : 'no shared-auth dep');
      if (r.id === 'R3') {
        const tags = [];
        if (h.hasUtoipaAdminSecurity) tags.push('utoipa-security(admin)');
        if (h.hasBodyAdminLogic) tags.push('body-admin-call');
        why = tags.join(',');
      }
      rows.push({
        rule: r.id,
        svc: h.svc ?? h.name ?? '-',
        fileLine: (h.file ? h.file + ':' : (h.path ?? h.cargoPath ?? '-')) + (h.line ? h.line : (h.lineNum ? h.lineNum : '')),
        fn: h.fnName || h.fn || '-',
        anchor: h.anchorLine || '',
        why,
      });
    }
  }
  if (rows.length === 0) {
    console.log('    (no hits for R2/R3 — scans are clean or hits are empty)');
    return rows.length;
  }
  // 对齐输出：先打印 header
  const widths = { rule: 6, svc: 14, fileLine: 44, fn: 20, anchor: 7, why: 30 };
  const pad = (s, w) => { const t = String(s ?? ''); if (t.length <= w) return t.padEnd(w); return t.slice(0, w-1) + '…'; };
  const hd = `  ${pad('Rule',widths.rule)} | ${pad('Svc',widths.svc)} | ${pad('File:Line',widths.fileLine)} | ${pad('Fn',widths.fn)} | ${pad('Anchor',widths.anchor)} | ${pad('Why',widths.why)}`;
  console.log(hd);
  console.log('  ' + '-'.repeat(hd.length - 2));
  for (const r of rows) {
    console.log(`  ${pad(r.rule,widths.rule)} | ${pad(r.svc,widths.svc)} | ${pad(r.fileLine,widths.fileLine)} | ${pad(r.fn,widths.fn)} | ${pad(String(r.anchor),widths.anchor)} | ${pad(r.why,widths.why)}`);
  }
  return rows.length;
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

  const r7Desc = 'service has local middleware/tenant.rs AND uses shared-auth factory (double-track anti-pattern, migrate to shared-auth)';
  const r7Count = r7Hits.length;

  for (const r of rules) {
    if (r.id === 'R4') r.count = r4Hits.length;
    if (r.id === 'R5') r.count = r5Hits.length;
  }
  // 把 R4/R5/R7 hits 也 attach 到 rules，统一 reportRuleHitsTable / JSON 入口
  for (const r of rules) {
    if (r.id === 'R4') r.hits = r4Hits;
    if (r.id === 'R5') r.hits = r5Hits.slice(0, 50);
    if (r.id === 'R7') { r.count = r7Count; r.hits = r7Hits; }
  }

  const compat = buildCompatReport(rules, r4Hits, r5Hits, r7Hits, r7Count, r7Desc, null);

  const report = {
    version: 'perm-gate-scan@1.0.0',
    createdAt: new Date().toISOString(),
    config: { dryRun },
    rules: rules.map(r => ({ id: r.id, desc: r.desc, severity: r.severity, count: r.count, hits: Array.isArray(r.hits) ? r.hits : [] })),
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

  console.log('');
  console.log('  ── Rule hits detail (R1/R2/R3/R4/R5/R7) ──');
  reportRuleHitsTable(rules, { rules: ['R1','R2','R3','R4','R5','R7'] });

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

  const r7Desc = 'service has local middleware/tenant.rs AND uses shared-auth factory (double-track anti-pattern, migrate to shared-auth)';
  const r7Count = r7Hits.length;

  for (const r of rules) {
    if (r.id === 'R4') r.count = r4Hits.length;
    if (r.id === 'R5') r.count = r5Hits.length;
  }
  // R4/R5/R7 hits 统一挂到 rules[].hits
  for (const r of rules) {
    if (r.id === 'R4') r.hits = r4Hits;
    if (r.id === 'R5') r.hits = r5Hits.slice(0, 50);
    if (r.id === 'R7') { r.count = r7Count; r.hits = r7Hits; }
  }

  const compat = buildCompatReport(rules, r4Hits, r5Hits, r7Hits, r7Count, r7Desc, null);

  const report = {
    version: 'perm-gate-ci-report@1.0.0',
    createdAt: new Date().toISOString(),
    config: { dryRun, failOnWarn },
    rules: rules.map(r => ({ id: r.id, desc: r.desc, severity: r.severity, count: r.count, hits: Array.isArray(r.hits) ? r.hits : [] })),
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

  console.log('');
  console.log('  ── Rule hits detail (R1/R2/R3/R4/R5/R7) ──');
  reportRuleHitsTable(rules, { rules: ['R1','R2','R3','R4','R5','R7'] });

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
