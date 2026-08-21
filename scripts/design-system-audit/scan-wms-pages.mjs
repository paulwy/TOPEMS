import fs from 'fs';
import path from 'path';

const PAGES_DIR = '/Users/air/TOPEMS/apps/web/src/pages/wms';
const MIGRATED_DETAIL_PAGES = [
  'WmsInboundDetailPage.tsx',
  'WmsOutboundDetailPage.tsx',
  'WmsTransferDetailPage.tsx',
  'WmsInventoryMovementDetailPage.tsx',
  'WmsWavePickDetailPage.tsx',
  'WmsStockTakeDetailPage.tsx',
];

function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  const checks = {
    file: path.basename(filePath),
    lineCount: lines.length,
    usesPageContainer: /PageContainer/.test(content),
    usesDetailPageTemplate: /DetailPageTemplate/.test(content),
    usesCrudPage: /CrudPage/.test(content),
    usesListPageTemplate: /ListPageTemplate/.test(content),
    usesDashboardTemplate: /DashboardTemplate/.test(content),
    usesDataTable: /DataTable/.test(content),
    usesMuiComponents: /@mui\/material/.test(content),
    hasTailwindClasses: /className=['"][^'"]*(?:\b(?:p-|m-|flex|grid|space-|rounded|border|bg-|text-|font-|w-|h-|md:|lg:|sm:)\b)/.test(content),
    hasHardcodedDivs: /<div\s+className/.test(content),
    importsCount: (content.match(/^import /gm) || []).length,
  };

  // Determine template coverage
  const templateComponents = [
    checks.usesDetailPageTemplate,
    checks.usesCrudPage,
    checks.usesListPageTemplate,
    checks.usesDashboardTemplate,
  ];
  checks.usesAnyTemplate = templateComponents.some(Boolean);
  checks.usesPageContainerOrCrud = checks.usesPageContainer || checks.usesCrudPage;

  // Count Tailwind class occurrences
  const tailwindMatches = content.match(/className=['"][^'"]*(?:\b(?:p-|m-|flex|grid|space-|rounded|border|bg-|text-|font-|w-|h-|md:|lg:|sm:)\b)[^'"]*/g) || [];
  checks.tailwindClassOccurrences = tailwindMatches.length;

  // Determine recommendation
  if (checks.usesAnyTemplate && !checks.hasTailwindClasses) {
    checks.recommendation = 'already-migrated';
  } else if (checks.usesCrudPage || checks.usesListPageTemplate) {
    checks.recommendation = 'template-used-but-tailwind-remains';
  } else if (checks.file.toLowerCase().includes('dashboard') || checks.file.toLowerCase().includes('report') || checks.file.toLowerCase().includes('analysis')) {
    checks.recommendation = 'dashboard-or-analytics';
  } else {
    checks.recommendation = 'needs-migration';
  }

  return checks;
}

const files = fs
  .readdirSync(PAGES_DIR)
  .filter((f) => f.endsWith('Page.tsx') && !MIGRATED_DETAIL_PAGES.includes(f))
  .sort();

const results = files.map((f) => analyzeFile(path.join(PAGES_DIR, f)));

const summary = {
  total: results.length,
  alreadyMigrated: results.filter((r) => r.recommendation === 'already-migrated').length,
  templateWithTailwind: results.filter((r) => r.recommendation === 'template-used-but-tailwind-remains').length,
  dashboardOrAnalytics: results.filter((r) => r.recommendation === 'dashboard-or-analytics').length,
  needsMigration: results.filter((r) => r.recommendation === 'needs-migration').length,
};

const outputLines = [];
outputLines.push('# WMS 非 Detail 页面模板使用扫描报告');
outputLines.push('');
outputLines.push(`扫描时间：${new Date().toISOString()}`);
outputLines.push(`扫描目录：apps/web/src/pages/wms`);
outputLines.push(`排除已迁移的 6 个 Detail 页面`);
outputLines.push('');
outputLines.push('## 汇总');
outputLines.push('');
outputLines.push(`- 总页面数：${summary.total}`);
outputLines.push(`- 已使用模板且无 Tailwind：${summary.alreadyMigrated}`);
outputLines.push(`- 已使用模板但仍有 Tailwind：${summary.templateWithTailwind}`);
outputLines.push(`- Dashboard/报表/分析类：${summary.dashboardOrAnalytics}`);
outputLines.push(`- 需要迁移：${summary.needsMigration}`);
outputLines.push('');
outputLines.push('## 详细清单');
outputLines.push('');
outputLines.push('| 文件 | 行数 | PageContainer | CrudPage | ListPageTemplate | DashboardTemplate | DataTable | MUI | Tailwind | 建议 |');
outputLines.push('|------|------|---------------|----------|------------------|-------------------|-----------|-----|----------|------|');

for (const r of results) {
  const y = '✅';
  const n = '—';
  outputLines.push(
    `| ${r.file} | ${r.lineCount} | ${r.usesPageContainer ? y : n} | ${r.usesCrudPage ? y : n} | ${r.usesListPageTemplate ? y : n} | ${r.usesDashboardTemplate ? y : n} | ${r.usesDataTable ? y : n} | ${r.usesMuiComponents ? y : n} | ${r.hasTailwindClasses ? `${r.tailwindClassOccurrences} 处` : n} | ${r.recommendation} |`
  );
}

outputLines.push('');
outputLines.push('## 分类说明');
outputLines.push('');
outputLines.push('- **already-migrated**：已使用标准模板且无 Tailwind 类名，无需处理');
outputLines.push('- **template-used-but-tailwind-remains**：已接入 CrudPage/ListPageTemplate 但仍有部分 Tailwind 样式，可逐步清理');
outputLines.push('- **dashboard-or-analytics**：Dashboard/报表/分析类页面，建议根据设计系统评估是否使用 DashboardTemplate');
outputLines.push('- **needs-migration**：未使用任何标准模板，建议优先迁移');
outputLines.push('');

const recommendationOrder = ['needs-migration', 'template-used-but-tailwind-remains', 'dashboard-or-analytics'];
for (const rec of recommendationOrder) {
  const recResults = results.filter((r) => r.recommendation === rec);
  if (recResults.length === 0) continue;
  outputLines.push(`## ${rec === 'needs-migration' ? '需要迁移' : rec === 'template-used-but-tailwind-remains' ? '模板已接入但需清理 Tailwind' : 'Dashboard / 报表 / 分析'} 页面`);
  outputLines.push('');
  for (const r of recResults) {
    outputLines.push(`- ${r.file}`);
    if (r.tailwindClassOccurrences > 0) {
      outputLines.push(`  - Tailwind 类名出现 ${r.tailwindClassOccurrences} 次`);
    }
    if (!r.usesAnyTemplate) {
      outputLines.push(`  - 未使用任何标准模板`);
    }
  }
  outputLines.push('');
}

const output = outputLines.join('\n');
const outPath = '/Users/air/TOPEMS/scripts/design-system-audit/reports/wms-pages-template-scan.md';
fs.writeFileSync(outPath, output);
console.log(output);
console.log(`\n报告已保存：${outPath}`);
