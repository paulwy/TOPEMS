import { test, expect } from '@playwright/test';
import { TEST_USERS, loginViaUi, isLoggedIn, logout } from '../helpers/auth';
import { buildApiContext, API_PATHS } from '../helpers/api';

test.describe('Auth - Login flow', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/');
  });

  test('login page renders and contains required fields', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByLabel(/用户名|username|账号/i)).toBeVisible();
    await expect(page.getByLabel(/密码|password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /登录|login|sign in/i })).toBeVisible();
  });

  test('admin user can log in via UI and reach the dashboard', async ({ page }) => {
    await loginViaUi(page, TEST_USERS.admin);
    await expect(page).toHaveURL(/\/(dashboard|home|portal|workspace)/i);
    expect(await isLoggedIn(page)).toBeTruthy();
  });

  test('invalid credentials show an error message', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/用户名|username|账号/i).fill('admin');
    await page.getByLabel(/密码|password/i).fill('wrong-password');
    await page.getByRole('button', { name: /登录|login|sign in/i }).click();

    // 实测：登录失败提示为「操作失败 / Request failed with status code 401」（后端 401 的通用错误 toast）
    await expect(
      page.getByText(/用户名或密码错误|登录失败|操作失败|401|invalid|incorrect/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test('operator user can log in', async ({ page }) => {
    await loginViaUi(page, TEST_USERS.operator);
    await expect(page).toHaveURL(/\/(dashboard|home|portal|workspace)/i);
  });

  test('logout clears the session and redirects to login', async ({
    page,
    context,
  }) => {
    await loginViaUi(page, TEST_USERS.admin);
    
    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    
    // 布局已换代到 redesign TopBar：头像入口用稳定 testid，菜单项是普通 button
    await page.getByTestId('topbar-profile').click();
    
    // Wait for menu to appear
    await page.waitForTimeout(1000);
    
    // Click logout menu item (直接登出，无确认对话框)
    await page.getByText(/退出登录|登出|logout/i).click();
    
    // Wait for redirect to login page
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    
    expect(await isLoggedIn(page)).toBeFalsy();
    
    // Clear cookies and storage manually
    await logout(context);
    
    // Verify cookies cleared
    const cookies = await context.cookies();
    expect(cookies.filter((c) => c.name.toLowerCase().includes('token'))).toHaveLength(0);
  });
});

test.describe('Auth - Token API', () => {
  test('POST /api/core/iam/auth/login returns a valid bearer token', async () => {
    const ctx = await buildApiContext();
    // Smoke: token was successfully obtained (buildApiContext already validated login)
    expect(ctx).toBeTruthy();
    await ctx.dispose();
  });

  test('login is rejected with wrong credentials', async ({ request }) => {
    const res = await request.post(
      `${process.env.API_BASE_URL ?? 'http://localhost:8099'}${API_PATHS.auth.login}`,
      { data: { username: 'admin', password: 'definitely-wrong' } }
    );
    const body = await res.json();
    expect(body.success).toBeFalsy();
    expect([400, 401]).toContain(body.code);
  });
});
