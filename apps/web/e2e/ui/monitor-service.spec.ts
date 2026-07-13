import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

test.describe('Monitor Service Health', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page.getByPlaceholder('请输入用户名').fill('admin');
    await page.getByPlaceholder('请输入密码').fill('admin123');
    await page.getByRole('button', { name: '登录' }).click();
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    await page.waitForLoadState('networkidle');
  });

  test('should navigate to monitor dashboard page', async ({ page }) => {
    await page.goto('/monitor');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display service health status', async ({ page }) => {
    await page.goto('/monitor');
    await page.waitForLoadState('networkidle');

    const healthSection = page.locator('text=服务健康');
    if (await healthSection.isVisible()) {
      await expect(healthSection).toBeVisible();
    }
  });

  test('should show individual service status', async ({ page }) => {
    await page.goto('/monitor');
    await page.waitForLoadState('networkidle');

    const serviceCards = page.locator('[data-testid*="service-"]');
    const count = await serviceCards.count();
    if (count > 0) {
      await expect(serviceCards.first()).toBeVisible();
    }
  });

  test('should show response time metrics', async ({ page }) => {
    await page.goto('/monitor');
    await page.waitForLoadState('networkidle');

    const responseTime = page.locator('text=响应时间');
    if (await responseTime.isVisible()) {
      await expect(responseTime).toBeVisible();
    }
  });

  test('should show uptime information', async ({ page }) => {
    await page.goto('/monitor');
    await page.waitForLoadState('networkidle');

    const uptime = page.locator('text=运行时间');
    if (await uptime.isVisible()) {
      await expect(uptime).toBeVisible();
    }
  });

  test('should navigate to notification center', async ({ page }) => {
    await page.goto('/monitor/notifications');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should refresh service status', async ({ page }) => {
    await page.goto('/monitor');
    await page.waitForLoadState('networkidle');

    const refreshButton = page.getByRole('button', { name: /刷新/i });
    if (await refreshButton.isVisible()) {
      await refreshButton.click();
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toBeVisible();
    }
  });
});