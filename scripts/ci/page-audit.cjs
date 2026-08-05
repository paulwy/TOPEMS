#!/usr/bin/env node
// 页面标准化审计脚本（V64 新增）
//
// 用途：
// 1. 扫描 apps/web/src/pages 下所有 tsx，统计使用 CrudPage / ListPageTemplate 的比例
// 2. 对新建（git diff）的 CRUD 型页面检查是否使用了标准模板
// 3. 输出审计报告，CI 门禁用
//
// 用法：
//   node scripts/ci/page-audit.cjs                 # 全量审计
//   node scripts/ci/page-audit.cjs --diff           # 只检查 git diff 中的新文件
//   node scripts/ci/page-audit.cjs --json           # 输出 JSON 格式
//   node scripts/ci/page-audit.cjs --strict         # 严格模式：新建 CRUD 页未用模板则 exit 1
//
// 退出码：
//   0 = 通过（或仅有警告）
//   1 = 严格模式下有新建 CRUD 页未用标准模板

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const WEB_ROOT = path.resolve(__dirname, '../../apps/web/src/pages');
// V64.1: 扩展模板家族识别（含 Dashboard/Detail/Settings/Form 等非 CRUD 模板）
const TEMPLATES = [
  // CRUD 型模板
  'CrudPage',
  'ListPageTemplate',
  'BffDataTable',
  'MasterDetailPageTemplate',
  'SubTableBuilder',
  // Dashboard 型模板
  'DashboardTemplate',
  'StatsPageTemplate',
  // Detail 型模板
  'DetailPageTemplate',
  // 表单/设置型模板
  'FormPageTemplate',
  'SettingsPageTemplate',
  // 特殊型模板
  'KanbanPageTemplate',
  'TimelinePageTemplate',
  'TreePageTemplate',
  'WizardPageTemplate',
  'CardListTemplate',
  'GisMapTemplate',
  'MarkdownEditorTemplate',
  'ReportDesignerTemplate',
  // 通用容器（最低标准）
  'PageContainer',
];

// CRUD 型页面关键词（页面名包含这些词的，建议用标准模板）
const CRUD_KEYWORDS = [
  'Management',
  'List',
  'Table',
  'Crud',
  'Catalog',
  'Inventory',
  'Record',
];

// 豁免页面（非 CRUD 型，不需要标准化）
const EXEMPT_PATTERNS = [
  /Dashboard/i,
  /Home/i,
  /Settings/i,
  /Config/i,
  /Debug/i,
  /Monitor/i,
  /Preview/i,
  /Design/i,
  /Designer/i,
  /Editor/i,
  /Wizard/i,
  /Overview/i,
  /Detail$/i,
  /Tree$/i,
  /Chart/i,
  /Report/i,
  /Analytics/i,
  /Statistics/i,
  /Login/i,
  /Register/i,
  /Error/i,
  /404/i,
  /403/i,
  /Profile/i,
  /Portal/i,
  /Welcome/i,
  /Test/i,
];

function findTsxFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== '__tests__' && entry.name !== 'node_modules') {
      results.push(...findTsxFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.tsx') && !entry.name.endsWith('.test.tsx')) {
      results.push(fullPath);
    }
  }
  return results;
}

// V64.1: 区分"纯页面文件"和"组件文件"
// 纯页面：*Page.tsx 或 index.tsx（在模块根目录下，不在 components/hooks/utils 子目录下）
function isPageFile(filePath) {
  const baseName = path.basename(filePath, '.tsx');
  // index.tsx 在模块根目录算页面
  if (baseName === 'index') {
    return !filePath.includes('/components/') && !filePath.includes('/hooks/') && !filePath.includes('/utils/');
  }
  // *Page.tsx 算页面
  return baseName.endsWith('Page') &&
    !filePath.includes('/components/') &&
    !filePath.includes('/hooks/') &&
    !filePath.includes('/utils/');
}

function checkTemplateUsage(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return TEMPLATES.some((t) => content.includes(t));
  } catch {
    return false;
  }
}

function isCrudPage(fileName) {
  // 检查文件名是否包含 CRUD 关键词且不在豁免列表
  const baseName = path.basename(fileName, '.tsx');
  const isCrud = CRUD_KEYWORDS.some((kw) => baseName.includes(kw));
  const isExempt = EXEMPT_PATTERNS.some((p) => p.test(baseName));
  return isCrud && !isExempt;
}

function getGitDiffNewFiles() {
  try {
    const output = execSync('git diff --cached --name-only --diff-filter=A', {
      encoding: 'utf8',
      cwd: path.resolve(__dirname, '../..'),
    });
    return output
      .split('\n')
      .filter((f) => f.startsWith('apps/web/src/pages/') && f.endsWith('.tsx') && !f.endsWith('.test.tsx'))
      .map((f) => path.resolve(__dirname, '../..', f));
  } catch {
    return [];
  }
}

