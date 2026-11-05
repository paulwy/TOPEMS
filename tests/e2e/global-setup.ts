import { request, type APIRequestContext, type FullConfig } from '@playwright/test';
import fs from 'node:fs';
import { AUTH_DIR, E2E_PASSWORD, E2E_USERNAME, SESSION_SEED_FILE, STORAGE_STATE_FILE } from './helpers/env';

/**
 * E2E global setup：用 admin 账号真实登录后端，生成 storageState 与会话种子。
 *
 * 解决 storageState.json 内 token 过期后整批用例跳登录的问题：每次运行前
 * 自动刷新，token 过期可自愈。仅作用于测试夹具，不触碰业务代码。
 */

const USERNAME = E2E_USERNAME;
const PASSWORD = E2E_PASSWORD;

const LOGIN_CANDIDATES = [
  '/api/core/iam/auth/login',
  '/api/core/iam/v1/auth/login',
  '/api/iam/auth/login',
  '/api/auth/login',
];

type ApiCookie = Awaited<ReturnType<APIRequestContext['storageState']>>['cookies'];

function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    const part = token.split('.')[1] ?? '';
    const normalized = part.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(Buffer.from(normalized, 'base64').toString('utf8')) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export default async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL =
    (config.projects[0]?.use?.baseURL as string | undefined) ?? 'http://localhost:8063';
  const apiBaseURL =
    process.env.API_BASE_URL ??
    (config.metadata?.apiBaseUrl as string | undefined) ??
    'http://localhost:8080';

  const ctx = await request.newContext();
  let payload: Record<string, unknown> | undefined;
  let cookies: ApiCookie = [];
  let lastError = 'no candidate responded';

  try {
    for (const candidate of LOGIN_CANDIDATES) {
      const res = await ctx.post(`${apiBaseURL}${candidate}`, {
        data: { username: USERNAME, password: PASSWORD },
      });
      if (res.status() === 404) {
        lastError = `404 at ${candidate}`;
        continue;
      }
      if (!res.ok()) {
        throw new Error(
          `[E2E] 登录失败（${res.status()}）@ ${apiBaseURL}${candidate}：` +
            `${(await res.text()).slice(0, 300)}。请确认后端已启动，且 E2E_USERNAME/E2E_PASSWORD 可用。`
        );
      }
      const body = (await res.json()) as { success?: boolean; data?: Record<string, unknown> };
      payload = (body.data ?? body) as Record<string, unknown>;
      // 登录可能写入 HttpOnly refresh_token Cookie
      cookies = (await ctx.storageState()).cookies;
      lastError = '';
      break;
    }
  } finally {
    await ctx.dispose();
  }

  if (!payload || !payload.access_token) {
    throw new Error(`[E2E] 无法获取 access_token：${lastError}`);
  }

  const token = String(payload.access_token);
  const claims = decodeJwtPayload(token);
  const expiresIn = Number(payload.expires_in ?? 0);
  const tokenExpiry =
    expiresIn > 0
      ? Date.now() + expiresIn * 1000
      : Number(claims.exp ?? 0) * 1000 || Date.now() + 3600_000;

  const apiUser = (payload.user ?? {}) as Record<string, unknown>;
  const user: Record<string, unknown> = {
    id: apiUser.id ?? claims.sub ?? '',
    username: apiUser.username ?? USERNAME,
    tenant_id: apiUser.tenant_id ?? claims.tenant_id ?? 'default',
    roles: apiUser.roles ?? claims.roles ?? ['admin'],
    is_superuser: apiUser.is_superuser ?? claims.is_superuser ?? true,
  };
  const roles =
    (apiUser.roles as string[] | undefined) ??
    (claims.roles as string[] | undefined) ??
    ['admin'];
  const permissions =
    (apiUser.permissions as string[] | undefined) ??
    (claims.permissions as string[] | undefined) ??
    ['*'];
  const tenantId = String(user.tenant_id ?? 'default');

  const localStorageEntries = [
    { name: 'token', value: token },
    { name: 'refresh_token', value: String(payload.refresh_token ?? '') },
    { name: 'user', value: JSON.stringify(user) },
    { name: 'roles', value: JSON.stringify(roles) },
    { name: 'permissions', value: JSON.stringify(permissions) },
    { name: 'token_expiry', value: String(tokenExpiry) },
    { name: 'current_tenant_id', value: tenantId },
  ].filter((entry) => entry.value !== '');

  const storageState = {
    cookies,
    origins: [{ origin: baseURL, localStorage: localStorageEntries }],
  };

  // 路径统一来自 helpers/env.ts（绝对路径，与 config.storageState 及 helpers/session.ts 完全一致）
  fs.mkdirSync(AUTH_DIR, { recursive: true });
  fs.writeFileSync(STORAGE_STATE_FILE, JSON.stringify(storageState, null, 2));
  fs.writeFileSync(
    SESSION_SEED_FILE,
    JSON.stringify(
      {
        token,
        refreshToken: String(payload.refresh_token ?? ''),
        user,
        roles,
        permissions,
        tenantId,
        tokenExpiry,
      },
      null,
      2
    )
  );

  console.log(
    `[E2E] global setup 已刷新登录会话：${USERNAME} @ ${apiBaseURL}（expiry=${tokenExpiry}）`
  );
}
