import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute, GuestRoute } from '../components/auth/ProtectedRoute';
import { GlobalLayout } from '../components/layout';
import { AdaptiveLayout, isUIV3Enabled } from '../layouts';
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
import i18n from '@/i18n';

// 懒加载页面：避免影响首屏体积
const TemplateDemoPage = createSafeLazy(() =>
  import('../components/templates/index').then((m) => ({ default: m.TemplateDemoPage }))
);
const RedesignDemoPage = createSafeLazy(() => import('../pages/RedesignDemo'));
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

        {!IS_STATIC_MODE && (
          <Route
            path='/core/*'
            element={
              <ProtectedRoute>
                {isUIV3Enabled() ? (
                  <AdaptiveLayout>
                    <DynamicRouter />
                  </AdaptiveLayout>
                ) : (
                  <GlobalLayout>
                    <DynamicRouter />
                  </GlobalLayout>
                )}
              </ProtectedRoute>
            }
          />
        )}
        {IS_STATIC_MODE && (
          <Route
            path='/core/*'
            element={
              <ProtectedRoute>
                {isUIV3Enabled() ? (
                  <AdaptiveLayout>
                    <div style={{ padding: 5 }}>
                      <h2>{i18n.t('routes.app_routes.k0')}</h2>
                      <p>
                        {i18n.t('routes.app_routes.k1')}
                        Module Federation。
                      </p>
                      <p>{i18n.t('routes.app_routes.k2')}</p>
                      <ul>
                        <li>
                          <a href={HRM_PATHS.root}>{i18n.t('routes.app_routes.k3')}</a>
                        </li>
                        <li>
                          <a href={CRM_PATHS.root}>{i18n.t('routes.app_routes.k4')}</a>
                        </li>
                        <li>
                          <a href={DASHBOARD_PATHS.dashboard}>{i18n.t('routes.app_routes.k5')}</a>
                        </li>
                      </ul>
                    </div>
                  </AdaptiveLayout>
                ) : (
                  <GlobalLayout>
                    <div style={{ padding: 5 }}>
                      <h2>{i18n.t('routes.app_routes.k0')}</h2>
                      <p>
                        {i18n.t('routes.app_routes.k1')}
                        Module Federation。
                      </p>
                      <p>{i18n.t('routes.app_routes.k2')}</p>
                      <ul>
                        <li>
                          <a href={HRM_PATHS.root}>{i18n.t('routes.app_routes.k3')}</a>
                        </li>
                        <li>
                          <a href={CRM_PATHS.root}>{i18n.t('routes.app_routes.k4')}</a>
                        </li>
                        <li>
                          <a href={DASHBOARD_PATHS.dashboard}>{i18n.t('routes.app_routes.k5')}</a>
                        </li>
                      </ul>
                    </div>
                  </GlobalLayout>
                )}
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
