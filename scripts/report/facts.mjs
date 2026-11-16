#!/usr/bin/env node
/**
 * scripts/report/facts.mjs
 *
 * 单一事实源（T-1）：把散落在门禁脚本、基线账本、源码里的关键计数集中输出为一份
 * 机器可读快照，供文档引用与漂移检测。设计原则是**不重复实现统计逻辑**——
 * 一律调用既有门禁脚本（check-request-txn / check-schema-prefix /
 * check-txn-write-non2xx），只做调用与归一化，避免出现第二个口径。
 *
 * 用法：
 *   node scripts/report/facts.mjs                       # 打印 JSON 到 stdout
 *   node scripts/report/facts.mjs --out <file.json>     # 写入快照
 *   node scripts/report/facts.mjs --check <file.json>   # 与快照比对，漂移则 exit 1
 *
 * 退出码：0 一致/成功；1 存在漂移；2 取数失败。
 *
 * 不覆盖的项：需要连库的指标（RLS 策略分类、权限三源）不在本脚本内取数，
 * 只在 `external` 段记录"最近一次只读取数的来源与数值"，避免脚本变相连生产库。
 */

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const ROOT = process.cwd();
const OUT_DEFAULT = join(ROOT, 'docs/quality/facts-latest.json');

/** 展示用路径：仓库内用相对路径，仓库外用绝对路径 */
function display(p) {
  const rel = relative(ROOT, p);
  return rel.startsWith('..') ? p : rel;
}

