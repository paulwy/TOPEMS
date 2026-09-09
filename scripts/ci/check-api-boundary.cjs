#!/usr/bin/env node
/**
 * API Boundary Gate (2026-09-09, 修复建议⑨落地)
 *
 * Scans frontend API call sites (apps/web/src) for `apiClient.<svc>.<verb>('path')`
 * and verifies the FULL path (baseURL + path, mirroring config/runtime.ts and
 * each service's api_prefix in main.rs) exists in the backend's route
 * registrations (svc 各服务 src). Prevents new dangling API paths.
 *
 * Matching: compare first 3 segments of the full path, e.g.
 *   frontend apiClient.doc.get('/workspaces') + base '/api/core/doc'
 *     = '/api/core/doc/workspaces'  -> segments ['/api','/api/core','/api/core/doc']
 *   backend  api_prefix '/api/core' + route '/doc/workspaces'
 *     = '/api/core/doc/workspaces'  -> same segments ✓
 * Because unified-core registers module-prefixed routes (/iam/auth/...) while
 * other services register bare routes (/materials) under their api_prefix,
 * matching MUST join both sides into the full path before comparing.
 *
 * Allowlist (scripts/ci/api-boundary-allowlist.json): deliberate pre-built
 * (预埋) modules with a stated reason. New dangling paths outside it block CI.
 *
 * Usage: node scripts/ci/check-api-boundary.cjs
 * Exit codes: 0 = pass, 1 = violations found
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.join(__dirname, '..', '..');
const WEB_SRC = path.join(REPO_ROOT, 'apps', 'web', 'src');
const SVC_DIR = path.join(REPO_ROOT, 'svc');
const ALLOWLIST_PATH = path.join(__dirname, 'api-boundary-allowlist.json');

// frontend svc -> baseURL path (runtime.ts services block, 2026-09-09)
const SERVICES = {
  iam: '/api/core/iam', workflow: '/api/core/flow', flow: '/api/core/flow',
  file: '/api/core/file', doc: '/api/core/doc', migration: '/api/core/migration',
  core: '/api/core', automation: '/api/core/automation',
  master: '/api/master-data', 'master-data': '/api/master-data',
  mail: '/api/communication/mail', im: '/api/communication/im',
  notification: '/api/communication/notification',
  search: '/api/search', erp: '/api/erp', finance: '/api/finance',
  ai: '/api/ai', hrm: '/api/hrm', pm: '/api/pm', crm: '/api/crm',
  mes: '/api/mes', pdm: '/api/pdm', scm: '/api/scm', wms: '/api/wms',
  tms: '/api/tms', aps: '/api/aps', srm: '/api/srm', qms: '/api/qms',
  lims: '/api/lims', ehs: '/api/ehs', rd: '/api/rd', bi: '/api/bi',
  analytics: '/api/bi', monitor: '/api/monitor', portal: '/api/portal',
  mobile: '/api/mobile', gis: '/api/gis', integration: '/api/integration',
  'plugin-registry': '/api/plugin', ticket: '/api/ticket',
};

// svc name -> backend svc dir(s)
const SVC_MAP = {
  iam: ['unified-core'], workflow: ['unified-core'], flow: ['unified-core'],
  file: ['unified-core'], doc: ['unified-core'], migration: ['unified-core'],
  core: ['unified-core'], automation: ['unified-core'],
  master: ['master-data'], 'master-data': ['master-data'],
  mail: ['communication'], im: ['communication'], notification: ['communication'],
  search: ['search'], erp: ['erp'], finance: ['finance'], ai: ['ai'],
  hrm: ['hrm'], pm: ['pm'], crm: ['crm'], mes: ['mes'], pdm: ['pdm'],
  scm: ['scm'], wms: ['wms'], tms: ['tms'], aps: ['mes'], srm: ['srm'],
  qms: ['qms'], lims: ['lims'], ehs: ['ehs'], rd: ['rd'], bi: ['analytics'],
  analytics: ['analytics'], monitor: ['monitor'], portal: ['portal'],
  mobile: ['mobile'], gis: ['gis'], integration: ['integration'],
  'plugin-registry': ['plugin-registry'], ticket: ['ticket'],
};

function walk(dir, ext, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', 'target', '__tests__'].includes(entry.name)) continue;
      walk(p, ext, out);
    } else if (entry.name.endsWith(ext)) {
      out.push(p);
    }
  }
  return out;
}

// 完整路径 → 前 3 段（含 /api 根）
function segs3(full) {
  const parts = full.replace(/\/{2,}/g, '/').split('/').filter(Boolean);
  const out = [];
  for (let i = 1; i <= Math.min(3, parts.length); i++) {
    out.push('/' + parts.slice(0, i).join('/'));
  }
  return out;
}

// ---------- 1. frontend: (svc, verb, full) ----------
function frontendCalls() {
  const files = walk(WEB_SRC, '.ts').concat(walk(WEB_SRC, '.tsx'));
  const re = /apiClient\.([a-zA-Z_-]+)\.(get|post|put|delete|patch)\(\s*["'`]([^"'`]+)["'`]/g;
  const calls = [];
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8');
    let m;
    while ((m = re.exec(src)) !== null) {
      const svc = m[1];
      const verb = m[2].toUpperCase();
      // 剔除模板占位（${...}）再切 query：`/customers${q ? ...}` → /customers
      // 嵌套反引号会导致捕获在占位中途截断（${queryString ? `...），补删尾部未闭合占位
      let p = m[3]
        .replace(/\$\{[^}]*\}/g, '')
        .replace(/\$\{[^}]*$/g, '')
        .split('?')[0];
      const base = SERVICES[svc];
      if (!base || !p.startsWith('/')) continue;
      calls.push({ svc, verb, path: p, full: base + p, file: f });
    }
  }
  return calls;
}

// ---------- 2. backend: full route segments per frontend svc ----------
function backendSegs() {
  // api_prefix per svc dir (main.rs), default /api/<dir>
  const prefixOf = {};
  for (const dir of fs.readdirSync(SVC_DIR)) {
    const main = path.join(SVC_DIR, dir, 'src', 'main.rs');
    if (!fs.existsSync(main)) continue;
    const src = fs.readFileSync(main, 'utf8');
    const mm = src.match(/api_prefix:\s*"([^"]+)"/);
    prefixOf[dir] = mm ? mm[1] : '/api/' + dir;
  }
  prefixOf['plugin-registry'] = '/api';

  const out = {}; // svc -> Set<segment>
  for (const svc of Object.keys(SVC_MAP)) {
    const set = new Set();
    for (const dir of SVC_MAP[svc]) {
      const pre = prefixOf[dir] || '/api/' + dir;
      const svcDir = path.join(SVC_DIR, dir);
      if (!fs.existsSync(svcDir)) continue;
      // 收集该服务目录内全部 route 路径与 nest 前缀，再做笛卡尔拼接：
      // 如 mes 服务 api_prefix /api/mes + nest("/api/aps") 挂 aps_compat → aps 路由对外为 /api/aps/*
      const routes = new Set();
      const nests = new Set([pre]);
      for (const f of walk(path.join(svcDir, 'src'), '.rs')) {
        const src = fs.readFileSync(f, 'utf8');
        let m;
        const routeRe = /\.route\(\s*"([^"]+)"/g;
        while ((m = routeRe.exec(src)) !== null) routes.add(m[1].split('?')[0]);
        const nestRe = /nest\(\s*"([^"]+)"/g;
        while ((m = nestRe.exec(src)) !== null) {
          const n = m[1].split('?')[0];
          nests.add(n.startsWith('/api/') ? n : pre + n);
        }
      }
      for (const n of nests) {
        for (const r of routes) {
          const full = r.startsWith('/api/') ? r : n + r;
          for (const s of segs3(full)) set.add(s);
        }
      }
    }
    out[svc] = set;
  }
  return out;
}

function main() {
  const allowlistRaw = JSON.parse(fs.readFileSync(ALLOWLIST_PATH, 'utf8'));
  const allow = new Map(); // key -> type
  for (const e of allowlistRaw.entries) allow.set(`${e.svc}|${e.verb}|${e.path}`, e.type || 'prebuilt');

  const calls = frontendCalls();
  const backend = backendSegs();
  const violations = [];
  let matched = 0, allowPrebuilt = 0, allowGap = 0;

  for (const c of calls) {
    const segs = segs3(c.full);
    const key = segs[segs.length - 1]; // 最深段（含具体模块），避免 /api、/api/<svc> 通用段污染
    const ok = backend[c.svc].has(key);
    if (ok) { matched++; continue; }
    const at = allow.get(`${c.svc}|${c.verb}|${c.path}`);
    if (at === 'prebuilt') { allowPrebuilt++; continue; }
    if (at === 'known_gap') { allowGap++; continue; }
    violations.push(`${c.file.replace(REPO_ROOT + '/', '')}: ${c.svc} ${c.verb} ${c.path}`);
  }

  console.log(`API Boundary Gate (2026-09-09)`);
  console.log(`  frontend call sites     : ${calls.length}`);
  console.log(`  matched backend         : ${matched}`);
  console.log(`  allowlisted prebuilt    : ${allowPrebuilt}`);
  console.log(`  allowlisted known gaps  : ${allowGap}`);
  console.log(`  violations (unlisted)   : ${violations.length}`);
  if (violations.length) {
    console.log(`\n[FAIL] 以下前端 API 路径在后端无路由（新悬空 API，需实现或登记 allowlist）：`);
    const seen = new Set();
    const cap = process.env.GATE_FULL ? Infinity : 60;
    for (const v of violations) {
      const k = v.replace(/^.*?: /, '');
      if (seen.has(k)) continue;
      seen.add(k);
      console.log(`  - ${v}`);
      if (seen.size >= cap) { console.log(`  ... 其余 ${violations.length - seen.size} 条省略`); break; }
    }
    process.exit(1);
  }
  console.log('[PASS]');
}

main();
