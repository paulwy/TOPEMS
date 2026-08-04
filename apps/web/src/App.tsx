import React, { Suspense, useState, useEffect, useRef, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ProtectedRoute, GuestRoute } from './components/auth/ProtectedRoute';
import { ModuleGate } from './components/PermissionGate';
import ErrorBoundary from './components/ErrorBoundary';
import { NotificationProvider } from './components/notification/NotificationProvider';
import { LoadingProvider } from './components/LoadingProvider';
import { ThemeProvider } from './components/ThemeProvider';
import { LoadingSpinner } from '@topems/shared-components';
import { GlobalLayout } from './components/layout';
import { SmartLayout } from './layouts/SmartLayout';
import { logger } from '@/utils/logger';
import { PluginProvider } from './context/PluginContext';
import { createSafeLazy, lazyWithPreload } from './utils/createSafeLazy';

import {
  authRoutes,
  dashboardRoutes,
  commonRoutes,
  loadModuleConfig,
  coreModuleCodes,
  type RouteConfig,
} from './routes';
import { DASHBOARD_PATHS } from './routes/dashboard';
import { HRM_PATHS } from './modules/hrm/config';
import { CRM_PATHS } from './modules/crm/config';
import { ADMIN_PATHS } from './modules/admin/config';
import { eventBus, ModuleEvents } from './lib/plugin-loader/EventBus';
// V35.0 Phase 7: 微前端智能预加载
import { prefetchOnIdle } from './microfrontend/RemoteLoader';
import { REMOTE_MODULES } from './microfrontend/config';
// V37.0 Phase 7: Service Worker 离线缓存 + 智能预加载
import { recordNavigation, prefetchIntelligent, prefetchRemoteEntries } from './lib/pwa';
// V39.0 Track F: 微前端版本管理 + 热更新 + 灰度发布
import { versionManager } from './microfrontend/version-manager';
import { canaryRelease } from './microfrontend/canary-release';
// V40.0 Track F: 微前端可观测性
import {
  errorTracker,
  userBehaviorAnalytics,
  ObservabilityPanel,
} from './microfrontend/observability';

const TemplateDemoPage = createSafeLazy(() =>
  import('./components/templates/index').then((m) => ({ default: m.TemplateDemoPage }))
);
const DynamicRouter = createSafeLazy(() => import('./lib/plugin-loader/DynamicRouter'));
const { lazy: PerformanceTestPage, preload: preloadPerformanceTest } = lazyWithPreload(
  () => import('./pages/performance/PerformanceTestPage')
);

// DevTools 仅在开发模式按需加载，避免生产包体积膨胀
const MicroFrontendDevTools = lazy(() => import('./dev-tools'));

const IS_STATIC_MODE =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITEDeploymentMode) !==
  'module-federation';

const IS_DEV = typeof import.meta !== 'undefined' && import.meta.env?.DEV === true;

const PageLoader: React.FC = () => (
  <Box
    sx={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      bgcolor: 'var(--color-background)',
    }}
  >
    <Box sx={{ textAlign: 'center' }}>
      <LoadingSpinner size='lg' />
      <Typography sx={{ mt: 2, color: 'var(--color-text-secondary)' }}>加载中...</Typography>
    </Box>
  </Box>
);

const ProtectedRouteWrapper: React.FC<{
  route: RouteConfig;
  children: React.ReactNode;
}> = ({ route, children }) => {
  const permissions = route.requiredPermissions || [];
  const hasModuleGate = route.module && route.action;

  const renderContent = (withLayout: boolean) => {
    const content = hasModuleGate ? (
      <ModuleGate
        module={route.module!}
        action={route.action!}
      >
        {withLayout ? <SmartLayout>{children}</SmartLayout> : children}
      </ModuleGate>
    ) : withLayout ? (
      <SmartLayout>{children}</SmartLayout>
    ) : (
      children
    );
    return <ProtectedRoute requiredPermissions={permissions}>{content}</ProtectedRoute>;
  };

  if (route.module === 'mobile') {
    return renderContent(false);
  }

  return renderContent(true);
};

