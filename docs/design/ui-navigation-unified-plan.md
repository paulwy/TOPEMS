# TOPEMS UI 设计与导航统一方案

> 版本：v1.0.2
> 状态：已生效
> 更新日期：2026-08-28
> 范围：apps/web（Web 管理端）

---

## 执行摘要

本次统一方案对项目内所有 UI 设计与导航相关文档进行归纳、去重与评估，制定以「代码即文档、单一真值源」为核心的新方案。方案明确：

- **导航唯一真值源**：`docs/navigation-architecture.md` + `apps/web/src/lib/navigation/types.ts` + `NavigationRegistryV2.ts`
- **设计系统唯一真值源**：`docs/development/frontend/design-system.md`
- **共享组件唯一真值源**：`docs/design/shared-component-guidelines.md`
- **页面模板唯一真值源**：`docs/design/page-template-selection-guide.md`
- **无障碍唯一真值源**：`docs/development/frontend/accessibility.md`

已清理 11 份冗余/过时文档，保留 7 份权威文档，建立统一的文档入口与质量门禁。

---

## 一、现状评估

### 1.1 文档现状

| 维度 | 问题 | 影响 |
|------|------|------|
| 重复规范 | UI 设计规范存在 3 份以上交叉文档 | 开发者无所适从 |
| 版本不一致 | 导航文档从 v2.0 到 v3.1 多个版本并存 | 实施依据混乱 |
| 过时内容 | 部分文档仍描述 Tailwind/SCSS/BEM 方案 | 误导新开发者 |
| 过程文档堆积 | audit 报告、roadmap 计划、superpowers 方案分散 | 检索效率低 |
| 真值源未统一 | 文档与代码未强制一致 | 设计与实现脱节 |

### 1.2 代码现状

| 维度 | 状态 | 说明 |
|------|------|------|
| 导航四层模型 | 已落地 | L1 业务域 × 10、L2 模块 × 35、L3 子组 × 8 枚举、L4 页面 × 368 |
| 标准页面模板 | 已落地 | 22 种模板，全站覆盖率 100% |
| MUI 样式系统 | 已落地 | Tailwind 已清零，统一 sx prop |
| 共享组件库 | 已落地 | `@topems/shared-components` |
| 无障碍基础 | 已落地 | WCAG 2.1 AA 基线 |

### 1.3 核心问题

1. **Header 导航 Tab 与 Sidebar 模块树功能冗余**：`HeaderNavTabs` 的「首页 / 模块 / 仪表盘」与 Sidebar L1 业务域 + Dashboard 模块卡片重叠。
2. **插件市场入口隐蔽**：`Briefcase` 图标语义不匹配，应通过 Sidebar `enterprise` 域显式入口 + Dashboard「专业模块」分区呈现。
3. **主题切换逻辑缺陷**：`cyberpunk` 主题无独立 palette，`toggleTheme` 跳过 `system` 分支。
4. **浮动按钮重叠**：AI 助手、上下文帮助、性能监控三个 fixed 按钮位置冲突。
5. **部分模块全局 order 重复**：导致排序依赖插入顺序，需逐步按域内 10 间隔重新分配。

---

## 二、统一原则

### 2.1 设计原则

| 原则 | 优先级 | 说明 |
|------|--------|------|
| 一致性 | P0 | 统一视觉风格、交互模式、组件 API |
| 可扩展性 | P0 | 支持插件动态注册、主题定制、导航扩展 |
| 简洁性 | P0 | 清晰信息层级，减少视觉噪音 |
| 可用性 | P0 | 直观操作流程，降低学习成本 |
| 响应式 | P0 | 适配桌面、平板、移动端 |
| 模块化 | P0 | 组件独立开发、测试、部署 |
| 无障碍 | P1 | 支持键盘导航和屏幕阅读器 |
| 性能优先 | P0 | 首屏加载快，按需加载 |

### 2.2 文档原则

1. **代码即文档**：所有规范必须以代码中的类型、枚举、脚本为真值源。
2. **单一真值源**：同一领域只保留一份权威文档，其他文档通过链接引用。
3. **禁止过时内容**：已被替代的写法必须明确标注废弃或删除。
4. **强制一致**：文档与代码冲突时，以代码为准，文档 24 小时内修正。

### 2.3 技术栈统一

