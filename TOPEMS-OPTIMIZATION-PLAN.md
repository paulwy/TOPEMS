# TOPEMS 全面优化计划

> 按照布局 → 导航 → 组件 → 页面模板 → 页面的顺序，覆盖 Web/桌面/平板/移动端

---

## 项目现状

| 类别 | 数量 |
|---|---|
| 路由总数 | ~220+ 条（26 个路由模块） |
| 页面组件 | ~250+ 个（32 个业务模块） |
| 页面模板 | 15 个主模板 + 9 个子组件 |
| 通用组件 | ~160+ 个（24 个子目录） |
| 布局组件 | 7 个 |
| MUI 组件覆盖 | 21 个（已完成基础对齐） |
| .design 项目 | 3 个（platform / hrm / auth） |
| 设计系统组件 | 20 个 |

---

## 第一阶段：布局层优化（Foundation）

### 1.1 GlobalLayout 增强
- [ ] 抽离 Header 为独立 `AppHeader` 组件，从 GlobalLayout 中解耦
- [ ] Sidebar 响应式断点标准化：`< 1024px` 折叠为图标栏，`< 768px` 隐藏为 overlay
- [ ] 主内容区统一：`max-w-[1800px] mx-auto px-4 lg:px-6 py-4 lg:py-6`
- [ ] 添加全局 loading 骨架屏状态（首次加载时显示页面级 Skeleton）
- [ ] Header 搜索栏：桌面端展开、平板收起为图标、移动端移入底部/隐藏
- [ ] Sidebar 折叠态增加 tooltip 显示菜单名称

### 1.2 移动端布局系统
- [ ] 完善 `MobileLayout` 组件：固定 BottomTabBar + 顶部 MobileHeader + 内容区
- [ ] 确认移动端路由 (`/mobile/*`) 使用 MobileLayout 而非 GlobalLayout
- [ ] 移动端 BottomTabBar 5 个标签：首页/任务/审批/扫码/我的
- [ ] 移动端页面过渡动画（slide-left/slide-right）

### 1.3 .design 项目 Shell 统一
- [ ] Platform Shell：已优化，确认所有 3 个页面内嵌 shell 一致性
- [ ] HRM Shell：已优化，确认所有 4 个页面内嵌 shell 一致性
- [ ] Auth 项目：确认 login/register 的单列布局在移动端正常

**预计工作量：3 个文件修改 + 2 个新组件**

---

## 第二阶段：导航系统优化（Navigation）

### 2.1 AppSidebar 增强
- [ ] 菜单分组标题样式统一（`text-xs font-semibold uppercase tracking-wider`）
- [ ] Active 状态：左侧 `border-l-3 border-primary` + `bg-primary/5`
- [ ] Hover 状态：`bg-surface-hover transition-colors`
- [ ] 底部用户信息区（品牌渐变头像 + 姓名 + 角色）
- [ ] 菜单 badge 提示（待办数量红点）
- [ ] 折叠态 tooltip（MUI Tooltip）
- [ ] 键盘快捷键支持（`Cmd+K` 呼出 CommandPalette）

### 2.2 Header 优化
- [ ] ModuleTabs（模块内子导航）样式对齐设计系统 Tabs 规范
- [ ] 通知铃铛 badge 红点
- [ ] 用户菜单 Dropdown 对齐设计系统 Dropdown 规范
- [ ] 面包屑 Breadcrumb 对齐设计系统规范

### 2.3 移动端导航
- [ ] MobileNav 抽屉式侧栏（汉堡按钮触发）
- [ ] overlay 遮罩 `bg-black/50 backdrop-blur-sm`
- [ ] 手势支持（左滑打开/右滑关闭）

### 2.4 命令面板
- [ ] 全局 `CommandPalette` 组件（`Cmd+K`）
- [ ] 搜索页面/模块/操作
- [ ] 键盘导航（上下箭头 + Enter）

**预计工作量：4 个文件修改 + 1 个新组件**

---

## 第三阶段：组件层优化（Components）

### 3.1 MUI Theme 补全（新增 ~15 个组件覆盖）
- [ ] MuiSelect：borderRadius + 菜单最大高度 + 菜单阴影
- [ ] MuiMenuItem：padding + hover 状态 + 圆角
- [ ] MuiInputLabel：缩小字号 + focus 颜色
- [ ] MuiIconButton：hover 圆角背景
- [ ] MuiSkeleton：圆角 + 脉冲动画
- [ ] MuiLinearProgress：圆角 + 渐变色
- [ ] MuiCircularProgress：primary 色调
- [ ] MuiBackdrop：blur + 背景色
- [ ] MuiSnackbar：圆角 + 底部间距
- [ ] MuiAccordion：圆角 + 展开动画
- [ ] MuiLink：primary 色 + hover 下划线
- [ ] MuiAutocomplete：borderRadius + 菜单阴影
- [ ] MuiSlider：轨道/拇指尺寸 + 颜色
- [ ] MuiToggleButtonGroup：圆角 + 选中态

