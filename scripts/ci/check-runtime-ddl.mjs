#!/usr/bin/env node
/**
 * scripts/ci/check-runtime-ddl.mjs
 *
 * 运行期 DDL 只减不增门禁（TODO §1.B W2-D1）。
 *
 * 背景：`svc/*\/src/**\/schema_defense.rs` 在服务启动时执行 `CREATE SCHEMA` /
 * `CREATE TABLE IF NOT EXISTS` / `ALTER TABLE ADD COLUMN`（由 `TABLE_DEFS` 驱动），
 * 等于把 DDL 的第二真源放在代码里。历史事故：代码与迁移漂移、启动期锁表、
 * 非超级用户下建表失败但被吞掉。收口目标是把 DDL 全部迁回 `database/migrations/`，
 * 在此之前先用本门禁用「只减不增」把存量焊死。
 *
 * 度量（每个 Rust 文件，排除测试代码）：
 *   tables   该文件内 `TABLE_DEFS` 声明的表数
 *   columns  该文件内 `TABLE_DEFS` 声明的列数
 *   ddl      SQL 字符串字面量中的 DDL 语句数
 *            （CREATE TABLE / CREATE INDEX / CREATE SCHEMA / ALTER TABLE / DROP TABLE）
 *   callers  调用 `run_schema_migration_and_verify` 的次数
 *
 * 基线 `scripts/ci/runtime-ddl-baseline.json` 记录上述四项的现值。默认模式下
 * **任一项增加**（或出现新的含 DDL 文件）即退出码 1；下降只提示核销，不阻断。
 * `--update-baseline` 用于核销下降（与 check-request-txn.mjs 同一口径）。
 *
 * 用法：
 *   node scripts/ci/check-runtime-ddl.mjs                  # 全量（CI）
 *   node scripts/ci/check-runtime-ddl.mjs --changed-only    # 仅暂存文件（pre-commit）
 *   node scripts/ci/check-runtime-ddl.mjs --json            # 机器可读
 *   node scripts/ci/check-runtime-ddl.mjs --report-only     # 只报告不阻断
 *   node scripts/ci/check-runtime-ddl.mjs --update-baseline # 人工核销（需 review diff）
 *
 * 退出码：0 通过（含仅有下降）；1 存在增加/新增。
 */

import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = process.cwd();
const SCAN_DIRS = ['svc', 'lib'];
const BASELINE_FILE = join(ROOT, 'scripts/ci/runtime-ddl-baseline.json');

const args = process.argv.slice(2);
const CHANGED_ONLY = args.includes('--changed-only');
const JSON_MODE = args.includes('--json');
const REPORT_ONLY = args.includes('--report-only');
const UPDATE_BASELINE = args.includes('--update-baseline');

const SKIP_DIRS = new Set(['target', 'node_modules', '.git', 'vendor', 'dist', 'build', 'tests']);

const DDL_PATTERNS = [
  /\bCREATE\s+(?:OR\s+REPLACE\s+)?(?:TEMP(?:ORARY)?\s+|UNLOGGED\s+)?TABLE\b/gi,
  /\bCREATE\s+(?:UNIQUE\s+)?INDEX\b/gi,
  /\bCREATE\s+SCHEMA\b/gi,
  /\bALTER\s+TABLE\b/gi,
  /\bDROP\s+TABLE\b/gi,
];

// ── 1. 文件枚举 ─────────────────────────────────────────────────────────────
function walk(dir, out) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
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
    return new Set(
      execSync('git diff --cached --name-only --diff-filter=ACM', { cwd: ROOT, encoding: 'utf8' })
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
    );
  } catch {
    return new Set();
  }
}

// ── 2. 去测试代码（#[cfg(test)] mod 整块，用等长空白占位保持行号） ───────────
function stripTestModules(src) {
  const marker = '#[cfg(test)]';
  let out = '';
  let i = 0;
  while (true) {
    const idx = src.indexOf(marker, i);
    if (idx < 0) {
      out += src.slice(i);
      break;
    }
    out += src.slice(i, idx);
    const brace = src.indexOf('{', idx);
    if (brace < 0) break;
    let depth = 0;
    let j = brace;
    for (; j < src.length; j++) {
      if (src[j] === '{') depth++;
      else if (src[j] === '}') {
        depth--;
        if (depth === 0) {
          j++;
          break;
        }
      }
    }
    out += src.slice(idx, j).replace(/[^\n]/g, ' ');
    i = j;
  }
  return out;
}

