#!/usr/bin/env node
/**
 * scripts/ci/check-schema-prefix.mjs
 *
 * schema 前缀门禁：模块内 SQL 的表引用必须显式 `<schema>.<table>`，不依赖 search_path 默认值。
 *
 * 背景（连接治理 B）：`ScopedTxn` 用 `SET LOCAL search_path` 做兜底隔离，但兜底不能当成
 * 正确性依据——同名表跨 schema 时（如 `core_files` 在 public / flow / iam 各有一份），
 * 切换 search_path 等于隐式换了数据源，且不会报错，只会静默读到另一份数据。
 *
 * 判定分级（危险度从高到低）：
 *   AMBIGUOUS              表名在多 schema 同名（scripts/schema_boundary_tables.json#ambiguous）
 *                          —— search_path 一变就读到别的表，最危险
 *   CROSS_SCHEMA           静态归属 schema 不在该服务的 search_path/allow 内
 *                          —— 当前就依赖隐式解析，随时可能读到对端 schema
 *   SEARCH_PATH_DEPENDENT  归属 schema 恰在 search_path 内，今天能跑通纯属巧合
 *   UNKNOWN                静态归属表里查不到（新表/视图/CTE 未识别）
 *
 * 例外（不算违规，已在口径中固化）：
 *   - 动态表名（`format!` / 绑定参数 / `{...}` 占位）：无法静态解析，跳过并计入 dynamic；
 *   - CTE 名（`WITH x AS (...)`）、子查询、表别名；
 *   - `pg_catalog` / `information_schema` 系统表，以及 `unnest` / `generate_series` 等集合函数；
 *   - Rust 测试代码（`tests/`、`*_test.rs`、`#[cfg(test)] mod`）。
 *
 * 用法：
 *   node scripts/ci/check-schema-prefix.mjs                       # 全量（CI）：阻断新增/新表
 *   node scripts/ci/check-schema-prefix.mjs --changed-only        # 仅暂存文件（pre-commit）
 *   node scripts/ci/check-schema-prefix.mjs --json                # 机器可读
 *   node scripts/ci/check-schema-prefix.mjs --report-only         # 只报告，不阻断
 *   node scripts/ci/check-schema-prefix.mjs --update-baseline     # 人工更新基线（需 review diff）
 *
 * 基线 `scripts/ci/schema-prefix-baseline.json` 以 `文件::表名` 为键：既存违规放行，
 * 新增文件/新表名一律阻断——避免一次性红掉，也防止"改一行 SQL 就偷偷加个裸表名"。
 *
 * 退出码：0 通过；1 存在未在基线内的违规。
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = process.cwd();
const SVCS_DIR = join(ROOT, 'svc');
const BOUNDARY_FILE = join(ROOT, 'scripts/schema_boundary.json');
const TABLES_FILE = join(ROOT, 'scripts/schema_boundary_tables.json');
const BASELINE_FILE = join(ROOT, 'scripts/ci/schema-prefix-baseline.json');

const args = process.argv.slice(2);
const CHANGED_ONLY = args.includes('--changed-only');
const JSON_MODE = args.includes('--json');
const REPORT_ONLY = args.includes('--report-only');
const UPDATE_BASELINE = args.includes('--update-baseline');

const SKIP_RELATIONS = new Set([
  'select', 'values', 'lateral', 'only', 'unnest', 'generate_series', 'json_each',
  'jsonb_each', 'json_array_elements', 'jsonb_array_elements', 'json_table', 'dual',
  'now', 'current_setting', 'set_config', 'to_regclass', 'to_regnamespace', 'extract',
  'pg_catalog', 'information_schema', 'set', 'with', 'conflict',
]);

const readJson = (p, fallback) => {
  if (!existsSync(p)) {
    if (fallback !== undefined) return fallback;
    console.error(`[schema-prefix] 缺少事实源：${p}`);
    process.exit(1);
  }
  return JSON.parse(readFileSync(p, 'utf8'));
};

const boundary = readJson(BOUNDARY_FILE);
const tables = readJson(TABLES_FILE);
const baseline = existsSync(BASELINE_FILE)
  ? readJson(BASELINE_FILE)
  : { generated: '', note: '', entries: [] };

const parseSchemas = (searchPath) =>
  String(searchPath || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

// ── 1. 收集待扫描文件 ───────────────────────────────────────────────────────
function walk(dir, out) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name === 'tests' || name === 'target') continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (
      name.endsWith('.rs') &&
      !name.endsWith('_test.rs') &&
      !name.endsWith('_tests.rs') &&
      !name.startsWith('test_')
    )
      out.push(p);
  }
  return out;
}

function stagedFiles() {
  try {
    return execSync('git diff --cached --name-only --diff-filter=ACM', { cwd: ROOT, encoding: 'utf8' })
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.startsWith('svc/') && s.endsWith('.rs'));
  } catch {
    return [];
  }
}

let files = walk(SVCS_DIR, []).map((p) => relative(ROOT, p));
if (CHANGED_ONLY) {
  const staged = new Set(stagedFiles());
  files = files.filter((f) => staged.has(f));
}

// ── 2. 去掉 Rust 测试代码（#[cfg(test)] mod 整块） ───────────────────────────
function stripTestModules(src) {
  const marker = '#[cfg(test)]';
  let out = '';
  let i = 0;
  while (true) {
    const idx = src.indexOf(marker, i);
    if (idx < 0) { out += src.slice(i); break; }
    out += src.slice(i, idx);
    // 从 marker 起找到 `mod xxx {` 后的第一个 '{'，按花括号配对跳过整块
    const brace = src.indexOf('{', idx);
    if (brace < 0) break;
    let depth = 0;
    let j = brace;
    for (; j < src.length; j++) {
      if (src[j] === '{') depth++;
      else if (src[j] === '}') { depth--; if (depth === 0) { j++; break; } }
    }
    // 用等长换行占位，保证行号不变
    out += src.slice(idx, j).replace(/[^\n]/g, ' ');
    i = j;
  }
  return out;
}

// ── 3. 抽取 Rust 字符串字面量（普通串 + r"..." / r#"..."#） ─────────────────
function extractLiterals(src) {
  const out = [];
  let i = 0;
  let line = 1;
  const pushLiteral = (text, startLine) => out.push({ text, line: startLine });
  while (i < src.length) {
    const c = src[i];
    if (c === '\n') { line++; i++; continue; }
    if (c === '/' && src[i + 1] === '/') {
      while (i < src.length && src[i] !== '\n') i++;
      continue;
    }
    if (c === '/' && src[i + 1] === '*') {
      const end = src.indexOf('*/', i + 2);
      const stop = end < 0 ? src.length : end + 2;
      line += (src.slice(i, stop).match(/\n/g) || []).length;
      i = stop;
      continue;
    }
    if (c === 'r' && (src[i + 1] === '"' || src[i + 1] === '#')) {
      // r"..." 或 r###"..."###
      let h = 0;
      while (src[i + 1 + h] === '#') h++;
      if (src[i + 1 + h] === '"') {
        const startLine = line;
        const bodyStart = i + 2 + h;
        const closer = '"' + '#'.repeat(h);
        const end = src.indexOf(closer, bodyStart);
        const stop = end < 0 ? src.length : end + closer.length;
        pushLiteral(src.slice(bodyStart, end < 0 ? src.length : end), startLine);
        line += (src.slice(i, stop).match(/\n/g) || []).length;
        i = stop;
        continue;
      }
    }
    if (c === '"') {
      const startLine = line;
      let j = i + 1;
      let buf = '';
      while (j < src.length && src[j] !== '"') {
        if (src[j] === '\\') { buf += src[j + 1] || ''; j += 2; continue; }
        if (src[j] === '\n') line++;
        buf += src[j];
        j++;
      }
      pushLiteral(buf, startLine);
      i = j + 1;
      continue;
    }
    i++;
  }
  return out;
}

