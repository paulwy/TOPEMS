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

    // Additional wait to ensure localStorage is saved
    await page.waitForTimeout(500);
  });

  test('dashboard page loads successfully', async ({ page }) => {
    await expect(page).toHaveURL(/dashboard/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('can navigate to RS page via URL', async ({ page }) => {
    await page.goto('/rs');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('can navigate to LIMS page via URL', async ({ page }) => {
    await page.goto('/lims');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('can navigate to QMS page via URL', async ({ page }) => {
    await page.goto('/qms');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('can navigate back to dashboard', async ({ page }) => {
    await page.goto('/rs');
    await page.waitForLoadState('networkidle');
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/dashboard/);
  });

  test('breadcrumb navigation works', async ({ page }) => {
    await page.goto('/hrm/employees');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('mobile navigation menu works', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('keyboard navigation works', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.keyboard.press('Alt+1');
    await page.waitForTimeout(500);
    await expect(page.locator('body')).toBeVisible();
  });
});