function main() {
  const args = process.argv.slice(2);
  const diffOnly = args.includes('--diff');
  const jsonOut = args.includes('--json');
  const strict = args.includes('--strict');

  const allFiles = findTsxFiles(WEB_ROOT);
  const filesToCheck = diffOnly ? getGitDiffNewFiles() : allFiles;

  const report = {
    total_pages: allFiles.length,
    checked_pages: filesToCheck.length,
    standardized: 0,
    not_standardized: 0,
    crud_new_without_template: [],
    module_stats: {},
    files: [],
  };

  for (const file of filesToCheck) {
    const usesTemplate = checkTemplateUsage(file);
    const relPath = path.relative(path.resolve(__dirname, '../../..'), file);
    const fileName = path.basename(file, '.tsx');
    const moduleMatch = relPath.match(/pages\/([^/]+)\//);
    const moduleName = moduleMatch ? moduleMatch[1] : 'root';

    if (!report.module_stats[moduleName]) {
      report.module_stats[moduleName] = { total: 0, standardized: 0 };
    }
    report.module_stats[moduleName].total++;

    if (usesTemplate) {
      report.standardized++;
      report.module_stats[moduleName].standardized++;
    } else {
      report.not_standardized++;
    }

    report.files.push({
      file: relPath,
      module: moduleName,
      uses_template: usesTemplate,
      is_crud: isCrudPage(fileName),
    });

    // 严格模式：新建 CRUD 页面未用模板
    if (strict && diffOnly && usesTemplate === false && isCrudPage(fileName)) {
      report.crud_new_without_template.push(relPath);
    }
  }

  // 全量统计标准化率
  let totalStandardized = 0;
  for (const file of allFiles) {
    if (checkTemplateUsage(file)) totalStandardized++;
  }
  report.overall_standardization_rate = allFiles.length > 0
    ? Math.round((totalStandardized / allFiles.length) * 100)
    : 0;

  // V64.1: 纯页面文件标准化率（排除组件文件）
  const pageFiles = allFiles.filter(isPageFile);
  let pageStandardized = 0;
  for (const file of pageFiles) {
    if (checkTemplateUsage(file)) pageStandardized++;
  }
  report.page_only_total = pageFiles.length;
  report.page_only_standardized = pageStandardized;
  report.page_only_rate = pageFiles.length > 0
    ? Math.round((pageStandardized / pageFiles.length) * 100)
    : 0;

  if (jsonOut) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log('========================================');
    console.log('  页面标准化审计报告 (V64)');
    console.log('========================================');
    console.log(`总文件数（含组件）: ${report.total_pages}`);
    console.log(`已标准化: ${report.standardized}`);
    console.log(`未标准化: ${report.not_standardized}`);
    console.log(`整体标准化率: ${report.overall_standardization_rate}%`);
    console.log('');
    console.log(`纯页面文件数: ${report.page_only_total}`);
    console.log(`纯页面已标准化: ${report.page_only_standardized}`);
    console.log(`纯页面标准化率: ${report.page_only_rate}%`);
    console.log('');

    console.log('模块统计:');
    const sortedModules = Object.entries(report.module_stats).sort((a, b) => b[1].total - a[1].total);
    for (const [mod, stats] of sortedModules) {
      const rate = stats.total > 0 ? Math.round((stats.standardized / stats.total) * 100) : 0;
      const bar = '█'.repeat(Math.floor(rate / 5)) + '░'.repeat(20 - Math.floor(rate / 5));
      console.log(`  ${mod.padEnd(15)} ${bar} ${rate}% (${stats.standardized}/${stats.total})`);
    }

    if (report.crud_new_without_template.length > 0) {
      console.log('');
      console.log('⚠️  新建 CRUD 页面未使用标准模板:');
      for (const f of report.crud_new_without_template) {
        console.log(`  - ${f}`);
      }
      console.log('');
      console.log('建议：新建 CRUD 页面应使用 CrudPage 或 ListPageTemplate 标准模板。');
      console.log('参考：apps/web/src/pages/admin/TenantManagementPage.tsx');
    }

    console.log('');
    console.log('========================================');
    if (strict && report.crud_new_without_template.length > 0) {
      console.log('❌ 审计未通过（严格模式下有新建 CRUD 页未用标准模板）');
      console.log('========================================');
      process.exit(1);
    } else {
      console.log('✅ 审计完成');
      console.log('========================================');
    }
  }
}

main();
