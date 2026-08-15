# ModuleLayout 模块布局使用指南

> 本文档介绍 TOPEMS 平台的 `ModuleLayout` 组件，帮助开发者快速搭建统一的模块页面布局。

| 项目 | 内容 |
|------|------|
| **文档版本** | v1.0.0 |
| **创建日期** | 2026-06-24 |
| **适用范围** | apps/web/src/components/layout/ModuleLayout.tsx |
| **状态** | 实施中 |

---

## 一、概述

`ModuleLayout` 是 TOPEMS 平台提供的模块页面布局容器，整合了三级导航、面包屑、页面标题等模块页面的所有标准元素。

### 1.1 核心特性

| 特性 | 说明 |
|------|------|
| **自动导航获取** | 从 `NavigationRegistry` 自动获取侧边栏和 Tab |
| **动态面包屑** | 根据 URL 路径自动生成面包屑 |
| **响应式适配** | 移动端自动隐藏侧边栏 |
| **pluginCode 解析** | 支持显式 prop 或 URL 参数自动解析 |
| **统一布局** | 所有模块页面使用相同的布局结构 |

### 1.2 适用场景

- ERP、CRM、HRM、PM 等业务模块的页面
- 任何需要侧边栏 + Tab 导航的模块
- 插件模块的标准页面

---

## 二、布局结构

```
┌─────────────────────────────────────────────────┐
│ Header (L1) - TopNav                            │
├──────────┬──────────────────────────────────────┤
│          │ ModuleTabs (L3)                       │
│ Sidebar  ├──────────────────────────────────────┤
│ (L2)     │ Breadcrumb                            │
│          │ PageHeader                            │
│          ├──────────────────────────────────────┤
│          │                                      │
│          │ Page Content                          │
│          │                                      │
└──────────┴──────────────────────────────────────┘
```

| 区域 | 组件 | 数据源 |
|------|------|--------|
| Header | `TopNav` | `NavigationRegistry.getTopNavItems()` |
| Sidebar | `Sidebar` | `NavigationRegistry.getSidebarNavItems(pluginCode)` |
| ModuleTabs | `ModuleTabs` | `NavigationRegistry.getModuleTabs(pluginCode)` |
| Breadcrumb | `PageBreadcrumb` | 动态从 URL 路径生成 |
| PageHeader | `PageHeader` | 末级面包屑 |
| Content | `{children}` | 业务页面 |

---

## 三、API 参考

### 3.1 Props

```typescript
interface ModuleLayoutProps {
  children: React.ReactNode;
  pluginCode?: string;
}
```

| 属性 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `children` | `React.ReactNode` | ✅ | 页面内容 |
| `pluginCode` | `string` | ❌ | 插件代码，未传时从 URL 参数自动解析 |

### 3.2 默认行为

如果未传 `pluginCode`，组件会从 URL 参数 `pluginCode` 自动解析：

```
URL: /erp/dashboard
     ↑
     pluginCode = "erp"
```

---

## 四、使用示例

### 4.1 基础用法

```tsx
import { ModuleLayout } from '@/components/layout/ModuleLayout';

const ErpPage: React.FC = () => {
  return (
    <ModuleLayout pluginCode="erp">
      <h1>ERP 仪表盘</h1>
      <p>欢迎使用企业资源管理</p>
    </ModuleLayout>
  );
};
```

### 4.2 在路由中使用

```tsx
import { ModuleLayout } from '@/components/layout/ModuleLayout';

const App: React.FC = () => {
  return (
    <Routes>
      <Route 
        path="/erp/*" 
        element={
          <ModuleLayout pluginCode="erp">
            <Routes>
              <Route path="dashboard" element={<ErpDashboard />} />
              <Route path="finance" element={<ErpFinance />} />
              <Route path="inventory" element={<ErpInventory />} />
            </Routes>
          </ModuleLayout>
        } 
      />
      <Route 
        path="/crm/*" 
        element={
          <ModuleLayout pluginCode="crm">
            <Routes>
              <Route path="customers" element={<CrmCustomers />} />
              <Route path="opportunities" element={<CrmOpportunities />} />
            </Routes>
          </ModuleLayout>
        } 
      />
    </Routes>
  );
};
```

### 4.3 动态 pluginCode 解析

```tsx
import { ModuleLayout } from '@/components/layout/ModuleLayout';

const App: React.FC = () => {
  return (
    <Routes>
      <Route 
        path="/:pluginCode/*" 
        element={
          <ModuleLayout>
            <Outlet />
          </ModuleLayout>
        } 
      />
    </Routes>
  );
};
```

### 4.4 与 React Router Outlet 集成

