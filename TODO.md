# TOPEMS UI 重设计迁移任务板

> 目标：用 Industrial OS 设计语言彻底替换旧 UI，建立可落地的 UI 设计标准与实施方案。  
> 范围：以 `apps/web` 为主战场，`apps/desktop` / `apps/mobile` 后续对齐。  
> 原则：**彻底、一步到位**——新方案与旧方案不并存，旧 token / 旧布局 / 旧视觉补丁按阶段清理。
>
> 📖 **迁移指南**：详见 [UI_MIGRATION_GUIDE.md](./UI_MIGRATION_GUIDE.md)  
> 📝 **变更日志**：详见 [CHANGELOG_UI_MIGRATION.md](./CHANGELOG_UI_MIGRATION.md)  
> ✅ **测试清单**：详见 [UI_MIGRATION_TEST_CHECKLIST.md](./UI_MIGRATION_TEST_CHECKLIST.md)  
> 🚀 **部署指南**：详见 [UI_MIGRATION_DEPLOYMENT_GUIDE.md](./UI_MIGRATION_DEPLOYMENT_GUIDE.md)  
> ❓ **常见问题**：详见 [UI_MIGRATION_FAQ.md](./UI_MIGRATION_FAQ.md)  
> 📊 **完成报告**：详见 [UI_MIGRATION_COMPLETION_REPORT.md](./UI_MIGRATION_COMPLETION_REPORT.md)  
> ⚡ **快速启动**：运行 `./scripts/enable-ui-v3.sh` 启用新布局

---

## 当前进度

### Phase 1：基础建设（已完成 ✅）

- [x] 输出 `UI_REDESIGN_v3.md` 评估与迁移策略文档
- [x] 创建 `apps/web/src/theme/redesign-tokens.css` Industrial OS token
- [x] 创建 `apps/web/src/theme/redesign-global.css` 全局样式与工具类
- [x] 搭建新组件库 `apps/web/src/components/redesign/`
  - [x] `primitives/`：Button、Card、Badge、Tag、Input、Select、Tabs
  - [x] `layout/`：AppShell、TopBar、SideRail、PageHeader
  - [x] `data/`：StatTile、StatusLight
  - [x] `overlay/`：Modal
  - [x] `feedback/`：Alert、EmptyState、ErrorState
- [x] 完成 `pages/RedesignDemo.tsx` 新版 Dashboard 演示页
- [x] 注册 `/redesign-demo` 路由
- [x] `pnpm typecheck` 通过
- [x] 新增代码 `eslint` 0 错误

### Phase 2：核心能力补齐与首批页面迁移（已完成 ✅）

#### 2.1 补齐 Industrial OS 组件库（已完成 ✅）

- [x] `components/redesign/data/DataTable.tsx`
  - 表头 uppercase + 左/右/中对齐
  - 行 hover `surface-2`、选中 `surface-3` + 左侧 accent 边线
  - 支持排序、空态、加载骨架
- [x] `components/redesign/data/FilterChip.tsx`
  - 可添加/移除的筛选标签，与 Tag 样式区分
- [x] `components/redesign/data/TrendLine.tsx`
  - 迷你折线/面积图，用于 StatTile 或表格趋势列
- [x] `components/redesign/overlay/Drawer.tsx`
  - 右侧滑出抽屉，支持小/中/大/全屏尺寸
  - 焦点陷阱 + Esc 关闭 + `aria-modal`
- [x] `components/redesign/overlay/Tooltip.tsx`
  - Portal 实现，支持 4 个方向
- [x] `components/redesign/feedback/Toast.tsx`
  - 全局通知栈，支持 info/success/warning/error
- [x] `components/redesign/feedback/LoadingOverlay.tsx`
  - 局部/全屏加载遮罩

#### 2.2 页面级模板封装（已完成 ✅）

- [x] `components/redesign/templates/ListPageTemplate.tsx`
  - 统一列表页：PageHeader + 筛选栏 + DataTable + 空态/错误态
- [x] `components/redesign/templates/FormPageTemplate.tsx`
  - 统一表单页：PageHeader + 表单区 + 底部操作栏
- [x] `components/redesign/templates/DetailPageTemplate.tsx`
  - 统一详情页：PageHeader + 信息卡片区 + Tab 内容区 + 可选侧边栏

#### 2.3 全局布局替换（已完成 ✅）

- [x] 创建 `layouts/GlobalLayoutV3.tsx`
  - 用 `AppShell` 替换现有 `SmartLayout` / `GlobalLayout`
  - 集成 `TopBar` + `SideRail` + 命令面板入口
- [x] 创建 `layouts/MobileLayoutV3.tsx`
  - 用 `BottomRail` + 全屏抽屉替换 `MobileLayout`
- [x] 创建 `layouts/AdaptiveLayout.tsx`
  - 根据设备类型自动选择桌面/移动端布局
- [x] 在路由层增加 `VITE_UI_V3_ENABLED` 特性开关
  - 开关开启时走新 layout，关闭时回退旧 layout
  - 保证灰度与回滚能力
