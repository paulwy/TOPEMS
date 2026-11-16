#!/usr/bin/env node
/**
 * scripts/ci/check-request-txn.mjs
 *
 * §17.2 配套门禁：请求内的数据库访问必须复用请求事务（`Db::scope_with`），
 * 不得（a）拿裸 `&mut **txn` 直接查、也不得（b）在请求路径里再 `pool.begin()`。
 *
 * 为什么：
 *   - (a) 裸 `&mut **txn` 走的是池的会话级 search_path，模块各自的 schema 域失效，
 *       同名表会解析到影子副本；且与 `scope_with` 混用时"静默改解析目标"（SET LOCAL 是事务级）。
 *   - (b) `.scope()` / `.scope_read()` 会自己 `BEGIN`，一个写请求吃 2 条连接，
 *       直接抵消 §17.1 的连接预算收益。
 *
 * 规则（按服务计数，只减不增）：
 *   - 统计 `svc/<svc>/src/**` 中 `&mut **txn` 的出现次数（kind=bare_txn）；
 *   - 统计 `.scope()` / `.scope_read()` 的调用次数（kind=own_txn）——
 *     `scope_system` / `scope_read_system` / `scope_for_tenant` / `scope_read_for_tenant`
 *     / `scope_with` 不计入（后台任务与显式租户遍历是合法路径）；
 *   - 测试代码（`tests/`、`*_test.rs`、`*_tests.rs`）不扫描。
 *
 * 基线 `scripts/ci/request-txn-baseline.json` 记录各服务现有计数；任一项**增加**即退出码 1。
 *
 * 用法：
 *   node scripts/ci/check-request-txn.mjs                 # 全量（CI）
 *   node scripts/ci/check-request-txn.mjs --changed-only  # 仅暂存 svc/*.rs 时执行（pre-commit）
 *   node scripts/ci/check-request-txn.mjs --json
 *   node scripts/ci/check-request-txn.mjs --update-baseline
 *   node scripts/ci/check-request-txn.mjs --report-only    # 只报告不阻断
 *
 * 退出码：0 通过；1 存在计数上升。
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = process.cwd();
const SVCS_DIR = join(ROOT, 'svc');
const BASELINE_FILE = join(ROOT, 'scripts/ci/request-txn-baseline.json');

const args = process.argv.slice(2);
const CHANGED_ONLY = args.includes('--changed-only');
const JSON_MODE = args.includes('--json');
const REPORT_ONLY = args.includes('--report-only');
const UPDATE_BASELINE = args.includes('--update-baseline');

// 裸请求事务：handler 直接把 `&mut Transaction` 解引用成连接用
const BARE_TXN_RE = /&mut\s+\*\*\s*txn\b/g;
// 自开事务：`.scope()` / `.scope_read()`（后面紧跟 `_system` / `_for_tenant` 的不算）
const OWN_TXN_RE = /\.(scope|scope_read)\(\s*\)/g;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (name === 'target' || name === 'node_modules' || name === 'tests') continue;
      walk(p, out);
    } else if (name.endsWith('.rs') && !/_test(?:s)?\.rs$/.test(name)) {
      out.push(p);
    }
  }
  return out;
}

function countMatches(text, re) {
  re.lastIndex = 0;
  let n = 0;
  while (re.exec(text) !== null) n += 1;
  return n;
}

/** 逐服务、逐 kind 统计；返回 { "svc::kind": count } 与命中明细。 */
function scan(files) {
  const counts = {};
  const sites = {};
  for (const file of files) {
    const rel = relative(ROOT, file);
    const svc = rel.split('/')[1];
    if (!svc) continue;
    const text = readFileSync(file, 'utf8');
    const bare = countMatches(text, BARE_TXN_RE);
    const own = countMatches(text, OWN_TXN_RE);
    for (const [kind, n] of [
      ['bare_txn', bare],
      ['own_txn', own],
    ]) {
      if (!n) continue;
      const key = `${svc}::${kind}`;
      counts[key] = (counts[key] || 0) + n;
      (sites[key] ||= []).push(`${rel}(${n})`);
    }
  }
  return { counts, sites };
}

