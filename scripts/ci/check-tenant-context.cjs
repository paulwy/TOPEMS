#!/usr/bin/env node
/**
 * 租户上下文门禁（W7 第二步配套，2026-11-11）
 *
 * 背景：`get_tenant_id` 的随机 UUID 兜底把「缺租户」变成静默的跨租户读 / 孤儿写。
 * 第二步改造前，先把两类**新增**回归挡住，存量以基线冻结、分批清理：
 *
 *   R1 event_handlers 系统通道
 *      `svc/<svc>/src/**\/event_handlers/**.rs` 里出现 `scope_system` /
 *      `scope_read_system`。事件消费只允许用 payload 里的租户走请求作用域；
 *      系统通道只允许后台任务，且必须显式登记。
 *
 *   R2 modules 裸池回归
 *      `svc/<svc>/src/modules/**.rs` 里直接使用 `state.pool`（绕过 `Db::scope*`，
 *      查询拿不到 `app.tenant_id`）。存量按文件计数冻结，新增即失败。
 *
 * 豁免：同一行或上一行有 `// tenant-system: <原因>`。
 * 约定说明见 `lib/shared-db/src/schema.rs` 模块头。
 *
 * 用法：
 *   node scripts/ci/check-tenant-context.cjs                  # 全量 + 基线比对
 *   node scripts/ci/check-tenant-context.cjs --changed-only   # 仅暂存文件（pre-commit）
 *   node scripts/ci/check-tenant-context.cjs --update-baseline
 *   node scripts/ci/check-tenant-context.cjs --json
 *
 * 退出码：0 = 无新增违规（存量基线内）；1 = 有新增违规 / 基线缺失；2 = 运行错误。
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const BASELINE_PATH = path.join(__dirname, 'tenant-context-baseline.json');
const ANNOTATION = /\/\/\s*tenant-system\s*:/;

// W7-B4-EHS 定案（D5）：只豁免 `Db::new(pool.clone()).scope_with(...)` 这一种形态
// （复用 tenant_middleware 已开启的请求级 RLS 事务），其余 `state.pool` 一律计入 R2。
// 5 处位置显式登记，代码漂移（行号失效）即红；命中数不得超过白名单长度。
const SCOPED_CONSTRUCTION_WHITELIST = [
  'svc/ehs/src/modules/environment.rs:184',
  'svc/ehs/src/modules/accident.rs:658',
  'svc/ehs/src/modules/accident.rs:1210',
  'svc/ehs/src/modules/accident.rs:1337',
  'svc/ehs/src/modules/training.rs:1837',
];

function isScopedConstruction(lines, idx) {
  const line = lines[idx];
  if (!/Db\s*::\s*new\s*\(/.test(line) || !/state\s*\.\s*pool\s*\.\s*clone\s*\(\s*\)/.test(line)) {
    return false;
  }
  const end = Math.min(lines.length, idx + 16);
  for (let k = idx; k < end; k++) {
    if (/\.\s*scope_with\s*\(/.test(lines[k])) return true;
  }
  return false;
}

const args = new Set(process.argv.slice(2));
const changedOnly = args.has('--changed-only');
const updateBaseline = args.has('--update-baseline');
const asJson = args.has('--json');

function gitList(filesArgs) {
  return execSync(`git ls-files ${filesArgs}`, { cwd: ROOT, encoding: 'utf8' })
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}
function stagedFiles() {
  return execSync('git diff --cached --name-only --diff-filter=ACM', {
    cwd: ROOT,
    encoding: 'utf8',
  })
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

function loadBaseline() {
  if (!fs.existsSync(BASELINE_PATH)) return null;
  try {
    return JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
  } catch (e) {
    console.error(`[tenant-context] 基线解析失败: ${e.message}`);
    process.exit(2);
  }
}

/** 去掉行尾注释，仅用于规则匹配（避免把说明文字当成违规）。 */
function stripLineComment(line) {
  return line.replace(/(^|\s)\/\/.*$/, '$1');
}

