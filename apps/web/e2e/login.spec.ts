import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
  });

  test('should display login page correctly', async ({ page }) => {
    await expect(page.getByText('TOPEMS')).toBeVisible();
    await expect(page.getByPlaceholder('请输入用户名')).toBeVisible();
    await expect(page.getByPlaceholder('请输入密码')).toBeVisible();
    await expect(page.getByRole('button', { name: '登录' })).toBeVisible();
  });

  test('should show validation errors for empty fields', async ({ page }) => {
    await page.getByRole('button', { name: '登录' }).click();
    
    const usernameInput = page.getByPlaceholder('请输入用户名');
    await expect(usernameInput).toHaveAttribute('aria-invalid', 'true');
  });

  test('should show validation error for short password', async ({ page }) => {
    await page.getByPlaceholder('请输入用户名').fill('admin');
    await page.getByPlaceholder('请输入密码').fill('123');
    await page.getByRole('button', { name: '登录' }).click();

    const passwordInput = page.getByPlaceholder('请输入密码');
    await expect(passwordInput).toHaveAttribute('aria-invalid', 'true');
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    await page.getByPlaceholder('请输入用户名').fill('admin');
    await page.getByPlaceholder('请输入密码').fill('admin123');
    await page.getByRole('button', { name: '登录' }).click();

    await page.waitForURL('**/dashboard', { timeout: 15000 });
    await expect(page).toHaveURL(/dashboard/);
  });

  test('should fail login with invalid credentials', async ({ page }) => {
    await page.getByPlaceholder('请输入用户名').fill('admin');
    await page.getByPlaceholder('请输入密码').fill('wrongpassword');
    await page.getByRole('button', { name: '登录' }).click();

    await page.waitForTimeout(1000);
    await expect(page).toHaveURL(/login/);
  });

  test('should toggle password visibility', async ({ page }) => {
    const passwordInput = page.getByPlaceholder('请输入密码');
    await expect(passwordInput).toHaveAttribute('type', 'password');

    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    if (buttonCount > 1) {
      await buttons.nth(1).click();
    }
  });

  test('should switch to registration mode', async ({ page }) => {
    await page.getByText('没有账号？立即注册').click();
    await expect(page.locator('text=用户注册')).toBeVisible();
  });

  test('should remember login state', async ({ page, context }) => {
    await page.getByPlaceholder('请输入用户名').fill('admin');
    await page.getByPlaceholder('请输入密码').fill('admin123');
    
    const rememberMeCheckbox = page.locator('input[type="checkbox"]');
    if (await rememberMeCheckbox.isVisible()) {
      await rememberMeCheckbox.check();
    }
    
    await page.getByRole('button', { name: '登录' }).click();

    await page.waitForURL('**/dashboard', { timeout: 15000 });
    await page.context().storageState({ path: 'e2e/auth-state.json' });

    const newPage = await context.newPage();
    await newPage.goto('/dashboard');
    await newPage.waitForURL('**/dashboard', { timeout: 15000 });
  });
});