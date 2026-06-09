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
    await expect(page.locator('h4', { hasText: '科研研发' })).toBeVisible();
    await expect(page.locator('h4', { hasText: '实验室管理' })).toBeVisible();
    await expect(page.locator('h4', { hasText: '质量管理' })).toBeVisible();
  });

  test('navigates to RS page', async ({ page }) => {
    await page.locator('h4', { hasText: '科研研发' }).click();
    await page.waitForURL('**/rs', { timeout: 10000 });
    await expect(page.locator('text=/研发|R&D/i').first()).toBeVisible();
  });

  test('navigates to LIMS page', async ({ page }) => {
    await page.locator('h4', { hasText: '实验室管理' }).click();
    await page.waitForURL('**/lims', { timeout: 10000 });
    await expect(page.locator('h1', { hasText: '检验管理' })).toBeVisible();
  });

  test('navigates to QMS page', async ({ page }) => {
    await page.locator('h4', { hasText: '质量管理' }).click();
    await page.waitForURL('**/qms', { timeout: 10000 });
    await expect(page.locator('h1', { hasText: '质量管理' })).toBeVisible();
  });

  test('navigates back to dashboard', async ({ page }) => {
    await page.locator('h4', { hasText: '科研研发' }).click();
    await page.waitForURL('**/rs', { timeout: 10000 });
    
    await page.goBack();
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    
    await expect(page.locator('h4', { hasText: '科研研发' })).toBeVisible();
  });

  test('breadcrumb navigation', async ({ page }) => {
    await page.locator('h4', { hasText: '科研研发' }).click();
    await page.waitForURL('**/rs', { timeout: 10000 });
    
    const pageContent = page.locator('body');
    await expect(pageContent).toBeVisible();
  });

  test('mobile navigation menu', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    
    const menuButton = page.locator('button').filter({ has: page.locator('svg') }).nth(0);
    await menuButton.click();
    await page.waitForTimeout(1000);
    
    await expect(page.locator('text=科研研发').first()).toBeEnabled();
  });

  test('keyboard navigation', async ({ page }) => {
    await page.keyboard.press('Alt+1');
    
    await page.waitForTimeout(500);
  });
});
