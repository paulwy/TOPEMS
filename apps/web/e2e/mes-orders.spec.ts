import { test, expect } from '@playwright/test';

test.describe('MES生产订单列表', () => {
  test.beforeEach(async ({ page }) => {
    // 先登录
    await page.goto('/login');
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');

    // 跳转到MES订单列表
    await page.goto('/mes/orders');
  });

  test('应该显示MES订单列表页面', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('生产订单');
    await expect(page.locator('table')).toBeVisible();
  });

  test('应该能够搜索订单', async ({ page }) => {
    await page.fill('input[placeholder="搜索"]', 'PO-');
    await page.click('button:has-text("搜索")');
    await expect(page.locator('table tbody tr').first()).toBeVisible();
  });

  test('应该能够创建新订单', async ({ page }) => {
    await page.click('button:has-text("新建订单")');
    await expect(page.locator('.ant-modal')).toBeVisible();
    await expect(page.locator('.ant-modal h2')).toContainText('新建生产订单');
  });
});
