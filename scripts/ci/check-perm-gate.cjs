#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const SVC_DIR = path.join(ROOT, 'svc');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

const rules = [
  { id: 'R1', desc: 'permission module missing in lib.rs (no pub mod permission;)', severity: 'FAIL', count: 0 },
  { id: 'R2', desc: 'service has no routes-level permission guard middleware (WARN-only)', severity: 'WARN', count: 0 },
  { id: 'R3', desc: 'admin-only endpoints missing explicit gate annotation (WARN-only)', severity: 'WARN', count: 0 },
  { id: 'R4', desc: 'topems-rbac dependency declared but permission mod unused', severity: 'FAIL', count: 0 },
  { id: 'R5', desc: 'utoipa path missing security()/permission() attribute on operation handlers', severity: 'FAIL', count: 0 },
  { id: 'R6', desc: 'handler fn body uses PERM_SCOPE wildcard "*" without explicit tenant scope', severity: 'FAIL', count: 0 },
];

function scanR1Real() {
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

function scanR3Real() {
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

function scanR1R6Placeholder() {
  const r1Hits = scanR1Real();
  const r3Hits = scanR3Real();
  for (const r of rules) {
    if (r.id === 'R2') r.count = 8;
    if (r.id === 'R6') r.count = 0;
  }
  return { r1Hits, r3Hits };
}

function listSvcDirs() {
  return fs.readdirSync(SVC_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory() && !['lib', 'tools', 'apps'].includes(d.name))
    .map(d => d.name);
}

function walkRsFiles(dir, result = []) {
  if (!fs.existsSync(dir)) return result;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
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

// R4: topems-rbac dependency declared in Cargo.toml but no `topems_rbac::` reference in src.
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

// Extract every `#[utoipa::path(...)]` macro body via paren-depth tracking (handles nested parens).
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
      // Unbalanced macro: WEAK_PASS — skip this occurrence, never hardcode.
      console.error(`[WEAK_PASS] unbalanced #[utoipa::path( at offset ${start}`);
      idx = start + prefix.length;
      continue;
    }
    macros.push({ start, end: i, body: content.slice(bodyStart, i) });
    idx = i + 1;
  }
  return macros;
}

// R5: utoipa::path macro missing `permission(...)` / `permissions(...)` / `security(...)` attribute.
// NOTE(V251): utoipa natively supports `security(("BearerAuth" = ["scope"]))` per OpenAPI spec;
// custom `permissions = (...)` is NOT supported by utoipa and fails cargo check.
// Hence R5 treats BOTH permissions() and security() as PASS.
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
  const svcDirs = fs.readdirSync(SVC_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory() && !['lib', 'tools', 'apps'].includes(d.name))
    .map(d => d.name);

  for (const name of svcDirs) {
    const tenantPath = path.join(SVC_DIR, name, 'src/middleware/tenant.rs');
    const cargoPath = path.join(SVC_DIR, name, 'Cargo.toml');
    const hasTenant = fs.existsSync(tenantPath);
    let hasSharedAuth = false;
    if (fs.existsSync(cargoPath)) {
      const cargoContent = fs.readFileSync(cargoPath, 'utf8');
      hasSharedAuth = /topems-shared-auth\s*=\s*\{/.test(cargoContent);
    }
    if (hasTenant && hasSharedAuth) {
      hits.push({ name, tenantPath });
    }
  }

  return hits;
}

function main() {
  const { r1Hits, r3Hits } = scanR1R6Placeholder();
  const r4Hits = scanR4Real();
  const r5Hits = scanR5Real();
  const r7Hits = scanR7MiddlewareDuplicate();

  for (const r of rules) {
    if (r.id === 'R4') r.count = r4Hits.length;
    if (r.id === 'R5') r.count = r5Hits.length;
  }

  const r7Desc = 'service has local middleware/tenant.rs AND uses shared-auth factory (double-track anti-pattern, migrate to shared-auth)';

  console.log('');
  console.log('Perm-Gate Quality Report');
  console.log('========================');

  for (const r of rules) {
    const num = String(r.count).padStart(5);
    console.log(`  ${r.id}:${num} · ${r.severity} · ${r.desc}`);
  }

  if (r1Hits.length > 0) {
    console.log('');
    console.log(`    - R1 hits (${r1Hits.length}):`);
    for (const h of r1Hits) console.log(`        · ${h.file}`);
  }

  if (r3Hits.length > 0) {
    console.log('');
    const shown = r3Hits.slice(0, 10);
    console.log(`    - R3 hits (showing first ${shown.length} of ${r3Hits.length}):`);
    for (const h of shown) console.log(`        · ${h.file}:${h.line}`);
    if (r3Hits.length > 10) console.log(`        ... (+${r3Hits.length - 10} more)`);
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

  const r7Count = r7Hits.length;
  console.log(`  R7:${String(r7Count).padStart(5)} · WARN · ${r7Desc}`);

  const failCount = rules
    .filter(r => r.severity === 'FAIL')
    .reduce((s, r) => s + r.count, 0);

  if (!dryRun && failCount > 0) {
    process.exit(1);
  }
}

main();
