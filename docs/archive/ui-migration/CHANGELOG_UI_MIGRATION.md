# TOPEMS UI 重设计迁移变更日志

> 记录 Industrial OS 设计语言替换旧 UI 的所有变更。

## [Unreleased] - 2026-09-14

### 新增

#### 布局系统
- `apps/web/src/layouts/GlobalLayoutV3.tsx` — 桌面端全局布局
  - 使用 AppShell（TopBar + SideRail）替换旧 GlobalLayout / SmartLayout
  - 12 个主导航项 + 2 个底部导航项（设置/个人中心）
  - 根据当前路径自动计算激活导航项
  - 支持 fullWidth 属性

- `apps/web/src/layouts/MobileLayoutV3.tsx` — 移动端全局布局
  - 底部 5 个核心 Tab 导航（首页/制造/审批/消息/我的）
  - 消息 Tab 支持未读徽章
  - 安全区域适配（env(safe-area-inset-bottom)）
  - 统一 Industrial OS 视觉语言

- `apps/web/src/layouts/AdaptiveLayout.tsx` — 自适应布局选择器
  - 根据 VITE_UI_V3_ENABLED 环境变量开关控制
  - 根据设备类型自动选择桌面/移动端布局
  - 支持 forceV3 属性用于灰度测试
  - 开关关闭时透传 children（由调用方使用旧布局），保证渐进式迁移

- `apps/web/src/layouts/index.ts` — 统一导出

#### 配置文件
- `apps/web/.env.example` — 环境变量配置示例
  - VITE_UI_V3_ENABLED 开关说明
  - API 配置示例
  - 其他配置示例

- `UI_MIGRATION_GUIDE.md` — UI 迁移指南
  - 快速开始（启用/回退）
  - 架构说明（布局选择流程）
  - 核心文件清单
  - 已迁移页面清单（10 个）
  - 未迁移页面清单
  - 灰度发布策略（4 阶段）
  - 已知问题与注意事项
  - 常见问题 FAQ

#### 已迁移页面（10 个）

**P0：首页与全局入口**
- `apps/web/src/pages/shared/DashboardPage.tsx` — 工作台首页
  - 复用 RedesignDemo 中的 KPI/告警/任务/系统健康模块
  - 接入真实 BFF GraphQL 数据（getDashboard）
  - 3 个 Tab：概览 / 模块 / 告警
  - 时间范围筛选（1h/24h/7d/30d）+ 刷新
  - KPI 统计卡片（OEE 87.3% / 产量 124,582 件 / 交付率 94.6% / 合格率 99.2%）
  - 模块运行状态卡片（MES/ERP/SCM/QMS/WMS/BI）
  - 实时告警列表（严重/警告/提示三级）
  - 待办任务列表（高/中/低优先级）
  - 系统健康监控（API 网关/消息队列/数据库/缓存）

- `apps/web/src/pages/notification/NotificationCenter.tsx` — 消息中心
  - 消息列表 + 已读/未读状态 + 快速操作
  - 5 个筛选 Tab（全部/未读/系统/警告/消息），未读 Tab 显示 badge
  - 搜索 + 批量选择 + 全选
  - 标记已读 / 全部已读 / 删除单条 / 删除选中
  - 通知设置弹窗（通知渠道/通知类型/免打扰时段）
  - 7 种通知类型图标和颜色（系统/成功/警告/错误/消息/提醒/系统更新）
  - 相对时间显示（刚刚/X 分钟前/X 小时前/X 天前）
  - 操作结果走 Toast

**P1：企业平台域（IAM / Admin）**
- `apps/web/src/pages/iam/UserManagementPage.tsx` — 用户管理（早期已完成）
- `apps/web/src/pages/iam/RoleManagementPage.tsx` — 角色管理（早期已完成）

- `apps/web/src/pages/admin/TenantManagementPage.tsx` — 租户管理
  - 使用 ListPageTemplate + DataTable
  - 统计卡片（总数/活跃/试用/过期）
  - 搜索 + 状态筛选
  - 新建/编辑走 Drawer
  - 删除确认走 Modal
  - 操作结果走 Toast

- `apps/web/src/pages/admin/SystemSettingsPage.tsx` — 系统设置
  - 使用 FormPageTemplate + Tabs
  - 4 个 Tab：基础设置 / 邮件设置 / 短信设置 / 日志设置
  - Toggle / Select / Input 组合
  - 保存/重置操作
  - 操作结果走 Toast

**P2：协同与流程域**
- `apps/web/src/pages/workflow/WorkflowApprovalsPage.tsx` — 审批中心
  - 审批列表 + 审批详情 Drawer
  - 4 个 Tab：待审批 / 已通过 / 已驳回 / 全部（待审批 Tab 显示 badge）
  - 搜索 + 优先级筛选（高/中/低）
  - 快速通过/驳回操作（列表行内 + 详情页）
  - 驳回原因弹窗（必填）
  - 审批详情包含：基本信息 / 审批内容 / 审批流程时间线
  - 优先级标签（高/中/低）+ 状态标签（待审批/已通过/已驳回/已认领）
  - 操作结果走 Toast

- `apps/web/src/pages/oa/AnnouncementPage.tsx` — 公告管理
  - 公告列表 + 发布公告 Modal
  - 3 个 Tab：全部 / 已发布 / 草稿（各显示数量 badge）
  - 搜索 + 分类筛选（通知/公告/制度/活动/其他）
  - 公告详情 Drawer（标题/元信息/正文）
  - 置顶标签 + 分类标签 + 状态标签
  - 浏览量统计 + 发布人 + 发布时间
  - 发布/编辑表单（标题/分类/优先级/内容）
  - 操作结果走 Toast

