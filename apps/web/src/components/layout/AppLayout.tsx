import React from 'react';
import ErrorBoundary from '../ErrorBoundary';
import { NotificationProvider } from '../notification/NotificationProvider';
import { LoadingProvider } from '../LoadingProvider';
import { ThemeProvider } from '../ThemeProvider';
import { AuthProvider } from '../../hooks/useAuth';
import { PluginProvider } from '../../context/PluginContext';

/**
 * 应用级布局：组合全局 Provider 树
 *
 * 包裹顺序（外 → 内）：
 *   ErrorBoundary → ThemeProvider → NotificationProvider →
 *   LoadingProvider → AuthProvider → PluginProvider → children
 *
 * 任何子节点（如 AppRoutes）均可安全调用 useAuth / usePlugin 等上下文。
 */
const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ErrorBoundary>
    <ThemeProvider>
      <NotificationProvider>
        <LoadingProvider>
          <AuthProvider>
            <PluginProvider>{children}</PluginProvider>
          </AuthProvider>
        </LoadingProvider>
      </NotificationProvider>
    </ThemeProvider>
  </ErrorBoundary>
);

export default AppLayout;
