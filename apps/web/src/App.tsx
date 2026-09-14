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

// 自愈：清理历史遗留的 alg:none 伪 JWT（旧 dev 注入器写入的 `{header}.{payload}.` token）。
// 此类 token 会被后端 jsonwebtoken 拒绝（401），且 dev_auth_bypass 会阻止登出，
// 导致受保护 API 永久 401。检测到即清除，让用户重新走正常登录获取真实 token。
if (import.meta.env.DEV) {
  try {
    const existing = localStorage.getItem('token');
    if (existing) {
      const [h] = existing.split('.');
      let isNoneAlg = false;
      try {
        const header = JSON.parse(atob(h.replace(/-/g, '+').replace(/_/g, '/')));
        isNoneAlg = header?.alg === 'none';
      } catch {
        /* 非 base64 或非 JSON 头，不处理 */
      }
      if (isNoneAlg) {
        localStorage.removeItem('token');
        localStorage.removeItem('dev_auth_bypass');
        localStorage.removeItem('user');
        localStorage.removeItem('roles');
        localStorage.removeItem('permissions');
      }
    }
  } catch {
    /* noop */
  }
}

// 🔧 Dev auth injector: 从 URL query ?_tok=JWT&_tid=TENANT_ID 注入身份，用于联调
// 安全约束：仅在 URL 显式携带联调参数（_tok/_tid）时才注入身份；
// 绝不使用 alg:none 伪 JWT 覆盖 localStorage 中已登录的真实 token（否则所有受保护
// API 都会因 JWT 算法校验失败返回 401）。
if (import.meta.env.DEV) {
  try {
    const isJwtLike = (value: string | null): value is string =>
      !!value && value.split('.').length === 3;

    const params = new URLSearchParams(window.location.search);
    const rawTok = params.get('_tok');
    const tid = params.get('_tid');
    if (rawTok || tid) {
      // 仅当 _tok 是合法 JWT 形态时写入；缺 _tok 或非 JWT 时保持现有登录态
      if (isJwtLike(rawTok)) localStorage.setItem('token', rawTok as string);
      if (tid) localStorage.setItem('tenant_id', tid);
      localStorage.setItem(
        'user',
        JSON.stringify({
          id: params.get('_uid') || '11111111-1111-1111-1111-111111111111',
          username: 'admin',
          role: 'admin',
          is_superuser: true,
        })
      );
      localStorage.setItem('roles', JSON.stringify(['admin', 'user']));
      localStorage.setItem('permissions', JSON.stringify(['*']));
      localStorage.setItem('dev_auth_bypass', '1');
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
        Dev-mode placeholder: MicroFrontendDevTools (left fixed multi-row buttons,
        ~25 colored buttons spanning 3-4 rows) + ObservabilityPanel (right fixed
        floating button ~48px) both use position: fixed and are taken out of flow,
        which would otherwise cover content near the bottom of the page.
        This in-flow div pushes the scroll-boundary down so the last screenful
        remains visible. Rendered only when import.meta.env.DEV && authenticated;
        fully tree-shaken from production builds.
      */}
      <div
        aria-hidden='true'
        style={{
          width: '100%',
          height: 320,
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
