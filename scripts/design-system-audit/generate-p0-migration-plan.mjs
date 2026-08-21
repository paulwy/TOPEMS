#!/usr/bin/env node
/**
 * P0 模块迁移方案文档生成器
 *
 * 输入：reports/p0-migration-analysis.json
 * 输出：reports/p0-migration-plan.md
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPORTS_DIR = path.resolve(__dirname, 'reports');
const INPUT_JSON = path.join(REPORTS_DIR, 'p0-migration-analysis.json');
const OUTPUT_MD = path.join(REPORTS_DIR, 'p0-migration-plan.md');

function main() {
  if (!fs.existsSync(INPUT_JSON)) {
    console.error(`❌ 找不到输入文件：${INPUT_JSON}`);
    console.error('请先运行 analyze-p0-migration.mjs 生成分析数据。');
    process.exit(1);
  }

  const analyses = JSON.parse(fs.readFileSync(INPUT_JSON, 'utf-8'));

  // 统计
  const totalPages = analyses.length;
  const byModule = analyses.reduce((acc, item) => {
    if (!acc[item.module]) acc[item.module] = [];
    acc[item.module].push(item);
    return acc;
  }, {});

  const byComplexity = analyses.reduce((acc, item) => {
    acc[item.complexity] = (acc[item.complexity] || 0) + 1;
    return acc;
  }, {});

  const byTemplate = analyses.reduce((acc, item) => {
    acc[item.recommendedTemplate] = (acc[item.recommendedTemplate] || 0) + 1;
    return acc;
  }, {});

  const complexityEffort = {
    低: { min: 0.5, max: 1, mid: 0.75 },
    中: { min: 1, max: 2, mid: 1.5 },
    高: { min: 2, max: 4, mid: 3 },
  };

  let totalMinDays = 0;
  let totalMaxDays = 0;
  let totalMidDays = 0;
  for (const item of analyses) {
    const effort = complexityEffort[item.complexity];
    totalMinDays += effort.min;
    totalMaxDays += effort.max;
    totalMidDays += effort.mid;
  }

  let md = `# TOPEMS P0 模块页面模板迁移方案

> 生成时间：${new Date().toISOString()}
> 范围：MES / WMS / ERP 三个 P0 模块中未使用标准模板的页面
> 数据来源：scripts/design-system-audit/reports/p0-migration-analysis.json

---

## 1. 总体概况

| 指标 | 数值 |
|------|------|
| P0 未使用模板页面总数 | **${totalPages}** |
| 涉及模块 | MES、WMS、ERP |
| 高复杂度页面 | ${byComplexity['高'] || 0} |
| 中复杂度页面 | ${byComplexity['中'] || 0} |
| 低复杂度页面 | ${byComplexity['低'] || 0} |
| 预估总工作量 | ${totalMinDays.toFixed(1)} - ${totalMaxDays.toFixed(1)} 人天（约 ${totalMidDays.toFixed(1)} 人天） |

### 1.1 按模块分布

| 模块 | 页面数 | 高/中/低复杂度 |
|------|--------|----------------|
`;

  for (const module of Object.keys(byModule).sort()) {
    const items = byModule[module];
    const complexityBreakdown = items.reduce((acc, item) => {
      acc[item.complexity] = (acc[item.complexity] || 0) + 1;
      return acc;
    }, {});
    md += `| ${module.toUpperCase()} | ${items.length} | 高 ${complexityBreakdown['高'] || 0} / 中 ${complexityBreakdown['中'] || 0} / 低 ${complexityBreakdown['低'] || 0} |\n`;
  }

  md += `
### 1.2 推荐模板分布

| 推荐模板 | 页面数 |
|----------|--------|
`;

  for (const [template, count] of Object.entries(byTemplate).sort((a, b) => b[1] - a[1])) {
    md += `| ${template} | ${count} |\n`;
  }

  md += `
---

## 2. 迁移策略总览

### 2.1 整体原则

1. **先低后高**：先完成低复杂度页面（1 个），建立迁移范例；再处理中复杂度（9 个）；最后攻克高复杂度（21 个）。
2. **按模块集中处理**：建议同一模块内连续迁移，便于发现共性问题并抽象公共组件。
3. **保留业务逻辑**：迁移只调整页面结构和组件使用方式，不改动 API 层和数据模型。
4. **分步验收**：每迁移 3-5 个页面进行一次设计走查和回归测试。

### 2.2 推荐迁移顺序

| 阶段 | 目标页面 | 周期 | 验收标准 |
|------|----------|------|----------|
| 第 1 阶段 | 低复杂度 + 部分中复杂度页面 | 1 周 | 完成 5-6 页，建立迁移范例 |
| 第 2 阶段 | MES 中低复杂度页面 | 1-2 周 | MES 完成 50% |
| 第 3 阶段 | WMS 中低复杂度页面 | 1-2 周 | WMS 完成 50% |
| 第 4 阶段 | ERP 全部 + 剩余 MES/WMS | 1-2 周 | P0 模块完成 100% |
| 第 5 阶段 | 高复杂度页面（图表/多 Tab/Dialog 密集） | 2-3 周 | 全部完成并通过走查 |

### 2.3 通用迁移步骤

每页迁移建议按以下步骤执行：

1. **备份与基线**：复制当前页面为 .backup.tsx，记录当前行为。
2. **选择模板**：根据页面类型选择 DashboardTemplate / StatsPageTemplate / CrudPage / ListPageTemplate。
3. **调整页面根结构**：使用 PageContainer 包裹，按模板要求组织 PageHeader、内容区、操作区。
4. **替换表格**：MUI Table → DataTable（直接替换或接入 CrudPage）。
5. **替换按钮**：MUI Button → ActionButton。
6. **整理表单/弹窗**：Dialog 表单迁移为 CrudPage 的 create/edit 或独立 FormPageTemplate。
7. **整理图表**：将图表封装为 StatCardComponent / ChartCardComponent。
8. **替换硬编码样式**：颜色/间距/字号改为 designTokens / semanticTokens。
9. **回归测试**：验证数据加载、筛选、导出、弹窗、移动端等核心流程。
10. **设计走查**：确认视觉一致性和交互完整性。

---

## 3. 逐页迁移方案

`;

  for (const module of Object.keys(byModule).sort()) {
    const items = byModule[module];
    md += `## ${module.toUpperCase()} 模块（${items.length} 个页面）\n\n`;

    for (const item of items) {
      md += `### ${item.basename}\n\n`;
      md += `- **文件路径**：${item.file}\n`;
      md += `- **代码行数**：${item.lineCount} 行\n`;
      md += `- **复杂度**：${item.complexity}\n`;
      md += `- **预估工作量**：${item.effortDays}\n`;
      md += `- **推荐模板**：${item.recommendedTemplate}\n\n`;

      md += '**当前结构特征：**\n\n';
      md += '| 特征 | 状态 |\n|------|------|\n';
      md += `| PageContainer | ${item.hasPageContainer ? '已使用' : '未使用'} |\n`;
      md += `| MUI Table | ${item.hasMuiTable ? '已使用' : '未使用'} |\n`;
      md += `| DataTable | ${item.hasDataTable ? '已使用' : '未使用'} |\n`;
      md += `| Tabs | ${item.hasTabs ? '已使用' : '未使用'} |\n`;
      md += `| Dialog | ${item.hasDialog ? '已使用' : '未使用'} |\n`;
      md += `| Form 控件 | ${item.hasForm ? '已使用' : '未使用'} |\n`;
      md += `| 图表 | ${item.hasCharts ? '已使用' : '未使用'} |\n`;
      md += `| Card / Grid 布局 | ${item.hasCards || item.hasGrid ? '已使用' : '未使用'} |\n`;
      md += `| useQuery 数量 | ${item.useQueryCount} |\n`;
      md += `| useMutation 数量 | ${item.useMutationCount} |\n`;
      md += `| 主要 MUI 组件 | ${item.muiImports || '-'} |\n\n`;

      md += '**迁移步骤：**\n\n';
      item.migrationSteps.forEach((step, index) => {
        md += `${index + 1}. ${step}\n`;
      });
      md += '\n';

      md += '**风险与注意事项：**\n\n';
      item.risks.forEach((risk) => {
        md += `- ${risk}\n`;
      });
      md += '\n---\n\n';
    }
  }

  md += `## 4. 关键共性问题

基于 31 个 P0 页面的分析，发现以下共性：

### 4.1 表格未统一

- 21 个页面使用 MUI Table，仅少量使用 DataTable
- **建议**：统一迁移到 DataTable 或通过 CrudPage 使用列表能力

### 4.2 自定义 Dashboard/Stats 页面多

- MES analytics 页面、WMS analytics 页面多为统计报表
- **建议**：统一使用 StatsPageTemplate，图表使用 ChartCardComponent

### 4.3 Detail 页面分散

- WMS 多个 Detail 页面（Inbound/Outbound/Transfer 等）结构相似
- **建议**：抽象为统一的 DetailLayout 或接入 CrudPage 详情能力

### 4.4 硬编码样式

- 多个页面直接使用 designTokens.colors.xxx 或硬编码颜色
- **建议**：统一使用 semanticTokens，便于主题切换

### 4.5 弹窗表单

- AnomalyDetectionPage、ApsSchedulingPage 等使用 Dialog 承载表单
- **建议**：评估是否迁移为 CrudPage 的编辑能力或独立 FormPageTemplate

---

## 5. 实施建议

### 5.1 人员安排

| 角色 | 人数 | 职责 |
|------|------|------|
| 前端开发 | 2-3 人 | 执行页面迁移 |
| 设计师 | 1 人 | 走查和视觉验收 |
| QA | 1 人 | 回归测试 |

### 5.2 时间节点

- 第 1 周：完成低复杂度 + 5 个中复杂度页面
- 第 2-3 周：完成 MES/WMS 大部分中低复杂度页面
- 第 4-5 周：完成 ERP 全部 + 剩余 MES/WMS
- 第 6-7 周：完成高复杂度页面和整体回归

### 5.3 验收标准

- [ ] 31 个 P0 页面全部使用标准模板
- [ ] 无 MUI Table 直接用于数据列表（特殊布局除外）
- [ ] 所有页面均使用 PageContainer
- [ ] 无 P0/P1 级回归 Bug
- [ ] 设计走查通过率达到 100%

---

## 6. 附录

### 6.1 相关脚本与文档

- 扫描脚本：scripts/design-system-audit/scan.mjs
- P0 分析脚本：scripts/design-system-audit/analyze-p0-migration.mjs
- 分析数据：scripts/design-system-audit/reports/p0-migration-analysis.json
- 总体迁移清单：scripts/design-system-audit/reports/migration-list.md
- 实施规划：design-system-implementation-plan.md

### 6.2 模板选型速查

| 页面类型 | 推荐模板 | 备注 |
|----------|----------|------|
| 统计看板 / 报表 | StatsPageTemplate | 含图表卡片 |
| 数据列表 / CRUD | CrudPage / ListPageTemplate | 优先 CrudPage |
| 详情展示 | DetailPageTemplate / CrudPage detail | 数据量小用 DetailPageTemplate |
| 看板 | KanbanPageTemplate | 状态流转 |
| Dashboard 入口 | DashboardTemplate | 首页/概览 |

---

*本方案基于代码扫描结果自动生成，具体迁移前需结合业务需求和页面实际交互进行人工复核。*
`;

  fs.writeFileSync(OUTPUT_MD, md, 'utf-8');

  console.log('✅ P0 模块迁移方案文档生成完成');
  console.log(`   页面数：${totalPages}`);
  console.log(`   预估工作量：${totalMinDays.toFixed(1)} - ${totalMaxDays.toFixed(1)} 人天`);
  console.log(`   输出文件：${OUTPUT_MD}`);
}

main();