| 技术 | 版本 | 用途 | 状态 |
|------|------|------|------|
| MUI (Material UI) | v9.1.1 | 唯一 UI 组件库 | 强制 |
| Emotion | v11.x | CSS-in-JS | 强制 |
| Lucide React | v1.x | 唯一图标库 | 强制 |
| React Router | v6 | 路由 | 强制 |
| @tanstack/react-query | v5 | 数据获取（singleton） | 强制 |

---

## 三、导航架构统一方案

### 3.1 四层导航模型

```
L1 业务域（Business Domain）—— ModuleSuite 枚举（10 个）
 └ L2 功能模块（Module）—— ModuleNavConfig.code（35 个，全局唯一）
    └ L3 菜单子组（Group）—— NavGroup 枚举（8 个）
       └ L4 页面入口（Page）—— NavItemConfig.code（368 个，全局唯一）
```

### 3.2 强制规则

| 层级 | 规则 | 校验方式 |
|------|------|----------|
| L1 | 10 个 ModuleSuite 枚举锁死，禁止新增 | TypeScript 枚举 + `analyze_nav_structure.mjs` 结构核对 |
| L2 | code 全局唯一，suite 必须从枚举取值 | `NavigationRegistryV2` 运行时去重 + `verify_navigation.mjs` |
| L3 | 仅 8 个 NavGroup 枚举，自定义编译报错 | TypeScript 类型系统 |
| L4 | code = `{module}-{page}`，label ≤ 6 字，icon 必须注册 | `verify_navigation.mjs` 三联校验 |
| 路径 | 必须引用模块内 PATHS 常量，禁止硬编码 | `verify_navigation.mjs` 路由注册校验 |

### 3.3 组件职责

| 组件 | 职责 | 数据源 |
|------|------|--------|
| `AppHeader` | 全局搜索、通知、主题、用户菜单 | 全局状态 |
| `AppSidebar` | L1 业务域 + L2 模块导航 | `NavigationRegistryV2.getNavItemsGroupedByBusinessDomain()` |
| `ModuleTabs` | 模块内 Tab 切换 | `NavigationRegistryV2.getModuleTabs()` |
| `PageBreadcrumb` | 页面层级导航 | URL + NavigationRegistry |
| `ModuleLayout` | 模块页面布局容器 | 组合上述组件 |

### 3.4 整改项

1. **删除 `HeaderNavTabs`**：Header 只承担全局动作，导航由 Sidebar 承担。
2. **插件市场入口整改**：Sidebar `enterprise` 域使用 `Puzzle`/`Store` 图标；Dashboard 增加「专业模块」分区。
3. **全局 order 重新分配**：按域内 10 间隔规划，避免排序依赖插入顺序。

---

## 四、UI 设计统一方案

### 4.1 设计 Token 架构

```
Layer 1: apps/web/src/theme/tokens.ts（TypeScript 唯一真值源）
    │
    ├── scripts/generate-tokens.ts（自动同步）
    │
    ├──→ Layer 2: apps/web/src/index.css（CSS 自定义属性）
    │
    └──→ Layer 3: packages/@topems/tokens（TS 常量，跨应用）
```

修改 Token 只需编辑 `tokens.ts`，运行 `pnpm run generate-tokens` 自动同步。

### 4.2 颜色系统

| 场景 | 规范 |
|------|------|
| 主题色 | 使用 MUI `palette.primary` 等 |
| 背景/表面 | 使用 CSS 变量 `var(--color-background)`、`var(--color-surface)` |
| 状态色 | 使用 `success.dark`、`error.dark`、`warning.dark` 做小文本 |
| 模块渐变色 | 按模块固定映射（见 `design-system.md`） |

### 4.3 样式规范

1. **所有新代码使用 MUI sx prop**，禁止 Tailwind className。
2. **禁止硬编码颜色、px 间距、rem 字号**，必须通过 Token 或 theme。
3. **图标统一使用 Lucide React**，禁止使用 `@mui/icons-material`。
4. **布局使用 `Box`/`Stack`/`Grid`**，避免裸 `div`/`span`。

### 4.4 主题切换整改

