# TOPEMS UI 设计系统评估报告

> 评估日期: 2026-06-28 | 评估范围: MUI 利用度、设计系统成熟度、改善路线图

---

## 一、MUI 最新版本利用度评估

### 当前技术栈版本

| 依赖 | 当前版本 | MUI v9 特性 |
|------|---------|------------|
| @mui/material | ^9.1.1 | 最新主版本 |
| @mui/x-date-pickers | ^9.0.0 | MUI X v9 |
| @mui/x-tree-view | ^9.0.0 | MUI X v9 |
| @mui/lab | 9.0.0-beta.5 | Timeline 组件仍在 lab 中，保留依赖 |
| @emotion/react | ^11.14.0 | 兼容 |
| React | ^19.2.7 | React 19 |

### 已充分利用的 MUI v9 特性

| 特性 | 状态 | 说明 |
|------|------|------|
| `createTheme` + `ThemeProvider` | 已使用 | 自定义主题完整配置 |
| `CssBaseline` | 已使用 | 全局样式重置 |
| `sx` prop 样式系统 | 高频使用 | 3419 处 sx 引用，风格一致 |
| 组件 `styleOverrides` | 已使用 | 37+ 组件全局样式覆盖 |
| React 19 兼容 | 已使用 | MUI v9 原生支持 |
| Emotion 引擎 | 已使用 | v11 最新版 |
| MUI X DatePickers | 已使用 | v9 版本 |
| MUI X TreeView | 已使用 | v9 版本 |
| Typography 系统 | 已使用 | h1-h6/body/button/overline 完整映射 |
| Palette 自定义 | 已使用 | primary/secondary/success/warning/error/info 完整色阶 |
| Dark Mode 支持 | 已使用 | 系统/手动切换，暗色 token 完整 |
| Breakpoints 自定义 | 已使用 | xs:0/sm:600/md:900/lg:1200/xl:1536 |

### 未充分利用的 MUI v9 特性

| 特性 | 优先级 | 影响 | 当前替代方案 |
|------|--------|------|-------------|
| **CSS 变量主题 (cssVars)** | P0 | v9 核心新特性 | 未使用，仅 3 处 `var(--mui)` 引用 |
| **MUI X DataGrid Pro/Premium** | P1 | 强大的数据表格 | 自建 DataTable + TanStack Table |
| **MUI X Charts** | P1 | 原生图表组件 | 使用 recharts (8 处引用) |
| **`@mui/lab` 评估** | P3 | Timeline 仍在 lab 中 | 2 处 Timeline 引用，属于正常使用 |
| **`slotProps` / `slots` 新 API** | P2 | v9 推荐方式 | DataTable 有 1 处，其余用旧 props |
| **MUI X Localization** | P2 | 国际化 | 仅 date-fns + dayjs 自行处理 |
| **`useColorScheme`** | P3 | 替代手动 matchMedia | ThemeProvider 手动实现 |
| **`@mui/material-next`** | P3 | Tailwind CSS 集成 | 未使用 |

### 关键发现

1. **CSS 变量主题是最大缺口** — MUI v9 最核心的新特性是 `cssVars` 模式，允许运行时动态主题切换，无需 JS 重新创建 theme。TOPEMS 目前在 `ThemeProvider.tsx` 中每次都调用 `createCustomTheme(muiMode)` 重建主题，这是 v5 时代的做法。

2. **自建 DataTable 的成本高** — 当前 DataTable 组件有 1370+ 行，功能丰富但维护成本极高。MUI X DataGrid Pro 已内置虚拟滚动、列分组、列固定、高级筛选等全部功能。

3. **@mui/lab 依赖评估** — 实际引用仅 2 个文件（RsProjectDetailPage、RsExperimentDetailPage），均使用 Timeline 组件。Timeline 在 MUI v9 中仍在 @mui/lab 中，属于正常使用，无需迁移。已在文档示例中更新 LoadingButton 示例。

---

## 二、设计系统成熟度评估

### 设计系统架构

```
packages/
  tokens/              # 设计令牌源（TS → CSS）
  shared-constants/    # 运行时颜色/间距常量
  shared-types/        # UI 类型定义
  shared-components/    # 22 个共享组件
  shared-hooks/         # useCrud/useDebounce
  shared-utils/         # 日期/数字/验证工具
apps/web/
  theme/               # MUI 主题配置
  components/
    templates/         # 13 个页面模板
    common/            # 15+ 通用组件
    layout/            # 全局布局
    mobile/            # 8 个移动端组件
    responsive/        # 响应式组件
```

