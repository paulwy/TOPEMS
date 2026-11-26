import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute, GuestRoute } from '../components/auth/ProtectedRoute';
import { GlobalLayoutV3 } from '../layouts';
import DynamicRoutes from '../components/DynamicRoutes';
import ProtectedRouteWrapper from '../components/ProtectedRouteWrapper';
import PageLoader from '../components/PageLoader';
import { PageErrorBoundary } from '../components/ErrorBoundary';
import { useAppInit } from '../hooks/useAppInit';
import { ensureNamespacesLoaded } from '../i18n';
import { createSafeLazy, lazyWithPreload } from '../utils/createSafeLazy';
import { authRoutes, dashboardRoutes, commonRoutes, type RouteConfig } from './index';
import { DASHBOARD_PATHS } from './dashboard';

// 懒加载页面：避免影响首屏体积
const TemplateDemoPage = createSafeLazy(() =>
  import('../components/templates/index').then((m) => ({ default: m.TemplateDemoPage }))
);
const RedesignDemoPage = createSafeLazy(() => import('../components/redesign/RedesignDemo'));
const DynamicRouter = createSafeLazy(() => import('../lib/plugin-loader/DynamicRouter'));
// G9 修复：/core/users、/core/roles 显式注册本地组件（DynamicRouter 依赖运行时模块注册，
// 加载失败时会渲染空白，导致 /core/* 主体空白——双机确认的 G9 问题）。
// G4 修复：/core/* 为平铺顶层路由，不经 v2 loadModuleConfig 的命名空间预加载，
// 故懒加载前先注入 iam 命名空间，避免页面 i18n key 明文泄漏。
const CoreUsersPage = createSafeLazy(() =>
  ensureNamespacesLoaded(['iam']).then(() => import('../components/iam/UserManagementPage'))
);
const CoreRolesPage = createSafeLazy(() =>
  ensureNamespacesLoaded(['iam']).then(() => import('../components/iam/RoleManagementPage'))
);
const { lazy: PerformanceTestPage } = lazyWithPreload(
  () => import('../components/performance/PerformanceTestPage')
);

/**
 * 将 RouteConfig[] 渲染为受保护的路由节点
 *
 * V65.1.1: 路由级 ErrorBoundary — 每个路由用 PageErrorBoundary 包裹 Suspense，
 * 让单页 lazy load 失败/运行时崩溃隔离在该路由内，不冒泡到 AppLayout 顶层边界。
 */
const renderRoutes = (routes: RouteConfig[]) => {
  return routes.map((route) => {
    const { element } = route;
    // RouteConfig.element 允许是 ReactElement（如 <Navigate />）或组件类型（LazyExoticComponent）。
    // 直接 cast 成 ComponentType 并以 <Element /> 渲染会在前者情况下触发
    // "Element type is invalid ... got: <Navigate />"。这里按类型分流。
    const isReactElement = React.isValidElement(element);
    const Element = element as React.ComponentType;
    return (
      <Route
        key={route.path}
        path={route.path}
        element={
          <ProtectedRouteWrapper route={route}>
            <PageErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                {isReactElement ? element : <Element />}
              </Suspense>
            </PageErrorBoundary>
          </ProtectedRouteWrapper>
        }
      />
    );
  });
};

/**
 * 应用路由树
 *
 * 包含：
 * - 性能测试页（直连，不走布局）
 * - 认证路由（GuestRoute）
 * - 仪表盘 / 公共路由（ProtectedRoute + GlobalLayoutV3）
 * - 动态模块路由（DynamicRoutes）
 * - 核心模块路由（Module Federation 或静态降级）
 * - 旧路径重定向
 * - 模板演示页
 */
const AppRoutes: React.FC = () => {
  // 启动全局状态初始化（错误追踪、模块事件、预加载、版本管理）
  useAppInit();

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path='/performance'
          element={
            <ProtectedRoute>
              <PageErrorBoundary>
                <Suspense fallback={<PageLoader />}>
                  <PerformanceTestPage />
                </Suspense>
              </PageErrorBoundary>
            </ProtectedRoute>
          }
        />

        {authRoutes.map((route) => {
          const { element } = route;
          const isReactElement = React.isValidElement(element);
          const Element = element as React.ComponentType;
          return (
            <Route
              key={route.path}
              path={route.path}
              element={
                <GuestRoute>
                  <PageErrorBoundary>
                    <Suspense fallback={<PageLoader />}>
                      {isReactElement ? element : <Element />}
                    </Suspense>
                  </PageErrorBoundary>
                </GuestRoute>
              }
            />
          );
        })}

        {renderRoutes(dashboardRoutes)}
        {renderRoutes(commonRoutes)}

        <Route
          path='*'
          element={<DynamicRoutes />}
        />

        {/*
         * D4: /core/* 统一走本地插件动态路由（DynamicRouter）。
         * 原 IS_STATIC_MODE 分支的「Module Federation 未启用」占位页已移除——
         * 前端回归模块化单体，业务域全部本地打包，不再区分 static / module-federation 部署模式。
         * G9 修复：/core/users、/core/roles 平铺为顶层路由（嵌套 + 绝对子路径在 react-router v6
         * 匹配不可靠，是 /core/* 主体空白的根因），确定性注册本地组件；
         * 其余 /core/* 路径仍交由 DynamicRouter 处理（依赖其运行时模块注册）。
         */}
        <Route
          path='/core/users'
          element={
            <ProtectedRoute>
              <GlobalLayoutV3>
                <Suspense fallback={<PageLoader />}>
                  <CoreUsersPage />
                </Suspense>
              </GlobalLayoutV3>
            </ProtectedRoute>
          }
        />
        <Route
          path='/core/roles'
          element={
            <ProtectedRoute>
              <GlobalLayoutV3>
                <Suspense fallback={<PageLoader />}>
                  <CoreRolesPage />
                </Suspense>
              </GlobalLayoutV3>
            </ProtectedRoute>
          }
        />
        <Route
          path='/core/*'
          element={
            <ProtectedRoute>
              <GlobalLayoutV3>
                <Suspense fallback={<PageLoader />}>
                  <DynamicRouter />
                </Suspense>
              </GlobalLayoutV3>
            </ProtectedRoute>
          }
        />

        <Route
          path='/template-demo'
          element={
            <ProtectedRoute>
              <TemplateDemoPage />
            </ProtectedRoute>
          }
        />
        {/* G10 修复：/settings 旧路径重定向到 /system/settings（顶栏"系统设置"现指向后者） */}
        <Route
          path='/settings'
          element={
            <Navigate
              to={DASHBOARD_PATHS.systemSettings}
              replace
            />
          }
        />
        <Route
          path='/redesign-demo'
          element={
            <ProtectedRoute>
              <RedesignDemoPage />
            </ProtectedRoute>
          }
        />
        <Route
          path='/'
          element={
            <Navigate
              to={DASHBOARD_PATHS.dashboard}
              replace
            />
          }
        />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;