```typescript
// theme.ts 应支持多 colorScheme
createTheme({
  colorSchemes: {
    light: { palette: { mode: 'light', ...lightPalette } },
    dark: { palette: { mode: 'dark', ...darkPalette } },
    cyberpunk: { palette: { mode: 'dark', ...cyberpunkPalette } },
  },
});

// themeStore.ts 修正 toggleTheme
toggleTheme: () => {
  const next = theme === 'light' ? 'dark'
    : theme === 'dark' ? 'cyberpunk'
    : theme === 'cyberpunk' ? 'system'
    : 'light';
  set({ theme: next });
};
```

---

## 五、组件与模板统一方案

### 5.1 共享组件强制使用

| 场景 | 必须使用 | 禁止自研 |
|------|----------|----------|
| 数据表格 | `DataTable` | 手写 MUI Table |
| 分页 | `Pagination` | 手写分页按钮 |
| 状态展示 | `StatusBadge` | 手写 Chip 颜色 |
| 表单字段 | `FormField` 系列 | 零散 MUI TextField/Select |
| 页面头部 | `PageHeader` / `PageContainer` | 手写标题区 |
| 空状态 | `EmptyState` | 手写提示 |
| 加载 | `LoadingSpinner` | 手写 CircularProgress |
| 二次确认 | `ConfirmDialog` | `window.confirm` |
| 筛选 | `FilterBar` | 手写筛选表单 |
| 时间展示 | `RelativeTime` | 手写时间格式化 |

### 5.2 页面模板选型

| 模板 | 适用场景 |
|------|----------|
| `CrudPage` | Schema 驱动的完整增删改查 |
| `ListPageTemplate` | 数据列表、查询表格 |
| `DetailPageTemplate` | 详情页、只读信息展示 |
| `FormPageTemplate` | 新建/编辑表单页 |
| `DashboardTemplate` | 首页、统计看板 |
| `StatsPageTemplate` | 统计分析页、报表汇总 |
| `KanbanPageTemplate` | 任务/工单看板 |
| `TreePageTemplate` | 树形数据、组织架构 |
| `MasterDetailPageTemplate` | 主从布局 |
| `WizardPageTemplate` | 分步表单 |
| `SettingsPageTemplate` | 系统设置、个人设置 |
| `CardListTemplate` | 卡片网格 |
| `ChatPageTemplate` | AI/IM 对话页 |
| `AiToolPageTemplate` | AI 工具页 |
| `DesignerTemplate` | 设计器/画布 |
| `ReportViewerTemplate` | 报表查看器 |
| `GisMapTemplate` | GIS 地图 |
| `MobilePageTemplate` | 移动端页面 |
| `AuthPageTemplate` | 认证/错误页 |

### 5.3 新增页面流程

```
页面需求
  │
  ├─ 根据《页面模板选型规范》选择模板
  │
  ├─ 使用《共享组件使用规范》中的强制组件
  │
  ├─ 在模块 config.ts 中注册导航（遵循四层模型）
  │
  ├─ 运行 design-system-audit/scan.mjs 扫描
  │
  ├─ 运行 analyze_nav_structure.mjs 核对导航结构
  │
  └─ 运行 verify_navigation.mjs --strict 执行三联校验
```

---

## 六、页面布局统一方案

### 6.1 标准布局结构