```tsx
import { ModuleLayout } from '@/components/layout/ModuleLayout';
import { Outlet } from 'react-router-dom';

const ModulePage: React.FC = () => {
  return (
    <ModuleLayout>
      <Outlet />
    </ModuleLayout>
  );
};
```

---

## 五、面包屑自动生成

`ModuleLayout` 会根据当前 URL 自动生成面包屑。

### 5.1 生成规则

| URL | 面包屑 |
|-----|--------|
| `/erp` | 首页 > 企业资源管理 |
| `/erp/finance` | 首页 > 企业资源管理 > 财务管理 |
| `/erp/finance/detail` | 首页 > 企业资源管理 > 财务管理 > detail |
| `/crm/customers/123` | 首页 > 客户关系管理 > 客户管理 > 123 |

### 5.2 名称解析

面包屑中的标签名称优先从 `NavigationRegistry` 的 `sidebar_nav` 配置中查找对应的 `label`，如果找不到则使用 URL 段名。

**示例**：

```typescript
// NavigationRegistry 配置
navigationRegistry.register('erp', {
  sidebar_nav: [
    {
      code: 'erp-finance',
      label: '财务管理',  // 面包屑显示为"财务管理"
      path: '/erp/finance',
    },
  ],
});
```

URL `/erp/finance` 的面包屑会显示：

```
首页 > 企业资源管理 > 财务管理
```

---

## 六、响应式行为

| 断点 | Sidebar 显示 | ModuleTabs 显示 |
|------|--------------|-----------------|
| `< lg` (移动端) | 隐藏 | 横向滚动 |
| `>= lg` (桌面端) | 显示 | 横向滚动 |

移动端使用 `MobileNav` 抽屉菜单访问导航。

---

## 七、完整示例

### 7.1 典型模块页面

```tsx
// pages/erp/DashboardPage.tsx
import React from 'react';
import { Card, CardContent, Typography, Grid, Box } from '@mui/material';
import { ModuleLayout } from '@/components/layout/ModuleLayout';

const ErpDashboardPage: React.FC = () => {
  return (
    <ModuleLayout pluginCode="erp">
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6">财务概览</Typography>
              <Typography variant="h3" color="primary">
                ¥1,234,567
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6">库存预警</Typography>
              <Typography variant="h3" color="warning">
                12
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </ModuleLayout>
  );
};

export default ErpDashboardPage;
```

### 7.2 路由配置

```tsx
// router/modules.tsx
import { ModuleLayout } from '@/components/layout/ModuleLayout';
import { lazy } from 'react';

const ErpDashboard = lazy(() => import('@/pages/erp/DashboardPage'));
const ErpFinance = lazy(() => import('@/pages/erp/FinancePage'));
const ErpInventory = lazy(() => import('@/pages/erp/InventoryPage'));

export const erpRoutes = {
  path: '/erp',
  element: (
    <ModuleLayout pluginCode="erp">
      <Outlet />
    </ModuleLayout>
  ),
  children: [
    { index: true, element: <ErpDashboard /> },
    { path: 'finance', element: <ErpFinance /> },
    { path: 'inventory', element: <ErpInventory /> },
  ],
};
```

---

## 八、依赖组件

| 组件 | 说明 |
|------|------|
| `Sidebar` | 侧边栏导航 |
| `ModuleTabs` | 模块 Tab 导航 |
| `PageBreadcrumb` | 面包屑导航 |
| `PageHeader` | 页面标题 |

---

## 九、注意事项

### 9.1 性能考虑

- `ModuleLayout` 会在 pluginCode 变化时重新获取导航配置
- 建议在路由层级使用，避免不必要的重新渲染
- 配合 `React.memo` 优化子组件

### 9.2 路由嵌套

```tsx
// ✅ 推荐：ModuleLayout 包裹一组路由
<Route path="/erp/*" element={<ModuleLayout pluginCode="erp"><Outlet /></ModuleLayout>}>
  <Route path="dashboard" element={<ErpDashboard />} />
  <Route path="finance" element={<ErpFinance />} />
</Route>

// ❌ 避免：每个页面都使用 ModuleLayout
<Route path="/erp/dashboard" element={
  <ModuleLayout pluginCode="erp">
    <ErpDashboard />
  </ModuleLayout>
} />
```

### 9.3 pluginCode 一致性

确保 `pluginCode` 与 `NavigationRegistry` 中注册的 code 一致：

```typescript
// NavigationRegistry
navigationRegistry.register('erp', { ... });

// ModuleLayout
<ModuleLayout pluginCode="erp">  // 必须一致
```

---

## 十、相关文档

- [UI 设计规范](./ui-design-spec.md)
- [导航设计文档](./ui-navigation-design.md)
- [PluginLifecycleManager 使用指南](./plugin-lifecycle-guide.md)
- [组件迁移指南](./component-migration-guide.md)