const baseline = existsSync(BASELINE_FILE)
  ? JSON.parse(readFileSync(BASELINE_FILE, 'utf8'))
  : { generated_at: null, counts: {} };

// pre-commit：仅在暂存了 svc/*.rs 时才做全量比对（计数是服务级的，必须全量扫才准）
if (CHANGED_ONLY) {
  const staged = execSync('git diff --cached --name-only --diff-filter=ACM', { encoding: 'utf8' })
    .split('\n')
    .filter((f) => /^svc\/.*\.rs$/.test(f));
  if (!staged.length) process.exit(0);
}

const allFiles = existsSync(SVCS_DIR) ? walk(SVCS_DIR) : [];
const { counts, sites } = scan(allFiles);

const keys = [...new Set([...Object.keys(counts), ...Object.keys(baseline.counts || {})])].sort();
const increases = [];
const decreases = [];
const summary = { services: {}, total: { bare_txn: 0, own_txn: 0 }, increases: 0, decreases: 0 };

for (const key of keys) {
  const now = counts[key] || 0;
  const was = baseline.counts?.[key] || 0;
  const [svc, kind] = key.split('::');
  (summary.services[svc] ||= { bare_txn: 0, own_txn: 0 })[kind] = now;
  summary.total[kind] += now;
  if (now > was) {
    increases.push({ key, svc, kind, was, now, sites: sites[key] || [] });
  } else if (now < was) {
    decreases.push({ key, svc, kind, was, now });
  }
}
summary.increases = increases.length;
summary.decreases = decreases.length;

if (UPDATE_BASELINE) {
  const next = {
    generated_at: new Date().toISOString().slice(0, 10),
    note: '§17.2 只减不增基线：bare_txn = 裸 &mut **txn 直接查；own_txn = 请求路径自开事务（.scope()/.scope_read()）。--update-baseline 仅允许在计数下降后执行。',
    counts: Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b))),
  };
  writeFileSync(BASELINE_FILE, JSON.stringify(next, null, 2) + '\n');
  console.log(`[request-txn] 基线已写入 ${relative(ROOT, BASELINE_FILE)}（${keys.length} 项）`);
  if (JSON_MODE) console.log(JSON.stringify({ summary }, null, 2));
  process.exit(0);
}

if (JSON_MODE) {
  console.log(JSON.stringify({ summary, increases, decreases, sites: sites }, null, 2));
} else {
  console.log(
    `[request-txn] bare_txn=${summary.total.bare_txn} own_txn=${summary.total.own_txn}` +
      `（基线 ${Object.values(baseline.counts || {}).reduce((a, b) => a + b, 0)}）`
  );
  const parts = Object.entries(summary.services)
    .filter(([, v]) => v.bare_txn || v.own_txn)
    .sort(([, a], [, b]) => b.bare_txn + b.own_txn - (a.bare_txn + a.own_txn))
    .map(([svc, v]) => `${svc}:bare=${v.bare_txn}/own=${v.own_txn}`);
  if (parts.length) console.log(`[request-txn] 按服务：${parts.join(' ')}`);
  for (const d of decreases) {
    console.log(`[request-txn] ↓ ${d.key}: ${d.was} → ${d.now}（可 --update-baseline 核销）`);
  }
  for (const i of increases) {
    console.error(`[request-txn] ✗ ${i.key}: ${i.was} → ${i.now}`);
    for (const s of i.sites.slice(0, 8)) console.error(`    ${s}`);
  }
}

if (increases.length && !REPORT_ONLY) {
  console.error(
    `[request-txn] FAILED：${increases.length} 项计数上升。请求内请改用 Db::scope_with(&mut *txn) 复用请求事务；` +
      `后台任务/脚本请用 Db::scope_system()/scope_read_system()（不计入本门禁）。`
  );
  process.exit(1);
}
