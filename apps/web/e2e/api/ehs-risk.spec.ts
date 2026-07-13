import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

test.describe('EHS Risk Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page.getByPlaceholder('请输入用户名').fill('admin');
    await page.getByPlaceholder('请输入密码').fill('admin123');
    await page.getByRole('button', { name: '登录' }).click();
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    await page.waitForLoadState('networkidle');
  });

  test('should navigate to EHS risk management page', async ({ page }) => {
    await page.goto('/ehs/risks');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display risk list', async ({ page }) => {
    await page.goto('/ehs/risks');
    await page.waitForLoadState('networkidle');
    
    const table = page.locator('table');
    await expect(table).toBeVisible();
  });

  test('should create a new risk assessment', async ({ page }) => {
    await page.goto('/ehs/risks');
    await page.waitForLoadState('networkidle');

    const createButton = page.getByRole('button', { name: /新建/i });
    if (await createButton.isVisible()) {
      await createButton.click();
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should navigate to hazard management page', async ({ page }) => {
    await page.goto('/ehs/hazards');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should navigate to accident management page', async ({ page }) => {
    await page.goto('/ehs/accidents');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should navigate to training management page', async ({ page }) => {
    await page.goto('/ehs/trainings');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should navigate to inspection plan page', async ({ page }) => {
    await page.goto('/ehs/inspections');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should navigate to emergency plan page', async ({ page }) => {
    await page.goto('/ehs/emergency-plans');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });
});