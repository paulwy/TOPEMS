# TOPEMS UI 重设计迁移指南

> 本文档说明如何启用 Industrial OS 新布局、如何回退到旧布局、以及迁移过程中的注意事项。

## 快速开始

### 1. 启用新布局

在 `apps/web/.env.local` 中添加：

```bash
# 启用 Industrial OS V3 新布局
VITE_UI_V3_ENABLED=true
```

然后重启开发服务器：

```bash
cd apps/web
pnpm dev
```

### 2. 验证新布局

访问以下页面验证新布局是否正常：

- `/dashboard` — 工作台首页
- `/iam/users` — 用户管理
- `/iam/roles` — 角色管理
- `/admin/tenants` — 租户管理
- `/admin/settings` — 系统设置
- `/notifications` — 消息中心
- `/workflow/approvals` — 审批中心
- `/oa/announcements` — 公告管理
- `/mes/work-orders` — 工单管理
- `/erp/purchase-orders` — 采购订单

### 3. 回退到旧布局

如果新布局有问题，修改 `.env.local`：

```bash
# 回退到旧布局（SmartLayout / GlobalLayout）
VITE_UI_V3_ENABLED=false
```

或者直接删除该行，默认使用旧布局。

## 架构说明

### 布局选择流程

```
用户访问页面
    ↓
ProtectedRouteWrapper 检查 VITE_UI_V3_ENABLED
    ├─ true → AdaptiveLayout
    │         ├─ 桌面端 → GlobalLayoutV3 (AppShell + TopBar + SideRail)
    │         └─ 移动端 → MobileLayoutV3 (底部 5 Tab 导航)
    └─ false → SmartLayout (旧布局)
```

### 核心文件

| 文件 | 说明 |
|------|------|
| `apps/web/src/layouts/GlobalLayoutV3.tsx` | 桌面端全局布局 |
| `apps/web/src/layouts/MobileLayoutV3.tsx` | 移动端全局布局 |
| `apps/web/src/layouts/AdaptiveLayout.tsx` | 自适应布局选择器 |
| `apps/web/src/layouts/index.ts` | 统一导出 |
| `apps/web/src/components/ProtectedRouteWrapper.tsx` | 路由层集成 |
| `apps/web/src/routes/appRoutes.tsx` | /core/* 路由集成 |
| `apps/web/src/components/redesign/` | 新组件库（20+ 组件） |
| `apps/web/src/theme/redesign-tokens.css` | Industrial OS design tokens |
| `apps/web/src/theme/redesign-global.css` | 全局样式与工具类 |

## 已迁移页面（10 个）

### P0：首页与全局入口
- ✅ `pages/shared/DashboardPage.tsx` — 工作台首页
- ✅ `pages/notification/NotificationCenter.tsx` — 消息中心

### P1：企业平台域（IAM / Admin）
- ✅ `pages/iam/UserManagementPage.tsx` — 用户管理
- ✅ `pages/iam/RoleManagementPage.tsx` — 角色管理
- ✅ `pages/admin/TenantManagementPage.tsx` — 租户管理
- ✅ `pages/admin/SystemSettingsPage.tsx` — 系统设置

### P2：协同与流程域
- ✅ `pages/workflow/WorkflowApprovalsPage.tsx` — 审批中心
- ✅ `pages/oa/AnnouncementPage.tsx` — 公告管理

### P3：制造与供应链域
- ✅ `pages/mes/MesWorkOrderPage.tsx` — 工单管理
- ✅ `pages/erp/PurchaseOrderPage.tsx` — 采购订单
- ✅ `pages/scm/ScmPurchaseOrderPage.tsx` — 供应链订单（复用 ERP 采购订单 UI）

## 未迁移页面

以下页面仍使用旧布局，后续可逐步迁移：

- WMS（仓储物流）
- QMS（质量管理）
- CRM（客户管理）
- HRM（人力资源）
- EHS（环境健康安全）
- BI（数据决策）
- GIS（地理信息）
- DOC（文档协同）
- 其他业务模块页面

## 灰度发布策略

### 阶段 1：测试环境验证（1-2 周）

1. 在测试环境启用 `VITE_UI_V3_ENABLED=true`
2. 内部测试团队验证 10 个已迁移页面
3. 收集 bug 和反馈
4. 修复关键问题

### 阶段 2：生产环境小流量灰度（1 周）

1. 生产环境 10% 流量启用新布局
2. 监控错误率和用户反馈
3. 修复发现的问题

### 阶段 3：全量上线（1 周）

1. 生产环境 50% → 100% 流量启用新布局
2. 持续监控
3. 收集用户反馈

### 阶段 4：稳定运行与清理（2 周后）

1. 稳定运行 2 周后，下线 `VITE_UI_V3_ENABLED` 开关
2. 新布局成为默认布局
3. 逐步删除旧 UI 代码（cyberpunk 主题、旧组件等）

## 已知问题与注意事项

### 1. Mock 数据

部分页面（如 WorkflowApprovalsPage、MesWorkOrderPage、PurchaseOrderPage）在 API 不可用时使用 Mock 数据。上线前需确保 API 正常工作。

### 2. 移动端适配

MobileLayoutV3 已实现基础的底部导航，但部分页面的移动端适配仍需优化。

### 3. 性能优化

新布局使用了较多的 CSS 变量和内联样式，建议在上线前进行性能测试和优化。

### 4. 主题系统

cyberpunk 主题仍是 MUI 主题系统的一部分，直接删除会导致主题系统崩溃。建议在新布局完全稳定后，逐步从主题系统中移除 cyberpunk 模式。

### 5. 国际化

部分新页面使用了硬编码的中文文本，后续需接入 i18n 国际化系统。

## 常见问题

### Q: 如何强制使用新布局进行测试？

A: 在代码中使用 `forceV3` 属性：

```tsx
<AdaptiveLayout forceV3>
  <YourPage />
</AdaptiveLayout>
```

### Q: 新布局和旧布局可以共存吗？

A: 可以。通过 `VITE_UI_V3_ENABLED` 开关控制，开关关闭时完全回退旧布局，无任何影响。

### Q: 如何添加新的导航项？

A: 修改 `apps/web/src/layouts/GlobalLayoutV3.tsx` 中的 `navItems` 数组和 `pathToNavId` 映射。

### Q: 如何自定义主题颜色？

A: 修改 `apps/web/src/theme/redesign-tokens.css` 中的 CSS 变量。

## 技术支持

如有问题，请参考以下文档：

- `UI_REDESIGN_v3.md` — UI 重设计评估与迁移策略
- `design-system-spec.md` — 设计系统规范
- `TODO.md` — 迁移任务板

---

**最后更新**：2026-09-14
**版本**：v1.0