```
┌─────────────────────────────────────────────┐
│ AppHeader（搜索 / 通知 / 主题 / 用户菜单）     │  ← L0 全局动作
├─────────────────────────────────────────────┤
│ AppSidebar（L1 业务域 → L2 模块）             │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │ PageBreadcrumb                          │  │
│  │ PageHeader + Actions                    │  │
│  ├────────────────────────────────────────┤  │
│  │ ModuleTabs（L3）                        │  │
│  ├────────────────────────────────────────┤  │
│  │                                         │  │
│  │ Page Content                            │  │
│  │                                         │  │
│  └────────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

### 6.2 首页 Dashboard 标准分区

1. 欢迎语 + 4 指标卡（待审批 / 待处理 / 在线用户 / 文件数量）
2. 快捷入口（8 个常用功能）
3. 待办事项
4. 最近活动
5. 服务状态监测
6. 专业模块分区（已安装 plugin 模块卡片）

### 6.3 浮动按钮布局

| 按钮 | 位置 | 说明 |
|------|------|------|
| AI Copilot | bottom: 24, right: 24 | 独立入口 |
| 上下文帮助 | bottom: 24, right: 80 | 与 AI 按钮错开 |
| 性能监控 | bottom: 24, left: 24 | 移至左侧 |

---

## 七、无障碍统一方案

### 7.1 强制要求

- 所有交互元素可通过 Tab 键到达。
- 图标按钮必须提供 `aria-label`。
- 表单输入必须有 `<label>` 关联。
- 错误消息必须 `role="alert"` 并关联输入框。
- 动态状态变化使用 `aria-live`。
- 尊重 `prefers-reduced-motion`。

### 7.2 优先级修复

1. `ProgressBar` 圆形/分段变体补充 ARIA 属性。
2. `StatusBadge` 补充 `role="status"`。
3. `DataTable` 导出/列设置菜单补充 `aria-haspopup`/`aria-checked`。

---

## 八、质量门禁

### 8.1 CI 强制检查

| 检查项 | 命令 | 失败标准 |
|--------|------|----------|
| 导航结构核对 | `node scripts/analyze_nav_structure.mjs` | L1/L2/L3/L4 数量/映射与方案偏差 |
| 导航三联校验 | `node scripts/verify_navigation.mjs --strict` | 任何页面/路由/权限缺失项 |
| Token 合规扫描 | `node scripts/ci/check-design-tokens.cjs --changed-only` | 新增硬编码 |
| Tailwind 残留 | grep 14 项 class 模式 | 业务代码 > 0 |
| TypeScript | `npx tsc --noEmit` | 任何 error |
| ESLint | `npx eslint .` | 任何 error |
| i18n 质量 | `check-i18n-quality.cjs` | fake en / 混合结构 |
| 硬编码 CJK | `scan-hardcoded-precise.cjs --strict` | admin 模块 > 0 |

### 8.2 本地提交前检查

```bash
# lefthook 配置已包含
- npx tsc --noEmit
- node scripts/ci/check-design-tokens.cjs --changed-only
- node scripts/scan-hardcoded-precise.cjs --strict --details 30
```

---

## 九、实施路线图

### 阶段 1：文档与入口统一（已完成）

- [x] 归纳所有 UI/导航文档
- [x] 删除冗余/过时文档
- [x] 建立统一方案文档
- [x] 更新保留文档交叉引用

### 阶段 2：导航整改（P0）

- [ ] 删除 `HeaderNavTabs`
- [ ] 整改插件市场入口（Sidebar + Dashboard）
- [ ] 修复 LanguageSelector i18n 影子化问题
- [ ] 重新分配全局 order（域内 10 间隔）

### 阶段 3：主题与浮动按钮整改（P0）

- [ ] `theme.ts` 支持 `light/dark/cyberpunk` colorSchemes
- [ ] `themeStore.ts` 修正 toggleTheme 循环
- [ ] 调整浮动按钮位置避免重叠

### 阶段 4：无障碍补强（P1）

- [ ] ProgressBar ARIA 属性
- [ ] StatusBadge role="status"
- [ ] DataTable 菜单 ARIA 属性

### 阶段 5：持续治理（P1）

- [ ] 每月文档与代码一致性审查
- [ ] 每季度回顾模板例外（当前 0 个）
- [ ] 新增组件必须补充 Storybook 示例

---

## 附录 A：导航结构校验实现细节

### A.1 校验脚本分工

| 脚本/模块 | 职责 | 触发时机 |
|-----------|------|----------|
| `scripts/analyze_nav_structure.mjs` | 扫描 `apps/web/src/modules/*/config.ts`，输出 L1-L4 导航结构统计与映射 | 本地调试、设计评审、CI 结构核对 |
| `scripts/verify_navigation.mjs` | 执行「三联校验」：导航声明 → 页面文件 / 路由注册 / 权限定义 | CI 门禁，`--strict` 阻断 |
| `packages/app-shell/src/navigation-types.ts` | 定义 `ModuleSuite`、`NavGroup`、`NavItemConfig` 等类型约束 | TypeScript 编译期 |
| `apps/web/src/lib/navigation/NavigationRegistryV2.ts` | 运行时导航注册、权限过滤、事件通知、模块去重 | 应用运行时 |

### A.2 四层模型类型约束（代码真值源）

```typescript
// packages/app-shell/src/navigation-types.ts
export type ModuleSuite =
  | 'enterprise'    // (10) 企业平台
  | 'manufacturing' // (20) 制造域
  | 'quality'       // (30) 质量域
  | 'supply'        // (40) 供应链域
  | 'finance'       // (50) 财务域
  | 'hr'            // (60) 人力域
  | 'crm'           // (70) 客户域
  | 'project'       // (80) 项目域
  | 'collaboration' // (90) 工具与协同域
  | 'platform';     // (100) 平台能力域

export type NavGroup =
  | 'overview'  // (0)  概览仪表盘
  | 'master'    // (10) 基础主数据
  | 'process'   // (20) 核心业务流程
  | 'business'  // (30) 业务单据管理
  | 'analytics' // (40) 统计分析
  | 'report'    // (50) 报表与打印
  | 'setting'   // (60) 系统配置/模板
  | 'other';    // (99) 杂项兜底
```

约束说明：

- L1 `ModuleSuite` 仅 10 个枚举值，新增值会导致 TypeScript 编译错误。
- L3 `NavGroup` 仅 8 个枚举值，模块 `config.ts` 中 `group` 字段超出枚举会触发类型检查失败。
- L2 `ModuleNavConfig.code` 全局唯一，`NavigationRegistryV2` 以 `Map` 存储，重复注册会覆盖并触发 `navigationUpdated` 事件。
- L4 `NavItemConfig.code` 推荐 `{module}-{page}` 格式，同一模块内禁止重复。

### A.3 `analyze_nav_structure.mjs` 实现

扫描逻辑：

1. 遍历 `apps/web/src/modules/` 下 33 个模块目录。
2. 读取每个模块的 `config.ts`。
3. 用正则定位 `export const xxxNavConfig: ModuleNavConfig = {`。
4. 在 NavConfig 头部提取字段：`code`、`name`、`icon`、`permission`、`source`、`suite`、`status`、`order`、`description`。
5. 解析 `navItems: [...]` 数组，递归解析 `children` 嵌套。
6. 按 `group` 字段分组统计 L3 子组。
7. 输出统计与映射报告：
   - L1 业务域数量与模块分布
   - L2 模块数量
   - L3 子组数量
   - L4 页面入口数量
   - 推荐 L1 分域映射覆盖率
   - 典型大模块（MES/HRM/QMS/WMS）的 L3 → L4 展开抽样

### A.4 `verify_navigation.mjs` 三联校验

#### 第一联：导航声明 → 页面文件存在性

- 输入：所有 `navItems` 扁平化后的 `path` 列表。
- 核心函数：`pagePathToFile(path)` 将路由路径转换为候选页面文件路径。
- 候选规则（按优先级）：
  - 直接路径：`{path}.tsx` / `{path}/index.tsx`
  - PascalCase 页面变体：`{LastSegment}Page.tsx`
  - 业务后缀缩略：去掉 `-management` 等后缀后再匹配
  - 单复数变体：复数末段去 `s` / `-ies` → `y`
  - 缩写词典：`statistics` → `StatsPage` 等
  - 模块前缀：`{Module}{Page}Page.tsx`
  - 复合词取后半段：`supplier-evaluation` → `EvaluationPage`
  - 模糊匹配兜底：同目录下按文件名相似度评分
- 输出：缺失页面文件列表及候选路径。

#### 第二联：导航声明 → 路由注册存在性

- 输入：导航声明 `path` 列表。
- 逻辑：
  1. 扫描每个模块 `config.ts` 中的 `routes: [...]` 数组。
  2. 解析路径常量（如 `MES_PATHS.workstation`）为实际字符串。
  3. 合并 `apps/web/src/routes/v2/index.ts` 中直接声明的路径。
  4. 将导航 `path` 中的动态段 `/:id` 归一化为 `/:id` 后匹配。
- 输出：缺失路由注册列表。

#### 第三联：导航声明 → 权限定义存在性

- 输入：导航声明 `permission` 列表。
- 校验规则：
  - `permission` 字段必须存在。
  - 格式必须是 2 段（`module:action`）或 3 段（`module:resource:action`）。
  - `module` 部分必须在合法模块代码集合中。
  - `action` 部分必须是白名单之一：`read | write | delete | approve | admin | update | create`。
- 权限来源：
  - `apps/web/src/config/permissions.ts` 中的 `MODULES` 和 `PERMISSIONS`。
  - 各模块 `config.ts` 中声明的 `permission` / `requiredPermissions`。
  - 自动生成的 `module:action` 全组合。
- 输出：格式错误、非法模块、非法 action、缺失权限列表。

### A.5 CI 集成示例

```yaml
- name: 导航结构核对
  run: node scripts/analyze_nav_structure.mjs

- name: 导航三联校验（严格模式）
  run: node scripts/verify_navigation.mjs --strict
```

退出码约定：

- `verify_navigation.mjs`：非严格模式下缺失仅提示，返回 `0`；`--strict` 模式下存在任何缺失项返回 `1`。
- `analyze_nav_structure.mjs`：始终返回 `0`，用于生成报告供人工或自动化比对。

### A.6 运行时校验与权限过滤

`NavigationRegistryV2` 在应用启动时聚合所有模块配置，提供：

- `registerModule(config)` / `unregisterModule(moduleCode)`
- `getTopNavItems(hasPermission?)`：L1 顶层导航
- `getNavItemsGroupedByBusinessDomain()`：L1 → L2 分组导航
- `getModuleTabs(moduleCode)`：L3 子组/Tab 导航
- 事件：`navigationUpdated` 用于动态刷新导航

权限过滤通过传入的 `hasPermission(perm: string) => boolean` 回调实现，未授权模块或页面不会进入渲染后的导航树，但注册表中保留原始配置以便调试与审计。

---

## 附录 B：导航结构校验测试用例与验证步骤

### B.1 单元测试覆盖（NavigationRegistryV2）

测试文件位置：

- `apps/web/src/lib/navigation/__tests__/NavigationRegistryV2.test.ts`
- `apps/web/src/lib/navigation/__tests__/NavigationRegistryV2.edge-cases.test.ts`

运行命令：

```bash
pnpm vitest run apps/web/src/lib/navigation/__tests__
```

#### B.1.1 核心功能测试

| 编号 | 用例 | 输入 | 期望结果 |
|------|------|------|----------|
| NR-01 | 单例模式 | 多次调用 `getInstance()` | 返回同一实例 |
| NR-02 | 模块注册 | `registerModule({ code: 'test' })` | `getModule('test')` 返回配置 |
| NR-03 | 模块注销 | `unregisterModule('test')` | `getModule('test')` 返回 `undefined` |
| NR-04 | 业务域分组 | 注册 `suite: 'finance'` 和 `suite: 'hr'` 的模块 | `getNavItemsGroupedByBusinessDomain()` 正确分组 |
| NR-05 | 无 suite 降级 | 注册未指定 `suite` 的模块 | 落入 `other` 分组 |
| NR-06 | 模块级权限过滤 | 模块 `permission: 'admin:view'`，回调拒绝该权限 | 模块不出现在任何分组 |

#### B.1.2 动态路由匹配测试

| 编号 | 用例 | 输入 | 期望结果 |
|------|------|------|----------|
| NR-07 | 单段动态路由 | 导航 `/test/:id`，访问 `/test/123` | 匹配到 `:id` 页面 |
| NR-08 | 嵌套动态路由 | 导航 `/projects/:projectId/tasks/:taskId` | 匹配到任务详情 |
| NR-09 | 静态优先 | 同时存在 `/users` 和 `/:id` | `/users` 优先匹配静态路由 |
| NR-10 | 段数不匹配 | 导航 `/test/:id`，访问 `/test/123/sub` | 不匹配 |

#### B.1.3 面包屑层级测试

| 编号 | 用例 | 输入 | 期望结果 |
|------|------|------|----------|
| NR-11 | 扁平层级 | 模块 + 1 级页面 | 返回 `[模块, 页面]` 2 层 |
| NR-12 | 嵌套层级 | 模块 + 3 级 `children` | 返回 4 层数组 |
| NR-13 | 未知路径 | 访问未注册路径 | 返回空数组 |
| NR-14 | 动态路由面包屑 | 访问 `/projects/proj-001` | 包含项目详情节点 |

#### B.1.4 Sidebar 分组与显示测试

| 编号 | 用例 | 输入 | 期望结果 |
|------|------|------|----------|
| NR-15 | 按 group 分组 | 多个 `group: 'master'` / `group: 'business'` 项 | 按标准 8 个 `NavGroup` 分组 |
| NR-16 | 空导航 | `navItems: []` | `getSidebarNavItems` 返回空数组，`getSidebarNavGrouped` 返回空对象 |
| NR-17 | 隐藏项过滤 | 页面 `showInSidebar: false` | 不进入 Sidebar |
| NR-18 | 页面级权限过滤 | 页面 `permission: 'admin:view'`，回调拒绝 | 该页面不进入 Sidebar |

#### B.1.5 模块卡片测试

| 编号 | 用例 | 输入 | 期望结果 |
|------|------|------|----------|
| NR-19 | 卡片路径取首个 navItem | 模块 `path: '/m'`，首个 navItem `/m/dashboard` | 卡片路径为 `/m/dashboard` |
| NR-20 | 无 navItem 回退 | 模块 `path: '/m'`，`navItems: []` | 卡片路径回退为 `/m` |
| NR-21 | 状态透传 | 模块 `status: 'beta'` | 卡片 `status` 为 `beta` |

#### B.1.6 事件测试

| 编号 | 用例 | 输入 | 期望结果 |
|------|------|------|----------|
| NR-22 | 注册事件 | `registerModule` | 触发 `navigationUpdated` 并携带模块 code |
| NR-23 | 注销事件 | `unregisterModule` | 再次触发 `navigationUpdated` |

### B.2 脚本级验证步骤

#### B.2.1 `analyze_nav_structure.mjs` 验证

1. 确保所有模块目录下存在 `config.ts`：
   ```bash
   ls apps/web/src/modules/*/config.ts | wc -l
   # 期望：33
   ```
2. 运行结构核对脚本：
   ```bash
   node scripts/analyze_nav_structure.mjs
   ```
3. 检查输出：
   - `L1 业务域 x 10`
   - `L2 模块数 x 33`
   - `L3 子组数` 与当前方案一致
   - `L4 页面入口` 与最近一次基线一致
   - `✅ L1→L2 映射 100% 覆盖全部 33 个模块！`
4. 若出现 `⚠️ 未在推荐 L1 中归属的模块`，需在 `config.ts` 中修正 `suite` 字段。

#### B.2.2 `verify_navigation.mjs` 验证

1. 开发环境非严格模式（仅提示不阻断）：
   ```bash
   node scripts/verify_navigation.mjs
   ```
2. CI 严格模式（任何缺失项都会导致失败）：
   ```bash
   node scripts/verify_navigation.mjs --strict
   ```
3. 详细输出模式：
   ```bash
   node scripts/verify_navigation.mjs --strict --verbose
   ```
4. 验收标准：
   - 第一联「页面文件」缺失数为 0。
   - 第二联「路由注册」缺失数为 0。
   - 第三联「权限定义」中格式错误、非法模块、非法 action 均为 0。
   - 综合覆盖率 100%。

### B.3 新增页面/模块手动验证清单

| 检查项 | 验证方法 | 通过标准 |
|--------|----------|----------|
| L1 业务域合规 | 检查 `suite` 字段 | 必须是 `ModuleSuite` 10 个枚举值之一 |
| L3 子组合规 | 检查 `group` 字段 | 必须是 `NavGroup` 8 个枚举值之一 |
| L4 code 规范 | 检查 `navItems[].code` | 格式为 `{module}-{page}`，模块内唯一 |
| 路径引用规范 | 检查 `path` 字段 | 使用模块 `PATHS` 常量，禁止硬编码字符串 |
| 页面文件存在 | 运行 `verify_navigation.mjs` | 第一联无缺失 |
| 路由已注册 | 运行 `verify_navigation.mjs` | 第二联无缺失 |
| 权限已定义 | 运行 `verify_navigation.mjs` | 第三联无格式/模块/action 错误 |
| i18n key 完整 | 检查 `labelKey` / `nameKey` | 所有新增 label 均有对应 key |
| 图标已注册 | 检查 `icon` 字段 | 必须是 Lucide 图标名称，且已导入 |
| 模板选型正确 | 对照《页面模板选型规范》 | 页面使用推荐模板 |

### B.4 CI 验证流程

```yaml
navigation-validation:
  steps:
    - name: 安装依赖
      run: pnpm install

    - name: TypeScript 类型检查
      run: npx tsc --noEmit

    - name: 导航 Registry 单元测试
      run: pnpm vitest run apps/web/src/lib/navigation/__tests__

    - name: 导航结构核对
      run: node scripts/analyze_nav_structure.mjs

    - name: 导航三联校验（严格模式）
      run: node scripts/verify_navigation.mjs --strict
