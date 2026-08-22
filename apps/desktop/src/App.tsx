import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Layout from './components/Layout';
import useKeyboardShortcuts from './hooks/useKeyboardShortcuts';

const Login = React.lazy(() => import('./pages/Login'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const HR = React.lazy(() => import('./pages/HR'));
const CRM = React.lazy(() => import('./pages/CRM'));
const ERP = React.lazy(() => import('./pages/ERP'));
const Reports = React.lazy(() => import('./pages/Reports'));
const Settings = React.lazy(() => import('./pages/Settings'));
const AuditLog = React.lazy(() => import('./pages/AuditLogPage'));

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  return <>{children}</>;
};

function App() {
  useKeyboardShortcuts();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Suspense fallback={null}><Login /></Suspense>} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Layout>
                <Suspense fallback={null}>
                  <Routes>
                    <Route path="/" element={<Navigate to="/dashboard" />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/hr" element={<HR />} />
                    <Route path="/crm" element={<CRM />} />
                    <Route path="/erp" element={<ERP />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/audit" element={<AuditLog />} />
                    <Route path="/settings" element={<Settings />} />
                  </Routes>
                </Suspense>
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
