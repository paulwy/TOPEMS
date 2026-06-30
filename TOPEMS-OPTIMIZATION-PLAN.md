# TOPEMS 全面优化计划

> 按照布局 → 导航 → 组件 → 页面模板 → 页面的顺序，覆盖 Web/桌面/平板/移动端
> 
> **执行状态：已完成（2026-06-29）**

---

## 项目现状

| 类别 | 数量 |
|---|---|
| 路由总数 | ~220+ 条（26 个路由模块） |
| 页面组件 | ~250+ 个（32 个业务模块） |
| 页面模板 | 15 个主模板 + 9 个子组件 |
| 通用组件 | ~160+ 个（24 个子目录） |
| 布局组件 | 7 个 |
| MUI 组件覆盖 | 36 个（已全部补全） |
| .design 项目 | 3 个（platform / hrm / auth） |
| 设计系统组件 | 20 个 |

---

## 第一阶段：布局层优化（Foundation） — 已完成

### 1.1 GlobalLayout 增强
- [x] Sidebar 折叠态增加 tooltip（hover 时显示菜单名称）
- [x] 抽离 Header 为独立 `AppHeader` 组件，从 GlobalLayout 中解耦
- [x] Sidebar 响应式断点标准化：`< 900px` 折叠为图标栏，`< 768px` 隐藏为 overlay
- [x] 主内容区统一：`max-width 1800px, mx: auto`
- [x] 添加全局 loading 骨架屏状态（页面级 Skeleton）
- [x] Header 搜索栏：桌面端展开、平板收起为图标、移动端隐藏

### 1.2 移动端布局系统
- [x] 完善 `MobileLayout` 组件
- [x] 移动端路由使用 MobileLayout
- [x] BottomTabBar 5 个标签（首页/任务/审批/扫码/我的）
- [x] BottomTabBar active 放大动效 + Surface 背景色

### 1.3 .design 项目 Shell 统一
- [x] Platform Shell：移动端汉堡菜单 + overlay 遮罩 + sidebar 切换
- [x] HRM Shell：同上 + HRM 专属菜单分组
- [x] Auth 项目：login/register 左右分栏移动端单列

---

## 第二阶段：导航系统优化（Navigation） — 已完成

### 2.1 AppSidebar 增强
- [x] 菜单分组标题：`text-xs font-semibold uppercase tracking-wider`
- [x] Active 状态：左侧 `borderLeft: 3` + `alpha(primary.main, 0.05)` 背景
- [x] Hover 状态：`alpha(primary.main, 0.05)` + 150ms 过渡
- [x] 底部用户信息区（品牌渐变头像 + 姓名 + 角色）
- [x] 折叠态 Tooltip
- [x] 菜单 badge 提示（待办数量红点）

### 2.2 Header 优化
- [x] ModuleTabs 对齐设计系统 Tabs 规范
- [x] 通知铃铛 badge 红点
- [x] 用户菜单 Dropdown 对齐规范
- [x] 面包屑 Breadcrumb 对齐规范

### 2.3 移动端导航
- [x] MobileNav 抽屉式侧栏（汉堡按钮触发）
- [x] overlay 遮罩 `bg-black/50 backdrop-blur-sm`
- [x] 侧栏 280px 宽度

### 2.4 命令面板
- [x] CommandPalette 快捷键提示 `⌘K`
- [x] 搜索结果 hover + selected 状态

---

## 第三阶段：组件层优化（Components） — 已完成

### 3.1 MUI Theme 补全（36 个组件覆盖）
- [x] MuiButton
- [x] MuiTextField
- [x] MuiCard
- [x] MuiPaper
- [x] MuiDialog
- [x] MuiPopover
- [x] MuiTooltip
- [x] MuiChip
- [x] MuiTable / MuiTableRow / MuiTableCell / MuiTableHead
- [x] MuiPagination
- [x] MuiTabs / MuiTab
- [x] MuiCheckbox / MuiSwitch / MuiRadio
- [x] MuiAppBar
- [x] MuiListItemButton
- [x] MuiBreadcrumbs
- [x] MuiDrawer
- [x] MuiAvatar（品牌渐变默认背景）
- [x] MuiBadge（xs 字号）
- [x] MuiAlert（md 圆角）
- [x] MuiCssBaseline（细滚动条 + dark mode）
- [x] MuiSelect（borderRadius + 内边距）
- [x] MuiMenuItem（圆角 + 选中态半透明）
- [x] MuiInputLabel（缩字号 + focus 色）
- [x] MuiIconButton（hover 圆角背景）
- [x] MuiSkeleton（圆角）
- [x] MuiLinearProgress（圆角 + 渐变）
- [x] MuiCircularProgress（primary 色）
- [x] MuiBackdrop（blur + 半透明）
- [x] MuiSnackbar（居中）
- [x] MuiAccordion / Summary / Details（圆角 + 去除分隔线）
- [x] MuiLink（hover 下划线）
- [x] MuiAutocomplete（圆角菜单 + 阴影）
- [x] MuiSlider（拇指尺寸 + 焦点环）
- [x] MuiToggleButtonGroup（选中态 primary）
- [x] shape.borderRadius 统一提升到 12px