// ── 4. 从 SQL 文本解析表引用 ────────────────────────────────────────────────
// 只认「像 SQL」的字面量：日志/提示文案里也常有 "from ..."，靠语句结构过滤掉。
const SQL_GATE =
  /\bSELECT\b[\s\S]*\bFROM\b|\bINSERT\s+INTO\b|\bUPDATE\s+[\w."]+\s+SET\b|\bDELETE\s+FROM\b|\bJOIN\b/i;
const REF_RE = /\b(?:FROM|JOIN|INTO|UPDATE|REFERENCES)\s+([A-Za-z_][A-Za-z0-9_.]*)/gi;
const QUOTED_REF_RE = /\b(?:FROM|JOIN|INTO|UPDATE|REFERENCES)\s+"([^"]+)"/gi;
const CTE_RE = /(?:WITH|,)\s+([A-Za-z_][A-Za-z0-9_]*)\s+AS\s*(?:NOT\s+)?(?:MATERIALIZED\s+)?\(/gi;

function extractRefs(sql) {
  if (!SQL_GATE.test(sql)) return [];
  const refs = [];
  const ctes = new Set();
  for (const m of sql.matchAll(CTE_RE)) ctes.add(m[1].toLowerCase());
  const consider = (raw, index) => {
    if (!raw || raw.includes('.')) return; // 已限定 schema
    const name = raw.toLowerCase();
    if (SKIP_RELATIONS.has(name) || ctes.has(name)) return;
    if (/^\d/.test(name)) return;
    refs.push({ name, index });
  };
  for (const m of sql.matchAll(REF_RE)) consider(m[1], m.index ?? 0);
  for (const m of sql.matchAll(QUOTED_REF_RE)) consider(m[1], m.index ?? 0);
  return refs;
}

function lineOfLiteral(literalLine, sql, index) {
  return literalLine + (sql.slice(0, index).match(/\n/g) || []).length;
}

function classify(svc, name) {
  const ambiguous = tables.ambiguous?.[name];
  const owner = tables.table_owner?.[name];
  if (ambiguous) return { level: 'AMBIGUOUS', owner: ambiguous.join('/') };
  const cfg = boundary.services?.[svc] || {};
  const allowed = new Set([
    ...(cfg.schema ? [cfg.schema] : []),
    ...parseSchemas(cfg.search_path),
    ...(cfg.allow || []),
    ...(boundary.default_shared || []),
  ]);
  if (owner && !allowed.has(owner)) return { level: 'CROSS_SCHEMA', owner };
  if (owner) return { level: 'SEARCH_PATH_DEPENDENT', owner };
  return { level: 'UNKNOWN', owner: null };
}

// ── 5. 扫描 ─────────────────────────────────────────────────────────────────
const violations = [];
let literalCount = 0;

for (const file of files) {
  const svc = file.split('/')[1];
  const raw = readFileSync(join(ROOT, file), 'utf8');
  const src = stripTestModules(raw);
  for (const lit of extractLiterals(src)) {
    if (!SQL_GATE.test(lit.text)) continue;
    literalCount++;
    for (const ref of extractRefs(lit.text)) {
      const v = classify(svc, ref.name);
      violations.push({
        file,
        line: lineOfLiteral(lit.line, lit.text, ref.index),
        table: ref.name,
        svc,
        ...v,
      });
    }
  }
}

// ── 6. 基线比对 ─────────────────────────────────────────────────────────────
const baselineKeys = new Set((baseline.entries || []).map((e) => `${e.file}::${e.table}`));
const keyOf = (v) => `${v.file}::${v.table}`;
const isKnown = (v) => baselineKeys.has(keyOf(v));
const fresh = violations.filter((v) => !isKnown(v));

const dedup = (list) => {
  const seen = new Set();
  return list.filter((v) => {
    const k = `${v.file}::${v.table}::${v.line}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};

const all = dedup(violations);
const freshDedup = dedup(fresh);

const byLevel = (list, level) => list.filter((v) => v.level === level);
const byModule = {};
for (const v of all) byModule[v.svc] = (byModule[v.svc] || 0) + 1;

const summary = {
  scanned_files: files.length,
  sql_literals: literalCount,
  violations: all.length,
  ambiguous: byLevel(all, 'AMBIGUOUS').length,
  cross_schema: byLevel(all, 'CROSS_SCHEMA').length,
  search_path_dependent: byLevel(all, 'SEARCH_PATH_DEPENDENT').length,
  unknown: byLevel(all, 'UNKNOWN').length,
  new_violations: freshDedup.length,
  by_module: byModule,
  changed_only: CHANGED_ONLY,
};

if (JSON_MODE) {
  console.log(JSON.stringify({ summary, violations: all, new_violations: freshDedup }, null, 2));
} else {
  console.log(`[schema-prefix] 扫描 ${summary.scanned_files} 个文件 / ${summary.sql_literals} 条 SQL 字面量`);
  console.log(
    `[schema-prefix] 违规 ${summary.violations}（AMBIGUOUS=${summary.ambiguous} ` +
      `CROSS_SCHEMA=${summary.cross_schema} SEARCH_PATH_DEPENDENT=${summary.search_path_dependent} ` +
      `UNKNOWN=${summary.unknown}），基线内 ${summary.violations - freshDedup.length}，新增 ${summary.new_violations}`
  );
  const mods = Object.entries(byModule).sort((a, b) => b[1] - a[1]);
  console.log(`[schema-prefix] 按模块：${mods.map(([m, n]) => `${m}=${n}`).join(' ')}`);
  for (const v of byLevel(all, 'AMBIGUOUS')) {
    console.log(`  AMBIGUOUS  ${v.file}#${v.line}  ${v.table}  (${v.owner})`);
  }
  if (freshDedup.length) {
    console.log('[schema-prefix] 新增违规（需改成 schema.table 或更新基线）：');
    for (const v of freshDedup) {
      console.log(`  ${v.level.padEnd(20)} ${v.file}#${v.line}  ${v.table}  owner=${v.owner}`);
    }
  }
}

if (UPDATE_BASELINE) {
  const entries = [...new Set(all.map(keyOf))].sort().map((k) => {
    const [file, table] = k.split('::');
    return { file, table };
  });
  const payload = {
    generated: new Date().toISOString().slice(0, 10),
    note:
      '既存裸表名基线。规则见 docs/database/connection-governance.md「C. schema 前缀规则」；' +
      '新增条目必须人工 review（优先改成显式 schema 前缀，而不是加进基线）。',
    entries,
  };
  writeFileSync(BASELINE_FILE, JSON.stringify(payload, null, 2) + '\n');
  console.log(`[schema-prefix] 基线已写入 ${relative(ROOT, BASELINE_FILE)}（${entries.length} 条）`);
} else if (freshDedup.length && !REPORT_ONLY) {
  process.exit(1);
}
