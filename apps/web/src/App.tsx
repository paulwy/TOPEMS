import React, { Suspense, lazy } from 'react';
import AppLayout from './components/layout/AppLayout';
import AppRoutes from './routes/appRoutes';
import I18nReadyGate from './components/I18nReadyGate';
import { useAuth } from './hooks/useAuth';

// DevTools 仅在开发模式按需加载，生产构建由 Vite tree-shaking 移除（import.meta.env.DEV 字面量）
const MicroFrontendDevTools = import.meta.env.DEV ? lazy(() => import('./dev-tools')) : null;

// V40.0 Track F: 微前端可观测性面板（开发模式）
// 使用 import.meta.env.DEV 编译时常量门控，确保生产构建中完全移除
const ObservabilityPanel = import.meta.env.DEV
  ? lazy(() =>
      import('./microfrontend/observability').then((m) => ({ default: m.ObservabilityPanel }))
    )
  : null;

// 🔧 Dev auth injector: 从 URL query ?_tok=JWT&_tid=TENANT_ID 注入身份，用于联调
if (import.meta.env.DEV) {
  try {
    const params = new URLSearchParams(window.location.search);
    const tok = params.get('_tok');
    const tid = params.get('_tid');
    if (tok) localStorage.setItem('token', tok);
    if (tid) localStorage.setItem('tenant_id', tid);
    if (tok || tid) {
      localStorage.setItem(
        'user',
        JSON.stringify({
          id: params.get('_uid') || '11111111-1111-1111-1111-111111111111',
          username: 'admin',
          role: 'admin',
          isSuperuser: true,
        })
      );
      localStorage.setItem('roles', JSON.stringify(['admin', 'user']));
      localStorage.setItem('permissions', JSON.stringify(['*']));
      localStorage.removeItem('topems-plugin-storage');
      localStorage.removeItem('plugin-persister');
    }
  } catch (_) {
    /* noop */
  }
}

/**
 * 开发模式 dev 面板包装器
 *
 * 仅在用户已认证时渲染 ObservabilityPanel 和 MicroFrontendDevTools，
 * 避免在登录页等公开路由上叠加高 z-index 浮层导致按钮被遮挡。
 */
const DevPanels: React.FC = () => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) return null;

  return (
    <>
      {/*
        开发模式占位块：MicroFrontendDevTools（左 fixed 一排彩色按钮 ~72px）
        + ObservabilityPanel（右 fixed 浮层按钮 ~48px）均是 position: fixed
        脱离文档流，会遮挡页面底部内容。
        此处用普通文档流占位块把页面滚动底边界顶开，避免最后一屏内容被浮层覆盖。
        仅在 import.meta.env.DEV && 已认证 时渲染，生产构建完全移除。
      */}
      <div
        aria-hidden='true'
        style={{
          width: '100%',
          height: 100,
          flexShrink: 0,
          pointerEvents: 'none',
        }}
      />
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
    </>
  );
};

/**
 * 应用入口
 *
 * 仅负责组合：
 * - AppLayout：全局 Provider 树（ErrorBoundary / Theme / Notification / Loading / Auth / Plugin）
 * - AppRoutes：路由树 + 全局状态初始化（useAppInit）
 * - 开发模式下已认证才显示的可观测性面板与微前端 DevTools
 */
const App: React.FC = () => (
  <I18nReadyGate>
    <AppLayout>
      <AppRoutes />
      <DevPanels />
    </AppLayout>
  </I18nReadyGate>
);

export default App;
