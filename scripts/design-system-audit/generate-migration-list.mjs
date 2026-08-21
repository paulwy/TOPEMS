#!/usr/bin/env node
/**
 * 未使用模板页面迁移清单生成器
 *
 * 输入：reports/page-template-map.csv
 * 输出：reports/migration-list.md
 *
 * 功能：
 *   - 筛选未使用标准模板的页面
 *   - 按模块优先级分组（P0/P1/P2/P3）
 *   - 根据文件名推断推荐模板类型
 *   - 生成分模块迁移清单与汇总统计
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPORTS_DIR = path.resolve(__dirname, 'reports');
const INPUT_CSV = path.join(REPORTS_DIR, 'page-template-map.csv');
const OUTPUT_MD = path.join(REPORTS_DIR, 'migration-list.md');

// 模块迁移优先级映射
const MODULE_PRIORITY = {
  // P0：核心业务，页面最多，迁移收益最大
  mes: 'P0',
  wms: 'P0',
  erp: 'P0',

  // P1：重要业务模块
  crm: 'P1',
  finance: 'P1',
  hrm: 'P1',
  qms: 'P1',

  // P2：中等优先级
  rd: 'P2',
  pdm: 'P2',
  scm: 'P2',
  srm: 'P2',
  lims: 'P2',
  aps: 'P2',
  tms: 'P2',
  ehs: 'P2',

  // P3：长尾模块
  admin: 'P3',
  bi: 'P3',
  report: 'P3',
  ai: 'P3',
  gis: 'P3',
  mobile: 'P3',
  monitor: 'P3',
  notification: 'P3',
  oa: 'P3',
  doc: 'P3',
  workflow: 'P3',
  pm: 'P3',
  lowcode: 'P3',
  plugin: 'P3',
  integration: 'P3',
  automation: 'P3',
  iam: 'P3',
  im: 'P3',
  ticket: 'P3',
  help: 'P3',
  asset: 'P3',
  system: 'P3',
  desktop: 'P3',
  performance: 'P3',
  shared: 'P3',
  _shared: 'P3',
};

const PRIORITY_ORDER = { P0: 0, P1: 1, P2: 2, P3: 3 };

// 根据文件名推断推荐模板类型
function inferTemplateType(filePath) {
  const basename = path.basename(filePath, '.tsx').toLowerCase();

  if (basename.includes('dashboard') || basename.includes('overview') || basename.includes('home')) {
    return 'dashboard';
  }
  if (basename.includes('wizard') || basename.includes('onboarding') || basename.includes('setup')) {
    return 'wizard';
  }
  if (basename.includes('kanban') || basename.includes('board')) {
    return 'kanban';
  }
  if (basename.includes('timeline') || basename.includes('history') || basename.includes('version')) {
    return 'timeline';
  }
  if (basename.includes('settings') || basename.includes('config') || basename.includes('preference')) {
    return 'settings';
  }
  if (basename.includes('stats') || basename.includes('analytics') || basename.includes('report')) {
    return 'stats';
  }
  if (basename.includes('map') || basename.includes('gis') || basename.includes('tracking')) {
    return 'gis-map';
  }
  if (basename.includes('card') || basename.includes('gallery')) {
    return 'card-list';
  }
  if (basename.includes('tree') || basename.includes('structure') || basename.includes('organization')) {
    return 'tree';
  }
  if (basename.includes('detail') || basename.includes('view')) {
    return 'crud / detail';
  }
  if (basename.includes('create') || basename.includes('edit') || basename.includes('form')) {
    return 'crud / form';
  }
  if (basename.includes('list') || basename.includes('management') || basename.includes('page')) {
    return 'crud / list';
  }

  return 'crud（需进一步确认）';
}

// 根据文件名推断迁移复杂度
function inferComplexity(filePath, commonComponentCount) {
  const basename = path.basename(filePath, '.tsx');
  const hasComplexPattern = /Dashboard|Report|Analytics|Wizard|Kanban|Map|Gis|Timeline/i.test(basename);
  const hasMediumPattern = /Detail|Create|Edit|Form|Settings|Config/i.test(basename);

  if (hasComplexPattern || commonComponentCount === 0) return '高';
  if (hasMediumPattern) return '中';
  return '低';
}

function inferEffort(complexity) {
  switch (complexity) {
    case '高':
      return '2-4 天';
    case '中':
      return '1-2 天';
    default:
      return '0.5-1 天';
  }
}

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

function main() {
  if (!fs.existsSync(INPUT_CSV)) {
    console.error(`❌ 找不到输入文件：${INPUT_CSV}`);
    console.error('请先运行 scan.mjs 生成扫描报告。');
    process.exit(1);
  }

  const content = fs.readFileSync(INPUT_CSV, 'utf-8');
  const rows = parseCsv(content);

  // 筛选未使用模板的页面
  const nonTemplatePages = rows
    .filter((row) => row.hasTemplate === 'no')
    .map((row) => {
      const module = row.module || 'unknown';
      const priority = MODULE_PRIORITY[module] || 'P3';
      const recommendedTemplate = inferTemplateType(row.file);
      const complexity = inferComplexity(row.file, parseInt(row.commonComponentCount || '0', 10));
      const effort = inferEffort(complexity);

      return {
        ...row,
        priority,
        recommendedTemplate,
        complexity,
        effort,
      };
    });

  // 按优先级、模块、文件排序
  nonTemplatePages.sort((a, b) => {
    const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    if (a.module !== b.module) return a.module.localeCompare(b.module);
    return a.file.localeCompare(b.file);
  });

  // 统计
  const totalPages = rows.length;
  const nonTemplateCount = nonTemplatePages.length;
  const byPriority = nonTemplatePages.reduce((acc, page) => {
    acc[page.priority] = (acc[page.priority] || 0) + 1;
    return acc;
  }, {});

  const byModule = nonTemplatePages.reduce((acc, page) => {
    if (!acc[page.module]) acc[page.module] = { count: 0, priority: page.priority };
    acc[page.module].count += 1;
    return acc;
  }, {});

  const moduleList = Object.entries(byModule)
    .map(([module, info]) => ({ module, ...info }))
    .sort((a, b) => {
      const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.count - a.count;
    });

  // 生成 Markdown
  let md = `# TOPEMS 未使用模板页面迁移清单

> 生成时间：${new Date().toISOString()}
> 数据来源：scripts/design-system-audit/reports/page-template-map.csv
> 筛选条件：hasTemplate = no

---

## 1. 总体概况

| 指标 | 数值 |
|------|------|
| 扫描页面总数 | ${totalPages} |
| 未使用模板页面数 | **${nonTemplateCount}** |
| 未使用模板占比 | ${((nonTemplateCount / totalPages) * 100).toFixed(1)}% |

### 按优先级分布

| 优先级 | 页面数 | 占比 | 说明 |
|--------|--------|------|------|
| P0 | ${byPriority.P0 || 0} | ${(((byPriority.P0 || 0) / nonTemplateCount) * 100).toFixed(1)}% | MES / WMS / ERP，优先处理 |
| P1 | ${byPriority.P1 || 0} | ${(((byPriority.P1 || 0) / nonTemplateCount) * 100).toFixed(1)}% | CRM / Finance / HRM / QMS |
| P2 | ${byPriority.P2 || 0} | ${(((byPriority.P2 || 0) / nonTemplateCount) * 100).toFixed(1)}% | RD / PDM / SCM / SRM / LIMS / APS / TMS / EHS |
| P3 | ${byPriority.P3 || 0} | ${(((byPriority.P3 || 0) / nonTemplateCount) * 100).toFixed(1)}% | 长尾模块 |

### 按模块分布（TOP20）

| 优先级 | 模块 | 未使用模板页面数 |
|--------|------|------------------|
`;

  for (const item of moduleList.slice(0, 20)) {
    md += `| ${item.priority} | ${item.module} | ${item.count} |\n`;
  }

  md += `
### 迁移工作量预估

| 复杂度 | 页面数 | 单页工作量 | 总工作量估算 |
|--------|--------|------------|--------------|
`;

  const complexityCount = nonTemplatePages.reduce((acc, page) => {
    acc[page.complexity] = (acc[page.complexity] || 0) + 1;
    return acc;
  }, {});

  const complexityEffort = {
    低: { unit: '0.75 天', multiplier: 0.75 },
    中: { unit: '1.5 天', multiplier: 1.5 },
    高: { unit: '3 天', multiplier: 3 },
  };

  let totalEffortDays = 0;
  for (const [complexity, count] of Object.entries(complexityCount).sort()) {
    const { unit, multiplier } = complexityEffort[complexity];
    const subtotal = count * multiplier;
    totalEffortDays += subtotal;
    md += `| ${complexity} | ${count} | ${unit} | 约 ${subtotal.toFixed(1)} 人天 |\n`;
  }

  md += `| **合计** | **${nonTemplateCount}** | - | **约 ${totalEffortDays.toFixed(1)} 人天** |\n`;

  md += `
---

## 2. 迁移路线图建议

### 第一波：P0 模块（${byPriority.P0 || 0} 个页面）

目标模块：MES、WMS、ERP
建议周期：2-3 周
验收标准：
- [ ] P0 模块未使用模板页面 100% 完成迁移
- [ ] 迁移后无 P0/P1 级回归 Bug
- [ ] 所有迁移页面通过设计走查

### 第二波：P1 模块（${byPriority.P1 || 0} 个页面）

目标模块：CRM、Finance、HRM、QMS
建议周期：3-4 周
验收标准：
- [ ] P1 模块未使用模板页面 80% 完成迁移
- [ ] 优先处理列表/详情/表单类高频页面

### 第三波：P2 模块（${byPriority.P2 || 0} 个页面）

目标模块：RD、PDM、SCM、SRM、LIMS、APS、TMS、EHS
建议周期：4-6 周
验收标准：
- [ ] P2 模块未使用模板页面 50% 完成迁移

### 第四波：P3 模块（${byPriority.P3 || 0} 个页面）

目标模块：其他长尾模块
建议周期：按业务需求择机处理

---

## 3. 详细迁移清单

`;

  // 按优先级分组输出
  for (const priority of ['P0', 'P1', 'P2', 'P3']) {
    const pagesInPriority = nonTemplatePages.filter((p) => p.priority === priority);
    if (pagesInPriority.length === 0) continue;

    md += `### ${priority} 优先级（${pagesInPriority.length} 个页面）\n\n`;

    // 按模块分组
    const byModuleInPriority = pagesInPriority.reduce((acc, page) => {
      if (!acc[page.module]) acc[page.module] = [];
      acc[page.module].push(page);
      return acc;
    }, {});

    for (const module of Object.keys(byModuleInPriority).sort()) {
      const pages = byModuleInPriority[module];
      md += `#### ${module}（${pages.length} 个）\n\n`;
      md += '| 文件 | 推荐模板 | 当前公共组件 | 复杂度 | 预估工作量 | 备注 |\n';
      md += '|------|----------|--------------|--------|------------|------|\n';

      for (const page of pages) {
        const fileShort = page.file.replace(`apps/web/src/pages/${page.module}/`, '');
        const commonComponents = page.commonComponents === 'none' ? '-' : page.commonComponents;
        const notes = [];

        if (page.commonComponents === 'none') notes.push('无公共组件，迁移成本高');
        if (page.usesPageContainer === 'yes') notes.push('已有 PageContainer');
        if (page.usesDataTable === 'yes') notes.push('已用 DataTable');

        md += `| ${fileShort} | ${page.recommendedTemplate} | ${commonComponents} | ${page.complexity} | ${page.effort} | ${notes.join('；') || '-'} |\n`;
      }

      md += '\n';
    }
  }

  md += `---

## 4. 迁移决策指南

### 4.1 推荐模板选择逻辑

| 文件名特征 | 推荐模板 | 说明 |
|------------|----------|------|
| Dashboard / Overview / Home | dashboard | 统计看板类 |
| List / Management / Page | crud / list | 数据列表类，优先用 CrudPage |
| Detail / View | crud / detail | 详情展示类 |
| Create / Edit / Form | crud / form | 表单编辑类 |
| Settings / Config / Preference | settings | 设置页 |
| Stats / Analytics / Report | stats | 统计分析页 |
| Kanban / Board | kanban | 看板页 |
| Timeline / History / Version | timeline | 时间轴页 |
| Map / Gis / Tracking | gis-map | GIS 地图页 |
| Wizard / Onboarding / Setup | wizard | 分步向导页 |
| Tree / Structure / Organization | tree | 树形结构页 |
| 其他 | crud（需确认） | 默认建议，需人工复核 |

### 4.2 迁移注意事项

1. **优先迁移已有 PageContainer 的页面**：这些页面布局基础较好，迁移成本低。
2. **使用 DataTable 的页面**：若当前已直接用 DataTable，可考虑直接接入 CrudPage 或 ListPageTemplate。
3. **无公共组件的页面**：需要额外评估是否先抽象公共组件再迁移。
4. **Dashboard 类页面**：统一接入 DashboardTemplate，统计卡片使用 StatCardComponent。
5. **AI / BI / GIS 等特殊页面**：注意 Cyber 主题和常规主题的视觉差异。

---

## 5. 附录

### 5.1 优先级定义

| 优先级 | 模块 | 理由 |
|--------|------|------|
| P0 | MES、WMS、ERP | 页面最多，业务核心，模板迁移收益最大 |
| P1 | CRM、Finance、HRM、QMS | 高频使用，列表/详情/表单典型 |
| P2 | RD、PDM、SCM、SRM、LIMS、APS、TMS、EHS | 中等优先级，按业务节奏处理 |
| P3 | 其他 | 页面较少或低频，择机处理 |

### 5.2 相关文件

- 扫描脚本：scripts/design-system-audit/scan.mjs
- 扫描报告：scripts/design-system-audit/reports/page-template-map.csv
- 实施规划：design-system-implementation-plan.md
- 资产盘点：design-inventory-and-template-analysis.md

---

*本清单基于正则扫描结果自动生成，推荐模板类型和复杂度仅为初步判断，实际迁移前需人工复核。*
`;

  fs.writeFileSync(OUTPUT_MD, md, 'utf-8');

  console.log('✅ 迁移清单生成完成');
  console.log(`   未使用模板页面：${nonTemplateCount} / ${totalPages}`);
  console.log(`   P0：${byPriority.P0 || 0} | P1：${byPriority.P1 || 0} | P2：${byPriority.P2 || 0} | P3：${byPriority.P3 || 0}`);
  console.log(`   预估总工作量：约 ${totalEffortDays.toFixed(1)} 人天`);
  console.log(`   输出文件：${OUTPUT_MD}`);
}

main();
