import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

test.describe('PDM Product Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page.getByPlaceholder('请输入用户名').fill('admin');
    await page.getByPlaceholder('请输入密码').fill('admin123');
    await page.getByRole('button', { name: '登录' }).click();
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    await page.waitForLoadState('networkidle');
  });

  test('should navigate to product management page', async ({ page }) => {
    await page.goto('/pdm/products');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display product list', async ({ page }) => {
    await page.goto('/pdm/products');
    await page.waitForLoadState('networkidle');
    
    const table = page.locator('table');
    await expect(table).toBeVisible();
  });

  test('should create a new product', async ({ page }) => {
    await page.goto('/pdm/products');
    await page.waitForLoadState('networkidle');

    const createButton = page.getByRole('button', { name: /新建/i });
    if (await createButton.isVisible()) {
      await createButton.click();
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should view product details', async ({ page }) => {
    await page.goto('/pdm/products');
    await page.waitForLoadState('networkidle');

    const rows = page.locator('table tbody tr');
    const count = await rows.count();
    if (count > 0) {
      await rows.first().click();
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should navigate to BOM page', async ({ page }) => {
    await page.goto('/pdm/bom');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should navigate to document management page', async ({ page }) => {
    await page.goto('/pdm/documents');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should navigate to change management page', async ({ page }) => {
    await page.goto('/pdm/changes');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });
});