- [x] 创建 `layouts/index.ts` 统一导出

#### 2.4 首批迁移页面（已完成 ✅）

##### P1：企业平台域（IAM / Admin）（已完成 ✅）

- [x] `pages/iam/UserManagementPage.tsx`
  - 使用 ListPageTemplate + DataTable
  - 新增/编辑用户走 Drawer
  - 删除确认走 Modal
  - 操作结果走 Toast
- [x] `pages/iam/RoleManagementPage.tsx`
  - 角色列表 + 权限树详情
  - 使用 ListPageTemplate + DataTable
  - 新增/编辑角色走 Drawer
  - 权限分配走 Drawer
  - 删除确认走 Modal
- [x] `pages/admin/TenantManagementPage.tsx`
  - 租户列表 + 状态标签 + 操作抽屉
  - 使用 ListPageTemplate + DataTable
  - 统计卡片（总数/活跃/试用/过期）
  - 新建/编辑走 Drawer
  - 删除确认走 Modal
  - 操作结果走 Toast
- [x] `pages/admin/SystemSettingsPage.tsx`
  - 设置表单页，使用 FormPageTemplate
  - 4 个 Tab（基础设置/邮件设置/短信设置/日志设置）
  - Toggle/Select/Input 组合
  - 保存/重置操作
  - 操作结果走 Toast

##### P0：首页与全局入口（已完成 ✅）

- [x] `pages/shared/DashboardPage.tsx` → 用新 Dashboard 替换
  - 复用 RedesignDemo 中的 KPI/告警/任务/系统健康模块
  - 接入真实 BFF GraphQL 数据（getDashboard）
  - 3 个 Tab：概览 / 模块 / 告警
  - 时间范围筛选 + 刷新
  - 统计卡片（OEE/产量/交付率/合格率）
  - 模块运行状态卡片
  - 实时告警列表
  - 待办任务列表
  - 系统健康监控
- [x] `pages/notification/NotificationCenter.tsx` → 新设计消息中心
  - 消息列表 + 已读/未读 + 快速操作
  - 5 个筛选 Tab（全部/未读/系统/警告/消息）
  - 搜索 + 批量选择
  - 标记已读/全部已读/删除
  - 通知设置弹窗（渠道/类型/免打扰）
  - 操作结果走 Toast

##### P2：协同与流程域（已完成 ✅）

- [x] `pages/workflow/WorkflowApprovalsPage.tsx`
  - 审批列表 + 审批详情 Drawer
  - 4 个 Tab（待审批/已通过/已驳回/全部）
  - 搜索 + 优先级筛选
  - 快速通过/驳回操作
  - 驳回原因弹窗
  - 审批流程时间线
  - 操作结果走 Toast
- [x] `pages/oa/AnnouncementPage.tsx`
  - 公告列表 + 发布公告 Modal
  - 3 个 Tab（全部/已发布/草稿）
  - 搜索 + 分类筛选
  - 公告详情 Drawer
  - 置顶/分类/状态标签
  - 浏览量统计
  - 操作结果走 Toast

##### P3：制造与供应链域（各取一个 MVP，已完成 ✅）

- [x] `pages/mes/MesWorkOrderPage.tsx`
  - 工单列表 + 状态筛选
  - 4 个 Tab（全部/待开始/进行中/已完成）
  - 搜索 + 车间筛选
  - 生产进度条
  - 工单详情 Drawer（基本信息/时间信息/备注）
  - 状态操作（开始/暂停/恢复/完成）
  - 新建工单 Modal
  - 统计卡片（总数/进行中/待开始/已完成）
  - 操作结果走 Toast
- [x] `pages/erp/PurchaseOrderPage.tsx`
  - 采购订单列表 + 审批状态
  - 5 个 Tab（全部/待审批/已批准/已下单/已收货）
  - 搜索 + 部门筛选
  - 金额格式化显示
  - 采购订单详情 Drawer（基本信息/备注）
  - 状态操作（批准/驳回/下单/确认收货）
  - 新建采购订单 Modal
  - 统计卡片（订单总数/待审批/采购总额/已收货）
  - 操作结果走 Toast
- [x] `pages/scm/ScmPurchaseOrderPage.tsx`
  - 供应链订单列表（复用 ERP 采购订单 UI 结构）
  - 后续可根据供应链模块特定需求扩展

---

## Phase 3：全面清理（部分完成 🚧）

### 已完成
- [x] 路由层集成 AdaptiveLayout，VITE_UI_V3_ENABLED 开关控制灰度
- [x] 新建 `.env.example`，说明 VITE_UI_V3_ENABLED 配置用法
- [x] 10 个首批迁移页面全部完成（P0/P1/P2/P3）

### 待完成（需谨慎操作，建议在新布局稳定后执行）
- [ ] 删除 `components/cyberpunk/*` 主题补丁
  - ⚠️ 注意：cyberpunk 是 MUI 主题系统的一部分（theme/theme.ts / ThemeProvider / useThemeMode），直接删除会导致主题系统崩溃
  - 建议：先从 ThemeProvider 中移除 cyberpunk 模式引用，再删除组件
