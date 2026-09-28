import { test, expect } from '@playwright/test';

test.describe('WMS库存管理', () => {
  test.beforeEach(async ({ page }) => {
    // 先登录
    await page.goto('/login');
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');

    // 跳转到WMS库存页面
    await page.goto('/wms/inventory');
  });

  test('应该显示WMS库存页面', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('库存管理');
    await expect(page.locator('table')).toBeVisible();
  });

  test('应该能够搜索库存', async ({ page }) => {
    await page.fill('input[placeholder="搜索物料"]', '原材料');
    await page.click('button:has-text("搜索")');
    await expect(page.locator('table tbody tr').first()).toBeVisible();
  });
});
