import React, { Suspense, useState, useEffect, useRef } from 'react';
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

const TemplateDemoPage = createSafeLazy(() =>
  import('./components/templates/index').then((m) => ({ default: m.TemplateDemoPage }))
);
const DynamicRouter = createSafeLazy(() => import('./lib/plugin-loader/DynamicRouter'));
const { lazy: PerformanceTestPage, preload: preloadPerformanceTest } = lazyWithPreload(() => 
  import('./pages/performance/PerformanceTestPage')
);

const IS_STATIC_MODE = import.meta.env.VITE_DEPLOYMENT_MODE !== 'module-federation';

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
        {withLayout ? <GlobalLayout>{children}</GlobalLayout> : children}
      </ModuleGate>
    ) : withLayout ? (
      <GlobalLayout>{children}</GlobalLayout>
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
        const routeElement = React.isValidElement(element)
          ? element
          : React.createElement(element as React.ComponentType);
        return (
          <Route
            key={route.path}
            path={route.path}
            element={
              <ProtectedRouteWrapper route={route}>
                <Suspense fallback={<PageLoader />}>{routeElement}</Suspense>
              </ProtectedRouteWrapper>
            }
          />
        );
      })}
    </Routes>
  );
};

const AppContent: React.FC = () => {
  useAuth();

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

  const renderRoutes = (routes: RouteConfig[]) => {
    return routes.map((route) => {
      const { element } = route;
      const routeElement = React.isValidElement(element)
        ? element
        : React.createElement(element as React.ComponentType);
      return (
        <Route
          key={route.path}
          path={route.path}
          element={
            <ProtectedRouteWrapper route={route}>
              <Suspense fallback={<PageLoader />}>{routeElement}</Suspense>
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
            <Suspense fallback={<PageLoader />}>
              <PerformanceTestPage />
            </Suspense>
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
          element={<TemplateDemoPage />}
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
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <NotificationProvider>
          <LoadingProvider>
            <AuthProvider>
              <PluginProvider>
                <AppContent />
              </PluginProvider>
            </AuthProvider>
          </LoadingProvider>
        </NotificationProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;
