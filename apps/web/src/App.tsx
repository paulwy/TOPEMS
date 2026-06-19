import React, { Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { ProtectedRoute, GuestRoute } from "./components/ProtectedRoute";
import { ModuleGate } from "./components/PermissionGate";
import ErrorBoundary from "./components/ErrorBoundary";
import { ToastProvider } from "./components/ToastProvider";
import { LoadingProvider } from "./components/LoadingProvider";
import { ThemeProvider } from "./components/ThemeProvider";
import { Toaster } from "./components/Toaster";
import { LoadingSpinner } from "./components/LoadingSpinner";
import { TemplateDemoPage } from "./components/templates/index";
import { GlobalLayout } from "./components/layout";
import { DynamicRouter } from "./modules/loader/DynamicRouter";
import { eventBus, ModuleEvents } from "./modules/loader/EventBus";

// Check if we're in static mode (Module Federation disabled)
const IS_STATIC_MODE = import.meta.env.VITE_DEPLOYMENT_MODE !== "module-federation";

import {
  authRoutes,
  dashboardRoutes,
  hrmRoutes,
  crmRoutes,
  erpRoutes,
  iamRoutes,
  workflowRoutes,
  biRoutes,
  pmRoutes,
  notificationRoutes,
  docsRoutes,
  aiRoutes,
  professionalRoutes,
  monitorRoutes,
  mesRoutes,
  scmRoutes,
  wmsRoutes,
  gisRoutes,
  type RouteConfig,
} from "./routes";

const PageLoader: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <LoadingSpinner size="lg" />
      <p className="mt-4 text-gray-600">加载中...</p>
    </div>
  </div>
);

// 需要跳过 GlobalLayout 的模块（这些模块有自己的布局）
const modulesWithOwnLayout = ["hrm", "crm", "system"];

const ProtectedRouteWrapper: React.FC<{
  route: RouteConfig;
  children: React.ReactNode;
}> = ({ route, children }) => {
  const hasOwnLayout =
    route.module && modulesWithOwnLayout.includes(route.module);

  if (hasOwnLayout) {
    // 使用简化包装，不添加 GlobalLayout
    return (
      <ProtectedRoute requiredPermissions={route.requiredPermissions || []}>
        {route.module && route.action ? (
          <ModuleGate module={route.module} action={route.action}>
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
          <ModuleGate module={route.module} action={route.action}>
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

const AppContent: React.FC = () => {
  useAuth();

  useEffect(() => {
    const handleModuleLoaded = (data: { moduleId: string; path: string }) => {
      console.log(`[Dynamic Router] Module loaded: ${data.moduleId}`);
    };

    const handleModuleError = (data: { moduleId: string; error: Error }) => {
      console.error(`[Dynamic Router] Module load error: ${data.moduleId}`, data.error);
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
    
    // Use React.isValidElement to check if it's a React element (from React.createElement)
    // vs a component type (including LazyExoticComponent from React.lazy)
    if (React.isValidElement(element)) {
      return element;
    }
    
    // It's a component type (including LazyExoticComponent from React.lazy), render as Element
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
              <Suspense fallback={<PageLoader />}>
                {renderElement(route)}
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

        {dashboardRoutes.map((route) => {
          const Element = route.element as React.ComponentType;
          return (
            <Route
              key={route.path}
              path={route.path}
              element={
                <ProtectedRoute>
                  <GlobalLayout>
                    <Suspense fallback={<PageLoader />}>
                      <Element />
                    </Suspense>
                  </GlobalLayout>
                </ProtectedRoute>
              }
            />
          );
        })}

        {renderRoutes(hrmRoutes)}
        {renderRoutes(crmRoutes)}
        {renderRoutes(erpRoutes)}
        {renderRoutes(iamRoutes)}
        {renderRoutes(workflowRoutes)}
        {renderRoutes(biRoutes)}
        {renderRoutes(pmRoutes)}
        {renderRoutes(notificationRoutes)}
        {renderRoutes(docsRoutes)}
        {renderRoutes(aiRoutes)}
        {renderRoutes(professionalRoutes)}
        {renderRoutes(monitorRoutes)}
        {renderRoutes(mesRoutes)}
        {renderRoutes(scmRoutes)}
        {renderRoutes(wmsRoutes)}
        {renderRoutes(gisRoutes)}

        {/* Core module routes - only load via Module Federation when not in static mode */}
        {!IS_STATIC_MODE && (
          <Route
            path="/core/*"
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
            path="/core/*"
            element={
              <ProtectedRoute>
                <GlobalLayout>
                  <div style={{ padding: "20px" }}>
                    <h2>核心模块</h2>
                    <p>核心模块在静态模式下不可用。请设置 VITE_DEPLOYMENT_MODE=module-federation 启用 Module Federation。</p>
                    <p>或者访问其他模块：</p>
                    <ul>
                      <li><a href="/hrm">人力资源管理</a></li>
                      <li><a href="/crm">客户关系管理</a></li>
                      <li><a href="/dashboard">仪表盘</a></li>
                    </ul>
                  </div>
                </GlobalLayout>
              </ProtectedRoute>
            }
          />
        )}

        <Route
          path="/departments"
          element={<Navigate to="/hrm/departments" replace />}
        />
        <Route
          path="/employees"
          element={<Navigate to="/hrm/employees" replace />}
        />
        <Route
          path="/contracts"
          element={<Navigate to="/hrm/contracts" replace />}
        />
        <Route
          path="/reports"
          element={<Navigate to="/hrm/reports" replace />}
        />
        <Route
          path="/config-debug"
          element={<Navigate to="/debug" replace />}
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/template-demo" element={<TemplateDemoPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <LoadingProvider>
            <AuthProvider>
              <AppContent />
              <Toaster />
            </AuthProvider>
          </LoadingProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;
