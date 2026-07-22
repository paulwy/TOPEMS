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

    // Either an inline error appears or we stay on /login
    await expect(page).toHaveURL(/\/login/);
    const errorVisible = await page
      .getByText(/登录失败|invalid|incorrect|错误|账号或密码/i)
      .first()
      .isVisible()
      .catch(() => false);
    expect(errorVisible).toBeTruthy();
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
    // Click on the user menu / logout button
    const logoutButton = page
      .getByRole('button', { name: /退出|登出|logout|sign out/i })
      .first();
    await logoutButton.click();
    await expect(page).toHaveURL(/\/login/);
    expect(await isLoggedIn(page)).toBeFalsy();
    // Cookies cleared
    const cookies = await context.cookies();
    expect(cookies.filter((c) => c.name.toLowerCase().includes('token'))).toHaveLength(0);
    await logout(context);
  });
});

test.describe('Auth - Token API', () => {
  test('POST /api/core/iam/auth/login returns a valid bearer token', async () => {
    const ctx = await buildApiContext();
    // Smoke: hit a protected endpoint with the token
    const me = await ctx.get(API_PATHS.auth.me);
    expect(me.ok(), `GET /me -> ${me.status()}`).toBeTruthy();
    await ctx.dispose();
  });

  test('login is rejected with wrong credentials', async ({ request }) => {
    const res = await request.post(
      `${process.env.API_BASE_URL ?? 'http://localhost:8080'}${API_PATHS.auth.login}`,
      { data: { username: 'admin', password: 'definitely-wrong' } }
    );
    expect([400, 401]).toContain(res.status());
  });
});
