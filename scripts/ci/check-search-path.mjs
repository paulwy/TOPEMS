#!/usr/bin/env node
/**
 * scripts/ci/check-search-path.mjs
 *
 * search_path 静态扫描门禁：禁止 svc 业务代码在 SQL 里自行 `SET search_path` /
 * `SET LOCAL search_path` / `set_config('search_path', ...)`。
 *
 * 背景（连接治理 B）：模块 schema 作用域由 `Db::new(pool, "<module search_path>")`
 * 在事务内 `SET LOCAL` 统一注入（lib/shared-db/src/scope.rs）。业务侧再手写
 * `SET search_path` 会：
 *   1. 绕过作用域基线、越过事务边界污染连接（会话级 SET 归还池后仍生效）；
 *   2. 让裸表名解析变成运行时行为，静态扫描（schema-prefix 门禁）无法判定落点；
 *   3. 同名表跨 schema 时静默读到另一份数据（不报错）。
 *
 * 例外：
 *   - Rust 测试代码（`tests/`、`*_test.rs` / `*_tests.rs`、`test_*.rs`、`#[cfg(test)] mod`）；
 *   - 注释 / 文档字符串（只扫描字符串字面量，注释本身已被剥离）；
 *   - `SHOW search_path`（只读诊断，不改变会话）。
 *
 * 用法：
 *   node scripts/ci/check-search-path.mjs                  # 全量（CI）
 *   node scripts/ci/check-search-path.mjs --changed-only   # 仅暂存文件（pre-commit）
 *   node scripts/ci/check-search-path.mjs --json           # 机器可读
 *   node scripts/ci/check-search-path.mjs --report-only    # 只报告，不阻断
 *   node scripts/ci/check-search-path.mjs --update-baseline
 *
 * 基线 `scripts/ci/search-path-baseline.json` 以 `文件::语句` 为键：既存违规放行，
 * 新增/新文件一律阻断。合并前必须人工 review——优先删除违规代码，而不是加基线。
 *
 * 退出码：0 通过；1 存在未在基线内的违规。
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = process.cwd();
const SVCS_DIR = join(ROOT, 'svc');
const BASELINE_FILE = join(ROOT, 'scripts/ci/search-path-baseline.json');

const args = process.argv.slice(2);
const CHANGED_ONLY = args.includes('--changed-only');
const JSON_MODE = args.includes('--json');
const REPORT_ONLY = args.includes('--report-only');
const UPDATE_BASELINE = args.includes('--update-baseline');

const SET_RE = /\bSET\s+(?:LOCAL\s+|SESSION\s+)?search_path\b/i;
const SET_CONFIG_RE = /\bset_config\s*\(\s*'search_path'\s*,/i;

const baseline = existsSync(BASELINE_FILE)
  ? JSON.parse(readFileSync(BASELINE_FILE, 'utf8'))
  : { generated: '', note: '', entries: [] };

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
    return execSync('git diff --cached --name-only --diff-filter=ACM', {
      cwd: ROOT,
      encoding: 'utf8',
    })
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

// ── 3. 抽取 Rust 字符串字面量（普通串 + r"..." / r#"..."#；注释被剥离） ──────
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

// ── 4. 扫描 ─────────────────────────────────────────────────────────────────
const normalize = (s) => s.replace(/\s+/g, ' ').trim().toLowerCase();
const violations = [];
let literalCount = 0;

for (const file of files) {
  const raw = readFileSync(join(ROOT, file), 'utf8');
  const src = stripTestModules(raw);
  for (const lit of extractLiterals(src)) {
    if (!SET_RE.test(lit.text) && !SET_CONFIG_RE.test(lit.text)) continue;
    literalCount++;
    const m = SET_RE.test(lit.text) ? lit.text.match(SET_RE) : lit.text.match(SET_CONFIG_RE);
    const index = m?.index ?? 0;
    const line = lit.line + (lit.text.slice(0, index).match(/\n/g) || []).length;
    // 取命中位置所在整行作为语句签名，避免整段 SQL 进基线造成漂移
    const sourceLine = lit.text.split('\n')[Math.max(0, (lit.text.slice(0, index).match(/\n/g) || []).length)];
    violations.push({ file, line, statement: normalize(sourceLine || m?.[0] || '') });
  }
}

const keyOf = (v) => `${v.file}::${v.statement}`;
const baselineKeys = new Set((baseline.entries || []).map((e) => `${e.file}::${e.statement}`));
const fresh = violations.filter((v) => !baselineKeys.has(keyOf(v)));

const summary = {
  scanned_files: files.length,
  literals_with_search_path: literalCount,
  violations: violations.length,
  baseline_allowed: violations.length - fresh.length,
  new_violations: fresh.length,
  changed_only: CHANGED_ONLY,
};

if (JSON_MODE) {
  console.log(JSON.stringify({ summary, violations, new_violations: fresh }, null, 2));
} else {
  console.log(
    `[search-path] 扫描 ${summary.scanned_files} 个文件，命中 ${summary.literals_with_search_path} 处 ` +
      `search_path 语句；违规 ${summary.violations}（基线放行 ${summary.baseline_allowed}，新增 ${summary.new_violations}）`
  );
  for (const v of violations) {
    const known = baselineKeys.has(keyOf(v));
    console.log(`  ${known ? 'BASELINE' : 'NEW     '}  ${v.file}#${v.line}  ${v.statement}`);
  }
}

if (UPDATE_BASELINE) {
  const entries = [...new Set(violations.map(keyOf))]
    .sort()
    .map((k) => {
      const i = k.indexOf('::');
      return { file: k.slice(0, i), statement: k.slice(i + 2) };
    });
  const payload = {
    generated: new Date().toISOString().slice(0, 10),
    note:
      '既存 search_path 自设语句基线（业务代码不应再新增）。规则见 ' +
      'docs/database/connection-governance.md；新增条目必须人工 review。',
    entries,
  };
  writeFileSync(BASELINE_FILE, JSON.stringify(payload, null, 2) + '\n');
  console.log(`[search-path] 基线已写入 ${relative(ROOT, BASELINE_FILE)}（${entries.length} 条）`);
} else if (fresh.length && !REPORT_ONLY) {
  console.error(
    '[search-path] 阻断：业务代码禁止自行 SET search_path，schema 作用域应通过 ' +
      'Db::new(pool, "<module search_path>") 的事务级 SET LOCAL 注入。'
  );
  process.exit(1);
}
