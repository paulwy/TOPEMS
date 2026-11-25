/**
 * 前端页面巡检共用：登录 + 注入登录态
 *
 * 两个巡检脚本（列表页一致性、页面健康度）都要「不点登录表单、直接带着真实 token 进页面」。
 * 这里统一实现，避免两处各写一遍后慢慢跑偏。
 */
export async function login({ apiBase, tenantId, username, password }) {
  const res = await fetch(`${apiBase}/api/core/iam/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': tenantId },
    body: JSON.stringify({ username, password }),
  });
  const body = await res.json().catch(() => null);
  const data = body && body.data;
  if (!res.ok || !data || !data.access_token) {
    throw new Error(`登录失败：HTTP ${res.status} ${body ? JSON.stringify(body).slice(0, 120) : ''}`);
  }
  const user = data.user || {};
  return {
    token: data.access_token,
    refresh: data.refresh_token || '',
    expiresIn: Number(data.expires_in || 3600),
    user: JSON.stringify(user),
    roles: JSON.stringify(user.roles || []),
    permissions: JSON.stringify(user.permissions || []),
  };
}

/** 在页面脚本执行前写入 localStorage（同源每次导航都会先跑这段） */
export async function installAuth(context, creds, tenantId) {
  await context.addInitScript(
    ({ token, refresh, expiresIn, user, roles, permissions, tenant }) => {
      try {
        localStorage.setItem('token', token);
        localStorage.setItem('token_expiry', String(Date.now() + expiresIn * 1000));
        if (refresh) localStorage.setItem('refresh_token', refresh);
        localStorage.setItem('user', user);
        localStorage.setItem('roles', roles);
        localStorage.setItem('permissions', permissions);
        localStorage.setItem('current_tenant_id', tenant);
      } catch {
        /* 隐私模式/禁用存储时忽略 */
      }
    },
    { ...creds, tenant: tenantId }
  );
}

/** 从 /api/core/menus 取全部可导航路由（去掉详情与看板类，可用 includeDashboards 打开） */
export async function fetchMenuPaths({ apiBase, tenantId, token, includeDashboards = false }) {
  const res = await fetch(`${apiBase}/api/core/menus`, {
    headers: { Authorization: `Bearer ${token}`, 'X-Tenant-Id': tenantId },
  });
  const body = await res.json().catch(() => null);
  const items = (body && body.data && body.data.items) || [];
  return items
    .map((m) => m.path)
    .filter((p) => typeof p === 'string' && p.startsWith('/') && !p.includes(':'))
    .filter((p) => !p.includes('/detail'))
    .filter((p) => includeDashboards || !/dashboard|dashboard|\/home|\/profile|workbench/.test(p));
}

/** 极简命令行参数读取 */
export function argOf(argv, name, dflt) {
  const pref = argv.find((a) => a.startsWith(`--${name}=`));
  if (pref) return pref.split('=').slice(1).join('=');
  const idx = argv.indexOf(`--${name}`);
  if (idx >= 0 && argv[idx + 1] && !argv[idx + 1].startsWith('--')) return argv[idx + 1];
  return dflt;
}

export const hasFlag = (argv, name) => argv.includes(`--${name}`);
