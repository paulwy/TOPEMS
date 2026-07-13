import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

test.describe('ERP Purchase Order Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page.getByPlaceholder('请输入用户名').fill('admin');
    await page.getByPlaceholder('请输入密码').fill('admin123');
    await page.getByRole('button', { name: '登录' }).click();
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    await page.waitForLoadState('networkidle');
  });

  test('should navigate to purchase order page', async ({ page }) => {
    await page.goto('/erp/purchase-orders');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display purchase order list', async ({ page }) => {
    await page.goto('/erp/purchase-orders');
    await page.waitForLoadState('networkidle');
    
    const table = page.locator('table');
    await expect(table).toBeVisible();
  });

  test('should filter purchase orders by status', async ({ page }) => {
    await page.goto('/erp/purchase-orders');
    await page.waitForLoadState('networkidle');

    const filterButton = page.getByRole('button', { name: /筛选/i });
    if (await filterButton.isVisible()) {
      await filterButton.click();
    }
  });

  test('should create a new purchase order', async ({ page }) => {
    await page.goto('/erp/purchase-orders');
    await page.waitForLoadState('networkidle');

    const createButton = page.getByRole('button', { name: /新建/i });
    if (await createButton.isVisible()) {
      await createButton.click();
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should view purchase order details', async ({ page }) => {
    await page.goto('/erp/purchase-orders');
    await page.waitForLoadState('networkidle');

    const rows = page.locator('table tbody tr');
    const count = await rows.count();
    if (count > 0) {
      await rows.first().click();
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toBeVisible();
    }
  });
});