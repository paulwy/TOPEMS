#!/usr/bin/env node
// API 模块与 moduleMapping 对齐检查脚本
//
// 用途：
// 1. 扫描 apps/web/src/api 下的所有子目录，每个子目录算一个 API 模块
// 2. 读取 apps/web/src/lib/navigation/moduleMapping.ts，提取所有顶层模块 key
// 3. 对比两组数据，发现未对齐的模块
// 4. 输出报告，CI 门禁用
//
// 对比逻辑：
// - API 独有（在 API 目录但不在 moduleMapping）：白名单内的是非导航模块，正常；
//   非白名单的需要检查是否应加入 moduleMapping 或白名单。
// - moduleMapping 独有（在 moduleMapping 但不在 API 目录）：可能是缺失 API 实现，
//   也可能是别名映射（如 oa -> erp），需要人工确认。
//
// 用法：
//   node scripts/ci/compare-api-modules.cjs          # 全量对比
//   node scripts/ci/compare-api-modules.cjs --json    # JSON 输出
//   node scripts/ci/compare-api-modules.cjs --strict  # 严格模式：未对齐则 exit 1
//
// 退出码：
//   0 = 通过（或仅警告）
//   1 = 严格模式下发现未对齐模块（缺失 API 实现或非白名单 API 独有模块）

const fs = require('fs');
const path = require('path');

const API_ROOT = path.resolve(__dirname, '../../apps/web/src/api');
const MAPPING_FILE = path.resolve(
  __dirname,
  '../../apps/web/src/lib/navigation/moduleMapping.ts',
);

// 白名单：非导航模块（存在于 API 目录但不在 moduleMapping 中是正常的）
// 这些模块不参与前端导航路由，因此不需要在 moduleMapping 中注册
const NON_NAV_WHITELIST = [
  'consolidation-contract',
  'master',
  'dict',
  'bff',
  'system',
  'voucherTemplate',
  'email',
  'feedback',
  'search',
  'external-erp',
  'crmFinance',
  'financialReport',
  'consolidation',
];

// 排除的子目录（不算 API 模块）
const EXCLUDED_DIRS = ['__tests__'];

// 扫描 API 目录下所有子目录（每个子目录算一个 API 模块）
function scanApiModules(apiRoot) {
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

// 从 moduleMapping.ts 中提取所有顶层模块 key
// 顶层 key 特征：行首恰好 2 个空格缩进，形如 "  key: {"
// subModules 内部的 key 缩进为 4+ 空格，不会被匹配
function parseModuleMappingKeys(filePath) {
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

function main() {
  const args = process.argv.slice(2);
  const jsonOut = args.includes('--json');
  const strict = args.includes('--strict');

  const apiModules = scanApiModules(API_ROOT);
  const mappingKeys = parseModuleMappingKeys(MAPPING_FILE);

  const apiSet = new Set(apiModules);
  const mappingSet = new Set(mappingKeys);
  const whitelistSet = new Set(NON_NAV_WHITELIST);

  // API 独有：在 API 目录但不在 moduleMapping 中
  const apiOnly = apiModules.filter((m) => !mappingSet.has(m));
  const apiOnlyWhitelisted = apiOnly.filter((m) => whitelistSet.has(m));
  const apiOnlyUnexpected = apiOnly.filter((m) => !whitelistSet.has(m));

  // moduleMapping 独有：在 moduleMapping 但不在 API 目录中
  const mappingOnly = mappingKeys.filter((m) => !apiSet.has(m));

  const report = {
    total_api_modules: apiModules.length,
    total_mapping_modules: mappingKeys.length,
    api_only: {
      whitelisted: apiOnlyWhitelisted,
      unexpected: apiOnlyUnexpected,
    },
    mapping_only: mappingOnly,
  };

  const hasMissing = mappingOnly.length > 0;
  const hasUnexpected = apiOnlyUnexpected.length > 0;

  if (jsonOut) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log('========================================');
    console.log('  API 模块与 moduleMapping 对齐报告');
    console.log('========================================');
    console.log(`总 API 模块数:        ${report.total_api_modules}`);
    console.log(`总 moduleMapping 数:  ${report.total_mapping_modules}`);
    console.log('');

    console.log(`API 独有 - 白名单内（非导航模块）: ${apiOnlyWhitelisted.length}`);
    if (apiOnlyWhitelisted.length > 0) {
      for (const m of apiOnlyWhitelisted) {
        console.log(`  ✓ ${m}`);
      }
    } else {
      console.log('  无');
    }
    console.log('');

    console.log(`API 独有 - 非白名单（需检查）: ${apiOnlyUnexpected.length}`);
    if (apiOnlyUnexpected.length > 0) {
      for (const m of apiOnlyUnexpected) {
        console.log(`  ⚠ ${m}`);
      }
      console.log('');
      console.log('  建议：确认是否应加入 moduleMapping 或补充到白名单。');
    } else {
      console.log('  无');
    }
    console.log('');

    console.log(`moduleMapping 独有（可能缺失 API 实现）: ${mappingOnly.length}`);
    if (mappingOnly.length > 0) {
      for (const m of mappingOnly) {
        console.log(`  ✗ ${m}`);
      }
      console.log('');
      console.log('  建议：检查是否缺失 API 实现，或是别名映射（如 oa -> erp）。');
    } else {
      console.log('  无');
    }

    console.log('');
    console.log('========================================');
    if (strict && (hasMissing || hasUnexpected)) {
      const reasons = [];
      if (hasMissing) reasons.push(`${mappingOnly.length} 个 moduleMapping 独有模块`);
      if (hasUnexpected) reasons.push(`${apiOnlyUnexpected.length} 个非白名单 API 独有模块`);
      console.log(`❌ 对齐检查未通过（${reasons.join('，')}）`);
      console.log('========================================');
      process.exit(1);
    } else {
      console.log('✅ 对齐检查完成');
      console.log('========================================');
    }
  }
}

main();
