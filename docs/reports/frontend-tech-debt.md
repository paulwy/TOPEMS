# 前端技术债务统计报告

**统计目录**: `/Users/air/TOPEMS/apps/web/src`

**统计日期**: 2026-07-05

---

## 一、总体概览

| 指标 | 数量 |
|------|------|
| 总文件数 | 1249 |
| 总代码行数 | 454,610 |
| 总函数数（估算） | 3,869 |
| `any` 类型使用 | 702 |
| `@ts-ignore` / `@ts-nocheck` | 5 |
| `console.log` | 0 |
| `console.error` | 122 |
| `console.warn` | 2 |
| `eslint-disable` | 12 |
| `// TODO` | 5 |
| `// FIXME` | 0 |
| `// HACK` | 0 |
| 硬编码颜色值 | 1511 |

## 二、各子目录代码行数统计

| 子目录 | 文件数 | 代码行数 | 函数数（估算） |
|--------|--------|----------|----------------|
| `pages` | 386 | 260,225 | 2,160 |
| `components` | 332 | 102,255 | 816 |
| `api` | 324 | 50,290 | 312 |
| `hooks` | 39 | 9,657 | 386 |
| `routes` | 39 | 7,852 | 13 |
| `lib` | 46 | 6,245 | 33 |
| `modules` | 12 | 2,858 | 25 |
| `types` | 8 | 2,711 | 0 |
| `utils` | 15 | 2,373 | 39 |
| `config` | 10 | 2,123 | 21 |
| `services` | 2 | 1,781 | 2 |
| `store` | 11 | 1,421 | 3 |
| `theme` | 7 | 1,161 | 2 |
| `context` | 2 | 970 | 9 |
| `constants` | 5 | 783 | 16 |
| `docs` | 1 | 674 | 22 |
| `(root)` | 4 | 490 | 8 |
| `@types` | 3 | 490 | 0 |
| `test` | 2 | 201 | 1 |
| `i18n` | 1 | 50 | 1 |

## 三、技术债务最严重的 Top 10 文件

| 排名 | 文件 | 债务评分 | any | ts-ignore | console.log | eslint-disable | TODO/FIXME/HACK | 硬编码颜色 | 行数 |
|------|------|----------|-----|-----------|-------------|----------------|-----------------|------------|------|
| 1 | `pages/hrm/HrmEmployeePage.tsx` | 59 | 19 | 0 | 0 | 0 | 0 | 2 | 1644 |
| 2 | `components/dashboard/ModuleCard.tsx` | 45 | 0 | 0 | 0 | 0 | 0 | 45 | 208 |
| 3 | `pages/lims/LimsTaskPage.tsx` | 44 | 12 | 0 | 0 | 0 | 0 | 8 | 1077 |
| 4 | `pages/monitor/MonitorAlertHistoryPage.tsx` | 42 | 9 | 0 | 0 | 0 | 0 | 15 | 782 |
| 5 | `pages/lims/LimsUncertaintyPage.tsx` | 40 | 9 | 0 | 0 | 0 | 0 | 13 | 765 |
| 6 | `pages/lims/LimsTestMethodPage.tsx` | 38 | 8 | 0 | 0 | 0 | 0 | 14 | 755 |
| 7 | `pages/lims/LimsInstrumentPage.tsx` | 37 | 3 | 0 | 0 | 0 | 0 | 28 | 1567 |
| 8 | `components/templates/FormPageTemplate.tsx` | 36 | 12 | 0 | 0 | 0 | 0 | 0 | 1557 |
| 9 | `pages/lims/LimsProficiencyTestingPage.tsx` | 33 | 6 | 0 | 0 | 0 | 0 | 15 | 778 |
| 10 | `pages/bi/Gispage.tsx` | 32 | 4 | 0 | 0 | 0 | 0 | 20 | 1972 |

## 四、详细说明

### 债务评分规则

- `any` 类型：每个 3 分
- `@ts-ignore` / `@ts-nocheck`：每个 5 分
- `console.log`：每个 2 分
- `console.error` / `console.warn`：每个 1 分
- `eslint-disable`：每个 2 分
- `// TODO`：每个 2 分
- `// FIXME`：每个 3 分
- `// HACK`：每个 4 分
- 硬编码颜色：每个 1 分

### 排除规则

- 排除目录：`node_modules/`、`dist/`、`build/`、`__tests__/`
- 排除文件：`*.test.*`、`*.spec.*`
- 硬编码颜色统计排除主题/颜色定义文件

### 统计范围

- 文件类型：`.ts`、`.tsx`
- 统计根目录：`/Users/air/TOPEMS/apps/web/src`
