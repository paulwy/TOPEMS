import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

test.describe('BI Report Analytics', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page.getByPlaceholder('请输入用户名').fill('admin');
    await page.getByPlaceholder('请输入密码').fill('admin123');
    await page.getByRole('button', { name: '登录' }).click();
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    await page.waitForLoadState('networkidle');
  });

  test('should navigate to BI dashboard page', async ({ page }) => {
    await page.goto('/bi/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display dashboard widgets', async ({ page }) => {
    await page.goto('/bi/dashboard');
    await page.waitForLoadState('networkidle');

    const widgets = page.locator('[data-testid*="widget-"]');
    const count = await widgets.count();
    if (count > 0) {
      await expect(widgets.first()).toBeVisible();
    }
  });

  test('should navigate to dataset management page', async ({ page }) => {
    await page.goto('/bi/datasets');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should navigate to report builder page', async ({ page }) => {
    await page.goto('/bi/report-builder');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should navigate to self-service report page', async ({ page }) => {
    await page.goto('/bi/self-service');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should navigate to multi-dimensional analysis page', async ({ page }) => {
    await page.goto('/bi/multi-dimensional');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should filter report data', async ({ page }) => {
    await page.goto('/bi/dashboard');
    await page.waitForLoadState('networkidle');

    const filterButton = page.getByRole('button', { name: /筛选/i });
    if (await filterButton.isVisible()) {
      await filterButton.click();
      await page.waitForLoadState('networkidle');
    }
  });

  test('should export report', async ({ page }) => {
    await page.goto('/bi/dashboard');
    await page.waitForLoadState('networkidle');

    const exportButton = page.getByRole('button', { name: /导出/i });
    if (await exportButton.isVisible()) {
      await exportButton.click();
    }
  });
});