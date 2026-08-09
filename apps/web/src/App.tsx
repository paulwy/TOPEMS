import React, { Suspense, lazy } from 'react';
import AppLayout from './components/layout/AppLayout';
import AppRoutes from './routes/appRoutes';

// DevTools 仅在开发模式按需加载，生产构建由 Vite tree-shaking 移除（import.meta.env.DEV 字面量）
const MicroFrontendDevTools = import.meta.env.DEV
  ? lazy(() => import('./dev-tools'))
  : null;

// V40.0 Track F: 微前端可观测性面板（开发模式）
// 使用 import.meta.env.DEV 编译时常量门控，确保生产构建中完全移除
const ObservabilityPanel = import.meta.env.DEV
  ? lazy(() => import('./microfrontend/observability').then(m => ({ default: m.ObservabilityPanel })))
  : null;

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
    {ObservabilityPanel && (
      <Suspense fallback={null}>
        <ObservabilityPanel />
      </Suspense>
    )}
    {MicroFrontendDevTools && (
      <Suspense fallback={null}>
        <MicroFrontendDevTools />
      </Suspense>
    )}
  </AppLayout>
);

export default App;