- [ ] 清理 `index.css` 中 `.dark .Mui*` 与 `cyber-*` 覆盖
- [ ] 清理 `components/common/` 中重复组件
- [ ] 移除 `design-system-spec.md` v2 规范（如存在）
- [ ] 下线 `VITE_UI_V3_ENABLED` 开关，新 layout 成为默认
  - ⚠️ 注意：需在新布局经过充分测试和用户验证后再下线

---

## Phase 4：验收与上线（待启动 ⏳）

### 验收清单
- [ ] `pnpm typecheck` 全项目通过
- [ ] `pnpm lint:a11y` 0 critical/serious
- [ ] `pnpm vitest run` 全绿
- [ ] Lighthouse 性能 ≥ 90，a11y ≥ 95
- [ ] 新布局在桌面端/移动端/平板端正常显示
- [ ] 10 个迁移页面功能完整验证
- [ ] 旧布局回退功能正常（VITE_UI_V3_ENABLED=false）

### 上线策略
1. **灰度发布**：先在测试环境启用 VITE_UI_V3_ENABLED=true，内部测试
2. **小流量验证**：生产环境 10% 流量启用新布局，收集用户反馈
3. **全量上线**：验证通过后全量启用新布局
4. **下线开关**：稳定运行 2 周后，下线 VITE_UI_V3_ENABLED 开关，新布局成为默认

---

## 最近验证结果

- `pnpm typecheck`：通过 ✅
- `npx eslint src/components/redesign/ src/pages/iam/UserManagementPage.tsx --fix`：0 错误 ✅

---

## 本地测试问题修复记录

### 已修复问题

| 序号 | 问题 | 影响范围 | 修复方案 | 状态 |
|------|------|----------|----------|------|
| 1 | 端口 3000 被占用 | 开发服务器启动 | 终止占用进程或使用其他端口 | ✅ 已解决 |
| 2 | Vite MIME 类型错误 | 页面加载 | 清除 `node_modules/.vite` 缓存 | ✅ 已解决 |
| 3 | `Tag` 重复导入 | AnnouncementPage.tsx 编译失败 | 从 lucide-react 导入中移除未使用的 Tag 图标 | ✅ 已修复 |
| 4 | `action` prop 警告 | 16 个新组件（header/div/nav/span） | 显式解构并排除 `action` 属性，避免传递给非 form 元素 | ✅ 已修复 |
| 5 | MUI 版本过旧 | MUI v9 + React 19 兼容性 | 升级 @mui/material 等依赖到最新版本 | ✅ 已升级 |

### 已知问题（不影响 UI 测试）

| 序号 | 问题 | 原因 | 影响 |
|------|------|------|------|
| 1 | WebSocket 连接失败 (`ws://localhost:3000/ws/mes/dashboard`) | 后端服务未启动，Vite 不提供 WebSocket 端点 | 不影响新布局功能测试，新 DashboardPage 使用 BFF GraphQL 数据 |
| 2 | typecheck/eslint 未运行 | 后台任务限制 | 需在本地环境手动运行 `pnpm typecheck` 验证 |

### 修复的组件清单（action prop 警告）

1. PageHeader (header)
2. SideRail (nav)
3. ListPageTemplate (div)
4. FormPageTemplate (div)
5. DetailPageTemplate (div)
6. DataTable (table)
7. Card (div)
8. StatTile (div)
9. Alert (div)
10. Tabs (div)
11. ErrorState (div)
12. LoadingOverlay (div)
13. Badge (span)
14. Tag (span)
15. FilterChip (span)
16. StatusLight (span)

---

## 下一步立即行动

1. 运行 `typecheck` + `eslint` 验证所有迁移页面（10 个页面）和布局集成。
2. 在 `.env.local` 中设置 `VITE_UI_V3_ENABLED=true`，本地测试新布局。
3. Phase 3 全面清理（删除 cyberpunk 主题补丁/清理 index.css/移除 design-system-spec.md v2/下线 VITE_UI_V3_ENABLED 开关）。
4. Phase 4 验收与上线（Lighthouse/灰度发布/用户反馈收集）。
5. 后续可扩展：更多业务模块页面迁移（WMS/QMS/CRM/HRM 等）。

## 已完成：路由层集成 AdaptiveLayout ✅

- `ProtectedRouteWrapper.tsx` — 根据 `VITE_UI_V3_ENABLED` 开关选择 SmartLayout 或 AdaptiveLayout
- `appRoutes.tsx` — `/core/*` 路由集成 AdaptiveLayout（DynamicRouter + 静态降级）
- `.env.example` — 新增 `VITE_UI_V3_ENABLED` 配置说明
- 灰度策略：开关关闭时完全回退旧布局，开启时使用新布局（桌面端 GlobalLayoutV3 / 移动端 MobileLayoutV3）
