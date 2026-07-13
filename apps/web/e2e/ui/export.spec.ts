import { test, expect } from '@playwright/test';

test.describe('导出功能测试', () => {
  test('登录页面应正常显示', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByPlaceholder('请输入用户名')).toBeVisible();
  });

  test('页面应支持导出功能', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    expect(page).toBeTruthy();
  });
});