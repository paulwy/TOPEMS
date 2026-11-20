#!/usr/bin/env node
/**
 * scripts/ci/check-scope-api.mjs
 *
 * §17.2 作用域 API 收敛的静态门禁（B0）。
 *
 * 背景：`scope_for_tenant` 在请求链路里自开事务 = 一个请求占用两条连接、外层回滚失效；
 * 但事件消费者 / 定时任务 / EHS 无请求事务路径 / WMS 短事务豁免**必须**保留它。
 * 因此口径不是「降为 0」，而是「未标记的存量只减不增 + 新增必须显式豁免」。
 *
 * 度量（`svc/` + `lib/`，排除测试代码与字符串/注释）：
 *   scope_for_tenant_total     生产调用点总数
 *   scope_for_tenant_marked    同行/上一行带 `// scope-exempt: <理由>` 的调用点
 *   scope_for_tenant_unmarked  total - marked（**入基线、只减不增**）
 *   db_new                     `Db::new(` 构造次数（**入基线、只减不增**；
 *                              请求 handler 内重建 Db 会绕过 deny_request_*
 *                              运行期守卫，见测绘文档 §2.1 第 6 条）
 *
 * 规则：
 *   1) 某文件 unmarked 高于基线 → 退出码 1；
 *   2) 新增调用必须带非空理由，写成 `// scope-exempt: bg-event` 等，
 *      理由枚举：bg-event / bg-spawn / no-request-txn / short-txn-exempt / lib-standalone；
 *   3) db_new 任一文件高于基线 → 退出码 1；
 *   4) 下降只提示核销，`--update-baseline` 用于核销；存在上升时拒绝更新基线。
 *
 * 基线：`scripts/ci/scope-api-baseline.json`
 * 口径依据：`docs/quality/scope-api-convergence-mapping-2026-11-21.md`
 *
 * 用法：
 *   node scripts/ci/check-scope-api.mjs                  # 全量（CI）
 *   node scripts/ci/check-scope-api.mjs --changed-only   # 仅暂存（pre-commit）
 *   node scripts/ci/check-scope-api.mjs --json
 *   node scripts/ci/check-scope-api.mjs --update-baseline
 *
 * 退出码：0 通过（含仅有下降）；1 存在未标记新增或 Db::new 新增。
 */

import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = process.cwd();
const SCAN_DIRS = ['svc', 'lib'];
const BASELINE_FILE = join(ROOT, 'scripts/ci/scope-api-baseline.json');

const args = process.argv.slice(2);
const CHANGED_ONLY = args.includes('--changed-only');
const JSON_MODE = args.includes('--json');
const UPDATE_BASELINE = args.includes('--update-baseline');

const SKIP_DIRS = new Set(['target', 'node_modules', '.git', 'vendor', 'dist', 'build', 'tests']);

const SCOPE_CALL_RE = /(?:\.|Db::)scope_for_tenant\s*\(/g;
const DB_NEW_RE = /\bDb::new\s*\(/g;
const EXEMPT_RE = /\/\/\s*scope-exempt:\s*(\S.*?)\s*$/m;

const EXEMPT_REASONS = [
  'bg-event',
  'bg-spawn',
  'no-request-txn',
  'short-txn-exempt',
  'lib-standalone',
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

// ── 3. 注释与字符串等长掩码（保留换行，只留可执行代码） ─────────────────────
// 必须掩掉字符串：scope.rs 的错误文案跨行包含 `Db::scope_for_tenant()`，
// 行级匹配会把文案误判成调用点。
function maskNonCode(src) {
  const out = src.split('');
  const blank = (from, to) => {
    for (let k = from; k < to && k < out.length; k++) if (out[k] !== '\n') out[k] = ' ';
  };
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === '/' && src[i + 1] === '/') {
      const end = src.indexOf('\n', i);
      blank(i, end < 0 ? src.length : end);
      i = end < 0 ? src.length : end;
      continue;
    }
    if (c === '/' && src[i + 1] === '*') {
      const end = src.indexOf('*/', i + 2);
      blank(i, end < 0 ? src.length : end + 2);
      i = end < 0 ? src.length : end + 2;
      continue;
    }
    // 原始字符串 r"..." / r#"..."# / br#"..."#
    const rawStart = /^(?:b?r)(#*)"/.exec(src.slice(i, i + 80));
    if (rawStart && (c === 'r' || (c === 'b' && src[i + 1] === 'r'))) {
      const h = rawStart[1].length;
      const bodyStart = i + rawStart[0].length;
      const closer = '"' + '#'.repeat(h);
      const end = src.indexOf(closer, bodyStart);
      blank(bodyStart, end < 0 ? src.length : end);
      i = end < 0 ? src.length : end + closer.length;
      continue;
    }
    if (c === '"') {
      let j = i + 1;
      while (j < src.length && src[j] !== '"') {
        if (src[j] === '\\') j++;
        j++;
      }
      blank(i + 1, j);
      i = j + 1;
      continue;
    }
    if (c === "'") {
      // 字符字面量：'a' / '\n'；生命周期 'a 不掩码（无闭合引号时按普通字符跳过）
      const m = /^'(?:\\.|[^\\'])'/.exec(src.slice(i, i + 8));
      if (m) {
        blank(i + 1, i + m[0].length - 1);
        i += m[0].length;
        continue;
      }
    }
    i++;
  }
  return out.join('');
}