### Token 系统评估

| 维度 | 评分 | 说明 |
|------|------|------|
| 基础 Token (颜色) | 9/10 | 完整 50-900 色阶，含 light/dark 模式 |
| 基础 Token (间距) | 8/10 | xs→3xl 语义化间距 |
| 基础 Token (圆角) | 9/10 | none→full 完整梯度 |
| 基础 Token (阴影) | 9/10 | 含暗色模式专用阴影 |
| 基础 Token (动效) | 8/10 | duration + easing 完整 |
| 语义 Token | 10/10 | space/text/elevation/radius/layer/border/background 全覆盖 |
| Token ↔ MUI 映射 | 9/10 | 37+ 组件通过 styleOverrides 消费 |
| Token 一致性 | 7/10 | tokens.ts 和 colors.ts 存在部分重复 |

### 共享组件评估

| 组件 | 状态 | 类型安全 | MUI 集成度 |
|------|------|---------|-----------|
| DataTable | 成熟 | 完整 | 高（MUI Table + TanStack） |
| PageContainer | 成熟 | 完整 | 高（MUI Box/Paper） |
| StatusBadge | 成熟 | 完整（多泛型） | 高 |
| CommandPalette | 成熟 | 完整 | 高 |
| FilterBar | 成熟 | 完整 | 高 |
| FormField/FormSelect | 成熟 | 完整 | 高 |
| ConfirmDialog (7 变体) | 成熟 | 完整 | 高 |
| Stepper/ProgressBar | 成熟 | 完整 | 高 |
| Pagination | 成熟 | 完整 | 高 |
| OrgTree/UserSelect | 成熟 | 完整 | 高 |

### 页面模板评估

| 模板 | 类型 | 复用率 |
|------|------|--------|
| ListPageTemplate | CRUD 列表 | 高 |
| DetailPageTemplate | 详情页 | 高 |
| FormPageTemplate | 表单页 | 高 |
| MasterDetailPageTemplate | 主从结构 | 中 |
| DashboardTemplate | 仪表盘 | 中 |
| CardListTemplate | 卡片列表 | 中 |
| KanbanPageTemplate | 看板 | 低（MES 专用） |
| TreePageTemplate | 树形结构 | 中 |
| WizardPageTemplate | 向导 | 低 |
| StatsPageTemplate | 统计 | 低 |

### 当前存在的差距

**1. Token 冗余 (P1)**
- `packages/tokens/src/tokens.ts` 定义原始 token
- `packages/shared-constants/src/colors.ts` 定义运行时颜色
- `packages/shared-constants/src/generated-colors.ts` 自动生成但与 colors.ts 内容重复
- `apps/web/src/theme/tokens.ts` (被 theme.ts import) — 又一份 token 副本
- 同一颜色值散布在 4 个位置，修改时容易遗漏

**2. 组件样式风格不统一 (P1)**
- `styled()` API 仍有 32 处使用（ProgressBar、QuickSearch、FileUpload 等）
- 其余 3419 处使用 `sx` prop
- 同一项目内两套样式范式并存

**3. 暗色模式覆盖不全 (P2)**
- ThemeProvider 对话框/弹出层仅处理了 backdrop
- 部分硬编码颜色值（如 `#2e7d32` 在 DataTable 中）
- `var(--color-background)` 和 `var(--color-text-secondary)` 在 App.tsx 中出现，但 CSS 变量体系未系统建立

**4. 移动端组件独立体系不完整 (P2)**
- 已有 8 个 Mobile 组件（MobileLayout、MobileHeader、BottomTabBar 等）
- 但与主站共享的组件复用策略不清晰
- 缺少 MobileDataTable、MobileForm 等核心移动端组件

**5. 缺少 Storybook 系统化 (P2)**
- Storybook 已配置（v10.4.6），但组件 story 覆盖率未知
- 无视觉回归测试

**6. 无设计系统文档站 (P3)**
- 设计 token、组件 API、模板用法缺乏可视化文档

---

## 三、改善路线图

### Phase 1: 基础夯实 (1-2 周)

**1.1 启用 MUI v9 CSS Variables 主题模式**
- 改造 `theme.ts` 启用 `cssVars: true`
- 利用 CSS 变量实现无闪烁的亮/暗模式切换
- 消除 ThemeProvider 中每次渲染重建 theme 的模式
- 预期收益：主题切换零延迟、代码量减少约 40%

