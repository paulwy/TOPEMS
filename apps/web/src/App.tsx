import React from 'react';
import AppLayout from './components/layout/AppLayout';
import AppRoutes from './routes/appRoutes';
import I18nReadyGate from './components/I18nReadyGate';

// G5 修复（2026-10-22）：移除开发模式调试面板（微前端可观测性面板 / DevTools），
// 原实现见 git 历史（V40.0 Track F）。生产构建本已 tree-shake，现直接不再渲染。

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
 * 应用入口
 *
 * 仅负责组合：
 * - AppLayout：全局 Provider 树（ErrorBoundary / Theme / Notification / Loading / Auth / Plugin）
 * - AppRoutes：路由树 + 全局状态初始化（useAppInit）
 */
const App: React.FC = () => (
  <I18nReadyGate>
    <AppLayout>
      <AppRoutes />
    </AppLayout>
  </I18nReadyGate>
);

export default App;