```

### B.5 常见失败场景与修复

| 失败现象 | 根因 | 修复步骤 |
|----------|------|----------|
| `verify_navigation.mjs` 第一联缺失 | 页面文件路径或命名与导航 path 不匹配 | 按 `pagePathToFile` 候选规则重命名文件，或修正导航 path |
| `verify_navigation.mjs` 第二联缺失 | 路由未在模块 `routes: [...]` 或 `routes/v2/index.ts` 注册 | 补充路由注册，并确保 path 常量已导出 |
| `verify_navigation.mjs` 第三联格式错误 | `permission` 不是 2/3 段格式 | 改为 `module:action` 或 `module:resource:action` |
| `verify_navigation.mjs` 第三联非法 action | action 不在白名单 | 使用 `read/write/delete/approve/admin/update/create` 之一 |
| `analyze_nav_structure.mjs` L1 未 100% 覆盖 | 某模块 `suite` 为空或为新字符串 | 从 10 个 `ModuleSuite` 枚举中选择归属 |
| `analyze_nav_structure.mjs` L3 出现非标准 group | `group` 字段使用了自定义字符串 | 改为 8 个 `NavGroup` 枚举值之一；确需新增则走 RFC |
| 单元测试 `group` 报错 | 测试用例使用旧自定义 group | 更新测试数据为标准 `NavGroup` 值 |

### B.6 回归验证命令

每次修改导航相关代码后，在本地依次执行：

```bash
# 1. 类型检查
npx tsc --noEmit

