# 导航 UI 统一计划审查报告

| 项 | 值 |
|---|---|
| 报告日期 | 2026-08-15 |
| 审查对象 | `docs/superpowers/plans/2026-08-08-navigation-ui-unified.md` |
| 审查范围 | 计划文档 vs 实际代码（AppHeader / AppSidebar / ThemeProvider / LanguageSelector / GlobalLayout / 35 模块 config.ts / 89 个 page-placeholder 文件） |
| 审查人 | TOPEMS 架构组 |
| 总体结论 | 计划已部分落地，但存在 4 严重 + 3 警告 + 1 机会共 8 类问题，建议不基于旧框架做增量补丁，而是按成熟方案重构 |

---

## 1. 问题清单总览

| # | 问题 | 严重度 | 类型 | 影响范围 |
|---|---|---|---|---|
| Q1 | Header 中导航 Tab 与 Sidebar 模块树功能冗余 | 警告 | 信息架构 | AppHeader.tsx / HeaderNavTabs.tsx |
| Q2 | 插件市场入口仅藏在 Briefcase 图标，无显式菜单项 | 严重 | 入口缺失 | GlobalActions.tsx / plugin/config.ts |
| Q3 | 中英翻译切换失效：LanguageSelector 解构同名 i18n 影子化 import | 严重 | 功能 Bug | LanguageSelector.tsx / themeStore.ts |
| Q4 | 暗色 & 朋克同属暗色基底，toggleTheme 跳过 system 分支 | 严重 | 主题逻辑缺陷 | ThemeProvider.tsx / themeStore.ts / theme.ts |
| Q5 | 浮动按钮三件套全部 bottom:24 right:24，互相压盖 | 严重 | 视觉压盖 | AICopilotFab.tsx / ContextHelpButton.tsx / PerformanceMonitor.tsx |
| Q6 | 89 个 page-placeholder 孤儿文件 + 重复 PluginMarketplacePage.tsx | 严重 | API 虚挂 / 维护噪音 | src/{module}/*.tsx / src/plugin/*.tsx |
| Q7 | 计划文档 L1 业务域与实际代码不一致 | 警告 | 文档失真 | docs/superpowers/plans/2026-08-08-navigation-ui-unified.md |
| Q8 | 重构机会：基础设施成熟，可按成熟方案重构 | 机会 | 优化空间 | 全局 |

---

## 2. 详细分析

### 2.1 Q1 · Header 导航 Tab 是否多余？

**结论：冗余，建议移除。**

**证据：**
- [AppHeader.tsx](file:///Users/air/TOPEMS/apps/web/src/components/layout/AppHeader/AppHeader.tsx) 渲染 `HeaderNavTabs`，提供「首页 / 模块 / 仪表盘」三个入口
- [HeaderNavTabs.tsx](file:///Users/air/TOPEMS/apps/web/src/components/layout/AppHeader/HeaderNavTabs.tsx) 第 15-23 行硬编码 3 个 Tab
- [AppSidebar.tsx](file:///Users/air/TOPEMS/apps/web/src/components/layout/AppSidebar/AppSidebar.tsx) 已通过 `navigationRegistryV2.getNavItemsGroupedByBusinessDomain` 渲染全部 35 个模块
- Dashboard 页本身已通过 `MODULE_SECTIONS` 渲染模块卡片，与「模块」Tab 重复

**问题：**
1. **单一职责违反**：Header 应只承担全局动作（搜索 / 通知 / 用户菜单 / 主题切换），不应承担页面导航
2. **信息冗余**：3 个 Tab 与 Sidebar L1 业务域 + Dashboard 模块卡功能完全重叠
3. **移动端已隐藏**：`display: { xs: 'none', md: 'flex' }` 表明其在大屏才显示，而大屏正是 Sidebar 可见时
4. **路径硬编码**：`/modules`、`/dashboard`、`/` 直接写死在组件中，未走 PATHS 常量

**建议：** 删除 `HeaderNavTabs` 组件及其在 `AppHeader` 中的引用。Home 入口由 Logo 点击承担，模块入口由 Sidebar 承担，仪表盘入口由 Sidebar 顶部收藏或 Dashboard 路由默认跳转承担。

---

### 2.2 Q2 · 插件市场入口在哪里？

**结论：藏在 GlobalActions 的 Briefcase 图标后，无显式菜单项，专业模块无 L1 入口。**

**证据：**
- [GlobalActions.tsx](file:///Users/air/TOPEMS/apps/web/src/layouts/components/GlobalActions.tsx) 第 58-67 行用 `Briefcase` 图标 + `i18n.t('layouts.global_actions.k0')` tooltip 跳转到 `PLUGIN_PATHS.marketplace`
- [plugin/config.ts](file:///Users/air/TOPEMS/apps/web/src/modules/plugin/config.ts) 第 80-125 行 `pluginNavConfig` 已注册 `plugin-marketplace` 为 `enterprise` 域 L2 项
- Sidebar 应通过 `navigationRegistryV2.getNavItemsGroupedByBusinessDomain` 自动渲染该项

**问题：**
1. **入口隐蔽**：Briefcase（公文包）图标语义与「插件市场」不匹配，用户难以发现
2. **重复入口**：Header GlobalActions 与 Sidebar 同一入口并存，违反单一入口原则
3. **专业模块无菜单**：CRM/Finance/ERP/QMS/LIMS 等专业模块虽然 source=plugin，但用户安装后无显式「专业模块」聚合入口
4. **tooltip 文案错误**：第 58 行 `title={i18n.t('layouts.global_actions.k0')}` 与第 29 行 Search 按钮使用同一 key

**建议：**
- 移除 GlobalActions 中的 Briefcase 图标
- 在 Sidebar `enterprise` 域下保留 `plugin-marketplace` 显式菜单项，使用 `Puzzle` 或 `Store` 图标
- 在 Dashboard 顶部增加「专业模块」分区，展示已安装的 plugin 模块卡片
- 修复 tooltip key 错误

---

### 2.3 Q3 · 中英翻译按钮不能正常切换

**结论：存在两个 Bug。**

**Bug 1：LanguageSelector 解构同名 i18n 影子化 import**

[LanguageSelector.tsx](file:///Users/air/TOPEMS/apps/web/src/components/LanguageSelector.tsx) 第 5 行 `import { SUPPORTED_LANGUAGES, type LanguageCode } from '../i18n';`，但第 8 行 `const { i18n } = useTranslation();` 解构出同名 `i18n`，**影子化了 import 的 i18n 实例**。

虽然 `useTranslation()` 返回的 `i18n` 与 import 的 `i18n` 在大多数情况下指向同一 i18next 实例，但存在以下风险：
- 若 react-i18next 版本变更或注入方式改变，两者可能不一致
- ESLint `no-shadow` 规则会报警
- 代码可读性下降

**Bug 2：themeStore 在模块加载期调用 i18n.t**

[themeStore.ts](file:///Users/air/TOPEMS/apps/web/src/store/themeStore.ts) 第 16-19 行在模块顶层立即执行 `i18n.t('store.theme_store.k0')` 等调用，此时 `i18n` 可能尚未 `init`（因为 `themeStore.ts` 与 `i18n/index.ts` 的加载顺序不保证），导致返回 key 本身而非翻译文本。

**修复建议：**
1. LanguageSelector 直接使用 import 的 `i18n`，或重命名解构变量为 `i18nInstance`
2. themeStore 的 `themeList` 改为函数或 lazy getter，在组件渲染时才取值
3. 添加 `i18n.on('initialized', ...)` 钩子确保翻译就绪后再渲染主题标签

---

### 2.4 Q4 · 明暗切换是否正常？暗色和朋克是否都是暗色？

**结论：暗色和朋克确实都是暗色基底；toggleTheme 逻辑有缺陷。**

**证据：**
- [theme.ts](file:///Users/air/TOPEMS/apps/web/src/theme/theme.ts) 第 118-160 行 `createCustomTheme` **仅创建 light 模式**（`palette.mode: 'light'`），未提供 dark mode 的 palette 覆盖
- [ThemeProvider.tsx](file:///Users/air/TOPEMS/apps/web/src/components/ThemeProvider.tsx) 第 27-36 行：
  - `system` → `setMode('system')`
  - `cyberpunk` → `setColorScheme('cyberpunk' as 'light' | 'dark')` ← **类型强转 hack**
  - 其他 → `setMode(storeTheme)`
- [themeStore.ts](file:///Users/air/TOPEMS/apps/web/src/store/themeStore.ts) 第 33-44 行 `toggleTheme` 循环：`light → dark → cyberpunk → light`，**跳过 system**

**问题：**
1. **朋克主题无独立 palette**：`cyberpunk.css.ts` 通过全局 CSS class `cyberpunk-mode` 在 body 上叠加样式，但 MUI 组件仍使用 light palette tokens，导致：
   - MUI Paper / Card / Dialog 背景仍是白色，与 cyberpunk 暗色背景冲突
   - 文字颜色（text.primary）仍是深色，在暗色背景上不可读
   - 仅 `cyber-glass-*` className 包装的元素才显示暗色效果
2. **暗色模式依赖 CSS Variables**：MUI v5 的 `useColorScheme` 通过 CSS Variables 实现 dark mode，但 `createCustomTheme` 未声明 `colorSchemes`，导致 `setMode('dark')` 可能无对应 CSS 变量
3. **toggleTheme 跳过 system**：用户从 cyberpunk 切换会回到 light，无法回到 system 跟随系统
4. **类型强转**：`setColorScheme('cyberpunk' as 'light' | 'dark')` 是类型欺骗，运行时 MUI 会忽略未知 scheme

**建议重构：**
```typescript
// theme.ts 改为支持多 colorScheme
export const createCustomTheme = (): Theme => {
  return createTheme({
    colorSchemes: {
      light: { palette: { mode: 'light', ...lightPalette } },
      dark: { palette: { mode: 'dark', ...darkPalette } },
      cyberpunk: { palette: { mode: 'dark', ...cyberpunkPalette } },
    },
    // ... 其他配置
  });
};

// themeStore.ts 修正 toggleTheme
toggleTheme: () => {
  const { theme } = get();
  const next: Theme =
    theme === 'light' ? 'dark'
    : theme === 'dark' ? 'cyberpunk'
    : theme === 'cyberpunk' ? 'system'
    : 'light'; // system → light
  set({ theme: next });
}
```

---

### 2.5 Q5 · 页面下端浮动按钮压盖问题

**结论：3 个 fixed 浮动按钮同位重叠。**

**证据：**
- [AICopilotFab.tsx](file:///Users/air/TOPEMS/apps/web/src/components/ai/copilot/AICopilotFab.tsx) 第 17-20 行：`position: 'fixed', bottom: 24, right: 24`
- [ContextHelpButton.tsx](file:///Users/air/TOPEMS/apps/web/src/components/ContextHelpButton.tsx) 第 75-80 行：默认 `offset = { x: 24, y: 24 }`，`bottom-right` → `{ bottom: 24, right: 24 }`
- [PerformanceMonitor.tsx](file:///Users/air/TOPEMS/apps/web/src/components/common/PerformanceMonitor.tsx) 第 97 行：`position: 'fixed', bottom: 20, right: 20`
- [templates/ReportDesignerTemplate/index.tsx](file:///Users/air/TOPEMS/apps/web/src/components/templates/ReportDesignerTemplate/index.tsx) 第 470 行：`position: 'fixed', bottom: 20, right: 20`
- [GlobalLayout.tsx](file:///Users/air/TOPEMS/apps/web/src/components/layout/GlobalLayout.tsx) 第 388-389 行同时渲染 `<FloatingAIHelper />` 和 `<ContextHelpButton />`

**问题：**
1. **三按钮完全重叠**：AICopilotFab + ContextHelpButton + PerformanceMonitor 三个 fixed 元素都定位在右下角 24/20px，互相压盖
2. **遮挡页面内容**：用户无法点击被遮挡的页面右下角元素（如表格分页、操作按钮）
3. **入口不合理**：Help 与 AI Copilot 本质是辅助功能，应整合到 UserMenu 或 Command Palette，而非占用屏幕固定空间
4. **移动端 BottomTabBar 已存在**：移动端已有底部 Tab Bar，浮动按钮在移动端更不合理

**建议重构：建立 FloatingDock 容器**

```tsx
// 新建 FloatingDock.tsx
export const FloatingDock: React.FC = () => {
  return (
    <Stack
      spacing={1.5}
      sx={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 1000,
        display: { xs: 'none', md: 'flex' }, // 移动端隐藏
      }}
    >
      <AICopilotFab onClick={...} />
      <ContextHelpButton variant="compact" />
    </Stack>
  );
};
```

并将 Help 入口同时添加到 UserMenu 下拉菜单中，作为非浮动备选入口。PerformanceMonitor 仅在 dev 模式显示，且应移到左下角或 DevTools 面板内。

---

### 2.6 Q6 · API 虚挂问题

**结论：89 个 page-placeholder 孤儿文件 + 1 个重复 PluginMarketplacePage。**

**证据：**
- `grep -r "page-placeholder"` 命中 89 个文件，分布在 `src/{module}/` 目录下（如 `src/workflow/WorkflowDashboardPage.tsx`、`src/iam/RoleManagementPage.tsx` 等）
- [src/plugin/PluginMarketplacePage.tsx](file:///Users/air/TOPEMS/apps/web/src/plugin/PluginMarketplacePage.tsx) 是简单占位符（10 行代码）
- [src/pages/plugin/PluginMarketplacePage.tsx](file:///Users/air/TOPEMS/apps/web/src/pages/plugin/PluginMarketplacePage.tsx) 是真实实现（完整组件）
- 路由实际加载的是 `src/pages/{module}/` 下的文件（见 [routes/v2/index.ts](file:///Users/air/TOPEMS/apps/web/src/routes/v2/index.ts) 第 6-75 行）
- [src/iam/RoleManagementPage.tsx](file:///Users/air/TOPEMS/apps/web/src/iam/RoleManagementPage.tsx) 第 1-4 行注释明确标注：「本文件是 src/iam/ 目录的旧实现（由 App 根路由 /iam 访问，保留向后兼容）」

**问题：**
1. **89 个孤儿文件占空间**：约 89 × 12 行 = 1068 行无用代码
2. **维护噪音**：开发者搜索时容易误改孤儿文件而非真实实现
3. **API 虚挂**：部分孤儿文件可能仍被某些遗留路由或导航项引用，导致用户访问到占位符而非真实页面
4. **重复 PluginMarketplacePage**：`src/plugin/` 与 `src/pages/plugin/` 同名文件，import 路径混淆风险

**建议：**
1. 全量删除 `src/{module}/` 下的 89 个 page-placeholder 文件
2. 删除 `src/plugin/PluginMarketplacePage.tsx`、`src/plugin/PluginUploadPage.tsx`、`src/plugin/PluginDetailPage.tsx`
3. 全局搜索 `from '@/{module}/` 或 `from '@/plugin/` 确保无遗留引用
4. 添加 ESLint 规则禁止 `page-placeholder` className

---

### 2.7 Q7 · 计划文档与实际 L1 业务域不一致

**结论：计划文档已过时，建议归档。**

**证据：**
- 计划文档 `2026-08-08-navigation-ui-unified.md` 第 198-209 行定义的 L1 域：
  ```
  workplace / core / operation / production / quality / supply_chain / finance_hr / data_ai / system / personal
  ```
- [navigation-architecture.md](file:///Users/air/TOPEMS/docs/navigation-architecture.md) v2.1.0 定义的 L1 域（与代码一致）：
  ```
  enterprise / manufacturing / quality / supply / finance / hr / crm / project / collaboration / platform
  ```
- [AppSidebar.tsx](file:///Users/air/TOPEMS/apps/web/src/components/layout/AppSidebar.tsx) 第 126-127 行使用 `getNavItemsGroupedByBusinessDomain`，基于 `SUITE_GROUPS` 字典，与 v2.1.0 一致

**问题：**
1. 计划文档的 L1 域命名（如 `workplace`、`core`、`operation`）与实际代码（`enterprise`、`manufacturing`、`collaboration`）完全不同
2. 计划文档的 MODULE_SECTIONS 配置（第 198-209 行）指向已废弃的模块分组
3. 计划文档中的 `cd /Users/xingzhai/TOPEMS` 路径错误（应为 `/Users/air/TOPEMS`）

**建议：**
1. 将 `docs/superpowers/plans/2026-08-08-navigation-ui-unified.md` 移动到 `docs/superpowers/archive/` 并标注「已过时，参考 navigation-architecture.md v2.1.0」
2. 新建 `docs/superpowers/plans/2026-08-15-navigation-ui-refactor.md` 基于实际代码状态制定重构计划

---

### 2.8 Q8 · 重构机会

**结论：基础设施成熟，可按成熟方案重构。**

**现有基础：**
- `NavigationRegistryV2` 已实现模块注册、权限过滤、按业务域分组
- `design-tokens.ts` 已定义完整的设计令牌系统
- `i18n/index.ts` 已实现 flat-to-nested 转换 + 多命名空间合并
- `themeStore` 已用 zustand persist 实现主题持久化
- 35 个模块 config.ts 已统一 RouteModuleConfig + ModuleNavConfig 双配置

**重构方向（参考 Linear / Vercel / GitHub 模式）：**

#### 2.8.1 Header 重构
- 移除 HeaderNavTabs
- 保留：Logo + 全局搜索（Cmd+K）+ 通知 + 语言 + 主题 + 用户菜单
- 新增：Breadcrumb 独立行（已有 HeaderBreadcrumbs）
- GlobalActions 仅保留 Search，AI 入口移到浮动栈

#### 2.8.2 Sidebar 重构
- 保留 L1 业务域分组（10 个）
- 新增「已安装插件」聚合分区，展示所有 source=plugin 的模块
- SidebarUserPanel 增加 ThemeSelector 快捷入口
- 收起态显示模块图标 + 徽章

#### 2.8.3 浮动栈重构
- 建立 `FloatingDock` 容器，纵向堆叠 AI Copilot + Context Help
- PerformanceMonitor 仅 dev 模式显示，移到左下角
- 移动端隐藏浮动栈，改用 BottomTabBar + Command Palette

#### 2.8.4 主题系统重构
- `createCustomTheme` 支持多 colorScheme（light / dark / cyberpunk）
- cyberpunk 作为 dark 的变体，使用独立 palette
- `toggleTheme` 修正循环：light → dark → cyberpunk → system → light
- 移除 body class hack，改用 MUI CSS Variables

#### 2.8.5 清理重构
- 删除 89 个 page-placeholder 孤儿文件
- 删除重复 PluginMarketplacePage
- 删除 HeaderNavTabs 组件
- 归档过时计划文档

---

## 3. 优先级与执行建议

| 优先级 | 任务 | 预计影响 | 风险 |
|---|---|---|---|
| P0 | 删除 89 个 page-placeholder 孤儿文件 | 清理 1068 行无用代码 | 低（已确认未被路由引用） |
| P0 | 修复 LanguageSelector i18n 影子化 | 修复语言切换 Bug | 低 |
| P0 | 修复 themeStore 模块加载期 i18n.t 调用 | 修复主题标签显示 key | 低 |
| P1 | 建立 FloatingDock 容器，解决浮动按钮压盖 | 修复视觉压盖 | 中（需调整 3 个组件） |
| P1 | 移除 HeaderNavTabs | 简化 Header | 低 |
| P1 | 移除 GlobalActions Briefcase，插件市场走 Sidebar | 统一入口 | 低 |
| P2 | 重构 createCustomTheme 支持多 colorScheme | 修复暗色/朋克主题 | 高（影响全局样式） |
| P2 | 修正 toggleTheme 循环（含 system） | 修复主题切换逻辑 | 低 |
| P3 | 归档过时计划文档，新建重构计划 | 文档治理 | 无 |

---

## 4. 验收标准

重构完成后需满足：
1. `npx tsc --noEmit` = 0 error
2. `pnpm run build` 成功
3. 语言切换实时生效，无 key 显示
4. 主题切换 light → dark → cyberpunk → system → light 循环正常
5. 暗色模式下 MUI 组件（Paper/Card/Dialog）背景为暗色
6. 朋克模式下 MUI 组件使用 cyberpunk palette
7. 浮动按钮不互相压盖
8. 插件市场通过 Sidebar 显式入口可达
9. 全局搜索 `page-placeholder` 返回 0 结果
10. 全局搜索 `from '@/plugin/` 返回 0 结果（统一走 `@/pages/plugin/`）

---

## 5. 参考资料

- [导航架构规范 v2.1.0](file:///Users/air/TOPEMS/docs/navigation-architecture.md)
- [导航架构校对报告 2026-08-15](file:///Users/air/TOPEMS/docs/audit/nav-architecture-verification-2026-08-15.md)
- [原始计划文档（待归档）](file:///Users/air/TOPEMS/docs/superpowers/plans/2026-08-08-navigation-ui-unified.md)
- [AppHeader.tsx](file:///Users/air/TOPEMS/apps/web/src/components/layout/AppHeader/AppHeader.tsx)
- [AppSidebar.tsx](file:///Users/air/TOPEMS/apps/web/src/components/layout/AppSidebar/AppSidebar.tsx)
- [ThemeProvider.tsx](file:///Users/air/TOPEMS/apps/web/src/components/ThemeProvider.tsx)
- [LanguageSelector.tsx](file:///Users/air/TOPEMS/apps/web/src/components/LanguageSelector.tsx)
- [GlobalLayout.tsx](file:///Users/air/TOPEMS/apps/web/src/components/layout/GlobalLayout.tsx)
- [themeStore.ts](file:///Users/air/TOPEMS/apps/web/src/store/themeStore.ts)
- [theme.ts](file:///Users/air/TOPEMS/apps/web/src/theme/theme.ts)
- [plugin/config.ts](file:///Users/air/TOPEMS/apps/web/src/modules/plugin/config.ts)
- [GlobalActions.tsx](file:///Users/air/TOPEMS/apps/web/src/layouts/components/GlobalActions.tsx)
- [AICopilotFab.tsx](file:///Users/air/TOPEMS/apps/web/src/components/ai/copilot/AICopilotFab.tsx)
- [ContextHelpButton.tsx](file:///Users/air/TOPEMS/apps/web/src/components/ContextHelpButton.tsx)
