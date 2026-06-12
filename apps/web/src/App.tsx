import React, { Suspense } from "react";
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

const ProtectedRouteWrapper: React.FC<{
  route: RouteConfig;
  children: React.ReactNode;
}> = ({ route, children }) => {
  if (route.requiredPermissions && route.requiredPermissions.length > 0) {
    return (
      <ProtectedRoute requiredPermissions={route.requiredPermissions}>
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
  return <ProtectedRoute>{children}</ProtectedRoute>;
};

const AppContent: React.FC = () => {
  useAuth();

  const renderRoutes = (routes: RouteConfig[]) => {
    return routes.map((route) => {
      const Element = route.element;
      return (
        <Route
          key={route.path}
          path={route.path}
          element={
            <ProtectedRouteWrapper route={route}>
              {Element}
            </ProtectedRouteWrapper>
          }
        />
      );
    });
  };

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {authRoutes.map((route) => (
            <Route
              key={route.path}
              path={route.path}
              element={<GuestRoute>{route.element}</GuestRoute>}
            />
          ))}

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                {dashboardRoutes.find((r) => r.path === "/dashboard")?.element}
              </ProtectedRoute>
            }
          />

          {renderRoutes(dashboardRoutes.filter((r) => r.path !== "/dashboard"))}
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
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
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