// ── 3. 抽取字符串字面量（普通串 + r"..." / r#"..."#），跳过注释 ──────────────
function extractLiterals(src) {
  const out = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === '/' && src[i + 1] === '/') {
      while (i < src.length && src[i] !== '\n') i++;
      continue;
    }
    if (c === '/' && src[i + 1] === '*') {
      const end = src.indexOf('*/', i + 2);
      i = end < 0 ? src.length : end + 2;
      continue;
    }
    if (c === 'r' && (src[i + 1] === '"' || src[i + 1] === '#')) {
      let h = 0;
      while (src[i + 1 + h] === '#') h++;
      if (src[i + 1 + h] === '"') {
        const bodyStart = i + 2 + h;
        const closer = '"' + '#'.repeat(h);
        const end = src.indexOf(closer, bodyStart);
        out.push(src.slice(bodyStart, end < 0 ? src.length : end));
        i = end < 0 ? src.length : end + closer.length;
        continue;
      }
    }
    if (c === '"') {
      let j = i + 1;
      let buf = '';
      while (j < src.length && src[j] !== '"') {
        if (src[j] === '\\') {
          buf += src[j + 1] || '';
          j += 2;
          continue;
        }
        buf += src[j];
        j++;
      }
      out.push(buf);
      i = j + 1;
      continue;
    }
    i++;
  }
  return out;
}

// ── 4. 解析 TABLE_DEFS（表数 / 列数） ───────────────────────────────────────
// 只做足够用的结构解析：字符串 + ( ) [ ] , 标记；不依赖具体换行格式。
function tokenizeDefs(text) {
  const tokens = [];
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (c === '/' && text[i + 1] === '/') {
      while (i < text.length && text[i] !== '\n') i++;
      continue;
    }
    if (c === '/' && text[i + 1] === '*') {
      const end = text.indexOf('*/', i + 2);
      i = end < 0 ? text.length : end + 2;
      continue;
    }
    if (c === '"') {
      let j = i + 1;
      let buf = '';
      while (j < text.length && text[j] !== '"') {
        if (text[j] === '\\') {
          buf += text[j + 1] || '';
          j += 2;
          continue;
        }
        buf += text[j];
        j++;
      }
      tokens.push({ type: 'str', value: buf });
      i = j + 1;
      continue;
    }
    if ('()[],'.includes(c)) {
      tokens.push({ type: 'punct', value: c });
    }
    i++;
  }
  return tokens;
}

