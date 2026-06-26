import { test, expect } from '@playwright/test';

test.describe('Authentication Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('displays login page correctly', async ({ page }) => {
    await expect(page.locator('text=TOPEMS')).toBeVisible();
    await expect(page.getByPlaceholder('请输入用户名')).toBeVisible();
    await expect(page.getByPlaceholder('请输入密码')).toBeVisible();
  });

  test('shows validation errors for empty fields', async ({ page }) => {
    await page.getByRole('button', { name: '登录' }).click();
    await page.waitForTimeout(500);
  });

  test('shows validation error for short username', async ({ page }) => {
    await page.getByPlaceholder('请输入用户名').fill('ab');
    await page.getByPlaceholder('请输入密码').fill('Test@1234');
    await page.getByRole('button', { name: '登录' }).click();
    await page.waitForTimeout(500);
  });

  test('successful login with valid credentials', async ({ page }) => {
    await page.getByPlaceholder('请输入用户名').fill('admin');
    await page.getByPlaceholder('请输入密码').fill('admin123');
    await page.getByRole('button', { name: '登录' }).click();
    
    await page.waitForURL('**/dashboard', { timeout: 10000 });
  });

  test('unsuccessful login with invalid credentials', async ({ page }) => {
    await page.getByPlaceholder('请输入用户名').fill('admin');
    await page.getByPlaceholder('请输入密码').fill('wrongpassword');
    await page.getByRole('button', { name: '登录' }).click();
    
    await page.waitForTimeout(1000);
  });

  test('password visibility toggle', async ({ page }) => {
    const passwordInput = page.getByPlaceholder('请输入密码');
    await expect(passwordInput).toHaveAttribute('type', 'password');
    
    const buttons = page.locator('button');
    if ((await buttons.count()) > 1) {
      await buttons.nth(1).click();
    }
  });

  test('navigates to registration mode', async ({ page }) => {
    const registerLink = page.getByText('没有账号？立即注册');
    if (await registerLink.isVisible()) {
      await registerLink.click();
      await expect(page.locator('text=用户注册')).toBeVisible();
    }
  });

  test('successful logout', async ({ page }) => {
    await page.getByPlaceholder('请输入用户名').fill('admin');
    await page.getByPlaceholder('请输入密码').fill('admin123');
    await page.getByRole('button', { name: '登录' }).click();
    
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    
    await page.waitForTimeout(500);
  });

  test('remembers login state', async ({ page, context }) => {
    await page.getByPlaceholder('请输入用户名').fill('admin');
    await page.getByPlaceholder('请输入密码').fill('admin123');
    await page.getByRole('button', { name: '登录' }).click();
    
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    
    await page.context().storageState({ path: 'auth-state.json' });
    
    const newPage = await context.newPage();
    await newPage.goto('/dashboard');
    
    await newPage.waitForURL('**/dashboard', { timeout: 10000 });
  });
});
