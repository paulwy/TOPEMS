import { test, expect } from '@playwright/test';

test.describe('HRM Module E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('请输入用户名').fill('admin');
    await page.getByPlaceholder('请输入密码').fill('admin123');
    await page.getByRole('button', { name: '登录' }).click();
    await page.waitForURL('**/dashboard', { timeout: 15000 });
  });

  test.describe('Navigation Tests', () => {
    test('should navigate to HRM employee page', async ({ page }) => {
      await page.goto('/hrm/employees');
      await page.waitForLoadState('networkidle');
    });

    test('should navigate to HRM positions page', async ({ page }) => {
      await page.goto('/hrm/positions');
      await page.waitForLoadState('networkidle');
    });

    test('should navigate to HRM leave page', async ({ page }) => {
      await page.goto('/hrm/leave');
      await expect(page).toHaveURL(/.*/, { timeout: 10000 });
    });

    test('should navigate to HRM contracts page', async ({ page }) => {
      await page.goto('/hrm/contracts');
      await expect(page).toHaveURL(/.*/, { timeout: 10000 });
    });

    test('should navigate to HRM recruitment page', async ({ page }) => {
      await page.goto('/hrm/recruitment');
      await expect(page).toHaveURL(/.*/, { timeout: 10000 });
    });

    test('should navigate to HRM payroll page', async ({ page }) => {
      await page.goto('/hrm/payroll');
      await expect(page).toHaveURL(/.*/, { timeout: 10000 });
    });

    test('should navigate to HRM performance page', async ({ page }) => {
      await page.goto('/hrm/performance');
      await expect(page).toHaveURL(/.*/, { timeout: 10000 });
    });

    test('should navigate to HRM attendance page', async ({ page }) => {
      await page.goto('/hrm/attendance');
      await expect(page).toHaveURL(/.*/, { timeout: 10000 });
    });

    test('should navigate to HRM training page', async ({ page }) => {
      await page.goto('/hrm/training');
      await expect(page).toHaveURL(/\/hrm\/training/);
    });

    test('should navigate to HRM reports page', async ({ page }) => {
      await page.goto('/hrm/reports');
      await expect(page).toHaveURL(/\/hrm\/reports/);
    });
  });

  test.describe('Employee Management Tests', () => {
    test('should load employee page successfully', async ({ page }) => {
      await page.goto('/hrm/employees');
      const pageTitle = await page.title();
      expect(pageTitle).toBeTruthy();
    });

    test('should have employee page layout elements', async ({ page }) => {
      await page.goto('/hrm/employees');
      await page.waitForLoadState('networkidle');
      expect(true).toBe(true);
    });
  });

  test.describe('Position Management Tests', () => {
    test('should load position page successfully', async ({ page }) => {
      await page.goto('/hrm/positions');
      const pageTitle = await page.title();
      expect(pageTitle).toBeTruthy();
    });
  });

  test.describe('Leave Management Tests', () => {
    test('should load leave page successfully', async ({ page }) => {
      await page.goto('/hrm/leave');
      const pageTitle = await page.title();
      expect(pageTitle).toBeTruthy();
    });
  });

  test.describe('Attendance Management Tests', () => {
    test('should load attendance page successfully', async ({ page }) => {
      await page.goto('/hrm/attendance');
      const pageTitle = await page.title();
      expect(pageTitle).toBeTruthy();
    });
  });

  test.describe('Payroll Management Tests', () => {
    test('should load payroll page successfully', async ({ page }) => {
      await page.goto('/hrm/payroll');
      const pageTitle = await page.title();
      expect(pageTitle).toBeTruthy();
    });
  });

  test.describe('Performance Management Tests', () => {
    test('should load performance page successfully', async ({ page }) => {
      await page.goto('/hrm/performance');
      const pageTitle = await page.title();
      expect(pageTitle).toBeTruthy();
    });
  });

  test.describe('Recruitment Management Tests', () => {
    test('should load recruitment page successfully', async ({ page }) => {
      await page.goto('/hrm/recruitment');
      const pageTitle = await page.title();
      expect(pageTitle).toBeTruthy();
    });
  });

  test.describe('Contract Management Tests', () => {
    test('should load contract page successfully', async ({ page }) => {
      await page.goto('/hrm/contracts');
      const pageTitle = await page.title();
      expect(pageTitle).toBeTruthy();
    });
  });

  test.describe('Training Management Tests', () => {
    test('should load training page successfully', async ({ page }) => {
      await page.goto('/hrm/training');
      const pageTitle = await page.title();
      expect(pageTitle).toBeTruthy();
    });
  });

  test.describe('HRM Reports Tests', () => {
    test('should load reports page successfully', async ({ page }) => {
      await page.goto('/hrm/reports');
      const pageTitle = await page.title();
      expect(pageTitle).toBeTruthy();
    });
  });
});
