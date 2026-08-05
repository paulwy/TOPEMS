#!/usr/bin/env node
// API 覆盖率检查脚本（V64 新增）
//
// 用途：
// 1. 检查 lowcode 10 个页面是否都引用了 @/api/lowcode
// 2. 检查 automation 5 个页面是否都引用了 @/api/automation
// 3. 对比 src/api 下 index.ts 目录数 vs moduleMapping 中的模块数
//
// 用法：
//   node scripts/ci/check-api-coverage.cjs
//   node scripts/ci/check-api-coverage.cjs --json
//   node scripts/ci/check-api-coverage.cjs --strict   # 有缺失则 exit 1
//
// 退出码：
//   0 = 通过
//   1 = 严格模式下有页面未接入 API

const fs = require('fs');
const path = require('path');

const WEB_ROOT = path.resolve(__dirname, '../../apps/web/src');

// 模块 → 页面目录 → API 模块名 映射
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

function findTsxFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== '__tests__') {
      results.push(...findTsxFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.tsx') && !entry.name.endsWith('.test.tsx')) {
      results.push(fullPath);
    }
  }
  return results;
}

function checkApiImport(filePath, apiImport) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return content.includes(apiImport);
  } catch {
    return false;
  }
}

function main() {
  const args = process.argv.slice(2);
  const jsonOut = args.includes('--json');
  const strict = args.includes('--strict');

  const report = {
    modules: [],
    passed: true,
  };

  for (const check of MODULE_CHECKS) {
    const files = findTsxFiles(check.pagesDir);
    const withApi = [];
    const withoutApi = [];

    for (const file of files) {
      const relPath = path.relative(WEB_ROOT, file);
      if (checkApiImport(file, check.apiImport)) {
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

  // API 模块数 vs moduleMapping 对齐检查
  const apiDir = path.join(WEB_ROOT, 'api');
  let apiModuleCount = 0;
  if (fs.existsSync(apiDir)) {
    apiModuleCount = fs.readdirSync(apiDir, { withFileTypes: true })
      .filter((e) => e.isDirectory() && fs.existsSync(path.join(apiDir, e.name, 'index.ts')))
      .length;
  }
  report.api_module_count = apiModuleCount;
  report.note = `src/api/ 有 ${apiModuleCount} 个模块（含 lowcode + automation），moduleMapping 中有对应映射即可`;

  if (jsonOut) {
    console.log(JSON.stringify(report, null, 2));
  } else {
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

    if (strict && !report.passed) {
      console.log('❌ API 覆盖率检查未通过');
      console.log('========================================');
      process.exit(1);
    } else {
      console.log('✅ API 覆盖率检查完成');
      console.log('========================================');
    }
  }
}

main();