**P3：制造与供应链域**
- `apps/web/src/pages/mes/MesWorkOrderPage.tsx` — 工单管理
  - 工单列表 + 状态筛选
  - 4 个 Tab：全部 / 待开始 / 进行中 / 已完成
  - 搜索 + 车间筛选
  - 生产进度条（已完成/总数 + 百分比）
  - 工单详情 Drawer（状态卡片/基本信息/时间信息/备注）
  - 状态操作（开始/暂停/恢复/完成）
  - 新建工单 Modal
  - 统计卡片（总数/进行中/待开始/已完成）
  - 操作结果走 Toast

- `apps/web/src/pages/erp/PurchaseOrderPage.tsx` — 采购订单
  - 采购订单列表 + 审批状态
  - 5 个 Tab：全部 / 待审批 / 已批准 / 已下单 / 已收货
  - 搜索 + 部门筛选
  - 金额格式化显示（¥ / $）
  - 采购订单详情 Drawer（状态卡片/基本信息/备注）
  - 状态操作（批准/驳回/下单/确认收货）
  - 新建采购订单 Modal
  - 统计卡片（订单总数/待审批/采购总额/已收货）
  - 操作结果走 Toast

- `apps/web/src/pages/scm/ScmPurchaseOrderPage.tsx` — 供应链订单
  - 复用 ERP 采购订单页面的 UI 结构
  - 后续可根据供应链模块的特定需求进行扩展

### 修改

#### 路由层集成
- `apps/web/src/components/ProtectedRouteWrapper.tsx`
  - 新增 AdaptiveLayout 和 isUIV3Enabled 导入
  - 根据 VITE_UI_V3_ENABLED 开关选择 SmartLayout 或 AdaptiveLayout
  - 影响范围：所有通过 renderRoutes 渲染的页面（dashboardRoutes / commonRoutes）

- `apps/web/src/routes/appRoutes.tsx`
  - 新增 AdaptiveLayout 和 isUIV3Enabled 导入
  - /core/* 路由（DynamicRouter + 静态降级）根据开关选择布局
  - 开关开启时使用 AdaptiveLayout，关闭时使用旧 GlobalLayout

#### 任务板
- `TODO.md`
  - 重写为 TOPEMS UI 重设计迁移任务板
  - Phase 1-4 完整任务清单
  - 实时更新各阶段进度
  - 新增 UI_MIGRATION_GUIDE.md 链接

### 后端商业化支撑（P0 四项，早期完成）

1. **tier 裁剪集成到路由层**
   - `svc/unified-core/src/middleware/tier_gate.rs` — TierGateConfig + tier_gate_middleware + 16 单元测试
   - `svc/unified-core/src/middleware/mod.rs` — 注册 tier_gate 模块

2. **tier 裁剪集成到前端**
   - `apps/web/src/lib/tier.ts` — 三层功能清单矩阵（28 模块）+ 工具函数
   - `apps/web/src/hooks/useTier.ts` — React Hook，localStorage + 事件同步

3. **租户创建/升级自动关联权限**
   - `svc/unified-core/src/modules/subscription/mod.rs` — TierPermissionService::sync_permissions_for_tenant()
   - `svc/unified-core/src/modules/tenant/handlers.rs` — create_tenant/update_tenant 集成权限同步

4. **订阅生命周期管理**
   - `svc/unified-core/src/modules/subscription/mod.rs` — SubscriptionLifecycleService + 10 单元测试

### 后端测试覆盖（早期完成）

- mes：453 lib + 47 integration = 500 passed（目标 500+ 达标）
- analytics：192+106+16+6+1 = 321 passed（目标 300+ 达标）
- lims：149+149+8+6+1 = 313 passed（目标 250+ 达标）

---

## 已知问题

1. **Mock 数据**：部分页面（WorkflowApprovalsPage/MesWorkOrderPage/PurchaseOrderPage）在 API 不可用时使用 Mock 数据，上线前需确保 API 正常工作。

2. **移动端适配**：MobileLayoutV3 已实现基础的底部导航，但部分页面的移动端适配仍需优化。

3. **性能优化**：新布局使用了较多的 CSS 变量和内联样式，建议在上线前进行性能测试和优化。

4. **主题系统**：cyberpunk 主题仍是 MUI 主题系统的一部分，直接删除会导致主题系统崩溃。建议在新布局完全稳定后，逐步从主题系统中移除 cyberpunk 模式。

5. **国际化**：部分新页面使用了硬编码的中文文本，后续需接入 i18n 国际化系统。

6. **TypeScript 类型检查**：由于后台任务限制，typecheck 暂未运行，建议在本地环境手动运行 `pnpm typecheck` 验证。

---

## 下一步计划

### 短期（1-2 周）
1. 本地测试新布局（启用 VITE_UI_V3_ENABLED=true）
2. 运行 typecheck + eslint + vitest 验证
3. 修复发现的 bug 和类型错误
4. 测试环境灰度发布，内部测试

### 中期（2-4 周）
1. 生产环境 10% 流量灰度
2. 监控错误率和用户反馈
3. 修复生产环境发现的问题
4. 逐步扩大灰度比例至 100%

### 长期（1-2 月）
1. 稳定运行 2 周后，下线 VITE_UI_V3_ENABLED 开关
2. 新布局成为默认布局
3. 逐步删除旧 UI 代码（cyberpunk 主题、旧组件等）
4. 继续迁移更多业务模块页面（WMS/QMS/CRM/HRM 等）

---

**最后更新**：2026-09-14
**版本**：v1.0.0