function countMatches(text, re) {
  re.lastIndex = 0;
  let n = 0;
  while (re.exec(text) !== null) n++;
  return n;
}

// ── 4. 扫描 ─────────────────────────────────────────────────────────────────
const allFiles = SCAN_DIRS.flatMap((d) => walk(join(ROOT, d), []));
let staged = CHANGED_ONLY ? stagedFiles() : null;
// 脚本或基线自身被暂存时必须全量重算，否则无法验证基线改动
if (
  staged &&
  (staged.has('scripts/ci/scope-api-baseline.json') || staged.has('scripts/ci/check-scope-api.mjs'))
) {
  staged = null;
}

const current = { scope: {}, dbNew: {} };
const violations = [];
const decreases = [];

for (const abs of allFiles) {
  const rel = relative(ROOT, abs);
  if (staged && !staged.has(rel)) continue;

  const raw = readFileSync(abs, 'utf8');
  const code = maskNonCode(stripTestModules(raw));
  const codeLines = code.split('\n');
  const rawLines = raw.split('\n');

  let total = 0;
  let marked = 0;
  const unmarkedLines = [];
  const markedLines = [];
  const nonstandardMarkers = [];

  codeLines.forEach((line, idx) => {
    const hits = countMatches(line, SCOPE_CALL_RE);
    if (!hits) return;
    total += hits;
    const markerSrc = `${rawLines[idx] || ''}\n${rawLines[idx - 1] || ''}\n${rawLines[idx + 1] || ''}`;
    const m = EXEMPT_RE.exec(markerSrc);
    const reason = m ? m[1].trim() : '';
    if (reason) {
      marked += hits;
      markedLines.push(idx + 1);
      if (!EXEMPT_REASONS.includes(reason)) nonstandardMarkers.push({ line: idx + 1, reason });
    } else {
      unmarkedLines.push(idx + 1);
    }
  });

  const dbNewLines = [];
  codeLines.forEach((line, idx) => {
    if (countMatches(line, DB_NEW_RE) > 0) dbNewLines.push(idx + 1);
  });

  if (total > 0) {
    current.scope[rel] = {
      total,
      marked,
      unmarked: total - marked,
      unmarked_lines: unmarkedLines,
      marked_lines: markedLines,
      nonstandard_markers: nonstandardMarkers,
    };
  }
  if (dbNewLines.length > 0) current.dbNew[rel] = { total: dbNewLines.length, lines: dbNewLines };
}

// ── 5. 与基线比对 ───────────────────────────────────────────────────────────
const baseline = existsSync(BASELINE_FILE)
  ? JSON.parse(readFileSync(BASELINE_FILE, 'utf8'))
  : null;
const baseScope = (baseline && baseline.scope_for_tenant && baseline.scope_for_tenant.files) || {};
const baseDbNew = (baseline && baseline.db_new && baseline.db_new.files) || {};

const scopeFiles = staged
  ? Object.keys(current.scope).sort()
  : [...new Set([...Object.keys(current.scope), ...Object.keys(baseScope)])].sort();
const dbNewFiles = staged
  ? Object.keys(current.dbNew).sort()
  : [...new Set([...Object.keys(current.dbNew), ...Object.keys(baseDbNew)])].sort();

let curTotal = 0;
let curMarked = 0;
let curUnmarked = 0;
let baseUnmarked = 0;
let curDbNew = 0;
let baseDbNewTotal = 0;

for (const file of scopeFiles) {
  const now = current.scope[file] || { total: 0, marked: 0, unmarked: 0, unmarked_lines: [], invalid_marker_lines: [] };
  const was = baseScope[file] || { unmarked: 0 };
  curTotal += now.total;
  curMarked += now.marked;
  curUnmarked += now.unmarked;
  baseUnmarked += was.unmarked;
  if (now.unmarked > was.unmarked) {
    violations.push({
      kind: 'scope_for_tenant',
      file,
      was: was.unmarked,
      now: now.unmarked,
      lines: now.unmarked_lines,
    });
  } else if (now.unmarked < was.unmarked) {
    decreases.push({ file, was: was.unmarked, now: now.unmarked });
  }
}

for (const file of dbNewFiles) {
  const now = current.dbNew[file] || { total: 0, lines: [] };
  const was = baseDbNew[file] || { total: 0 };
  curDbNew += now.total;
  baseDbNewTotal += was.total;
  if (now.total > was.total) {
    violations.push({
      kind: 'Db::new',
      file,
      was: was.total,
      now: now.total,
      lines: now.lines,
    });
  } else if (now.total < was.total) {
    decreases.push({ file, was: was.total, now: now.total, kind: 'Db::new' });
  }
}