# 2. Registry 单元测试
pnpm vitest run apps/web/src/lib/navigation/__tests__

# 3. 结构核对
node scripts/analyze_nav_structure.mjs

# 4. 三联校验（严格模式）
node scripts/verify_navigation.mjs --strict

# 5. 设计 Token 合规检查
node scripts/ci/check-design-tokens.cjs --changed-only
```

全部通过后方可提交 PR。

---

## 十、文档索引

### 10.1 权威文档（保留）

| 文档 | 用途 | 状态 |
|------|------|------|
| [`docs/navigation-architecture.md`](../navigation-architecture.md) | 四层导航架构唯一规范 | 已生效 |
| [`docs/development/frontend/design-system.md`](../development/frontend/design-system.md) | MUI 设计系统基础 | 已生效 |
| [`docs/design/shared-component-guidelines.md`](./shared-component-guidelines.md) | 共享组件使用规范 | 已生效 |
| [`docs/design/page-template-selection-guide.md`](./page-template-selection-guide.md) | 页面模板选型规范 | 已生效 |
| [`docs/design/template-exceptions.md`](./template-exceptions.md) | 模板例外历史（已清零） | 已归档 |
| [`docs/development/frontend/accessibility.md`](../development/frontend/accessibility.md) | 无障碍规范 | 已生效 |
| [`docs/development/frontend/component-migration-guide.md`](../development/frontend/component-migration-guide.md) | shadcn → MUI 迁移参考 | 已生效 |

### 10.2 已删除文档

以下文档因内容被权威文档覆盖、过时或属于过程文档，已删除：

- `docs/development/frontend/ui-design-spec.md`
- `docs/development/frontend/ui-navigation-design.md`
- `docs/development/frontend/frontend-components.md`
- `docs/development/frontend/page-refactoring-guide.md`
- `docs/development/frontend/module-layout-guide.md`
- `docs/modules/development/frontend/ui-navigation-standardization.md`
- `docs/audit/navigation-ui-unified-review-2026-08-15.md`
- `docs/audit/nav-architecture-verification-2026-08-15.md`
- `docs/roadmap/V67.3-frontend-ui-optimization-plan.md`
- `docs/superpowers/plans/2026-08-08-navigation-ui-unified.md`
- `docs/superpowers/plans/2026-08-09-v68-3-nav-arch-compliance.md`

---

## 十一、更新记录

| 版本 | 日期 | 更新内容 |
|------|------|----------|
| v1.0.2 | 2026-08-28 | 补充附录 B：导航结构校验测试用例与验证步骤，含单元测试、脚本验证、手动清单、CI 流程、常见失败场景 |
| v1.0.1 | 2026-08-28 | 补充附录 A：导航结构校验实现细节；修正校验命令为 `analyze_nav_structure.mjs` + `verify_navigation.mjs --strict` |
| v1.0.0 | 2026-08-28 | 初始版本，统一 UI 设计与导航方案，清理冗余文档 |

---

*本文档由 TOPEMS 前端团队维护，与代码强制一致。*
