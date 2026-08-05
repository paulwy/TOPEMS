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

// V64.3: 特殊功能页白名单 — 这些页面豁免标准化检查
// 原因：登录/错误/性能基准等页面运行在框架外或刻意不依赖主框架
const SPECIAL_PAGE_WHITELIST = [
  'shared/LoginPage.tsx', // 认证入口，未登录状态，不能用 PageContainer
  'shared/ForgotPasswordPage.tsx', // 认证流程，未登录状态
  'shared/ErrorPage.tsx', // 错误兜底页，必须独立于主框架
  'shared/NotFoundPage.tsx', // 404 兜底页
  'performance/PerformanceTestPage.tsx', // Lighthouse 基准页，刻意不依赖模板
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
  // 在 components/hooks/utils 子目录的都不是页面
  if (filePath.includes('/components/') || filePath.includes('/hooks/') || filePath.includes('/utils/')) {
    return false;
  }
  // 跳过 re-export 包装（barrel 文件）：export { default } from './xxx/index'
  // 这类文件不管文件名是什么，都是包装而非真实页面实现
  try {
    const content = fs.readFileSync(filePath, 'utf8').trim();
    if (/^export\s*(\{[^}]*\}|\*)\s*from\s*['"][^'"]+['"]/.test(content) && content.split('\n').length <= 3) {
      return false;
    }
  } catch {
    // 读不了内容则保守判断为页面
  }
  // index.tsx 在模块根目录算页面
  if (baseName === 'index') {
    return true;
  }
  // *Page.tsx 算页面
  return baseName.endsWith('Page');
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
  // V64.3: 审计目标改为"纯页面"（排除 components/hooks/utils 子目录、re-export 包装）
  // 这样模块统计不再被组件文件拖低，反映真实页面入口健康度
  const pageFilesAll = allFiles.filter(isPageFile);
  const filesToCheck = diffOnly ? getGitDiffNewFiles().filter(isPageFile) : pageFilesAll;

  const report = {
    total_files: allFiles.length,
    total_pages: pageFilesAll.length,
    checked_pages: filesToCheck.length,
    standardized: 0,
    not_standardized: 0,
    crud_new_without_template: [],
    module_stats: {},
    files: [],
  };

  for (const file of filesToCheck) {
    const usesTemplate = checkTemplateUsage(file);
    // __dirname = /repo/scripts/ci，相对项目根上溯 2 层
    const relPath = path.relative(path.resolve(__dirname, '../..'), file);
    const fileName = path.basename(file, '.tsx');
    const moduleMatch = relPath.match(/pages\/([^/]+)\//);
    const moduleName = moduleMatch ? moduleMatch[1] : 'root';
    // V64.3: 特殊功能页豁免（标准化视为通过）
    const relNorm = relPath.replace(/\\/g, '/');
    const pageRel = relNorm.replace(/^apps\/web\/src\/pages\//, '');
    const isWhitelisted = SPECIAL_PAGE_WHITELIST.includes(pageRel);
    const effectivelyStandardized = usesTemplate || isWhitelisted;

    if (!report.module_stats[moduleName]) {
      report.module_stats[moduleName] = { total: 0, standardized: 0, whitelisted: 0 };
    }
    report.module_stats[moduleName].total++;

    if (effectivelyStandardized) {
      report.standardized++;
      report.module_stats[moduleName].standardized++;
      if (isWhitelisted) {
        report.module_stats[moduleName].whitelisted++;
      }
    } else {
      report.not_standardized++;
    }

    report.files.push({
      file: relPath,
      module: moduleName,
      uses_template: usesTemplate,
      whitelisted: isWhitelisted,
      is_crud: isCrudPage(fileName),
    });

    // 严格模式：新建 CRUD 页面未用模板
    if (strict && diffOnly && !effectivelyStandardized && isCrudPage(fileName)) {
      report.crud_new_without_template.push(relPath);
    }
  }

  // V64.3: 模块统计和标准化率都基于"纯页面"，避免组件文件污染
  // 白名单页面计入"标准化"分子，分母为纯页面总数
  report.standardization_rate = pageFilesAll.length > 0
    ? Math.round((report.standardized / pageFilesAll.length) * 100)
    : 0;
  // 兼容旧字段（page_only_rate 旧脚本有引用）
  report.overall_standardization_rate = report.standardization_rate;
  report.page_only_total = pageFilesAll.length;
  report.page_only_standardized = report.standardized;
  report.page_only_rate = report.standardization_rate;

  if (jsonOut) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log('========================================');
    console.log('  页面标准化审计报告 (V64.3)');
    console.log('========================================');
    console.log(`总 .tsx 文件数（含组件/hook）: ${report.total_files}`);
    console.log(`纯页面文件数（审计目标）      : ${report.total_pages}`);
    console.log(`已标准化纯页面                : ${report.standardized}`);
    console.log(`未标准化纯页面                : ${report.not_standardized}`);
    console.log(`纯页面标准化率                : ${report.standardization_rate}%`);
    console.log('');

    console.log('模块统计（纯页面口径，白名单豁免计入达标）:');
    const sortedModules = Object.entries(report.module_stats).sort((a, b) => b[1].total - a[1].total);
    for (const [mod, stats] of sortedModules) {
      const rate = stats.total > 0 ? Math.round((stats.standardized / stats.total) * 100) : 0;
      const bar = '█'.repeat(Math.floor(rate / 5)) + '░'.repeat(20 - Math.floor(rate / 5));
      const wlNote = stats.whitelisted > 0 ? ` (${stats.whitelisted}白名单)` : '';
      console.log(`  ${mod.padEnd(15)} ${bar} ${rate}% (${stats.standardized}/${stats.total})${wlNote}`);
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

    // V64.3: 全量 --strict 模式下，若标准化率不达标则失败
    // 阈值默认 95%，可通过 --threshold=N 覆盖
    const thresholdArg = args.find((a) => a.startsWith('--threshold='));
    const threshold = thresholdArg ? Number(thresholdArg.split('=')[1]) : 95;
    // 只列"非白名单且未标准化"的页面（白名单页面不报警）
    const notStandardizedPages = report.files.filter(
      (f) => !f.uses_template && !f.whitelisted
    );
    if (notStandardizedPages.length > 0) {
      console.log('');
      console.log(`未标准化纯页面清单（${notStandardizedPages.length} 个，不含白名单）：`);
      for (const f of notStandardizedPages) {
        const note = f.is_crud ? ' [CRUD]' : '';
        console.log(`  - ${f.module.padEnd(12)} ${f.file}${note}`);
      }
      console.log('');
      console.log('说明：特殊功能页（Login/Error/ForgotPassword/PerformanceTest）在白名单中豁免，');
      console.log('      re-export 包装和 components/hooks 子目录文件不参与审计。');
    }
    const whitelistedPages = report.files.filter((f) => f.whitelisted);
    if (whitelistedPages.length > 0) {
      console.log('');
      console.log(`白名单豁免页面（${whitelistedPages.length} 个）：`);
      for (const f of whitelistedPages) {
        console.log(`  ✓ ${f.module.padEnd(12)} ${f.file}`);
      }
    }

    console.log('');
    console.log('========================================');
    let failed = false;
    const reasons = [];
    if (strict && report.crud_new_without_template.length > 0) {
      reasons.push(`${report.crud_new_without_template.length} 个新建 CRUD 页未用标准模板`);
      failed = true;
    }
    if (strict && !diffOnly && report.standardization_rate < threshold) {
      reasons.push(`标准化率 ${report.standardization_rate}% 低于阈值 ${threshold}%`);
      failed = true;
    }
    if (failed) {
      console.log(`❌ 审计未通过（${reasons.join('；')}）`);
      console.log('========================================');
      process.exit(1);
    } else {
      console.log('✅ 审计完成');
      console.log('========================================');
    }
  }
}

main();
