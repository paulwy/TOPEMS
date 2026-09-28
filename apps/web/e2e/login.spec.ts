import { test, expect } from '@playwright/test';

test.describe('登录流程', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('应该显示登录页面', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('登录');
    await expect(page.locator('input[name="username"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toContainText('登录');
  });

  test('应该能够使用正确的账号密码登录', async ({ page }) => {
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');

    // 等待跳转到首页
    await page.waitForURL('/');
    await expect(page.locator('h1')).toContainText('首页');
  });

  test('应该显示错误提示当账号密码错误', async ({ page }) => {
    await page.fill('input[name="username"]', 'wrong');
    await page.fill('input[name="password"]', 'wrong');
    await page.click('button[type="submit"]');

    await expect(page.locator('.ant-message-error')).toContainText('账号或密码错误');
  });
});