**1.2 Token 源去重**
- 以 `packages/tokens/src/tokens.ts` 为唯一源
- `shared-constants/colors.ts` 改为从 tokens 导入
- 删除 `generated-colors.ts` 中的重复定义
- 建立自动化检查脚本防止 token 漂移

**1.3 @mui/lab 依赖确认（已完成）**
- 实际引用仅 2 个文件（RsProjectDetailPage、RsExperimentDetailPage），均使用 Timeline 组件
- Timeline 在 MUI v9 中仍在 @mui/lab 中，属于正常使用，无需迁移
- 已更新文档示例中的 LoadingButton 引用

### Phase 2: 组件标准化 (2-4 周)

**2.1 样式范式统一**
- 将 `styled()` 用法逐步迁移到 `sx` prop 或 `styleOverrides`
- 对于复杂的动态样式场景，统一使用 `styled` + `sx` 混合模式并形成规范

**2.2 DataTable 升级评估**
- 评估 MUI X DataGrid Pro 与现有 DataTable 的功能对比
- 如果决定保留自建方案：补充虚拟滚动（当前 TODO 项）、列固定、行拖拽
- 如果迁移到 DataGrid Pro：逐步替换，优先替换高性能需求场景

**2.3 暗色模式审计**
- 建立自动化暗色模式对比测试（lighthouse / playwright 截图）
- 消除硬编码颜色值
- 确保 CSS 变量覆盖所有 token 引用

### Phase 3: 体验提升 (4-8 周)

**3.1 MUI X Charts 替代 recharts**
- recharts (8 处引用) → 评估迁移到 `@mui/x-charts`
- 统一图表主题与 MUI 设计 token

**3.2 Storybook 扩展**
- 为 22 个共享组件补充 stories
- 补充 13 个页面模板 stories
- 建立视觉回归测试 (chromatic)

**3.3 移动端组件策略**
- 明确共享组件在移动端的适配策略
- 补充缺失的移动端核心组件
- 响应式断点与 MUI breakpoints 对齐

### Phase 4: 设计系统完善 (8-12 周)

**4.1 设计系统文档站**
- 基于 Storybook 构建设计系统文档
- Token 可视化、组件 Playground、模板预览
- 设计规范与开发规范对照

**4.2 MUI X DataGrid Pro 逐步引入**
- 优先在数据量大、需要虚拟滚动的页面引入
- WMS 库存管理、MES 生产记录等场景先行

**4.3 高级特性**
- 多主题支持（基于 CSS Variables 的品牌主题切换）
- 无障碍审计自动化集成
- 组件库版本化与 changelog 自动生成

---

## 四、优先级矩阵

| 任务 | 影响范围 | 实施难度 | 推荐优先级 |
|------|---------|---------|-----------|
| 启用 CSS Variables 主题 | 全局 | 中 | P0 |
| Token 去重 | 全局 | 低 | P0 |
| @mui/lab 评估 | 2 个文件 | 低(无需操作) | P3 |
| 样式范式统一 | 9 个文件 | 中 | P1 |
| 暗色模式审计 | 全局 | 中 | P1 |
| DataTable 升级 | 数据密集页面 | 高 | P1 |
| Storybook 扩展 | 开发体验 | 中 | P2 |
| MUI X Charts 迁移 | 8 处引用 | 中 | P2 |
| 移动端组件策略 | 移动端 | 高 | P2 |
| 设计系统文档站 | 团队协作 | 中 | P3 |
| 多主题支持 | 全局 | 高 | P3 |

---

## 五、总结

### 优势
- MUI v9 版本跟进及时，核心 API 使用正确
- Design Token 体系成熟（基础 token + 语义 token 双层架构）
- 37+ 组件全局样式覆盖，设计一致性高
- 共享组件库 22 个组件类型安全、接口规范
- 13 个页面模板覆盖大部分企业应用场景
- 暗色模式基础架构已就绪

### 核心差距
- **未启用 CSS Variables 主题模式**（MUI v9 最重要特性）
- **Token 分散在 4 个位置**，缺乏单一真相源
- **自建 DataTable 维护成本过高**，缺少虚拟滚动等关键特性
- **样式范式不统一**（styled vs sx 混用）
- **@mui/lab 依赖保留**（仅 Timeline 组件，属于正常使用）

### 整体成熟度评分: **7.5 / 10**

设计系统骨架完善、Token 体系专业、组件覆盖率高。主要差距在于 MUI v9 新特性利用不足（CSS Variables）和 Token 管理的工程化问题。通过 Phase 1 的 3 项改进即可显著提升至 8.5/10。

---

*评估人: SOLO Design | 2026-06-28*
