export const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
export const API_URL = process.env.API_URL || 'http://localhost:8000';

export const TEST_ACCOUNTS = {
  superadmin: { username: 'admin', password: 'admin123' },
  admin: { username: 'admin_admin', password: 'admin123' },
  hr_admin: { username: 'hr_admin', password: 'admin123' },
  employee: { username: 'employee', password: 'admin123' },
};

export async function apiLogin(username: string, password: string): Promise<string> {
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

export async function createAuthenticatedContext(browser: any, username: string, password: string): Promise<any> {
  const token = await apiLogin(username, password);
  
  const context = await browser.newContext({
    storageState: {
      cookies: [],
      origins: [
        {
          origin: BASE_URL,
          localStorage: [
            { name: 'token', value: token },
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