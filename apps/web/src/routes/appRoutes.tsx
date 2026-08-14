import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute, GuestRoute } from '../components/auth/ProtectedRoute';
import { GlobalLayout } from '../components/layout';
import DynamicRoutes from '../components/DynamicRoutes';
import ProtectedRouteWrapper from '../components/ProtectedRouteWrapper';
import PageLoader from '../components/PageLoader';
import { PageErrorBoundary } from '../components/ErrorBoundary';
import { useAppInit } from '../hooks/useAppInit';
import { createSafeLazy, lazyWithPreload } from '../utils/createSafeLazy';
import { authRoutes, dashboardRoutes, commonRoutes, type RouteConfig } from './index';
import { DASHBOARD_PATHS } from './dashboard';
import { HRM_PATHS } from '../modules/hrm/config';
import { CRM_PATHS } from '../modules/crm/config';
import { VITEDeploymentMode } from '@/config/env';

// 懒加载页面：避免影响首屏体积
const TemplateDemoPage = createSafeLazy(() =>
  import('../components/templates/index').then((m) => ({ default: m.TemplateDemoPage }))
);
const DynamicRouter = createSafeLazy(() => import('../lib/plugin-loader/DynamicRouter'));
const { lazy: PerformanceTestPage } = lazyWithPreload(
  () => import('../pages/performance/PerformanceTestPage')
);

const IS_STATIC_MODE = VITEDeploymentMode() !== 'module-federation';

/**
 * 将 RouteConfig[] 渲染为受保护的路由节点
 *
 * V65.1.1: 路由级 ErrorBoundary — 每个路由用 PageErrorBoundary 包裹 Suspense，
 * 让单页 lazy load 失败/运行时崩溃隔离在该路由内，不冒泡到 AppLayout 顶层边界。
 */
const renderRoutes = (routes: RouteConfig[]) => {
  return routes.map((route) => {
    const { element } = route;
    const Element = element as React.ComponentType;
    return (
      <Route
        key={route.path}
        path={route.path}
        element={
          <ProtectedRouteWrapper route={route}>
            <PageErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <Element />
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
 * - 仪表盘 / 公共路由（ProtectedRoute + SmartLayout）
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
          const Element = route.element as React.ComponentType;
          return (
            <Route
              key={route.path}
              path={route.path}
              element={
                <GuestRoute>
                  <PageErrorBoundary>
                    <Suspense fallback={<PageLoader />}>
                      <Element />
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

        {!IS_STATIC_MODE && (
          <Route
            path='/core/*'
            element={
              <ProtectedRoute>
                <GlobalLayout>
                  <DynamicRouter />
                </GlobalLayout>
              </ProtectedRoute>
            }
          />
        )}
        {IS_STATIC_MODE && (
          <Route
            path='/core/*'
            element={
              <ProtectedRoute>
                <GlobalLayout>
                  <div style={{ padding: 5 }}>
                    <h2>核心模块</h2>
                    <p>
                      核心模块在静态模式下不可用。请设置 VITE_DEPLOYMENT_MODE=module-federation 启用
                      Module Federation。
                    </p>
                    <p>或者访问其他模块：</p>
                    <ul>
                      <li>
                        <a href={HRM_PATHS.root}>人力资源管理</a>
                      </li>
                      <li>
                        <a href={CRM_PATHS.root}>客户关系管理</a>
                      </li>
                      <li>
                        <a href={DASHBOARD_PATHS.dashboard}>仪表盘</a>
                      </li>
                    </ul>
                  </div>
                </GlobalLayout>
              </ProtectedRoute>
            }
          />
        )}

        <Route
          path='/template-demo'
          element={
            <ProtectedRoute>
              <TemplateDemoPage />
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
