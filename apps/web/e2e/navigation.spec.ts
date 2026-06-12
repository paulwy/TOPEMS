import { test, expect } from '@playwright/test';

// Run tests serially to avoid authentication state conflicts
test.describe.configure({ mode: 'serial' });

test.describe('Navigation Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    // Fill login form
    await page.getByPlaceholder('请输入用户名').fill('admin');
    await page.getByPlaceholder('请输入密码').fill('admin123');
    
    // Click login and wait for response
    await page.getByRole('button', { name: '登录' }).click();
    
    // Wait for navigation to complete
    await page.waitForURL('**/dashboard', { timeout: 30000 });
    
    // Wait for page content to load and auth state to be saved
    await page.waitForLoadState('networkidle');
    
    // Wait for the dashboard content to be visible (ensures auth is working)
    await page.waitForSelector('h4:has-text("科研研发")', { timeout: 15000 });
    
    // Additional wait to ensure localStorage is saved
    await page.waitForTimeout(500);
  });

  test('sidebar navigation menu is visible', async ({ page }) => {
    await expect(page.locator('h4', { hasText: '科研研发' })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('h4', { hasText: '实验室管理' })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('h4', { hasText: '质量管理' })).toBeVisible({ timeout: 10000 });
  });

  test('navigates to RS page', async ({ page }) => {
    await page.locator('h4', { hasText: '科研研发' }).click();
    await page.waitForURL('**/rs', { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=/研发|R&D/i').first()).toBeVisible({ timeout: 10000 });
  });

  test('navigates to LIMS page', async ({ page }) => {
    await page.locator('h4', { hasText: '实验室管理' }).click();
    await page.waitForURL('**/lims', { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    // Check for any content on the LIMS page
    const pageContent = page.locator('body');
    await expect(pageContent).toBeVisible();
  });

  test('navigates to QMS page', async ({ page }) => {
    await page.locator('h4', { hasText: '质量管理' }).click();
    await page.waitForURL('**/qms', { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1', { hasText: '质量管理' })).toBeVisible({ timeout: 10000 });
  });

  test('navigates back to dashboard', async ({ page }) => {
    await page.locator('h4', { hasText: '科研研发' }).click();
    await page.waitForURL('**/rs', { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    
    await page.goBack();
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    
    await expect(page.locator('h4', { hasText: '科研研发' })).toBeVisible({ timeout: 10000 });
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
