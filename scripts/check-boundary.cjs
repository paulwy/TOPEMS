#!/usr/bin/env node
/**
 * check-boundary.cjs — 编译时边界检查的 CI 侧强制脚本（Plan v1.0 §4.4 配套）
 *
 * 扫描 svc 目录下各服务的 sqlx query 系列宏的
 * SQL 字符串字面量，提取 `schema.table` 引用，与「服务 → 允许 schema 白名单」比对：
 *   - 引用不在本服务白名单 → 违规（跨 schema 裸引用）
 *   - 白名单含本服务 schema + 平台共享层（public/unified_core/core/iam）+ 显式共享只读 schema
 *
 * 用法:
 *   node scripts/check-boundary.cjs            # 全量核查，违规 exit 1
 *   node scripts/check-boundary.cjs --list     # 只列引用不判违规
 *   node scripts/check-boundary.cjs --service crm  # 单服务核查
 *
 * 注：本脚本是静态文本级核查（不解析 Rust 语义），误报需人工复核；
 * only_own_schema_query! 宏的编译期检查是权威，本脚本兜底未包宏的裸查询。
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SVC_DIR = path.join(ROOT, 'svc');

// 服务 → 允许 schema 白名单（本服务 schema + 平台共享层 + 显式共享只读）
// 平台共享层: public / unified_core / core / iam（跨服务读写平台表）
const PLATFORM_SHARED = new Set(['public', 'unified_core', 'core', 'iam']);
// 系统 schema（工具/迁移查询，允许）
const SYSTEM_SCHEMAS = new Set(['information_schema', 'pg_catalog', 'pg_toast', 'pg_temp']);

const SERVICE_SCHEMA = {
  analytics: ['bi', 'plugin_bi'],
  ai: ['ai', 'plugin_ai'],
  communication: ['communication', 'im', 'mail', 'flow'],
  crm: ['crm', 'plugin_crm'],
  ehs: ['ehs', 'plugin_ehs'],
  erp: ['erp', 'plugin_erp', 'finance'], // erp 服务读 finance 报表（B2 迁移链）
  finance: ['finance', 'plugin_finance', 'erp'],
  gis: ['gis'],
  hrm: ['hrm', 'plugin_hrm'],
  integration: ['integration'],
  lims: ['lims'],
  'master-data': ['master_data'],
  mes: ['mes'],
  mobile: ['mobile'],
  pdm: ['pdm'],
  pm: ['pm'],
  portal: ['public'],
  qms: ['qms'],
  rd: ['rd'],
  scm: ['scm'],
  search: ['search', 'erp'],
  server: ['public'],
  srm: ['srm'],
  ticket: ['ticket'],
  tms: ['tms', 'aps'],
  'unified-core': ['core', 'iam', 'unified_core', 'public', 'crm', 'ehs', 'erp', 'finance', 'hrm', 'pdm', 'qms', 'scm', 'wms'],
  wms: ['wms', 'plugin_wms'],
  monitor: ['public'],
  'plugin-registry': ['public'],
};

// 提取 Rust 字符串字面量内容（"..." 与 r#"..."# raw 字符串）；跳过 only_own_schema_query! 宏参数（宏在编译期权威校验）
function extractSqlLiterals(src) {
  const out = [];
  const macroRange = [];
  const lineRe = /only_own_schema_query!\s*\(/g;
  let lm;
  while ((lm = lineRe.exec(src)) !== null) {
    let depth = 1;
    let i = lm.index + lm[0].length;
    while (i < src.length && depth > 0) {
      if (src[i] === '(') depth++;
      else if (src[i] === ')') depth--;
      i++;
    }
    macroRange.push([lm.index, i]);
  }
  const re = /r#+"([\s\S]*?)"#+|\"((?:\\.|[^"\\])*)\"/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const inMacro = macroRange.some(([s, e]) => m.index > s && m.index < e);
    if (inMacro) continue;
    const lit = m[1] !== undefined ? m[1] : m[2];
    if (/(select|insert|update|delete|with|create|alter|drop)\s/i.test(lit)) {
      out.push(lit);
    }
  }
  return out;
}

// 全部已知 schema 集合（服务 schema + 平台共享 + 系统 schema）——仅这些视为 schema.table 引用
const ALL_KNOWN_SCHEMAS = new Set([
  ...new Set(Object.values(SERVICE_SCHEMA).flat()),
  ...PLATFORM_SHARED,
  'information_schema', 'pg_catalog', 'pg_toast', 'pg_temp',
]);

function extractSchemaRefs(sql) {
  const refs = [];
  // 先提取 FROM/JOIN 后的表别名集合（`FROM table alias` / `JOIN table alias`，alias 为裸 ident 且非保留字）
  const aliases = new Set();
  const tokRe = /(?:from|join)\s+([a-z_][a-z0-9_]*)(?:\s*\.\s*([a-z_][a-z0-9_]*))?\s+([a-z_][a-z0-9_]*)/gi;
  let tm;
  while ((tm = tokRe.exec(sql)) !== null) {
    if (tm[3] && tm[2] !== undefined) aliases.add(tm[3].toLowerCase());
    if (tm[3] && tm[2] === undefined && tm[1] !== 'select' && tm[1] !== 'only') aliases.add(tm[3].toLowerCase());
  }
  const re = /([a-z_][a-z0-9_]*)\s*\.\s*([a-z_][a-z0-9_]*)/gi;
  let m;
  while ((m = re.exec(sql)) !== null) {
    const a = m[1].toLowerCase();
    const b = m[2].toLowerCase();
    if (aliases.has(a)) continue; // 已识别表别名（bi./im. 等）
    if (!ALL_KNOWN_SCHEMAS.has(a)) continue; // 未知名 = 别名/伪引用
    if (SYSTEM_SCHEMAS.has(a)) continue; // 系统 schema 允许
    if (b === 'nextval' || b === 'currval' || b === 'setval') continue; // 序列
    refs.push(`${a}.${b}`);
  }
  return refs;
}

function scanService(svcName) {
  const dir = path.join(SVC_DIR, svcName, 'src');
  if (!fs.existsSync(dir)) return [];
  const allowed = new Set([...(SERVICE_SCHEMA[svcName] || [svcName]), ...PLATFORM_SHARED]);
  const findings = [];
  const files = [];
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.rs')) files.push(p);
    }
  })(dir);

  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8');
    for (const sql of extractSqlLiterals(src)) {
      for (const ref of extractSchemaRefs(sql)) {
        const schema = ref.split('.')[0];
        if (!allowed.has(schema)) {
          findings.push({
            file: path.relative(ROOT, f),
            ref,
            allowed: [...allowed].join(','),
          });
        }
      }
    }
  }
  return findings;
}

const args = process.argv.slice(2);
const listOnly = args.includes('--list');
const onlyService = args.find((a) => a.startsWith('--service='))?.split('=')[1];

let svcs = Object.keys(SERVICE_SCHEMA);
if (onlyService) svcs = [onlyService];

const all = [];
for (const s of svcs) {
  const f = scanService(s);
  for (const x of f) all.push({ svc: s, ...x });
}

if (listOnly) {
  for (const x of all) console.log(`${x.svc}\t${x.file}\t${x.ref}`);
  process.exit(0);
}

if (all.length === 0) {
  console.log(`✓ boundary check passed (${svcs.length} services)`);
  process.exit(0);
}
console.log(`✗ ${all.length} cross-schema reference(s) found:`);
for (const x of all) console.log(`  ${x.svc}\t${x.file}\t${x.ref}\t(allow: ${x.allowed})`);
process.exit(1);
