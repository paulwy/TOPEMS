// Component-level visual regression tests for TOPEMS
// To update baselines: npx playwright test --update-snapshots
// First run will fail (no baselines). Run with --update-snapshots to create them.

import { test, expect } from '@playwright/test';

test.describe('Component Visual Regression', () => {
  // Test a list page (DataTable + FilterBar + Pagination pattern)
  test('HRM employee list page', async ({ page }) => {
    await page.goto('/hrm/employees');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('hrm-employee-list.png', { fullPage: true, maxDiffPixelRatio: 0.05 });
  });

  // Test a dashboard page (StatCard + ChartCard pattern)
  test('PM dashboard page', async ({ page }) => {
    await page.goto('/pm/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('pm-dashboard.png', { fullPage: true, maxDiffPixelRatio: 0.05 });
  });

  // Test dark mode rendering
  test('dark mode - login page', async ({ page }) => {
    // Set localStorage for dark mode before navigating
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('theme-mode', 'dark');
    });
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('login-page-dark.png', { fullPage: true, maxDiffPixelRatio: 0.05 });
  });
});