function hasAnnotation(lines, idx) {
  if (ANNOTATION.test(lines[idx])) return true;
  return idx > 0 && ANNOTATION.test(lines[idx - 1]);
}

function scanFile(rel) {
  const abs = path.join(ROOT, rel);
  let text;
  try {
    text = fs.readFileSync(abs, 'utf8');
  } catch {
    return null;
  }
  const lines = text.split('\n');
  const isEventHandler = /^svc\/[^/]+\/src\/.*\/?event_handlers\//.test(rel);
  const isModule = /^svc\/[^/]+\/src\/modules\//.test(rel);
  const r1 = [];
  const r2 = [];
  const scopedHits = [];
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const code = stripLineComment(raw);
    if (isEventHandler && /\.scope(?:_read)?_system\s*\(/.test(code) && !hasAnnotation(lines, i)) {
      r1.push({ line: i + 1, text: raw.trim() });
    }
    if (isModule && /\bstate\s*\.\s*pool\b/.test(code) && !hasAnnotation(lines, i)) {
      const key = `${rel}:${i + 1}`;
      if (SCOPED_CONSTRUCTION_WHITELIST.includes(key) && isScopedConstruction(lines, i)) {
        scopedHits.push(key);
      } else {
        r2.push({ line: i + 1, text: raw.trim() });
      }
    }
  }
  return { rel, r1, r2, scopedHits };
}

