#!/usr/bin/env node
/**
 * check-api.cjs — API Gate 三脚本合并门禁
 *  模式：audit (P6+P7 审计) / coverage (页面 API 覆盖率) / compare (API 模块对齐, alias: align) / all (默认，三项全跑)
 *
 * 用法：
 *   node scripts/ci/check-api.cjs [--mode={audit|coverage|compare|align|all}]
 *                                 [--dry-run] [--fail-fast] [--quiet]
 *                                 [--thresholds='{"p6.red":0,...}']
 *                                 [--report-json=/path/to/report.json]
 *                                 [--json] [--strict]
 *
 * 退出码（对齐 check-i18n.cjs）：
 *   --dry-run 强制 exit 0
 *   --fail-fast 任一 FAIL → exit 1
 *   否则聚合（audit FAIL / coverage 严格失败 / compare 严格失败 任一为真 → exit 1）
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const SCRIPTS = path.join(PROJECT_ROOT, 'scripts');
const TMP_OUT = path.join(SCRIPTS, 'tmp-output');
const P6_SCRIPT = path.join(SCRIPTS, 'p6-api-audit-v5.cjs');
const P7_SCRIPT = path.join(SCRIPTS, 'p7-perm-audit-v5.cjs');
const WEB_ROOT = path.join(PROJECT_ROOT, 'apps/web/src');
const API_ROOT_DIR = path.join(WEB_ROOT, 'api');
const MAPPING_FILE = path.join(WEB_ROOT, 'lib/navigation/moduleMapping.ts');

const NON_NAV_WHITELIST = [
  'consolidation-contract',
  'master',
  'dict',
  'bff',
  'system',
  'voucherTemplate',
  'email',
  'search',
  'external-erp',
  'crmFinance',
  'financialReport',
  'consolidation',
  'addressbook',
  'file',
  'mail',
  'migration',
  'shared',
  'template',
  'tenant',
];

const MAPPING_WITHOUT_API_DIR = ['asset', 'oa', 'rs'];

const EXCLUDED_DIRS = ['__tests__'];

const MODULE_CHECKS = [
  {
    name: 'lowcode',
    pagesDir: path.join(WEB_ROOT, 'pages/lowcode'),
    apiImport: '@/api/lowcode',
    minPages: 10,
    description: '低代码平台 10 页面 API 覆盖率',
  },
  {
    name: 'automation',
    pagesDir: path.join(WEB_ROOT, 'pages/automation'),
    apiImport: '@/api/automation',
    minPages: 5,
    description: '自动化平台 5 页面 API 覆盖率',
  },
];

const DEFAULT_THRESHOLDS = {
  'p6.red': 0,
  'p6.yellow': Infinity,
  'p6.amber': Infinity,
  'p7.not_legal': 0,
  'p7.mismatch': 0,
  'p7.dead': Infinity,
};

const FAIL_KEYS = ['p6.red', 'p7.not_legal', 'p7.mismatch'];

function getArgValue(argsList, flag) {
  const eqIdx = argsList.findIndex((a) => a.startsWith(flag + '='));
  if (eqIdx !== -1) return argsList[eqIdx].slice(flag.length + 1);
  const spIdx = argsList.indexOf(flag);
  if (spIdx !== -1 && argsList[spIdx + 1]) return argsList[spIdx + 1];
  return null;
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const modeVal = getArgValue(args, '--mode') || 'all';
  let mode = ['audit', 'coverage', 'compare', 'align', 'all'].includes(modeVal) ? modeVal : 'all';
  if (mode === 'align') mode = 'compare';
  const dryRun = args.includes('--dry-run');
  const failFast = args.includes('--fail-fast');
  const quiet = args.includes('--quiet');
  const thresholdsCli = getArgValue(args, '--thresholds') || '';
  const reportJsonVal = getArgValue(args, '--report-json');
  const reportJsonPath = reportJsonVal ? path.resolve(reportJsonVal) : null;
  const jsonMode = args.includes('--json');
  const strict = args.includes('--strict');
  const THRESHOLDS = thresholdsCli ? { ...DEFAULT_THRESHOLDS, ...JSON.parse(thresholdsCli) } : DEFAULT_THRESHOLDS;
  return {
    mode,
    dryRun,
    failFast,
    quiet,
    THRESHOLDS,
    reportJsonPath,
    jsonMode,
    strict,
  };
}

function runScriptForAudit(scriptPath, label, quiet) {
  if (!fs.existsSync(scriptPath)) {
    console.error(`[ERROR] ${label} script not found: ${scriptPath}`);
    return false;
  }
  try {
    if (!quiet) console.log(`▶ Running ${label} ...`);
    execSync(`node ${scriptPath}`, { cwd: PROJECT_ROOT, stdio: quiet ? 'pipe' : 'inherit' });
    return true;
  } catch (e) {
    if (!quiet) console.log(`  (${label} exit=${e.status || 'n/a'} — proceeding to read outputs)`);
    return true;
  }
}

function readJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

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

function runAuditCheck(opts) {
  const { quiet, THRESHOLDS } = opts;
  if (!quiet) {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  API Audit Gate (P6 Page→API + P7 RBAC Permission Codes)');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`  thresholds  : ${JSON.stringify(THRESHOLDS)}`);
    console.log('═══════════════════════════════════════════════════════════════\n');
  }

  runScriptForAudit(P6_SCRIPT, 'P6 (Page→API)', quiet);
  runScriptForAudit(P7_SCRIPT, 'P7 (RBAC)', quiet);

  const p6Red = readJson(path.join(TMP_OUT, 'p6-red.json')) || [];
  const p7Report = readJson(path.join(TMP_OUT, 'p7-audit-report.json')) || {};
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

  if (!quiet) {
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

    if (p6Red.length > 0) {
      console.log('\n🔴 P6 RED (Page→API 方法不存在) — 前 20 条:');
      for (const c of p6Red.slice(0, 20)) {
        console.log(`   ${c.keyPath}  shapes=${(c.shapes || []).join(',')}  page=${c.page}`);
      }
      if (p6Red.length > 20) console.log(`   ... +${p6Red.length - 20} more`);
    }

    if ((p7Report.NOT_LEGAL || []).length > 0) {
      console.log('\n🔴 P7 NOT_LEGAL (未注册权限码) — 前 20 条:');
      for (const item of (p7Report.NOT_LEGAL || []).slice(0, 20)) {
        console.log(`   ${item.code}  usages=${(item.usages || []).slice(0, 2).join(' | ')}`);
      }
      if ((p7Report.NOT_LEGAL || []).length > 20) console.log(`   ... +${(p7Report.NOT_LEGAL || []).length - 20} more`);
    }

    if ((p7Report.MISMATCH || []).length > 0) {
      console.log('\n🔴 P7 MISMATCH (NavItem.code ≠ Route.permission) — 全量:');
      for (const m of p7Report.MISMATCH || []) {
        console.log(`   ${JSON.stringify(m)}`);
      }
    }
  }

  const allOk = failCount === 0;
  return {
    timestamp: new Date().toISOString(),
    thresholds: THRESHOLDS,
    metrics,
    results,
    failCount,
    allOk,
    samples: {
      p6Red: p6Red.slice(0, 30).map((c) => ({ keyPath: c.keyPath, shapes: c.shapes, page: c.page })),
      p7NotLegal: (p7Report.NOT_LEGAL || [])
        .slice(0, 30)
        .map((x) => ({ code: x.code, usages: (x.usages || []).slice(0, 3) })),
      p7Mismatch: (p7Report.MISMATCH || []).slice(0, 30),
    },
    p6RedCount: p6Red.length,
    p7NotLegalCount: (p7Report.NOT_LEGAL || []).length,
    p7MismatchCount: (p7Report.MISMATCH || []).length,
  };
}

function findTsxFilesCoverage(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== '__tests__') {
      results.push(...findTsxFilesCoverage(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.tsx') && !entry.name.endsWith('.test.tsx')) {
      results.push(fullPath);
    }
  }
  return results;
}

function checkApiImportCoverage(filePath, apiImport) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return content.includes(apiImport);
  } catch {
    return false;
  }
}

function runCoverageCheck(opts) {
  const { strict } = opts;
  const report = {
    modules: [],
    passed: true,
  };

  for (const check of MODULE_CHECKS) {
    const files = findTsxFilesCoverage(check.pagesDir);
    const withApi = [];
    const withoutApi = [];

    for (const file of files) {
      const relPath = path.relative(WEB_ROOT, file);
      if (checkApiImportCoverage(file, check.apiImport)) {
        withApi.push(relPath);
      } else {
        withoutApi.push(relPath);
      }
    }

    const passed = withoutApi.length === 0 && files.length >= check.minPages;
    if (!passed) report.passed = false;

    report.modules.push({
      name: check.name,
      description: check.description,
      total_pages: files.length,
      pages_with_api: withApi.length,
      pages_without_api: withoutApi.length,
      coverage_rate: files.length > 0 ? Math.round((withApi.length / files.length) * 100) : 0,
      passed,
      without_api_files: withoutApi,
    });
  }

  let apiModuleCount = 0;
  if (fs.existsSync(API_ROOT_DIR)) {
    apiModuleCount = fs
      .readdirSync(API_ROOT_DIR, { withFileTypes: true })
      .filter((e) => e.isDirectory() && fs.existsSync(path.join(API_ROOT_DIR, e.name, 'index.ts'))).length;
  }
  report.api_module_count = apiModuleCount;
  report.note = `src/api/ 有 ${apiModuleCount} 个模块（含 lowcode + automation），moduleMapping 中有对应映射即可`;

  return {
    report,
    strict,
    allOk: report.passed,
    printed: false,
  };
}

function scanApiModulesCompare(apiRoot) {
  const modules = [];
  if (!fs.existsSync(apiRoot)) {
    console.error(`[warn] API 目录不存在: ${apiRoot}`);
    return modules;
  }
  const entries = fs.readdirSync(apiRoot, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory() && !EXCLUDED_DIRS.includes(entry.name)) {
      modules.push(entry.name);
    }
  }
  return modules.sort();
}

function parseModuleMappingKeysCompare(filePath) {
  const keys = [];
  if (!fs.existsSync(filePath)) {
    console.error(`[warn] moduleMapping 文件不存在: ${filePath}`);
    return keys;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const topKeyRegex = /^  ([a-zA-Z_$][a-zA-Z0-9_$]*):\s*\{/;
  for (const line of lines) {
    const match = line.match(topKeyRegex);
    if (match) {
      keys.push(match[1]);
    }
  }
  return keys.sort();
}

function runCompareCheck(opts) {
  const { strict } = opts;
  const apiModules = scanApiModulesCompare(API_ROOT_DIR);
  const mappingKeys = parseModuleMappingKeysCompare(MAPPING_FILE);

  const apiSet = new Set(apiModules);
  const mappingSet = new Set(mappingKeys);
  const whitelistSet = new Set(NON_NAV_WHITELIST);

  const apiOnly = apiModules.filter((m) => !mappingSet.has(m));
  const apiOnlyWhitelisted = apiOnly.filter((m) => whitelistSet.has(m));
  const apiOnlyUnexpected = apiOnly.filter((m) => !whitelistSet.has(m));

  const mappingOnly = mappingKeys.filter((m) => !apiSet.has(m));
  const mappingOnlyWhitelisted = mappingOnly.filter((m) => MAPPING_WITHOUT_API_DIR.includes(m));
  const mappingOnlyUnexpected = mappingOnly.filter((m) => !MAPPING_WITHOUT_API_DIR.includes(m));

  const report = {
    total_api_modules: apiModules.length,
    total_mapping_modules: mappingKeys.length,
    api_only: {
      whitelisted: apiOnlyWhitelisted,
      unexpected: apiOnlyUnexpected,
    },
    mapping_only: {
      whitelisted: mappingOnlyWhitelisted,
      unexpected: mappingOnlyUnexpected,
    },
  };

  const hasMissing = mappingOnlyUnexpected.length > 0;
  const hasUnexpected = apiOnlyUnexpected.length > 0;
  const allOk = !hasMissing && !hasUnexpected;

  return {
    report,
    strict,
    hasMissing,
    hasUnexpected,
    allOk,
  };
}

function printCoverageHuman(coverageResult, quiet) {
  if (quiet) return;
  const report = coverageResult.report;
  console.log('========================================');
  console.log('  API 覆盖率检查 (V64)');
  console.log('========================================');

  for (const mod of report.modules) {
    console.log('');
    console.log(`📋 ${mod.name}: ${mod.description}`);
    console.log(`   总页面: ${mod.total_pages}`);
    console.log(`   已接入 API: ${mod.pages_with_api}`);
    console.log(`   未接入 API: ${mod.pages_without_api}`);
    console.log(`   覆盖率: ${mod.coverage_rate}%`);
    if (mod.without_api_files.length > 0) {
      console.log('   ⚠️  未接入 API 的页面:');
      for (const f of mod.without_api_files) {
        console.log(`      - ${f}`);
      }
    }
    console.log(`   ${mod.passed ? '✅ 通过' : '❌ 未通过'}`);
  }

  console.log('');
  console.log(`📦 API 模块总数: ${report.api_module_count}`);
  console.log('');
  console.log('========================================');

  if (coverageResult.strict && !report.passed) {
    console.log('❌ API 覆盖率检查未通过');
    console.log('========================================');
  } else {
    console.log('✅ API 覆盖率检查完成');
    console.log('========================================');
  }
}

function printCompareHuman(compareResult, quiet) {
  if (quiet) return;
  const r = compareResult.report;
  console.log('========================================');
  console.log('  API 模块与 moduleMapping 对齐报告');
  console.log('========================================');
  console.log(`总 API 模块数:        ${r.total_api_modules}`);
  console.log(`总 moduleMapping 数:  ${r.total_mapping_modules}`);
  console.log('');

  console.log(`API 独有 - 白名单内（非导航模块）: ${r.api_only.whitelisted.length}`);
  if (r.api_only.whitelisted.length > 0) {
    for (const m of r.api_only.whitelisted) console.log(`  ✓ ${m}`);
  } else {
    console.log('  无');
  }
  console.log('');

  console.log(`API 独有 - 非白名单（需检查）: ${r.api_only.unexpected.length}`);
  if (r.api_only.unexpected.length > 0) {
    for (const m of r.api_only.unexpected) console.log(`  ⚠ ${m}`);
    console.log('');
    console.log('  建议：确认是否应加入 moduleMapping 或补充到白名单。');
  } else {
    console.log('  无');
  }
  console.log('');

  console.log(`moduleMapping 独有 - 白名单内（API 散落他处）: ${r.mapping_only.whitelisted.length}`);
  if (r.mapping_only.whitelisted.length > 0) {
    for (const m of r.mapping_only.whitelisted) console.log(`  ✓ ${m}`);
  } else {
    console.log('  无');
  }
  console.log('');

  console.log(`moduleMapping 独有 - 非白名单（需检查）: ${r.mapping_only.unexpected.length}`);
  if (r.mapping_only.unexpected.length > 0) {
    for (const m of r.mapping_only.unexpected) console.log(`  ✗ ${m}`);
    console.log('');
    console.log('  建议：检查是否缺失 API 实现，或是别名映射（如 oa -> erp）。');
  } else {
    console.log('  无');
  }

  console.log('');
  console.log('========================================');
  if (compareResult.strict && (compareResult.hasMissing || compareResult.hasUnexpected)) {
    const reasons = [];
    if (compareResult.hasMissing) reasons.push(`${r.mapping_only.unexpected.length} 个非白名单 moduleMapping 独有模块`);
    if (compareResult.hasUnexpected) reasons.push(`${r.api_only.unexpected.length} 个非白名单 API 独有模块`);
    console.log(`❌ 对齐检查未通过（${reasons.join('，')}）`);
    console.log('========================================');
  } else {
    console.log('✅ 对齐检查完成');
    console.log('========================================');
  }
}

function renderReport(opts, auditResult, coverageResult, compareResult) {
  const { mode, jsonMode, reportJsonPath, dryRun, quiet } = opts;
  const generatedAt = new Date().toISOString();

  if (reportJsonPath) {
    const outJson = {
      mode,
      generatedAt,
      audit: mode !== 'coverage' && mode !== 'compare'
        ? {
            timestamp: auditResult.timestamp,
            thresholds: auditResult.thresholds,
            metrics: auditResult.metrics,
            results: auditResult.results,
            failCount: auditResult.failCount,
            allOk: auditResult.allOk,
            samples: auditResult.samples,
          }
        : null,
      coverage: mode !== 'audit' && mode !== 'compare'
        ? coverageResult.report
        : null,
      compare: mode !== 'audit' && mode !== 'coverage'
        ? compareResult.report
        : null,
    };
    fs.mkdirSync(path.dirname(reportJsonPath), { recursive: true });
    fs.writeFileSync(reportJsonPath, JSON.stringify(outJson, null, 2) + '\n', 'utf8');
    if (!quiet) console.log(`\n📝 Report JSON → ${reportJsonPath}`);
  }

  if (jsonMode) {
    const out = {
      mode,
      generatedAt,
      audit: mode !== 'coverage' && mode !== 'compare'
        ? {
            metrics: auditResult.metrics,
            failCount: auditResult.failCount,
            allOk: auditResult.allOk,
          }
        : null,
      coverage: mode !== 'audit' && mode !== 'compare' ? coverageResult.report : null,
      compare: mode !== 'audit' && mode !== 'coverage' ? compareResult.report : null,
    };
    console.log(JSON.stringify(out, null, 2));
    return;
  }

  if (mode !== 'coverage' && mode !== 'compare') {
    if (!quiet) {
      if (auditResult.failCount === 0) console.log('\n✅ Audit: All FAIL-rules within threshold.');
      else console.log(`\n⚠️  Audit: ${auditResult.failCount} FAIL-rule(s) exceeded.`);
    }
  }
  if (mode === 'all') console.log('\n');
  if (mode !== 'audit' && mode !== 'compare') {
    printCoverageHuman(coverageResult, quiet);
  }
  if (mode === 'all') console.log('\n');
  if (mode !== 'audit' && mode !== 'coverage') {
    printCompareHuman(compareResult, quiet);
  }
  if (dryRun) {
    console.log('\n[dry-run] 报告生成完毕，不触发 exit 非零。');
    if (reportJsonPath) console.log(`[dry-run] Report JSON -> ${path.relative(process.cwd(), reportJsonPath)}`);
  }
}

function main() {
  const opts = parseArgs(process.argv);
  let auditResult = null;
  let coverageResult = null;
  let compareResult = null;

  if (opts.mode !== 'coverage' && opts.mode !== 'compare') {
    auditResult = runAuditCheck(opts);
  }
  if (opts.mode !== 'audit' && opts.mode !== 'compare') {
    coverageResult = runCoverageCheck(opts);
  }
  if (opts.mode !== 'audit' && opts.mode !== 'coverage') {
    compareResult = runCompareCheck(opts);
  }

  renderReport(opts, auditResult, coverageResult, compareResult);

  if (opts.dryRun) {
    process.exitCode = 0;
    return;
  }

  let hasFail = false;
  if (opts.mode !== 'coverage' && opts.mode !== 'compare') {
    if (!auditResult.allOk) hasFail = true;
  }
  if (opts.mode !== 'audit' && opts.mode !== 'compare') {
    if (coverageResult.strict && !coverageResult.allOk) hasFail = true;
  }
  if (opts.mode !== 'audit' && opts.mode !== 'coverage') {
    if (compareResult.strict && !compareResult.allOk) hasFail = true;
  }

  if (opts.failFast) {
    if (hasFail) {
      process.exit(1);
    }
    process.exitCode = 0;
    return;
  }
  process.exitCode = hasFail ? 1 : 0;
}

main();
