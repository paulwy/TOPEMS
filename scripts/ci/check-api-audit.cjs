#!/usr/bin/env node
/**
 * check-api-audit.cjs — P6 (Page→API) + P7 (RBAC 权限码) 合并审计门禁
 *
 * 用法：
 *   node scripts/ci/check-api-audit.cjs [--fail-fast] [--quiet]
 *                                       [--thresholds '{"p6.red":0,"p7.not_legal":0,"p7.mismatch":0}']
 *                                       [--report-json=/tmp/api-audit-ci.json]
 *
 * 退出码：
 *   0 = 通过（或在无 --fail-fast 时仅 WARN 不阻断）
 *   1 = FAIL 阈值超标（仅当 --fail-fast 提供）
 *
 * FAIL 阈值（永久 0 容忍，对应 project_memory R1/R2/R3 规则）：
 *   - p6.red          Page 调用了 API 字典中不存在的 方法（运行时 404/500）
 *   - p7.not_legal    前端使用了未在 PERMISSION_DEFS 注册的权限码（RBAC 绕过）
 *   - p7.mismatch     NavItem.code 与 Route.permission 不一致（菜单可见但 403）
 *
 * WARN 阈值（仅报告，永不阻断）：
 *   - p6.yellow       Page 期望分页结构但 API 返回非分页（需适配器兼容）
 *   - p6.amber        API 返回类型未知（多为 createCrudApi 工厂方法）
 *   - p7.dead         已注册但前端未使用的权限码（待清理）
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const SCRIPTS = path.join(ROOT, 'scripts');
const TMP_OUT = path.join(SCRIPTS, 'tmp-output');
const P6_SCRIPT = path.join(SCRIPTS, 'p6-api-audit-v5.cjs');
const P7_SCRIPT = path.join(SCRIPTS, 'p7-perm-audit-v5.cjs');

// ── CLI 参数解析 ────────────────────────────────────────────────
const argv = process.argv.slice(2);
const FAIL_FAST = argv.includes('--fail-fast');
const QUIET = argv.includes('--quiet');
const THRESHOLDS_CLI = (argv.find((a) => a.startsWith('--thresholds=')) || '').slice('--thresholds='.length);
const REPORT_JSON = (argv.find((a) => a.startsWith('--report-json=')) || '').slice('--report-json='.length) || '';

const DEFAULT_THRESHOLDS = {
  'p6.red': 0,
  'p6.yellow': Infinity,
  'p6.amber': Infinity,
  'p7.not_legal': 0,
  'p7.mismatch': 0,
  'p7.dead': Infinity,
};
const THRESHOLDS = THRESHOLDS_CLI ? { ...DEFAULT_THRESHOLDS, ...JSON.parse(THRESHOLDS_CLI) } : DEFAULT_THRESHOLDS;

// FAIL 规则（永久 0 容忍）
const FAIL_KEYS = ['p6.red', 'p7.not_legal', 'p7.mismatch'];

if (!QUIET) {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  API Audit Gate (P6 Page→API + P7 RBAC Permission Codes)');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  mode        : ${FAIL_FAST ? 'FAIL-FAST (blocks CI on FAIL)' : 'DRY-RUN (report only)'}`);
  console.log(`  thresholds  : ${JSON.stringify(THRESHOLDS)}`);
  console.log('═══════════════════════════════════════════════════════════════\n');
}

// ── 运行 P6 + P7 审计脚本 ──────────────────────────────────────
function runScript(scriptPath, label) {
  if (!fs.existsSync(scriptPath)) {
    console.error(`[ERROR] ${label} script not found: ${scriptPath}`);
    return false;
  }
  try {
    if (!QUIET) console.log(`▶ Running ${label} ...`);
    execSync(`node ${scriptPath}`, { cwd: ROOT, stdio: QUIET ? 'pipe' : 'inherit' });
    return true;
  } catch (e) {
    // 审计脚本可能因阈值超标返回非 0 退出码；忽略并继续读取产物
    if (!QUIET) console.log(`  (${label} exit=${e.status || 'n/a'} — proceeding to read outputs)`);
    return true;
  }
}

runScript(P6_SCRIPT, 'P6 (Page→API)');
runScript(P7_SCRIPT, 'P7 (RBAC)');

// ── 读取审计产物 ────────────────────────────────────────────────
function readJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

const p6Red = readJson(path.join(TMP_OUT, 'p6-red.json')) || [];
const p7Report = readJson(path.join(TMP_OUT, 'p7-audit-report.json')) || {};

// P6 缺少结构化 JSON 报告，从 CSV 解析 YELLOW/AMBER 计数
function countCsvLevel(level) {
  const csv = (() => {
    try {
      return fs.readFileSync(path.join(TMP_OUT, 'p6-audit-v5-robust.csv'), 'utf8');
    } catch {
      return '';
    }
  })();
  if (!csv) return 0;
  let n = 0;
  for (const line of csv.split('\n')) {
    const parts = line.split(',');
    if (parts[2] === level) n++;
  }
  return n;
}
const p6Yellow = countCsvLevel('YELLOW');
const p6Amber = countCsvLevel('AMBER');

const metrics = {
  'p6.red': p6Red.length,
  'p6.yellow': p6Yellow,
  'p6.amber': p6Amber,
  'p7.not_legal': p7Report.NOT_LEGAL_count ?? 0,
  'p7.mismatch': p7Report.MISMATCH_count ?? 0,
  'p7.dead': p7Report.DEAD_count ?? 0,
  'p7.coverage_pct': p7Report.coverage ?? 0,
  'p7.legal_count': p7Report.LEGAL_count ?? 0,
  'p7.used_count': p7Report.USED_count ?? 0,
};

// ── 阈值判定 ────────────────────────────────────────────────────
const results = [];
let failCount = 0;
for (const key of Object.keys(metrics)) {
  if (!(key in THRESHOLDS)) continue;
  const value = metrics[key];
  const threshold = THRESHOLDS[key];
  const isFailRule = FAIL_KEYS.includes(key);
  const exceeded = value > threshold;
  const level = isFailRule ? (exceeded ? 'FAIL' : 'PASS') : exceeded ? 'WARN' : 'PASS';
  if (isFailRule && exceeded) failCount++;
  results.push({ key, value, threshold, level, isFailRule });
}

// ── 控制台报告 ──────────────────────────────────────────────────
if (!QUIET) {
  console.log('\n┌──────────────────────────────────────────────────────────────────┐');
  console.log('│                    Audit Results Summary                        │');
  console.log('├──────────────────────────────────────────────────────────────────┤');
  for (const r of results) {
    const pad = (s, n) => String(s).padEnd(n);
    const mark = r.level === 'PASS' ? '✅' : r.level === 'FAIL' ? '❌' : '⚠️';
    const thr = r.threshold === Infinity ? '∞' : r.threshold;
    console.log(`│ ${mark} ${pad(r.key, 18)} value=${pad(r.value, 5)} threshold=${pad(thr, 5)} ${pad(r.level, 5)} │`);
  }
  console.log('└──────────────────────────────────────────────────────────────────┘');

  // P6 RED 详情
  if (p6Red.length > 0) {
    console.log('\n🔴 P6 RED (Page→API 方法不存在) — 前 20 条:');
    for (const c of p6Red.slice(0, 20)) {
      console.log(`   ${c.keyPath}  shapes=${(c.shapes || []).join(',')}  page=${c.page}`);
    }
    if (p6Red.length > 20) console.log(`   ... +${p6Red.length - 20} more`);
  }

  // P7 NOT_LEGAL 详情
  if ((p7Report.NOT_LEGAL || []).length > 0) {
    console.log('\n🔴 P7 NOT_LEGAL (未注册权限码) — 前 20 条:');
    for (const item of (p7Report.NOT_LEGAL || []).slice(0, 20)) {
      console.log(`   ${item.code}  usages=${(item.usages || []).slice(0, 2).join(' | ')}`);
    }
    if ((p7Report.NOT_LEGAL || []).length > 20) console.log(`   ... +${(p7Report.NOT_LEGAL || []).length - 20} more`);
  }

  // P7 MISMATCH 详情
  if ((p7Report.MISMATCH || []).length > 0) {
    console.log('\n🔴 P7 MISMATCH (NavItem.code ≠ Route.permission) — 全量:');
    for (const m of p7Report.MISMATCH || []) {
      console.log(`   ${JSON.stringify(m)}`);
    }
  }
}

// ── 结构化 JSON 报告 ────────────────────────────────────────────
const summary = {
  timestamp: new Date().toISOString(),
  mode: FAIL_FAST ? 'fail-fast' : 'dry-run',
  thresholds: THRESHOLDS,
  metrics,
  results,
  failCount,
  passed: failCount === 0,
  // 附带样本用于 Step Summary 渲染（前 30 条）
  samples: {
    p6Red: p6Red.slice(0, 30).map((c) => ({ keyPath: c.keyPath, shapes: c.shapes, page: c.page })),
    p7NotLegal: (p7Report.NOT_LEGAL || [])
      .slice(0, 30)
      .map((x) => ({ code: x.code, usages: (x.usages || []).slice(0, 3) })),
    p7Mismatch: (p7Report.MISMATCH || []).slice(0, 30),
  },
};

if (REPORT_JSON) {
  fs.mkdirSync(path.dirname(REPORT_JSON), { recursive: true });
  fs.writeFileSync(REPORT_JSON, JSON.stringify(summary, null, 2));
  if (!QUIET) console.log(`\n📝 Report JSON → ${REPORT_JSON}`);
}

// ── 退出码判定 ──────────────────────────────────────────────────
if (FAIL_FAST && failCount > 0) {
  if (!QUIET) console.log(`\n❌ FAIL: ${failCount} FAIL-rule(s) exceeded threshold. CI blocked.`);
  process.exit(1);
}
if (!QUIET) {
  if (failCount === 0) console.log('\n✅ PASS: All FAIL-rules within threshold.');
  else console.log(`\n⚠️ WARN: ${failCount} FAIL-rule(s) exceeded (dry-run, not blocking).`);
}
process.exit(0);
