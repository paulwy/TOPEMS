// Visual regression tests for TOPEMS design system
// To update baselines: npx playwright test --update-snapshots
// First run will fail (no baselines). Run with --update-snapshots to create them.

import { test, expect } from '@playwright/test';

test.describe('Design System Visual Regression', () => {
  test('login page renders correctly', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('login-page.png', { fullPage: true, maxDiffPixelRatio: 0.05 });
  });

  test('iam dashboard with sidebar', async ({ page }) => {
    await page.goto('/iam/dashboard');
    await page.waitForLoadState('networkidle');
    // Wait a bit for sidebar animations
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot('iam-dashboard.png', { fullPage: true, maxDiffPixelRatio: 0.05 });
  });
});
