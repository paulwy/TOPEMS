import { test, expect } from '@playwright/test';

test.describe('Authentication Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('displays login page correctly', async ({ page }) => {
    await expect(page.locator('text=TOPEMS')).toBeVisible();
    await expect(page.locator('text=用户登录')).toBeVisible();
    await expect(page.getByPlaceholder('请输入用户名')).toBeVisible();
    await expect(page.getByPlaceholder('请输入密码')).toBeVisible();
  });

  test('shows validation errors for empty fields', async ({ page }) => {
    await page.getByRole('button', { name: '登录' }).click();
    
    await expect(page.locator('text=用户名不能为空')).toBeVisible();
    await expect(page.locator('text=密码不能为空')).toBeVisible();
  });

  test('shows validation error for short username', async ({ page }) => {
    await page.getByPlaceholder('请输入用户名').fill('ab');
    await page.getByPlaceholder('请输入密码').fill('Test@1234');
    await page.getByRole('button', { name: '登录' }).click();
    
    await expect(page.locator('text=用户名至少需要6个字符')).toBeVisible();
  });

  test('successful login with valid credentials', async ({ page }) => {
    await page.getByPlaceholder('请输入用户名').fill('admin');
    await page.getByPlaceholder('请输入密码').fill('admin123');
    await page.getByRole('button', { name: '登录' }).click();
    
    await page.waitForURL('**/dashboard');
    await expect(page.locator('text=仪表盘')).toBeVisible();
  });

  test('unsuccessful login with invalid credentials', async ({ page }) => {
    await page.getByPlaceholder('请输入用户名').fill('admin');
    await page.getByPlaceholder('请输入密码').fill('wrongpassword');
    await page.getByRole('button', { name: '登录' }).click();
    
    await expect(page.locator('text=/错误|失败|invalid/i')).toBeVisible({ timeout: 5000 });
  });

  test('password visibility toggle', async ({ page }) => {
    const passwordInput = page.getByPlaceholder('请输入密码');
    await expect(passwordInput).toHaveAttribute('type', 'password');
    
    await page.locator('button').nth(1).click();
    
    await expect(passwordInput).toHaveAttribute('type', 'text');
  });

  test('navigates to registration mode', async ({ page }) => {
    await page.getByText('没有账号？立即注册').click();
    
    await expect(page.locator('text=用户注册')).toBeVisible();
    await expect(page.getByPlaceholder('请输入邮箱')).toBeVisible();
    await expect(page.getByRole('button', { name: '注册' })).toBeVisible();
  });

  test('successful logout', async ({ page }) => {
    await page.getByPlaceholder('请输入用户名').fill('admin');
    await page.getByPlaceholder('请输入密码').fill('admin123');
    await page.getByRole('button', { name: '登录' }).click();
    
    await page.waitForURL('**/dashboard');
    
    await page.getByText('退出登录').click();
    
    await expect(page).toHaveURL(/\/login/);
  });

  test('remembers login state', async ({ page, context }) => {
    await page.getByPlaceholder('请输入用户名').fill('admin');
    await page.getByPlaceholder('请输入密码').fill('admin123');
    await page.getByRole('button', { name: '登录' }).click();
    
    await page.waitForURL('**/dashboard');
    
    await page.context().storageState({ path: 'auth-state.json' });
    
    const newPage = await context.newPage();
    await newPage.goto('/dashboard');
    
    await expect(newPage.locator('text=仪表盘')).toBeVisible({ timeout: 5000 });
  });
});
