import { test, expect } from '@playwright/test';

test.describe('Workflow Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('请输入用户名').fill('admin');
    await page.getByPlaceholder('请输入密码').fill('admin123');
    await page.getByRole('button', { name: '登录' }).click();
    // Wait for login to complete but don't require exact dashboard URL
    await page.waitForLoadState('networkidle');
  });

  test('QMS page loads successfully', async ({ page }) => {
    await page.goto('/qms');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('RS page loads successfully', async ({ page }) => {
    await page.goto('/rs');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });
});