const DynamicRoutes: React.FC = () => {
  const [routes, setRoutes] = useState<RouteConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const routeCacheRef = useRef<Map<string, RouteConfig[]>>(new Map());
  const prevModuleRef = useRef<string | null>(null);

  const detectModuleFromPath = (path: string): string | null => {
    const pathParts = path.split('/').filter((p) => p);
    if (pathParts.length === 0) return null;
    const firstPart = pathParts[0];
    if (coreModuleCodes.includes(firstPart as (typeof coreModuleCodes)[number])) {
      return firstPart;
    }
    return null;
  };

  // V37.0 Phase 7: 记录用户导航历史 + 触发智能预加载
  useEffect(() => {
    recordNavigation(location.pathname);
    // 延迟触发智能预加载，避免与当前路由加载竞争
    const timer = setTimeout(() => prefetchIntelligent(), 2000);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  useEffect(() => {
    const moduleCode = detectModuleFromPath(location.pathname);

    if (prevModuleRef.current === moduleCode && routeCacheRef.current.has(moduleCode || '')) {
      setRoutes(routeCacheRef.current.get(moduleCode || '') || []);
      setLoading(false);
      return;
    }

    const loadRoutes = async () => {
      setLoading(true);
      try {
        if (moduleCode) {
          const cachedRoutes = routeCacheRef.current.get(moduleCode);
          if (cachedRoutes) {
            logger.info(`[Dynamic Routes] Using cached routes for: ${moduleCode}`);
            setRoutes(cachedRoutes);
            prevModuleRef.current = moduleCode;
            setLoading(false);
            return;
          }

          logger.info(`[Dynamic Routes] Loading module: ${moduleCode}`);
          const moduleConfig = await loadModuleConfig(moduleCode);
          const flatRoutes = moduleConfig.routes.flatMap((route) => {
            const flatten = (r: typeof route): (typeof route)[] => [
              r,
              ...(r.children || []).flatMap(flatten),
            ];
            return flatten(route);
          });
          const mappedRoutes: RouteConfig[] = flatRoutes.map((route) => ({
            path: route.path,
            element: route.element,
            requiredPermissions: route.requiredPermissions,
            module: route.module,
            action: route.action,
          }));
          routeCacheRef.current.set(moduleCode, mappedRoutes);
          setRoutes(mappedRoutes);
          prevModuleRef.current = moduleCode;
        }
      } catch (error) {
        logger.error('[Dynamic Routes] Failed to load routes', error);
      } finally {
        setLoading(false);
      }
    };

    loadRoutes();
  }, [location.pathname]);

  if (loading) {
    return <PageLoader />;
  }

  return (
    <Routes>
      {routes.map((route) => {
        const { element } = route;
        const Element = element as React.ComponentType;
        return (
          <Route
            key={route.path}
            path={route.path}
            element={
              <ProtectedRouteWrapper route={route}>
                <Suspense fallback={<PageLoader />}>
                  <Element />
                </Suspense>
              </ProtectedRouteWrapper>
            }
          />
        );
      })}
    </Routes>
  );
};

const AppContent: React.FC = () => {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const handleModuleLoaded = (data: { moduleId: string; path: string }) => {
      logger.info(`[Dynamic Router] Module loaded: ${data.moduleId}`);
    };

    const handleModuleError = (data: { moduleId: string; error: Error }) => {
      logger.error(`[Dynamic Router] Module load error: ${data.moduleId}`, data.error);
    };

    eventBus.on(ModuleEvents.MODULE_LOADED, handleModuleLoaded);
    eventBus.on(ModuleEvents.MODULE_ERROR, handleModuleError);

    return () => {
      eventBus.off(ModuleEvents.MODULE_LOADED, handleModuleLoaded);
      eventBus.off(ModuleEvents.MODULE_ERROR, handleModuleError);
    };
  }, []);

  // V35.0 Phase 7: 用户认证后，浏览器空闲时预加载非核心模块的远程入口
  // V37.0 Phase 7: 同时预缓存远程模块入口到 Service Worker
  useEffect(() => {
    if (!isAuthenticated) return;
    const lazyEntries = REMOTE_MODULES.filter((m) => !m.isCore).map((m) => m.entry);
    if (lazyEntries.length > 0) {
      prefetchOnIdle(lazyEntries);
      // V37.0: 预缓存远程入口到 Service Worker（离线可用）
      prefetchRemoteEntries(lazyEntries);
    }
  }, [isAuthenticated]);

  // V39.0 Track F: 启动微前端版本管理 + 灰度配置同步
  // 用户认证后启动定时版本检查（5 分钟一次）+ 灰度配置服务端同步（2 分钟一次）
  useEffect(() => {
    if (!isAuthenticated) return;

    // 初始化版本管理器
    versionManager.init();

    // 注册版本更新回调：当检测到新版本（prompt 策略）时记录日志
    const unsubscribeVersion = versionManager.onVersionUpdate((event) => {
      logger.info(
        `[App] 版本更新通知: ${event.moduleId} ${event.oldVersion} → ${event.newVersion} (策略: ${event.strategy})`
      );
    });

    // 启动定时版本检查（5 分钟一次，首次延迟 30 秒）
    versionManager.startAutoCheck(5 * 60 * 1000);

    // 初始化灰度发布管理器
    canaryRelease.init();

    // 启动灰度配置服务端同步（2 分钟一次）
    canaryRelease.startServerSync(2 * 60 * 1000);

    return () => {
      unsubscribeVersion();
      versionManager.stopAutoCheck();
      canaryRelease.stopServerSync();
    };
  }, [isAuthenticated]);

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
              <Suspense fallback={<PageLoader />}>
                <Element />
              </Suspense>
            </ProtectedRouteWrapper>
          }
        />
      );
    });
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path='/performance'
          element={
            <ProtectedRoute>
              <Suspense fallback={<PageLoader />}>
                <PerformanceTestPage />
              </Suspense>
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
                  <Suspense fallback={<PageLoader />}>
                    <Element />
                  </Suspense>
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
                  <div style={{ padding: '20px' }}>
                    <h2>核心模块</h2>
                    <p>
                      核心模块在静态模式下不可用。请设置 VITEDeploymentMode=module-federation 启用
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
          path='/departments'
          element={
            <Navigate
              to={HRM_PATHS.departments}
              replace
            />
          }
        />
        <Route
          path='/employees'
          element={
            <Navigate
              to={HRM_PATHS.employees}
              replace
            />
          }
        />
        <Route
          path='/contracts'
          element={
            <Navigate
              to={HRM_PATHS.contracts}
              replace
            />
          }
        />
        <Route
          path='/reports'
          element={
            <Navigate
              to={HRM_PATHS.reports}
              replace
            />
          }
        />
        <Route
          path='/config-debug'
          element={
            <Navigate
              to={ADMIN_PATHS.configDebug}
              replace
            />
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

const App: React.FC = () => {
  useEffect(() => {
    errorTracker.loadFromStorage();
    userBehaviorAnalytics.loadFromStorage();
    errorTracker.startErrorTracking();

    return () => {
      errorTracker.stopErrorTracking();
    };
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <NotificationProvider>
          <LoadingProvider>
            <AuthProvider>
              <PluginProvider>
                <AppContent />
                {IS_DEV && <ObservabilityPanel />}
                {IS_DEV && (
                  <Suspense fallback={null}>
                    <MicroFrontendDevTools />
                  </Suspense>
                )}
              </PluginProvider>
            </AuthProvider>
          </LoadingProvider>
        </NotificationProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;
