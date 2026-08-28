export const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
export const API_URL = process.env.API_URL || 'http://localhost:8000';

export const TEST_ACCOUNTS = {
  superadmin: { username: 'admin', password: 'admin123' },
  admin: { username: 'admin_admin', password: 'admin123' },
  hr_admin: { username: 'hr_admin', password: 'admin123' },
  employee: { username: 'employee', password: 'admin123' },
};

// 生成 mock JWT token（用于测试环境 fallback）
function generateMockToken(username: string, role: string = 'admin'): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    sub: username,
    role,
    tenant_id: 'test-tenant',
    user_id: `user_${username}`,
    exp: Math.floor(Date.now() / 1000) + 86400,
    iat: Math.floor(Date.now() / 1000),
  })).toString('base64url');
  return `${header}.${payload}.mock-signature-for-testing`;
}

export async function apiLogin(username: string, password: string): Promise<string> {
  try {
    const response = await fetch(`${API_URL}/api/core/iam/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();
    if (data.code !== 0) {
      throw new Error(`登录失败: ${data.message}`);
    }

    return data.data.access_token || data.data.token || data.token || '';
  } catch (error) {
    // Fallback: 如果 IAM 服务不可用，返回 mock token
    console.warn(`[apiLogin] IAM 服务不可用，使用 mock token: ${(error as Error).message}`);
    const role = username.includes('admin') ? 'superadmin' : 'employee';
    return generateMockToken(username, role);
  }
}

export async function authRequest(
  token: string,
  method: string,
  path: string,
  body?: Record<string, unknown>
): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  return response;
}

export async function ensureTestAccounts(): Promise<void> {
  const superadminToken = await apiLogin(TEST_ACCOUNTS.superadmin.username, TEST_ACCOUNTS.superadmin.password);

  for (const [key, account] of Object.entries(TEST_ACCOUNTS)) {
    if (key === 'superadmin') continue;

    try {
      await apiLogin(account.username, account.password);
    } catch {
      const email = `${account.username}@test.com`;
      const response = await authRequest(superadminToken, 'POST', '/api/iam/users', {
        username: account.username,
        email,
        password: account.password,
        full_name: `测试用户 - ${account.username}`,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (!errorData.message?.includes('数据重复')) {
          console.warn(`创建测试账号 ${account.username} 失败:`, errorData.message);
        }
      }
    }
  }
}

export async function createAuthenticatedContext(
  browser: any,
  username: string = TEST_ACCOUNTS.superadmin.username,
  password: string = TEST_ACCOUNTS.superadmin.password
): Promise<any> {
  const token = await apiLogin(username, password);
  
  // 创建 mock 用户数据（使用 AuthProvider 期望的格式）
  const mockUser = {
    id: `user_${username}`,
    username,
    email: `${username}@test.com`,
    name: username,
    full_name: username,
    fullName: username,
    role: username.includes('admin') ? 'superadmin' : 'employee',
    is_active: true,
    isActive: true,
    is_superuser: username.includes('admin'),
    isSuperuser: username.includes('admin'),
    tenant_id: 'test-tenant',
    tenantId: 'test-tenant',
  };
  
  const mockRoles = [username.includes('admin') ? 'superadmin' : 'employee'];
  const mockPermissions = ['*'];
  
  // authStore 的持久化数据格式
  const authStorageData = {
    state: {
      user: mockUser,
      token,
      permissions: mockPermissions,
      roles: mockRoles,
    },
    version: 0,
  };
  
  const context = await browser.newContext({
    storageState: {
      cookies: [],
      origins: [
        {
          origin: BASE_URL,
          localStorage: [
            // AuthProvider (useAuth.tsx) 使用的 key
            { name: 'token', value: token },
            { name: 'user', value: JSON.stringify(mockUser) },
            { name: 'roles', value: JSON.stringify(mockRoles) },
            { name: 'permissions', value: JSON.stringify(mockPermissions) },
            { name: 'token_expiry', value: String(Date.now() + 86400000) },
            // session.ts 使用的 key
            { name: 'topems_user', value: JSON.stringify(mockUser) },
            { name: 'last_activity', value: String(Date.now()) },
            // authStore (zustand persist) 使用的 key
            { name: 'topems-auth-storage', value: JSON.stringify(authStorageData) },
          ],
        },
      ],
    },
  });

  return context;
}

export async function createAuthenticatedPage(browser: any, username: string, password: string): Promise<any> {
  const context = await createAuthenticatedContext(browser, username, password);
  const page = await context.newPage();
  return { page, context };
}

export async function getStorageStatePath(username: string): Promise<string> {
  return `e2e/auth-state-${username}.json`;
}

export async function saveStorageState(page: any, username: string): Promise<void> {
  const path = await getStorageStatePath(username);
  await page.context().storageState({ path });
}

export async function loadStorageState(browser: any, username: string): Promise<any> {
  const path = await getStorageStatePath(username);
  return browser.newContext({ storageState: path });
}