function parseTableDefs(src) {
  const decl = src.indexOf('pub const TABLE_DEFS');
  if (decl < 0) return null;
  // 注意：类型注解里也有 `&[`（`&[(&str, &[(&str, &str)])]`），必须定位初始化式 `= &[`
  const initRe = /=\s*&\[/g;
  initRe.lastIndex = decl;
  const init = initRe.exec(src);
  if (!init) return null;
  const open = init.index + init[0].length - 1; // 指向 '['

  // 从初始化式的 `[` 起做括号配对，取出数组体
  let depth = 1;
  let end = -1;
  for (let i = open + 1; i < src.length; i++) {
    if (src[i] === '[') depth++;
    else if (src[i] === ']') {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end < 0) return null;

  const tokens = tokenizeDefs(src.slice(open + 1, end));
  let bracketDepth = 0;
  let expectTable = false;
  let expectColumn = false;
  let tables = 0;
  let columns = 0;
  for (const tok of tokens) {
    if (tok.type === 'punct') {
      if (tok.value === '[') bracketDepth++;
      else if (tok.value === ']') bracketDepth = Math.max(0, bracketDepth - 1);
      else if (tok.value === '(') {
        if (bracketDepth === 0) expectTable = true;
        else if (bracketDepth === 1) expectColumn = true;
      } else if (tok.value === ',') {
        expectTable = false;
        expectColumn = false;
      }
      continue;
    }
    if (expectTable) {
      tables++;
      expectTable = false;
    } else if (expectColumn) {
      columns++;
      expectColumn = false;
    }
  }
  return { tables, columns };
}

// ── 5. 扫描 ─────────────────────────────────────────────────────────────────
const files = SCAN_DIRS.flatMap((d) => walk(join(ROOT, d), []));
let staged = CHANGED_ONLY ? stagedFiles() : null;
// 门禁脚本或基线自身被暂存时必须全量重算，否则无法验证基线改动
if (
  staged &&
  (staged.has('scripts/ci/runtime-ddl-baseline.json') ||
    staged.has('scripts/ci/check-runtime-ddl.mjs'))
) {
  staged = null;
}
const counts = {};

for (const abs of files) {
  const rel = relative(ROOT, abs);
  if (staged && !staged.has(rel)) continue;
  const raw = readFileSync(abs, 'utf8');
  const src = stripTestModules(raw);

  const defs = parseTableDefs(src) || { tables: 0, columns: 0 };
  let ddl = 0;
  for (const lit of extractLiterals(src)) {
    for (const re of DDL_PATTERNS) {
      const m = lit.match(re);
      if (m) ddl += m.length;
    }
  }
  const callers = (src.match(/(?<!fn\s)run_schema_migration_and_verify\s*\(/g) || []).length;

  if (defs.tables || defs.columns || ddl || callers) {
    counts[rel] = { tables: defs.tables, columns: defs.columns, ddl, callers };
  }
}

const baseline = existsSync(BASELINE_FILE)
  ? JSON.parse(readFileSync(BASELINE_FILE, 'utf8'))
  : { files: {} };

const METRICS = ['tables', 'columns', 'ddl', 'callers'];
// --changed-only（pre-commit）只比对暂存文件；未扫描的基线文件不计为下降
const keys = staged
  ? Object.keys(counts).sort()
  : [...new Set([...Object.keys(counts), ...Object.keys(baseline.files || {})])].sort();

const increases = [];
const decreases = [];
const currentTotal = { tables: 0, columns: 0, ddl: 0, callers: 0 };
const baselineTotal = { tables: 0, columns: 0, ddl: 0, callers: 0 };

for (const file of keys) {
  const now = counts[file] || { tables: 0, columns: 0, ddl: 0, callers: 0 };
  const was = (baseline.files || {})[file] || { tables: 0, columns: 0, ddl: 0, callers: 0 };
  for (const m of METRICS) {
    currentTotal[m] += now[m] || 0;
    baselineTotal[m] += was[m] || 0;
    const a = now[m] || 0;
    const b = was[m] || 0;
    if (a > b) increases.push({ file, metric: m, was: b, now: a });
    else if (a < b) decreases.push({ file, metric: m, was: b, now: a });
  }
}

const totalIncreases = METRICS.filter((m) => currentTotal[m] > baselineTotal[m]);
const totalDecreases = METRICS.filter((m) => currentTotal[m] < baselineTotal[m]);

if (UPDATE_BASELINE) {
  // 首次建档（基线不存在）允许直接写入；既有基线只允许在无上升时核销
  if (increases.length > 0 && existsSync(BASELINE_FILE) && !REPORT_ONLY) {
    console.error('[runtime-ddl] 拒绝更新基线：存在计数上升（先解释新增 DDL 的合法性）：');
    for (const i of increases) console.error(`  ↑ ${i.file} ${i.metric}: ${i.was} → ${i.now}`);
    process.exit(1);
  }
  const filesOut = {};
  for (const file of Object.keys(counts).sort()) filesOut[file] = counts[file];
  const payload = {
    generated: new Date().toISOString().slice(0, 10),
    note:
      '运行期 DDL 只减不增基线（TODO W2-D1）。度量：tables/columns = TABLE_DEFS 声明数；' +
      'ddl = SQL 字面量中的 CREATE TABLE|CREATE INDEX|CREATE SCHEMA|ALTER TABLE|DROP TABLE；' +
      'callers = run_schema_migration_and_verify 调用次数。仅允许在下降后 --update-baseline 核销。',
    totals: {
      files: Object.keys(filesOut).length,
      ...currentTotal,
    },
    files: filesOut,
  };
  writeFileSync(BASELINE_FILE, JSON.stringify(payload, null, 2) + '\n');
  console.log(
    `[runtime-ddl] 基线已更新：files=${payload.totals.files} tables=${currentTotal.tables} ` +
      `columns=${currentTotal.columns} ddl=${currentTotal.ddl} callers=${currentTotal.callers}`
  );
  process.exit(0);
}

if (JSON_MODE) {
  console.log(
    JSON.stringify(
      { totals: { current: currentTotal, baseline: baselineTotal }, increases, decreases },
      null,
      2
    )
  );
}

if (decreases.length) {
  console.log(`[runtime-ddl] ↓ 检测到 ${decreases.length} 项下降（可 --update-baseline 核销）：`);
  for (const d of decreases.slice(0, 20))
    console.log(`  ↓ ${d.file} ${d.metric}: ${d.was} → ${d.now}`);
  if (decreases.length > 20) console.log(`  … 其余 ${decreases.length - 20} 项省略`);
}

const summary =
  `files=${Object.keys(counts).length} tables=${currentTotal.tables} columns=${currentTotal.columns} ` +
  `ddl=${currentTotal.ddl} callers=${currentTotal.callers}`;

if (increases.length === 0 && totalIncreases.length === 0) {
  if (!JSON_MODE) console.log(`[runtime-ddl] OK 运行期 DDL 未增加（${summary}）`);
  process.exit(0);
}

console.error('[runtime-ddl] FAILED：运行期 DDL 计数上升。DDL 只能进 database/migrations/。');
for (const i of increases) console.error(`  ↑ ${i.file} ${i.metric}: ${i.was} → ${i.now}`);
for (const m of totalIncreases)
  console.error(`  ↑ 合计 ${m}: ${baselineTotal[m]} → ${currentTotal[m]}`);
console.error(
  '修复：新增表/列请写 database/migrations/*.sql 并从 TABLE_DEFS 删除；' +
    '确属收口期临时例外，需先在 TODO W2-D 登记并说明原因。'
);

if (REPORT_ONLY) process.exit(0);
process.exit(1);