// 理由不在建议枚举内：仅提示，不阻断（非空理由即视为豁免）
const badMarkers = [];
for (const [file, info] of Object.entries(current.scope)) {
  if (info.nonstandard_markers && info.nonstandard_markers.length) {
    badMarkers.push({ file, markers: info.nonstandard_markers });
  }
}

const summary = {
  scanned_files: staged ? staged.size : allFiles.length,
  scope_for_tenant: {
    total: curTotal,
    marked: curMarked,
    unmarked: curUnmarked,
    baseline_unmarked: baseUnmarked,
  },
  db_new: { total: curDbNew, baseline: baseDbNewTotal },
  changed_only: CHANGED_ONLY,
};

if (UPDATE_BASELINE) {
  if (violations.length > 0 && baseline) {
    console.error('[scope-api] 拒绝更新基线：存在未标记新增或 Db::new 新增（先解释合法性）：');
    for (const v of violations) {
      console.error(`  ↑ ${v.file} ${v.kind}: ${v.was} → ${v.now}`);
      for (const ln of v.lines.slice(0, 20)) console.error(`     ${v.file}#${ln}`);
      if (v.lines.length > 20) console.error(`     … 其余 ${v.lines.length - 20} 行省略`);
    }
    process.exit(1);
  }
  const scopeOut = {};
  for (const file of Object.keys(current.scope).sort()) {
    const s = current.scope[file];
    scopeOut[file] = { unmarked: s.unmarked };
  }
  const dbNewOut = {};
  for (const file of Object.keys(current.dbNew).sort()) dbNewOut[file] = { total: current.dbNew[file].total };
  const payload = {
    generated: new Date().toISOString().slice(0, 10),
    note:
      '§17.2 作用域 API 收敛基线。scope_for_tenant 计未标记（无 // scope-exempt: <理由>）的' +
      '生产调用点，只减不增；新增调用必须带理由（bg-event/bg-spawn/no-request-txn/' +
      'short-txn-exempt/lib-standalone）。db_new 计 Db::new( 构造点，只减不增。' +
      '口径见 docs/quality/scope-api-convergence-mapping-2026-11-21.md。',
    scope_for_tenant: {
      total: curTotal,
      marked: curMarked,
      unmarked: curUnmarked,
      files: scopeOut,
    },
    db_new: { total: curDbNew, files: dbNewOut },
  };
  writeFileSync(BASELINE_FILE, JSON.stringify(payload, null, 2) + '\n');
  console.log(
    `[scope-api] 基线已写入 ${relative(ROOT, BASELINE_FILE)}：` +
      `scope_for_tenant total=${curTotal} marked=${curMarked} unmarked=${curUnmarked}，` +
      `db_new=${curDbNew}`
  );
  process.exit(0);
}

if (JSON_MODE) {
  console.log(JSON.stringify({ summary, violations, decreases, bad_markers: badMarkers }, null, 2));
} else {
  console.log(
    `[scope-api] 扫描 ${summary.scanned_files} 个文件：scope_for_tenant 调用 ${curTotal} ` +
      `（已豁免 ${curMarked}，未标记 ${curUnmarked}/基线 ${baseUnmarked}），` +
      `Db::new ${curDbNew}/基线 ${baseDbNewTotal}`
  );
  if (decreases.length) {
    console.log(`[scope-api] ↓ 检测到 ${decreases.length} 项下降（可 --update-baseline 核销）：`);
    for (const d of decreases.slice(0, 20))
      console.log(`  ↓ ${d.file} ${d.kind || 'scope_for_tenant'}: ${d.was} → ${d.now}`);
    if (decreases.length > 20) console.log(`  … 其余 ${decreases.length - 20} 项省略`);
  }
  if (badMarkers.length) {
    console.log('[scope-api] ⚠ 豁免理由不在建议枚举内（仍视为已豁免，建议改用枚举值）：');
    for (const b of badMarkers)
      console.log(`  ${b.file}#${b.markers.map((m) => m.line).join(',')}`);
  }
}

if (violations.length === 0) {
  if (!JSON_MODE) console.log('[scope-api] OK 未标记调用与 Db::new 均未增加');
  process.exit(0);
}

console.error('[scope-api] FAILED：作用域 API 门禁未通过。');
for (const v of violations) {
  console.error(`  ↑ ${v.file} ${v.kind}: ${v.was} → ${v.now}`);
  for (const ln of v.lines.slice(0, 20)) console.error(`     ${v.file}#${ln}`);
  if (v.lines.length > 20) console.error(`     … 其余 ${v.lines.length - 20} 行省略`);
}
console.error(
  '修复：\n' +
    '  1) 事件消费者/定时任务/spawn 请保留 Db::scope_for_tenant，并在调用行或上一行写\n' +
    '     `// scope-exempt: bg-event`（或 bg-spawn / no-request-txn / short-txn-exempt / lib-standalone）；\n' +
    '  2) 请求 handler 请改用 Db::scope_with(&mut req_txn) 复用请求事务，不要新建 Db；\n' +
    '  3) 确属既有面下降后核销，运行 `node scripts/ci/check-scope-api.mjs --update-baseline` 并 review diff。'
);
process.exit(1);