function serviceOf(rel) {
  const m = rel.match(/^svc\/([^/]+)\//);
  return m ? m[1] : '(other)';
}

function main() {
  const baseline = loadBaseline();

  let rels;
  try {
    const candidates = changedOnly
      ? stagedFiles().filter((f) => f.endsWith('.rs'))
      : gitList('svc').filter((f) => f.endsWith('.rs'));
    rels = candidates.filter(
      (f) => /^svc\/[^/]+\/src\/.*\/?event_handlers\//.test(f) || /^svc\/[^/]+\/src\/modules\//.test(f),
    );
  } catch (e) {
    console.error(`[tenant-context] 文件枚举失败: ${e.message}`);
    process.exit(2);
  }

  const results = [];
  for (const rel of rels) {
    const r = scanFile(rel);
    if (r) results.push(r);
  }

  const current = { r1: {}, r2: {} };
  const total = { r1: 0, r2: 0 };

  // 上限断言：5 处白名单必须逐一命中（形态/行号漂移即红），且命中数不得超出白名单。
  const scopedHits = results.flatMap((r) => r.scopedHits || []);
  // changed-only 只扫描暂存文件：仅校验本次扫描覆盖到的白名单条目，
  // 否则部分提交时未暂存文件的白名单条目会被误判为"行号漂移"。
  // 全量模式 scanned 覆盖全部 svc，5 条仍须逐一命中（语义不变）。
  const scanned = new Set(results.map((r) => r.rel));
  const staleWhitelist = SCOPED_CONSTRUCTION_WHITELIST.filter(
    (k) => !scopedHits.includes(k) && (!changedOnly || scanned.has(k.split(':')[0])),
  );
  if (staleWhitelist.length) {
    console.error('[tenant-context] 作用域构造白名单失效（行号漂移或形态变更）:');
    for (const k of staleWhitelist) console.error(`  - ${k}`);
    process.exit(1);
  }
  if (scopedHits.length > SCOPED_CONSTRUCTION_WHITELIST.length) {
    console.error(
      `[tenant-context] 作用域构造命中数 ${scopedHits.length} 超过上限 ${SCOPED_CONSTRUCTION_WHITELIST.length}`,
    );
    process.exit(1);
  }

  for (const r of results) {
    if (r.r1.length) {
      current.r1[r.rel] = r.r1.length;
      total.r1 += r.r1.length;
    }
    if (r.r2.length) {
      current.r2[r.rel] = r.r2.length;
      total.r2 += r.r2.length;
    }
  }

  // 全量扫描时才更新基线；--changed-only 只比对。
  if (updateBaseline) {
    if (changedOnly) {
      console.error('[tenant-context] --update-baseline 必须全量运行（不能与 --changed-only 同用）');
      process.exit(2);
    }
    const payload = {
      _comment:
        '存量基线（按文件计数）。只允许下降；新增违规必须改代码或加 // tenant-system: 说明。',
      generated_at: new Date().toISOString(),
      rules: {
        r1: 'event_handlers 内使用 scope_system / scope_read_system（无登记注释）',
        r2: 'modules 内直接使用 state.pool（无登记注释）',
      },
      r1: current.r1,
      r2: current.r2,
    };
    fs.writeFileSync(BASELINE_PATH, JSON.stringify(payload, null, 2) + '\n');
    console.log(
      `[tenant-context] 基线已更新: R1 ${total.r1} 处 / R2 ${total.r2} 处（${BASELINE_PATH}）`,
    );
    return;
  }

  const baseTotals = {
    r1: baseline ? Object.values(baseline.r1 || {}).reduce((a, b) => a + b, 0) : 0,
    r2: baseline ? Object.values(baseline.r2 || {}).reduce((a, b) => a + b, 0) : 0,
  };
  const baseFiles = {
    r1: baseline ? Object.keys(baseline.r1 || {}).length : 0,
    r2: baseline ? Object.keys(baseline.r2 || {}).length : 0,
  };

  const newViolations = [];
  for (const rule of ['r1', 'r2']) {
    for (const [rel, count] of Object.entries(current[rule])) {
      const base = baseline?.[rule]?.[rel] ?? 0;
      if (count > base) {
        newViolations.push({ rule, rel, base, count, delta: count - base });
      }
    }
  }

  // 按服务汇总存量，便于分批。
  const byService = {};
  for (const rule of ['r1', 'r2']) {
    for (const [rel, count] of Object.entries(current[rule])) {
      const svc = serviceOf(rel);
      byService[svc] = byService[svc] || { r1: 0, r2: 0 };
      byService[svc][rule] += count;
    }
  }

  if (asJson) {
    console.log(
      JSON.stringify(
        {
          scanned_files: results.length,
          changed_only: changedOnly,
          baseline: { files: baseFiles, sites: baseTotals },
          current: { ...total, by_service: byService },
          new_violations: newViolations,
        },
        null,
        2,
      ),
    );
    process.exit(newViolations.length ? 1 : 0);
  }

  console.log(
    `[tenant-context] 扫描 ${results.length} 个文件${changedOnly ? '（仅暂存）' : ''}；` +
      `存量基线 R1 ${baseTotals.r1} 处/${baseFiles.r1} 文件，R2 ${baseTotals.r2} 处/${baseFiles.r2} 文件`,
  );
  console.log(`[tenant-context] 本次 R1 ${total.r1} 处，R2 ${total.r2} 处`);

  if (!baseline && (total.r1 || total.r2)) {
    console.error(
      '[tenant-context] 基线缺失。请先全量运行 --update-baseline 冻结存量，再启用门禁。',
    );
    process.exit(1);
  }

  if (newViolations.length === 0) {
    console.log('[tenant-context] PASS：无新增违规');
    return;
  }

  console.error(`[tenant-context] FAIL：新增违规 ${newViolations.length} 个文件`);
  for (const v of newViolations) {
    const label =
      v.rule === 'r1' ? 'R1 事件消费使用了系统通道' : 'R2 模块绕过 Db 作用域直连池';
    console.error(`  - [${v.rule}] ${v.rel}: ${v.base} → ${v.count}（+${v.delta}）${label}`);
    const r = results.find((x) => x.rel === v.rel);
    for (const site of (v.rule === 'r1' ? r?.r1 : r?.r2) || []) {
      console.error(`      L${site.line}: ${site.text}`);
    }
  }
  console.error(
    '  修法：改用 Db::scope_read/scope（请求路径）或补齐租户绑定；确属系统通道的，' +
      '在调用处或上一行加 `// tenant-system: <原因>`。',
  );
  process.exit(1);
}

main();
