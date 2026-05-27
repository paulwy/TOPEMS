import { test, expect } from '@playwright/test';

test.describe('Navigation Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('请输入用户名').fill('admin');
    await page.getByPlaceholder('请输入密码').fill('admin123');
    await page.getByRole('button', { name: '登录' }).click();
    await page.waitForURL('**/dashboard');
  });

  test('sidebar navigation menu is visible', async ({ page }) => {
    await expect(page.locator('text=RS研发')).toBeVisible();
    await expect(page.locator('text=LIMS质检')).toBeVisible();
    await expect(page.locator('text=QMS质量管理')).toBeVisible();
  });

  test('navigates to RS page', async ({ page }) => {
    await page.locator('text=RS研发').first().click();
    await page.waitForURL('**/rs');
    await expect(page.locator('text=/研发|R&D/i')).toBeVisible();
  });

  test('navigates to LIMS page', async ({ page }) => {
    await page.locator('text=LIMS质检').first().click();
    await page.waitForURL('**/lims');
    await expect(page.locator('text=/质检|质量/i')).toBeVisible();
  });

  test('navigates to QMS page', async ({ page }) => {
    await page.locator('text=QMS质量管理').first().click();
    await page.waitForURL('**/qms');
    await expect(page.locator('text=/质量|QMS/i')).toBeVisible();
  });

  test('navigates back to dashboard', async ({ page }) => {
    await page.locator('text=RS研发').first().click();
    await page.waitForURL('**/rs');
    
    await page.locator('text=仪表盘').first().click();
    await page.waitForURL('**/dashboard');
    
    await expect(page.locator('text=仪表盘')).toBeVisible();
  });

  test('breadcrumb navigation', async ({ page }) => {
    await page.locator('text=RS研发').first().click();
    await page.waitForURL('**/rs');
    
    await expect(page.locator('text=/首页.*研发/i')).toBeVisible();
  });

  test('mobile navigation menu', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.locator('[class*="mobile"]').click();
    
    await expect(page.locator('text=RS研发')).toBeVisible();
    await expect(page.locator('text=LIMS质检')).toBeVisible();
  });

  test('keyboard navigation', async ({ page }) => {
    await page.keyboard.press('Alt+1');
    
    await expect(page.locator('text=仪表盘')).toBeVisible();
  });
});
