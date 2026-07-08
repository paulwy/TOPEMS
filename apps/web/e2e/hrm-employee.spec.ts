import { test, expect } from '@playwright/test';

test.describe('HRM Employee Management Flow', () => {
  const testEmployee = {
    name: 'Test Emp ' + Date.now(),
    email: 'emp.' + Date.now() + '@test.com',
    phone: '13800138000',
    department: '研发部',
    position: '工程师',
  };

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('请输入用户名').fill('admin');
    await page.getByPlaceholder('请输入密码').fill('admin123');
    await page.getByRole('button', { name: '登录' }).click();
    await page.waitForURL('**/dashboard', { timeout: 15000 });
  });

  test('should navigate to employee management page', async ({ page }) => {
    await page.goto('/hrm/employees');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/hrm\/employees/);
  });

  test('should load employee list page correctly', async ({ page }) => {
    await page.goto('/hrm/employees');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1, h2, h3')).toBeVisible();
  });
});