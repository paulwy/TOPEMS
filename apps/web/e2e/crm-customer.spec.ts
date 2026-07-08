import { test, expect } from '@playwright/test';

test.describe('CRM Customer Management Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('请输入用户名').fill('admin');
    await page.getByPlaceholder('请输入密码').fill('admin123');
    await page.getByRole('button', { name: '登录' }).click();
    await page.waitForURL('**/dashboard', { timeout: 15000 });
  });

  test('should navigate to customer management page', async ({ page }) => {
    await page.goto('/crm/customers');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/crm\/customers/);
  });

  test('should load customer list page correctly', async ({ page }) => {
    await page.goto('/crm/customers');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });
});