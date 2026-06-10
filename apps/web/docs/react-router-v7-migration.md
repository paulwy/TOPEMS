# React Router v7 升级准备指南

## 当前状态

- **当前版本**: `react-router-dom ^6.22.0`
- **目标版本**: `react-router-dom ^7.0.0`

## React Router v7 主要变化

### 1. 路由配置方式改变

**v6 (当前)**: 使用 JSX 声明路由
```tsx
<BrowserRouter>
  <Routes>
    <Route path="/dashboard" element={<DashboardPage />} />
  </Routes>
</BrowserRouter>
```

**v7 (新)**: 使用对象数组配置
```tsx
const router = createBrowserRouter([
  {
    path: "/dashboard",
    element: <DashboardPage />,
  },
]);

<RouterProvider router={router} />
```

### 2. 嵌套路由

**v6**: 使用嵌套的 `<Route>` 组件

**v7**: 在配置对象中使用 `children` 属性

### 3. 数据获取

**v7**: 推荐使用 `loader` 和 `action` 进行服务端数据获取

### 4. 移除的API

- `<Switch>` - 已在v6移除
- `useHistory` - 替换为 `useNavigate`
- `matchPath` - API有所变化

## 升级步骤

### 步骤1: 安装新版本

```bash
npm install react-router-dom@7
```

### 步骤2: 创建路由配置文件

创建 `src/routes/index.tsx` 替代 App.tsx 中的路由配置

### 步骤3: 更新路由声明方式

将 JSX 路由转换为对象数组配置

### 步骤4: 更新 ProtectedRoute 组件

适配新的路由API

### 步骤5: 更新所有 useNavigate、useParams 等 hook 调用

## 当前代码兼容性检查

### 需要更新的文件

| 文件 | 内容 | 状态 |
|------|------|------|
| `src/App.tsx` | 主要路由配置 | 需要重写 |
| `src/components/ProtectedRoute.tsx` | 路由守卫 | 需要更新 |
| `src/components/HrmLayout.tsx` | 布局组件 | 需要更新 |
| `src/components/im/ChatInterface.tsx` | IM路由 | 需要检查 |

### 使用的 React Router API

| API | 位置 | 兼容性 |
|-----|------|--------|
| `<BrowserRouter>` | App.tsx | 需要替换为 `<RouterProvider>` |
| `<Routes>` | App.tsx | 需要替换为 `createBrowserRouter` |
| `<Route>` | App.tsx | 需要转换为对象配置 |
| `<Navigate>` | App.tsx | 兼容 |
| `useNavigate` | 多个页面 | 兼容 |
| `useParams` | 多个页面 | 兼容 |
| `useLocation` | 多个页面 | 兼容 |
| `useRouteMatch` | 可能使用 | 需要检查 |

## 迁移脚本

```typescript
// src/routes/index.tsx
import { createBrowserRouter, RouteObject } from 'react-router-dom';
import { lazy } from 'react';

const LoginPage = lazy(() => import('../pages/LoginPage'));
const DashboardPage = lazy(() => import('../pages/DashboardPage'));
// ... 其他页面

export const routes: RouteObject[] = [
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/dashboard',
    element: <DashboardPage />,
  },
  // ... 其他路由
];

export const router = createBrowserRouter(routes);
```

## 测试计划

1. 更新前运行现有测试确保基线
2. 逐步更新路由配置
3. 每步更新后运行测试
4. 修复兼容性问题
5. 运行完整测试套件

## 风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 路由配置错误 | 页面无法访问 | 逐步迁移，单元测试 |
| 权限守卫失效 | 安全问题 | 重点测试 ProtectedRoute |
| 嵌套路由问题 | 布局显示异常 | 检查 Outlet 使用 |
| 动态路由参数 | 页面数据异常 | 测试动态路由页面 |

## 推荐时间安排

```
第1周: 完成路由配置迁移
第2周: 更新 ProtectedRoute 和布局组件
第3周: 测试和修复问题
第4周: 性能优化和回归测试
```

## 参考资源

- [React Router v7 官方文档](https://reactrouter.com/docs/en/v7)
- [v6 到 v7 迁移指南](https://reactrouter.com/docs/en/v7/upgrading/v6)
- [React Router v7 API 参考](https://reactrouter.com/docs/en/v7/api)