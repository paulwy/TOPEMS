import { Page, BrowserContext, Browser, expect } from '@playwright/test';

const DEFAULT_USERNAME = process.env.E2E_USERNAME ?? 'admin';
const DEFAULT_PASSWORD = process.env.E2E_PASSWORD ?? 'admin123';

export const TEST_USERS = {
  admin: {
    username: DEFAULT_USERNAME,
    password: DEFAULT_PASSWORD,
    tenantId: 'default',
  },
  operator: {
    username: process.env.E2E_OPERATOR_USER ?? 'operator',
    password: process.env.E2E_OPERATOR_PASS ?? 'operator123',
    tenantId: 'default',
  },
} as const;

export type TestUserKey = keyof typeof TEST_USERS;
export type TestUser = (typeof TEST_USERS)[TestUserKey];

/**
 * Login via the web login page.
 *
 * Navigates to /login, fills the form, submits, and waits for the dashboard
 * to load. Saves storage state automatically when the context persists.
 */
export async function loginViaUi(
  page: Page,
  user: TestUser = TEST_USERS.admin
): Promise<void> {
  await page.goto('/login', { waitUntil: 'networkidle' });
  await page.getByLabel(/用户名|username|账号/i).fill(user.username);
  await page.getByLabel(/密码|password/i).fill(user.password);
  await page.getByLabel(/租户|tenant/i).fill(user.tenantId);
  await page.getByRole('button', { name: /登录|login|sign in/i }).click();
  await expect(page).toHaveURL(/\/(dashboard|home|portal)/i, { timeout: 30_000 });
}

/**
 * Build an authenticated storage state by logging in.
 * Used to skip login in subsequent tests (e.g. via `test.use({ storageState })`).
 */
export async function buildAuthenticatedContext(
  browser: Browser,
  user: TestUser = TEST_USERS.admin,
  baseURL: string
): Promise<{ storageState: string; cleanup: () => Promise<void> }> {
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();
  await loginViaUi(page, user);
  const storageState = await context.storageState();
  await context.close();
  return {
    storageState: JSON.stringify(storageState),
    cleanup: async () => {
      // storageState is in-memory; nothing extra to clean up
    },
  };
}

/**
 * Clears all cookies and local storage to reset the session.
 */
export async function logout(context: BrowserContext): Promise<void> {
  await context.clearCookies();
  await context.clearPermissions();
  // 清除 localStorage / sessionStorage（需要先有页面打开）
  for (const page of context.pages()) {
    await page.evaluate(() => {
      try { localStorage.clear(); } catch { /* ignore */ }
      try { sessionStorage.clear(); } catch { /* ignore */ }
    }).catch(() => { /* page may be closed */ });
  }
}

/**
 * Returns true if the user is currently authenticated.
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  const url = page.url();
  if (/\/(dashboard|home|portal|workspace)/i.test(url)) {
    return true;
  }
  // Best-effort probe: look for a user avatar / logout button
  const logoutVisible = await page
    .getByRole('button', { name: /logout|退出|登出/i })
    .first()
    .isVisible()
    .catch(() => false);
  return logoutVisible;
}