### 3.2 通用组件优化（优先级排序）
- [ ] **DataTable**：已有 EnhancedDataTable — 补全 density/skeleton 已做；增加列固定（sticky column）、列宽拖拽
- [ ] **StatusBadge**：对齐设计系统 7 种变体色 + dot 前缀
- [ ] **SearchBar**：对齐设计系统 Input search 变体样式
- [ ] **Pagination**：对齐设计系统 Pagination 规范（item 样式、active 态、ellipsis）
- [ ] **Dialog/Modal**：对齐设计系统 Modal 规范（sm/md/lg 尺寸、header+body+footer 结构）
- [ ] **Drawer**：对齐设计系统 Drawer 规范（right/left、overlay、width）
- [ ] **Avatar**：对齐设计系统 Avatar 规范（5 种尺寸、品牌渐变、状态点）
- [ ] **Alert**：新增 AlertCard 对齐设计系统 Alert 规范（4 种变体 + border-left）
- [ ] **EmptyState**：对齐设计系统 EmptyState 规范（图标 + 标题 + 描述 + 操作）
- [ ] **ProgressBar/Progress**：线性 + 环形两种变体
- [ ] **Skeleton**：Card/Table/User 三种预设骨架屏
- [ ] **Switch**：对齐设计系统 Switch 规范（track + thumb + 标签）
- [ ] **Tabs**：Line/Pill/Enclosed 三种变体对齐
- [ ] **Breadcrumb**：分隔符样式 + chevron icon 变体

### 3.3 移动端组件补全
- [ ] MobileCard：紧凑卡片（shadow-sm + 12px 圆角）
- [ ] MobileButton：增大触摸目标（min-height 44px）
- [ ] MobileSearchBar：全宽搜索 + 取消按钮
- [ ] MobileTable：卡片式列表替代表格
- [ ] SwipeAction：左滑操作（删除/编辑）
- [ ] PullToRefresh：下拉刷新

**预计工作量：1 个文件修改(theme) + ~15 个组件修改/新建**

---

## 第四阶段：页面模板优化（Templates）

### 4.1 核心模板响应式完善
对 15 个主模板逐一检查并补全响应式断点：

- [ ] **DashboardTemplate**
  - 统计卡片：桌面 4 列 / 平板 2 列 / 移动 1-2 列
  - QuickActions：桌面 4 列 / 平板 2 列 / 移动横向滚动
  - 图表区域：桌面并排 / 平板堆叠 / 移动单列
  - 骨架屏 loading 已完成

- [ ] **ListPageTemplate**
  - 搜索筛选栏：桌面一行 / 平板两行 / 移动折叠
  - DataTable：桌面完整列 / 平板隐藏次要列 / 移动卡片列表替代表格
  - 分页：移动端简化（仅上一页/下一页）
  - density prop 已完成

- [ ] **DetailPageTemplate**
  - 信息卡头部：桌面左右布局 / 移动上下堆叠
  - Tabs：横向滚动（移动端）
  - DescriptionList：桌面两列 / 移动单列

- [ ] **FormPageTemplate**
  - 表单区：桌面两列 / 平板两列 / 移动单列
  - Footer 按钮：桌面右对齐 / 移动全宽堆叠

- [ ] **StatsPageTemplate**
  - 统计卡片：同 DashboardTemplate
  - 图表网格：桌面 3 列 / 平板 2 列 / 移动 1 列

- [ ] **CardListTemplate**
  - 卡片网格：桌面 3-4 列 / 平板 2 列 / 移动 1 列
  - 筛选栏：同 ListPageTemplate

- [ ] **KanbanPageTemplate**
  - 看板列：桌面 4 列 / 平板 2 列 / 移动横向滚动
  - 卡片：移动端简化信息

- [ ] **TreePageTemplate**
  - 树+详情：桌面左右分栏 / 平板上下 / 移动纯列表

- [ ] **TimelinePageTemplate**
  - 时间线：桌面左右交替 / 平板/移动左侧单列

- [ ] **WizardPageTemplate**
  - 步骤条：桌面横向 / 移动端简化为进度指示
  - 内容区：全宽

- [ ] **SettingsPageTemplate**
  - 左侧导航 + 右侧内容：桌面左右 / 移动 Tabs 替代

- [ ] **MasterDetailPageTemplate**
  - 主表+详情：桌面 split / 移动导航式（列表→详情→返回）

- [ ] **ReportDesignerTemplate**
  - 设计器：桌面全功能 / 平板简化 / 移动端仅预览

- [ ] **MarkdownEditorTemplate**
  - 编辑器：桌面分栏 / 移动端纯编辑模式

- [ ] **GisMapTemplate**
  - 地图：桌面全宽 / 平板/移动端地图 + 底部工具栏

