#!/usr/bin/env node
/**
 * scripts/ci/check-pool-acquire.mjs
 *
 * 连接治理 A/B 的配套门禁：`svc/` 下的业务/模块代码不得直接 `PgPool::acquire`。
 *
 * 为什么：全局预算按「建池期配额」记账，池内再绕过作用域直接借连接，会
 *   1) 脱离 `ScopedTxn` 的 `search_path` / RLS 事务上下文；
 *   2) 容易写成 `let _conn = pool.acquire().await?;`（绑定变量，连接持有到作用域结束，
 *      跨多个 await 白占预算——历史 28 处启动探测即此形态）；
 *   3) 未来 B 全量切换时漏改，形成"双路径"。
 *
 * 规则：
 *   - `svc/**` 内出现 `.acquire(` / `.acquire_timeout(` / `Pool::acquire` 即违规；
 *   - `lib/shared-db/**` 是连接治理基础设施层（建池、scope、RLS 中间件），不在扫描范围；
 *   - 测试代码（`tests/`、`*_test.rs`、`*_tests.rs`、`#[cfg(test)] mod`）不扫描。
 *
 * 白名单 `scripts/ci/pool-acquire-baseline.json` 记录确实无法纳入作用域的调用，
 * 每条必须带 reason；新增未登记调用 → 退出码 1。
 *
 * 用法：
 *   node scripts/ci/check-pool-acquire.mjs                 # 全量（CI）
 *   node scripts/ci/check-pool-acquire.mjs --changed-only  # 仅暂存（pre-commit）
 *   node scripts/ci/check-pool-acquire.mjs --json
 *   node scripts/ci/check-pool-acquire.mjs --update-baseline
 *
 * 退出码：0 通过；1 存在未登记调用。
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = process.cwd();
const SVCS_DIR = join(ROOT, 'svc');
const BASELINE_FILE = join(ROOT, 'scripts/ci/pool-acquire-baseline.json');

const args = process.argv.slice(2);
const CHANGED_ONLY = args.includes('--changed-only');
const JSON_MODE = args.includes('--json');
const UPDATE_BASELINE = args.includes('--update-baseline');

const ACQUIRE_RE = /\.acquire(?:_timeout)?\s*\(\s*\)|Pool::acquire/;

const baseline = existsSync(BASELINE_FILE)
  ? JSON.parse(readFileSync(BASELINE_FILE, 'utf8'))
  : { generated: '', note: '', entries: [] };

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

// 去掉 #[cfg(test)] mod 整块（保持行号）
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
    out += src.slice(idx, j).replace(/[^\n]/g, ' ');
    i = j;
  }
  return out;
}

const hits = [];
for (const file of files) {
  const raw = readFileSync(join(ROOT, file), 'utf8');
  const src = stripTestModules(raw);
  src.split('\n').forEach((ln, i) => {
    const code = ln.split('//')[0];
    if (ACQUIRE_RE.test(code)) hits.push({ file, line: i + 1, text: ln.trim() });
  });
}

const knownSet = new Set((baseline.entries || []).map((e) => e.file));
const fresh = hits.filter((h) => !knownSet.has(h.file));
const known = hits.filter((h) => knownSet.has(h.file));

const summary = {
  scanned_files: files.length,
  acquire_sites: hits.length,
  whitelisted: known.length,
  new_sites: fresh.length,
  changed_only: CHANGED_ONLY,
};

if (JSON_MODE) {
  console.log(JSON.stringify({ summary, whitelisted: known, new_sites: fresh }, null, 2));
} else {
  console.log(
    `[pool-acquire] 扫描 ${summary.scanned_files} 个文件，acquire 调用 ${summary.acquire_sites} ` +
      `（白名单 ${summary.whitelisted}，未登记 ${summary.new_sites}）`
  );
  if (fresh.length) {
    console.log('[pool-acquire] 未登记调用（改用 Db::scope()/scope_read()/scope_with，或补 reason 入白名单）：');
    for (const h of fresh) console.log(`  ${h.file}#${h.line}  ${h.text}`);
  }
}

if (UPDATE_BASELINE) {
  const filesInHits = [...new Set(hits.map((h) => h.file))];
  const prior = new Map((baseline.entries || []).map((e) => [e.file, e.reason || '']));
  const entries = filesInHits.map((file) => ({ file, reason: prior.get(file) || 'TODO: 说明为何无法纳入作用域' }));
  writeFileSync(
    BASELINE_FILE,
    JSON.stringify(
      {
        generated: new Date().toISOString().slice(0, 10),
        note: '确实无法纳入 ScopedTxn 的 acquire 调用白名单；每条必须有 reason，新增未登记调用会被 CI 阻断。',
        entries,
      },
      null,
      2
    ) + '\n'
  );
  console.log(`[pool-acquire] 基线已写入 ${relative(ROOT, BASELINE_FILE)}（${entries.length} 条）`);
} else if (fresh.length) {
  process.exit(1);
}
