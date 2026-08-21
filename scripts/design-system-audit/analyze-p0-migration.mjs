#!/usr/bin/env node
/**
 * P0 模块（MES/WMS/ERP）未使用模板页面迁移分析器
 *
 * 输入：reports/page-template-map.csv
 * 输出：reports/p0-migration-analysis.json
 *
 * 功能：
 *   - 读取 P0 模块未使用模板的页面源码
 *   - 提取关键结构特征（布局、表格、表单、图表、弹窗、标签页等）
 *   - 生成每页的迁移难度评估与推荐方案
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPORTS_DIR = path.resolve(__dirname, 'reports');
const PAGES_DIR = path.resolve(__dirname, '../../apps/web/src/pages');
const INPUT_CSV = path.join(REPORTS_DIR, 'page-template-map.csv');
const OUTPUT_JSON = path.join(REPORTS_DIR, 'p0-migration-analysis.json');

const P0_MODULES = ['mes', 'wms', 'erp'];

function parseCsv(content) {
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (const char of lines[i]) {
      if (char === '"' && !inQuotes) {
        inQuotes = true;
      } else if (char === '"' && inQuotes) {
        inQuotes = false;
      } else if (char === ',' && !inQuotes) {
        values.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current);

    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ? values[index].replace(/^"|"$/g, '').replace(/""/g, '"') : '';
    });
    rows.push(row);
  }

  return rows;
}

function analyzePage(filePath, row) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const basename = path.basename(filePath, '.tsx');

  // 基础特征检测
  const hasPageContainer = /<\/?PageContainer\b/.test(content);
  const hasMuiTable = /import\s+\{[^}]*\bTable\b/.test(content) || /<Table\b/.test(content);
  const hasDataTable = /<\/?DataTable\b/.test(content);
  const hasTabs = /<\/?Tabs\b/.test(content);
  const hasDialog = /<\/?Dialog\b/.test(content);
  const hasForm = /<\/?TextField\b/.test(content) || /<\/?FormControl\b/.test(content);
  const hasCharts = /recharts|echarts|chart|Chart/.test(content);
  const hasCards = /<\/?Card\b/.test(content);
  const hasGrid = /<\/?Grid\b/.test(content);
  const hasMuiButtons = /<\/?Button\b/.test(content);

  // 检测主要 MUI 组件
  const muiImports = [];
  const muiImportRegex = /import\s+\{([^}]+)\}\s+from\s+['"]@mui\/material['"];?/g;
  let match;
  while ((match = muiImportRegex.exec(content)) !== null) {
    const names = match[1].split(',').map((n) => n.trim().split(/\s+/)[0]);
    muiImports.push(...names);
  }

  // API hooks 数量
  const useQueryCount = (content.match(/useQuery\s*\(/g) || []).length;
  const useMutationCount = (content.match(/useMutation\s*\(/g) || []).length;

  // 代码行数
  const lineCount = content.split('\n').length;

  // 复杂度评分
  let complexityScore = 0;
  if (lineCount > 300) complexityScore += 1;
  if (lineCount > 500) complexityScore += 1;
  if (hasTabs) complexityScore += 1;
  if (hasDialog) complexityScore += 1;
  if (hasCharts) complexityScore += 1;
  if (useQueryCount > 3) complexityScore += 1;
  if (useMutationCount > 1) complexityScore += 1;
  if (!hasPageContainer) complexityScore += 2;
  if (!hasCards && !hasGrid) complexityScore += 1;

  const complexity = complexityScore >= 4 ? '高' : complexityScore >= 2 ? '中' : '低';

  // 推荐模板
  let recommendedTemplate = 'crud / list';
  const lowerBasename = basename.toLowerCase();

  if (lowerBasename.includes('dashboard') || lowerBasename.includes('overview')) {
    recommendedTemplate = 'dashboard';
  } else if (lowerBasename.includes('analytics') || lowerBasename.includes('report')) {
    recommendedTemplate = 'stats';
  } else if (lowerBasename.includes('detail')) {
    recommendedTemplate = hasMuiTable ? 'crud / detail' : 'detail';
  } else if (lowerBasename.includes('kanban')) {
    recommendedTemplate = 'kanban';
  } else if (lowerBasename.includes('detection') || lowerBasename.includes('management')) {
    recommendedTemplate = hasTabs ? 'stats' : 'crud / list';
  }

  // 特定调整
  if (lowerBasename.includes('schedule') || lowerBasename.includes('scheduling')) {
    recommendedTemplate = 'stats';
  }
  if (lowerBasename.includes('cost') || lowerBasename.includes('energy')) {
    recommendedTemplate = hasTabs ? 'stats' : 'crud / list';
  }

  // 迁移策略
  const migrationSteps = [];
  migrationSteps.push(`将页面外层替换为 ${recommendedTemplate === 'dashboard' ? 'DashboardTemplate' : recommendedTemplate === 'stats' ? 'StatsPageTemplate' : 'CrudPage / ListPageTemplate'}`);

  if (hasMuiTable && !hasDataTable) {
    migrationSteps.push('将 MUI Table 替换为 DataTable 或接入 CrudPage 的列表能力');
  }

  if (hasPageContainer) {
    migrationSteps.push('保留 PageContainer 作为内容容器，或根据模板要求调整布局层级');
  } else {
    migrationSteps.push('补充 PageContainer 作为页面根容器');
  }

  if (hasTabs) {
    migrationSteps.push('将 Tabs 内容拆分为独立子组件，按模板 slot 组织');
  }

  if (hasDialog) {
    migrationSteps.push('将 Dialog 表单迁移为 CrudPage 的 create/edit 能力或独立 FormPageTemplate');
  }

  if (hasCharts) {
    migrationSteps.push('将图表封装为 StatCardComponent / ChartCardComponent');
  }

  if (hasMuiButtons) {
    migrationSteps.push('将 MUI Button 替换为 ActionButton');
  }

  migrationSteps.push('将硬编码颜色/间距替换为 designTokens / semanticTokens');

  // 风险
  const risks = [];
  if (complexity === '高') risks.push('页面复杂度高，建议分阶段迁移');
  if (hasCharts) risks.push('图表依赖需确认与模板图表组件兼容性');
  if (hasDialog) risks.push('弹窗交互逻辑需完整回归');
  if (!hasPageContainer) risks.push('缺少 PageContainer，需同步调整布局');
  if (useQueryCount > 4) risks.push('数据查询多，迁移后需验证缓存策略');

  return {
    file: row.file,
    module: row.module,
    basename,
    lineCount,
    hasPageContainer,
    hasMuiTable,
    hasDataTable,
    hasTabs,
    hasDialog,
    hasForm,
    hasCharts,
    hasCards,
    hasGrid,
    useQueryCount,
    useMutationCount,
    muiImports: muiImports.join(', '),
    complexity,
    recommendedTemplate,
    migrationSteps,
    risks: risks.length > 0 ? risks : ['风险较低'],
    effortDays: complexity === '高' ? '2-4 天' : complexity === '中' ? '1-2 天' : '0.5-1 天',
  };
}

function main() {
  if (!fs.existsSync(INPUT_CSV)) {
    console.error(`❌ 找不到输入文件：${INPUT_CSV}`);
    process.exit(1);
  }

  const rows = parseCsv(fs.readFileSync(INPUT_CSV, 'utf-8'));
  const p0Pages = rows.filter(
    (row) => P0_MODULES.includes(row.module) && row.hasTemplate === 'no'
  );

  const analyses = [];
  for (const row of p0Pages) {
    const filePath = path.resolve(process.cwd(), row.file);
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️ 文件不存在：${row.file}`);
      continue;
    }
    analyses.push(analyzePage(filePath, row));
  }

  // 按模块和复杂度排序
  analyses.sort((a, b) => {
    if (a.module !== b.module) return a.module.localeCompare(b.module);
    const complexityOrder = { 高: 0, 中: 1, 低: 2 };
    return complexityOrder[a.complexity] - complexityOrder[b.complexity];
  });

  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(analyses, null, 2), 'utf-8');

  console.log('✅ P0 模块迁移分析完成');
  console.log(`   分析页面数：${analyses.length}`);
  console.log(`   高复杂度：${analyses.filter((a) => a.complexity === '高').length}`);
  console.log(`   中复杂度：${analyses.filter((a) => a.complexity === '中').length}`);
  console.log(`   低复杂度：${analyses.filter((a) => a.complexity === '低').length}`);
  console.log(`   输出文件：${OUTPUT_JSON}`);
}

main();
