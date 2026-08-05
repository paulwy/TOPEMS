import React, { Suspense, lazy } from 'react';
import AppLayout from './components/layout/AppLayout';
import AppRoutes from './routes/appRoutes';
// V40.0 Track F: 微前端可观测性（开发模式面板）
import { ObservabilityPanel } from './microfrontend/observability';
import { isDev } from '@/config/env';

// DevTools 仅在开发模式按需加载，避免生产包体积膨胀
const MicroFrontendDevTools = lazy(() => import('./dev-tools'));

const IS_DEV = isDev();

/**
 * 应用入口
 *
 * 仅负责组合：
 * - AppLayout：全局 Provider 树（ErrorBoundary / Theme / Notification / Loading / Auth / Plugin）
 * - AppRoutes：路由树 + 全局状态初始化（useAppInit）
 * - 开发模式下的可观测性面板与微前端 DevTools
 */
const App: React.FC = () => (
  <AppLayout>
    <AppRoutes />
    {IS_DEV && <ObservabilityPanel />}
    {IS_DEV && (
      <Suspense fallback={null}>
        <MicroFrontendDevTools />
      </Suspense>
    )}
  </AppLayout>
);

export default App;