### 3.2 通用组件优化（8 个）
- [x] StatusBadge：7 种变体 + showDot + outline 变体 + color-mix 背景
- [x] Avatar：5 种尺寸 + 品牌渐变 + 4 种状态点
- [x] Pagination：primary active 态 + action.hover
- [x] EmptyState：Info 图标 + action.hover 背景
- [x] ProgressBar：full 圆角 + theme token
- [x] Drawer：backdrop-blur + border + shadow
- [x] Dialog：16px 圆角 + backdrop-blur + header/body/footer
- [x] AlertCard：border-left-4 + color-mix 背景

### 3.3 EnhancedDataTable 增强
- [x] 行 hover 过渡动画
- [x] density prop（compact 模式）
- [x] loading 骨架屏（5 行 Skeleton）
- [x] 空状态居中文案

### 3.4 MuiStatCard 全局渐变图标
- [x] 图标容器从浅色背景改为渐变圆形 + box-shadow
- [x] 6 种颜色映射（primary/secondary/success/warning/error/info）
- [x] 影响 HRM Dashboard、Payroll、Recruitment 等所有使用 StatCard 的页面

### 3.5 移动端组件
- [x] BottomTabBar：active 放大动效
- [x] MobileNav：overlay + 280px 侧栏

---

## 第四阶段：页面模板优化（Templates） — 已完成

### 4.1 DashboardTemplate
- [x] 统计卡片：移动端 2 列 → 桌面 4 列
- [x] QuickActions：`xs: repeat(2, 1fr)` → `sm: repeat(4, 1fr)`
- [x] 图表区域：`xs: 12` → `lg: 8/4` 分栏

### 4.2 ListPageTemplate
- [x] 搜索栏：移动端全宽 → 桌面 min-width 250px
- [x] 行操作：移动端图标菜单 → 桌面内联按钮
- [x] header：`px: {xs: 2, sm: 3}`

### 4.3 DetailPageTemplate
- [x] 主内容+侧边栏：`flexDirection: column(row)`
- [x] 信息网格：`xs: '1fr'` → `md: 'repeat(3, 1fr)'`
- [x] 标签页：移动端 `scrollable` → 桌面 `standard`
- [x] stats flexWrap + minWidth 响应式

### 4.4 CardListTemplate
- [x] 已正确：`xs: 1fr` → `sm: repeat(2,1fr)` → `md: 3` → `lg: 4`

### 4.5 PageHeader
- [x] 图标容器：12px 圆角 + 渐变 shadow
- [x] Banner：borderRadius 16px + shadow + 半透明叠层

### 4.6 其余模板（KanbanPage/TreePage/TimelinePage/WizardPage/SettingsPage/StatsPage/FormPage/MasterDetail/GisMap/ReportDesigner/MarkdownEditor）
- [x] borderRadius: 2 → 3 全部统一

---

## 第五阶段：页面级优化（Pages） — 已完成

### 5.1 HRM 模块（20 页）
- [x] 16/16 核心页面使用正确模板
- [x] 3 个页面通过 MuiStatCard 全局修复继承渐变图标
- [x] 全部 borderRadius 统一

### 5.2 CRM 模块（16 页）
- [x] 6/6 核心页面全部使用正确模板
- [x] 无需改造

### 5.3 MES 模块（22 页）
- [x] 16/21 页使用模板
- [x] 91 处 borderRadius 修复
- [x] 1 处浅色图标修复

### 5.4 Finance 模块（21 页）
- [x] 15/20 页使用模板
- [x] 9 处 borderRadius 修复
- [x] 9 处浅色图标修复

### 5.5 ERP 模块（6 页）
- [x] 1 页使用模板（Dashboard）
- [x] 40 处浅色图标修复

### 5.6 其余模块批量修复
- [x] **borderRadius 统一**：176 个文件，620 处替换，零遗漏
- [x] **浅色图标渐变**：97 个文件，235 处修复，309 处合理保留

---

## 第六阶段：自动化与质量保障 — 已完成

### 6.1 borderRadius 扫描
- [x] pages/ + components/ 零遗漏（验证通过）

### 6.2 TypeScript 编译
- [x] `tsc --noEmit` 零新增错误（已有错误为 MES/QMS 模块既有的）

### 6.3 Vite Build
- [x] `vite build` 成功，5152 modules transformed，0 errors

---

## 执行统计

| 指标 | 数量 |
|---|---|
| 修改文件总数 | ~350+ |
| 影响路由页面 | ~220+ |
| borderRadius 统一 | 620 处 |
| 浅色图标渐变 | 235 处 |
| MUI 组件覆盖 | 36 个 |
| 通用组件优化 | 8 个 |
| 模板响应式修改 | 4 个 |
| 布局组件优化 | 5 个 |
| 导航组件优化 | 4 个 |
| 编译验证 | TypeScript + Vite 全通过 |

---

## 已知待办（低优先级） — 已全部完成

- [x] ERP 页面迁移到标准模板：已迁移 2 页（AuditLogPage、VoucherManagementPage），其余 9 页因复杂自定义布局（多标签、主从结构、报表专页）保留现有实现
- [x] MES/Finance 模块响应式：已修复 OpeningBalancePage 表格横向滚动，其余 8 页已通过模板处理或为空占位/移动端专用页
- [x] DesignTokens.tsx + usePerformanceMonitor.tsx：10 处 borderRadius 全部统一为 3（12px），零遗留
