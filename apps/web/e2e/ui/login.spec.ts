import { test, expect } from '@playwright/test';
import { TEST_ACCOUNTS, createAuthenticatedContext } from '../utils/testUtils';

test.describe('Login Page Tests', () => {
  test('should display login page and handle validation', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByText('TOPEMS')).toBeVisible();
    await expect(page.getByPlaceholder('请输入用户名')).toBeVisible();
    await expect(page.getByPlaceholder('请输入密码')).toBeVisible();
    await expect(page.getByTestId('login-submit')).toBeVisible();

    await page.getByTestId('login-submit').click();
    // 空提交：旧 aria-invalid 断言已过时（新 LoginPage 空提交不再标红），保留页面未跳转校验
    await expect(page.getByTestId('login-submit')).toBeVisible();

    await page.getByPlaceholder('请输入用户名').fill('admin');
    await page.getByPlaceholder('请输入密码').fill('123');
    await page.getByTestId('login-submit').click();
    // 错误凭证：新 LoginPage 不再给输入框标 aria-invalid，校验失败页面不跳转
    await expect(page.getByTestId('login-submit')).toBeVisible();

    const passwordInput = page.getByPlaceholder('请输入密码');
    await expect(passwordInput).toHaveAttribute('type', 'password');
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    if (buttonCount > 1) {
      await buttons.nth(1).click();
    }

    await page.getByText('没有账号？立即注册').click();
    await expect(page.locator('text=用户注册')).toBeVisible();
  });

  test('should fail login with invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    await page.getByPlaceholder('请输入用户名').fill('admin');
    await page.getByPlaceholder('请输入密码').fill('wrongpassword');
    await page.getByTestId('login-submit').click();
    await expect(page).toHaveURL(/login/);
  });
});

test.describe('Login Flow Tests', () => {
  test('should login successfully with valid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    
    await page.getByPlaceholder('请输入用户名').fill('test_admin');
    await page.getByPlaceholder('请输入密码').fill('admin123');
    await page.getByTestId('login-submit').click();
    
    await page.waitForURL('**/dashboard', { timeout: 30000 });
    await expect(page).toHaveURL(/dashboard/);
  });

  test('should remember login state', async ({ browser }) => {
    const context = await createAuthenticatedContext(
      browser, 
      TEST_ACCOUNTS.superadmin.username, 
      TEST_ACCOUNTS.superadmin.password
    );
    
    const page = await context.newPage();
    await page.goto('/dashboard');
    await page.waitForURL('**/dashboard', { timeout: 30000 });
    await expect(page).toHaveURL(/dashboard/);
    
    await page.close();
    await context.close();
  });
});