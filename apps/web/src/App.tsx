import { Suspense, lazy, useState } from 'react';
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

import {
  authRoutes,
  dashboardRoutes,
  commonRoutes,
  legacyRedirects,
  loadModuleConfig,
  coreModuleCodes,
  type RouteConfig,
} from './routes';
import { eventBus, ModuleEvents } from './modules/loader/EventBus';

const TemplateDemoPage = lazy(() =>
  import('./components/templates/index').then((m) => ({ default: m.TemplateDemoPage }))
);
const DynamicRouter = lazy(() => import('./modules/loader/DynamicRouter'));
const PerformanceTestPage = lazy(() => import('./pages/performance/PerformanceTestPage'));

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

const modulesWithOwnLayout: string[] = [];

const ProtectedRouteWrapper: React.FC<{
  route: RouteConfig;
  children: React.ReactNode;
}> = ({ route, children }) => {
  const hasOwnLayout = route.module && modulesWithOwnLayout.includes(route.module);

  if (hasOwnLayout) {
    return (
      <ProtectedRoute requiredPermissions={route.requiredPermissions || []}>
        {route.module && route.action ? (
          <ModuleGate
            module={route.module}
            action={route.action}
          >
            {children}
          </ModuleGate>
        ) : (
          children
        )}
      </ProtectedRoute>
    );
  }

  if (route.module === 'mobile') {
    return (
      <ProtectedRoute requiredPermissions={route.requiredPermissions || []}>
        {route.module && route.action ? (
          <ModuleGate
            module={route.module}
            action={route.action}
          >
            {children}
          </ModuleGate>
        ) : (
          children
        )}
      </ProtectedRoute>
    );
  }

  if (route.requiredPermissions && route.requiredPermissions.length > 0) {
    return (
      <ProtectedRoute requiredPermissions={route.requiredPermissions}>
        {route.module && route.action ? (
          <ModuleGate
            module={route.module}
            action={route.action}
          >
            <GlobalLayout>{children}</GlobalLayout>
          </ModuleGate>
        ) : (
          <GlobalLayout>{children}</GlobalLayout>
        )}
      </ProtectedRoute>
    );
  }
  return (
    <ProtectedRoute>
      <GlobalLayout>{children}</GlobalLayout>
    </ProtectedRoute>
  );
};

const DynamicRoutes: React.FC = () => {
  const [routes, setRoutes] = useState<RouteConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const detectModuleFromPath = (path: string): string | null => {
      const pathParts = path.split('/').filter((p) => p);
      if (pathParts.length === 0) return null;
      const firstPart = pathParts[0];
      if (coreModuleCodes.includes(firstPart as (typeof coreModuleCodes)[number])) {
        return firstPart;
      }
      return null;
    };

    const loadRoutes = async () => {
      setLoading(true);
      try {
        const moduleCode = detectModuleFromPath(location.pathname);
        if (moduleCode) {
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
          setRoutes(mappedRoutes);
        }
      } catch (error) {
        logger.error('[Dynamic Routes] Failed to load routes', error);
      } finally {
        setLoading(false);
      }
    };

    loadRoutes();
  }, [location.pathname]);

  const renderElement = (route: RouteConfig) => {
    const { element } = route;
    if (React.isValidElement(element)) {
      return element;
    }
    const Element = element as React.ComponentType;
    return <Element />;
  };

  if (loading) {
    return <PageLoader />;
  }

  return (
    <Routes>
      {routes.map((route) => (
        <Route
          key={route.path}
          path={route.path}
          element={
            <ProtectedRouteWrapper route={route}>
              <Suspense fallback={<PageLoader />}>{renderElement(route)}</Suspense>
            </ProtectedRouteWrapper>
          }
        />
      ))}
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

  const renderElement = (route: RouteConfig) => {
    const { element } = route;
    if (React.isValidElement(element)) {
      return element;
    }
    const Element = element as React.ComponentType;
    return <Element />;
  };

  const renderRoutes = (routes: RouteConfig[]) => {
    return routes.map((route) => {
      return (
        <Route
          key={route.path}
          path={route.path}
          element={
            <ProtectedRouteWrapper route={route}>
              <Suspense fallback={<PageLoader />}>{renderElement(route)}</Suspense>
            </ProtectedRouteWrapper>
          }
        />
      );
    });
  };

  return (
    <BrowserRouter>
      <Routes>
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

        <Route
          path='/performance'
          element={
            <Suspense fallback={<PageLoader />}>
              <PerformanceTestPage />
            </Suspense>
          }
        />

        {renderRoutes(dashboardRoutes)}
        {renderRoutes(commonRoutes)}

        <Route
          path='*'
          element={<DynamicRoutes />}
        />

        {legacyRedirects.map((redirect) => (
          <Route
            key={redirect.path}
            path={redirect.path}
            element={redirect.element}
          />
        ))}

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
                        <a href='/hrm'>人力资源管理</a>
                      </li>
                      <li>
                        <a href='/crm'>客户关系管理</a>
                      </li>
                      <li>
                        <a href='/dashboard'>仪表盘</a>
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
              to='/hrm/departments'
              replace
            />
          }
        />
        <Route
          path='/employees'
          element={
            <Navigate
              to='/hrm/employees'
              replace
            />
          }
        />
        <Route
          path='/contracts'
          element={
            <Navigate
              to='/hrm/contracts'
              replace
            />
          }
        />
        <Route
          path='/reports'
          element={
            <Navigate
              to='/hrm/reports'
              replace
            />
          }
        />
        <Route
          path='/config-debug'
          element={
            <Navigate
              to='/admin/config-debug'
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
              to='/dashboard'
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