function run(cmd, args, opts = {}) {
  try {
    const stdout = execFileSync(cmd, args, {
      cwd: ROOT,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
      ...opts,
    });
    return { ok: true, stdout, stderr: '' };
  } catch (err) {
    return { ok: false, stdout: err.stdout ? String(err.stdout) : '', stderr: err.stderr ? String(err.stderr) : String(err.message) };
  }
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

/** 事务写法债：直接复用 check-request-txn 的 --json 输出 */
function txnFacts() {
  const r = run(process.execPath, ['scripts/ci/check-request-txn.mjs', '--json']);
  if (!r.stdout) throw new Error(`check-request-txn 无输出: ${r.stderr}`);
  const d = JSON.parse(r.stdout);
  const services = d.summary?.services ?? {};
  return {
    total: d.summary?.total ?? {},
    services,
    services_with_bare_txn: Object.values(services).filter((v) => (v.bare_txn ?? 0) > 0).length,
    services_with_own_txn: Object.values(services).filter((v) => (v.own_txn ?? 0) > 0).length,
    increases: d.summary?.increases ?? null,
    decreases: d.summary?.decreases ?? null,
    gate_exit_ok: r.ok,
  };
}

/** schema 前缀：违规数 + 基线键数 + 陈旧键（基线里未被任何违规命中的键） */
function schemaPrefixFacts() {
  const r = run(process.execPath, ['scripts/ci/check-schema-prefix.mjs', '--json']);
  if (!r.stdout) throw new Error(`check-schema-prefix 无输出: ${r.stderr}`);
  const d = JSON.parse(r.stdout);
  const baseline = readJson(join(ROOT, 'scripts/ci/schema-prefix-baseline.json'));
  const baselineKeys = new Set((baseline.entries || []).map((e) => `${e.file}::${e.table}`));
  const usedKeys = new Set((d.violations || []).map((v) => `${v.file}::${v.table}`));
  const stale = [...baselineKeys].filter((k) => !usedKeys.has(k));
  return {
    scanned_files: d.summary?.scanned_files ?? null,
    sql_literals: d.summary?.sql_literals ?? null,
    violations: (d.violations || []).length,
    by_level: {
      AMBIGUOUS: d.summary?.ambiguous ?? null,
      CROSS_SCHEMA: d.summary?.cross_schema ?? null,
      SEARCH_PATH_DEPENDENT: d.summary?.search_path_dependent ?? null,
      UNKNOWN: d.summary?.unknown ?? null,
    },
    baseline_keys: baselineKeys.size,
    new_violations: (d.new_violations || []).length,
    stale_keys: stale.length,
    stale_samples: stale.slice(0, 10),
    gate_exit_ok: r.ok,
  };
}

/** 请求事务内写后返回非 2xx：脚本无 --json，按输出行统计 */
function txnWriteNon2xxFacts() {
  const r = run('python3', ['scripts/ci/check-txn-write-non2xx.py']);
  const lines = r.stdout.split('\n');
  const hits = lines.filter((l) => /^\s*-\s+svc\/\S+\.rs:\d+ fn /.test(l));
  const byService = {};
  for (const l of hits) {
    const m = l.match(/svc\/([a-z0-9-]+)\//);
    if (m) byService[m[1]] = (byService[m[1]] || 0) + 1;
  }
  const allow = readJson(join(ROOT, 'scripts/ci/txn-write-non2xx-allowlist.json'));
  return {
    // 检查器只输出「未登记」违规，故 hits 本身即 unregistered
    hits: hits.length,
    by_service: byService,
    allowlist_entries: (allow.allow || []).length,
    unregistered: hits.length,
  };
}

/** 租户上下文基线：modules 内直接用 state.pool 的存量 */
function tenantContextFacts() {
  const b = readJson(join(ROOT, 'scripts/ci/tenant-context-baseline.json'));
  const r2 = b.r2 || {};
  return {
    r1_files: Object.keys(b.r1 || {}).length,
    r2_files: Object.keys(r2).length,
    r2_occurrences: Object.values(r2).reduce((a, n) => a + n, 0),
    generated_at: b.generated_at ?? null,
  };
}

/** 源码级计数：SEARCH_PATH 引导散点数、*_real_module.rs 内残余 set_var */
function sourceFacts() {
  const svcDir = join(ROOT, 'svc');
  let searchPathSetVarFiles = 0;
  let searchPathSetVarSites = 0;

  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      if (name === 'target' || name === 'node_modules' || name === 'tests') continue;
      const p = join(dir, name);
      const st = statSync(p);
      if (st.isDirectory()) {
        walk(p);
      } else if (name.endsWith('.rs')) {
        const src = readFileSync(p, 'utf8');
        const hits = src.match(/set_var\(\s*"SEARCH_PATH"/g);
        if (hits) {
          searchPathSetVarFiles += 1;
          searchPathSetVarSites += hits.length;
        }
      }
    }
  };
  walk(svcDir);

  const modulesDir = join(ROOT, 'svc/server/src/modules');
  const realModules = readdirSync(modulesDir).filter((n) => n.endsWith('_real_module.rs'));
  const setVarInRealModules = realModules.filter((n) =>
    /set_var\(/.test(readFileSync(join(modulesDir, n), 'utf8')),
  ).length;

  return {
    search_path_set_var_files: searchPathSetVarFiles,
    search_path_set_var_sites: searchPathSetVarSites,
    real_module_files: realModules.length,
    real_module_with_set_var: setVarInRealModules,
  };
}

/** 文档侧：TODO 规模（粗口径，仅用于观察趋势，不用于判定完成度） */
function docFacts() {
  const todoPath = join(ROOT, 'TODO.md');
  if (!existsSync(todoPath)) return { todo_lines: null, todo_h2_sections: null };
  const lines = readFileSync(todoPath, 'utf8').split('\n');
  return {
    todo_lines: lines.length,
    todo_h2_sections: lines.filter((l) => /^## /.test(l)).length,
  };
}

/**
 * 账本健康（P-1）：直接复用 check-ledger-staleness 的 --json，
 * 保证"陈旧键 / 超期 / 基线虚高"只有一处判定逻辑。
 */
function ledgerFacts() {
  const r = run(process.execPath, ['scripts/ci/check-ledger-staleness.mjs', '--json']);
  if (!r.stdout) throw new Error(`check-ledger-staleness 无输出: ${r.stderr}`);
  const d = JSON.parse(r.stdout);
  return {
    ok: d.ok,
    problems: d.problems?.length ?? null,
    ledgers: (d.ledgers || []).map((e) => ({
      ledger: e.ledger,
      owner: e.owner,
      // 用 reviewed_at 而不是 age_days：age_days 每天都变，会让快照比对天天报漂移
      reviewed_at: e.reviewed_at ?? null,
      expires_days: e.expires_days ?? null,
      stale_keys: e.stale_keys ?? null,
      unregistered: e.unregistered ?? null,
      ok: e.ok,
    })),
  };
}

/**
 * 需要连库的指标：本脚本不取数，只记录"最近一次只读实测"的引用，
 * 避免把 facts.mjs 变成连生产库的隐式入口。
 */
const external = {
  note: '以下数值需连库只读取数，本脚本不采集；更新时请同步修改本段与文档出处。',
  rls_policies: {
    source: 'docs/database/known-gate-defects.md K10 / docs/database/scope-with-plan-20261116.md §7',
    total_select_all: 1030,
    with_tenant_predicate: 962,
    correct_fail_closed: 579,
    fail_open: 370,
    double_bypass: 12,
    non_tenant_predicate: 68,
  },
  permissions: {
    source: 'TODO.md §2（数字已过期，待按线上只读实测更新）',
    db_codes: 1021,
    backend_security: 619,
    intersection: 138,
  },
  tenants_in_prod: 1,
};

function buildFacts() {
  return {
    generated_at: new Date().toISOString(),
    root: ROOT,
    txn: txnFacts(),
    schema_prefix: schemaPrefixFacts(),
    txn_write_non2xx: txnWriteNon2xxFacts(),
    tenant_context: tenantContextFacts(),
    ledger: ledgerFacts(),
    source: sourceFacts(),
    docs: docFacts(),
    external,
  };
}

/** 指纹只覆盖"内容"，不含时间戳与路径，便于跨机器比对 */
function fingerprint(facts) {
  const { generated_at, root, ...rest } = facts;
  return createHash('sha256').update(JSON.stringify(rest)).digest('hex');
}

function flatten(obj, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      flatten(v, key, out);
    } else {
      out[key] = JSON.stringify(v);
    }
  }
  return out;
}

function check(snapshotPath) {
  if (!existsSync(snapshotPath)) {
    console.error(`[facts] 快照不存在：${snapshotPath}`);
    process.exit(2);
  }
  const prev = readJson(snapshotPath);
  const cur = buildFacts();
  // fingerprint 是快照自身的派生值，不参与比对（否则永远漂移）
  const stripMeta = (o) => {
    const { generated_at, root, fingerprint, ...rest } = o;
    return rest;
  };
  const a = flatten(stripMeta(prev));
  const b = flatten(stripMeta(cur));
  const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();
  const drift = keys.filter((k) => a[k] !== b[k]);

  if (drift.length === 0) {
    console.log(`[facts] OK 与 ${display(snapshotPath)} 一致（${keys.length} 项）`);
    return 0;
  }
  console.log(`[facts] DRIFT ${drift.length} 项与 ${display(snapshotPath)} 不一致：`);
  for (const k of drift) {
    console.log(`  - ${k}: 快照=${a[k] ?? '(缺失)'} 当前=${b[k] ?? '(缺失)'}`);
  }
  return 1;
}

function main() {
  const args = process.argv.slice(2);
  const outIdx = args.indexOf('--out');
  const checkIdx = args.indexOf('--check');

  if (checkIdx !== -1) {
    const p = args[checkIdx + 1];
    if (!p) {
      console.error('[facts] --check 需要一个快照路径');
      process.exit(2);
    }
    process.exit(check(resolve(ROOT, p)));
  }

  let facts;
  try {
    facts = buildFacts();
  } catch (e) {
    console.error(`[facts] 取数失败：${e.message}`);
    process.exit(2);
  }
  facts.fingerprint = fingerprint(facts);

  const outPath = outIdx !== -1 ? resolve(ROOT, args[outIdx + 1] || OUT_DEFAULT) : null;
  const json = JSON.stringify(facts, null, 2);
  if (outPath) {
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, `${json}\n`);
    console.log(`[facts] 已写入 ${display(outPath)}（fingerprint ${facts.fingerprint.slice(0, 12)}）`);
  } else {
    console.log(json);
  }
}

main();
