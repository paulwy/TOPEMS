#!/usr/bin/env node
/**
 * scripts/ci/check-ledger-staleness.mjs
 *
 * 账本核销检查（P-1）：
 * 1. 每个门禁账本都必须在 scripts/ci/ledger-meta.json 里有 owner / reviewed_at /
 *    evidence_cmd / expires_days——没有元数据的账本视为"无人认领"，直接失败；
 * 2. reviewed_at 超过 expires_days 视为过期，失败；
 * 3. 账本里"已经不该存在"的条目（陈旧键）必须核销，失败并列出清单。
 *
 * 用法：
 *   node scripts/ci/check-ledger-staleness.mjs          # 人读报告，退出码 0/1
 *   node scripts/ci/check-ledger-staleness.mjs --json   # 机器读，供 facts.mjs 复用
 *   node scripts/ci/check-ledger-staleness.mjs --strict-unregistered
 *        # 额外把"未登记的真实缺口"计为失败（默认只报告，避免一上来全红）
 *
 * 设计取舍：账本格式不动、读取点不动，元数据放 sidecar。
 * 原因是 request-txn / tenant-context / allowlist / schema-prefix 四种账本
 * 结构各不相同（扁平计数、r1/r2、allow 数组、entries 数组），
 * 直接往账本里加字段会波及 4 个读取点，违反"一次只动一个变更面"。
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = process.cwd();
// LEDGER_META 仅供自测/演练使用（指向一份临时元数据），生产路径固定。
const META_PATH = process.env.LEDGER_META
  ? resolve(ROOT, process.env.LEDGER_META)
  : join(ROOT, 'scripts/ci/ledger-meta.json');
const DAY = 24 * 60 * 60 * 1000;
const REQUIRED = ['owner', 'reviewed_at', 'evidence_cmd', 'expires_days'];

function readJson(p) {
  return JSON.parse(readFileSync(p, 'utf8'));
}

function runJson(cmd, args) {
  try {
    return JSON.parse(
      execFileSync(cmd, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }),
    );
  } catch (err) {
    // 门禁脚本在有新增时会以非 0 退出，但 stdout 仍是合法 JSON，需要继续解析
    if (err.stdout) return JSON.parse(String(err.stdout));
    throw err;
  }
}

/** 返回 {baseline, wouldRemove} —— baseline 里已不该存在的键 */
function staleForSchemaPrefix(ledger) {
  const gate = runJson(process.execPath, ['scripts/ci/check-schema-prefix.mjs', '--json']);
  const used = new Set((gate.violations || []).map((v) => `${v.file}::${v.table}`));
  const keys = (ledger.entries || []).map((e) => `${e.file}::${e.table}`);
  return keys.filter((k) => !used.has(k));
}

/** 返回 {increases, decreases} —— baseline 与当前实测的逐键差 */
function driftForRequestTxn(ledger) {
  const gate = runJson(process.execPath, ['scripts/ci/check-request-txn.mjs', '--json']);
  const actual = {};
  for (const [svc, v] of Object.entries(gate.summary?.services || {})) {
    actual[`${svc}::bare_txn`] = v.bare_txn ?? 0;
    actual[`${svc}::own_txn`] = v.own_txn ?? 0;
  }
  const increases = [];
  const decreases = [];
  for (const [key, base] of Object.entries(ledger.counts || {})) {
    const cur = actual[key] ?? 0;
    if (cur > base) increases.push(`${key}: 基线 ${base} → 当前 ${cur}`);
    if (cur < base) decreases.push(`${key}: 基线 ${base} → 当前 ${cur}（可核销 ${base - cur} 处）`);
  }
  return { increases, decreases };
}

/** tenant-context：基线里的文件若已不存在，即为陈旧键 */
function staleForTenantContext(ledger) {
  const files = Object.keys(ledger.r2 || {});
  return files.filter((f) => !existsSync(join(ROOT, f)));
}

/**
 * 非 2xx：allowlist 条目若"文件已不存在"或"函数已不存在"，即为陈旧条目。
 * 注意不能拿"扫描输出里没有它"当陈旧——脚本会按 allowlist 主动跳过命中（第 138 行），
 * 被跳过的条目本来就不会出现在输出里。这里只做可证伪的存在性判断。
 */