### 4.2 PageHeader 增强
- [ ] Banner 渐变：对齐设计系统（borderRadius 16px + shadow + 叠层）已完成
- [ ] 图标容器：渐变圆形 + box-shadow 已完成
- [ ] Compact 模式：移动端使用（隐藏 banner，只显示标题 + 按钮）

**预计工作量：15 个模板文件修改**

---

## 第五阶段：页面级优化（Pages — 按模块分批）

### 5.1 认证页面（2 页）
- [ ] LoginPage：左右分栏响应式已完成；对齐 MUI theme token
- [ ] ForgotPasswordPage：同上风格

### 5.2 共享页面（6 页）
- [ ] HybridHomePage：Hero 统计 + 模块网格响应式
- [ ] ModulesOverviewPage：12 模块卡片网格响应式（3→2→1 列）
- [ ] DashboardPage：统计卡片 + 图表响应式
- [ ] ProfilePage：头像区 + 信息编辑表单响应式
- [ ] HelpCenterPage：卡片列表响应式
- [ ] TemplateDemoPage：模板演示响应式

### 5.3 HRM 模块（20 页）— 核心模块，重点优化
- [ ] HrmDashboardPage：统计卡 + 图表 + 快捷操作（渐变图标已修复）
- [ ] HrmEmployeePage：DataTable + 搜索筛选 + 分页
- [ ] HrmEmployeeDetailPage：信息卡 + Tabs + DescriptionList + 时间线
- [ ] HrmOrganizationPage：树形架构图响应式
- [ ] HrmAttendancePage / HrmPayrollPage / HrmPerformancePage：表格 + 图表
- [ ] 其余 15 页：确保使用正确模板 + borderRadius + 响应式

### 5.4 CRM 模块（16 页）
- [ ] DashboardPage：统计 + 漏斗图 + 趋势图
- [ ] CustomerManagementPage：DataTable + 筛选
- [ ] CustomerDetailPage：信息卡 + Tabs + 交互记录时间线
- [ ] 其余 13 页：模板使用 + 响应式

### 5.5 MES 模块（22 页）— 工厂场景，平板优先
- [ ] ProductionDashboardPage：车间看板（大屏适配）
- [ ] ProductionOrderManagementPage：DataTable
- [ ] MobileWorkstationPage：移动端工位页面（全功能）
- [ ] 其余 19 页：模板使用 + 响应式

### 5.6 Finance 模块（21 页）
- [ ] FinanceVoucherPage / VoucherDetailPage / VoucherCreatePage：凭证核心流程
- [ ] BudgetManagementPage / DashboardPage：预算看板
- [ ] 其余 17 页：模板使用 + 响应式

### 5.7 其余模块批量优化
- [ ] SCM（8 页）、WMS（14 页）、PM（10 页）、Workflow（16 页）
- [ ] BI（8 页）、QMS（11 页）、LIMS（14 页）、EHS（13 页）
- [ ] IAM（13 页）、ERP（6 页）、RS（22 页）、PDM（14 页）
- [ ] Notification（5 页）、Docs（5 页）、GIS（3 页）
- [ ] AI（3 页）、IM（1 页）、SRM（8 页）
- [ ] Mobile（9 页）、Monitor（3 页）
- [ ] OA（5 页）、Asset（7 页）、Report（8 页）

**批量策略**：对每个模块，检查是否正确使用模板 + borderRadius + 图标渐变 + 响应式断点。使用自动化脚本扫描未使用模板的页面。

**预计工作量：~250 页面逐一检查/修复**

---

## 第六阶段：自动化与质量保障

### 6.1 自动化扫描脚本
- [ ] 扫描所有页面是否使用设计 token（而非硬编码色值）
- [ ] 扫描所有页面是否使用响应式断点
- [ ] 扫描所有 borderRadius 是否 >= md（8px）
- [ ] 生成差异报告

### 6.2 TypeScript 编译验证
- [ ] `tsc --noEmit` 确认零新增错误
- [ ] `vite build` 确认构建成功

### 6.3 视觉回归测试
- [ ] 关键页面截图对比（before/after）

---

## 执行优先级

| 阶段 | 内容 | 优先级 | 预计工作量 |
|---|---|---|---|
| 1 | 布局层 | P0 | 小 |
| 2 | 导航系统 | P0 | 小 |
| 3 | 组件层 | P0 | 中 |
| 4 | 页面模板 | P1 | 中 |
| 5.1-5.3 | 认证 + 共享 + HRM + CRM | P1 | 中 |
| 5.4 | MES + Finance | P1 | 中 |
| 5.5 | 其余模块批量 | P2 | 大 |
| 6 | 自动化 + 验证 | P0 | 小 |

---

## 总体工作量估算

- **P0（必须完成）**：布局 + 导航 + 组件 + 模板 + 核心页面 ≈ 40 个文件
- **P1（高优先级）**：HRM/CRM/MES/Finance ≈ 60 个文件
- **P2（常规）**：其余模块 ≈ 150+ 个文件批量扫描修复