function staleForNon2xx(ledger) {
  let stdout = '';
  try {
    stdout = execFileSync('python3', ['scripts/ci/check-txn-write-non2xx.py'], {
      cwd: ROOT,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch (err) {
    stdout = err.stdout ? String(err.stdout) : '';
  }
  const hits = new Set();
  for (const line of stdout.split('\n')) {
    const m = line.match(/^\s*-\s+(svc\/\S+\.rs):\d+\s+fn\s+(\w+)/);
    if (m) hits.add(`${m[1]}::${m[2]}`);
  }

  const allowEntries = ledger.allow || [];
  const stale = [];
  for (const a of allowEntries) {
    const abs = join(ROOT, a.file);
    if (!existsSync(abs)) {
      stale.push(`${a.file}::${a.function}（文件不存在）`);
      continue;
    }
    const src = readFileSync(abs, 'utf8');
    if (!new RegExp(`fn\\s+${a.function}\\b`).test(src)) {
      stale.push(`${a.file}::${a.function}（函数不存在）`);
    }
  }
  const allow = allowEntries.map((a) => `${a.file}::${a.function}`);
  const unregistered = [...hits].filter((k) => !allow.includes(k));
  return { stale, unregistered };
}

const CHECKS = {
  'schema-prefix': (ledger) => ({ stale: staleForSchemaPrefix(ledger) }),
  'request-txn': (ledger) => {
    const { increases, decreases } = driftForRequestTxn(ledger);
    return { stale: [], increases, decreases };
  },
  'tenant-context': (ledger) => ({ stale: staleForTenantContext(ledger) }),
  'txn-write-non2xx': (ledger) => staleForNon2xx(ledger),
};

function main() {
  const args = process.argv.slice(2);
  const jsonMode = args.includes('--json');
  const strictUnregistered = args.includes('--strict-unregistered');

  if (!existsSync(META_PATH)) {
    console.error(`[ledger] 缺少账本元数据：${META_PATH}`);
    process.exit(1);
  }
  const meta = readJson(META_PATH);
  const now = Date.now();
  const report = { generated_at: new Date().toISOString(), ledgers: [], problems: [] };

  for (const [relPath, m] of Object.entries(meta.ledgers || {})) {
    const abs = resolve(ROOT, relPath);
    const entry = { ledger: relPath, owner: m.owner ?? null, reviewed_at: m.reviewed_at ?? null };
    const problems = [];

    const missing = REQUIRED.filter((k) => m[k] === undefined || m[k] === null || m[k] === '');
    if (missing.length) problems.push(`缺少元数据字段：${missing.join(', ')}`);

    if (m.reviewed_at) {
      const age = Math.floor((now - new Date(`${m.reviewed_at}T00:00:00Z`).getTime()) / DAY);
      entry.age_days = age;
      entry.expires_days = m.expires_days ?? null;
      if (m.expires_days != null && age > m.expires_days) {
        problems.push(`已过期：reviewed_at=${m.reviewed_at}，已 ${age} 天 > ${m.expires_days} 天`);
      }
    }

    if (!existsSync(abs)) {
      problems.push('账本文件不存在');
    } else {
      const ledger = readJson(abs);
      const fn = CHECKS[m.stale_source];
      if (!fn) {
        problems.push(`未知 stale_source：${m.stale_source}`);
      } else {
        const r = fn(ledger) || {};
        entry.stale_keys = r.stale?.length ?? 0;
        entry.stale_samples = (r.stale || []).slice(0, 5);
        if (entry.stale_keys > 0) {
          problems.push(`陈旧条目 ${entry.stale_keys} 条未核销（示例：${entry.stale_samples.join(' / ')}）`);
        }
        if (r.increases?.length) {
          entry.increases = r.increases;
          problems.push(`基线被突破 ${r.increases.length} 处：${r.increases.slice(0, 3).join('；')}`);
        }
        if (r.decreases?.length) {
          entry.decreases = r.decreases;
          // 下降不是错误，但必须核销，否则基线永远虚高
          problems.push(`有 ${r.decreases.length} 处可核销但未更新基线：${r.decreases.slice(0, 3).join('；')}`);
        }
        if (r.unregistered) {
          entry.unregistered = r.unregistered.length;
          if (strictUnregistered && r.unregistered.length) {
            problems.push(`未登记的真实缺口 ${r.unregistered.length} 处`);
          }
        }
      }
    }

    entry.ok = problems.length === 0;
    entry.problems = problems;
    report.ledgers.push(entry);
    for (const p of problems) report.problems.push(`${relPath}: ${p}`);
  }

  report.ok = report.problems.length === 0;

  if (jsonMode) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    for (const e of report.ledgers) {
      const flag = e.ok ? 'OK  ' : 'FAIL';
      const extra = [
        e.age_days != null ? `reviewed ${e.age_days}d/${e.expires_days}d` : null,
        e.stale_keys != null ? `stale ${e.stale_keys}` : null,
        e.unregistered != null ? `unregistered ${e.unregistered}` : null,
      ].filter(Boolean).join(' | ');
      console.log(`[ledger] ${flag} ${e.ledger}${extra ? ` (${extra})` : ''}`);
      for (const p of e.problems) console.log(`         - ${p}`);
    }
    console.log(`[ledger] ${report.ok ? '通过' : `失败：${report.problems.length} 项`}`);
  }

  process.exit(report.ok ? 0 : 1);
}

main();
