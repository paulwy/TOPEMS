import { test, expect } from '@playwright/test';

test.describe('LIMS Page Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('请输入用户名').fill('admin');
    await page.getByPlaceholder('请输入密码').fill('admin123');
    await page.getByRole('button', { name: '登录' }).click();
    await page.waitForURL('**/dashboard');
    
    await page.locator('text=LIMS质检').first().click();
    await page.waitForURL('**/lims');
  });

  test('displays LIMS page correctly', async ({ page }) => {
    await expect(page.locator('text=/质检管理|样品列表/i')).toBeVisible();
    await expect(page.locator('text=/检测列表|检测管理/i')).toBeVisible();
  });

  test('displays samples section', async ({ page }) => {
    await expect(page.locator('text=样品列表')).toBeVisible();
  });

  test('displays tests section', async ({ page }) => {
    await expect(page.locator('text=检测列表')).toBeVisible();
  });

  test('opens new sample modal', async ({ page }) => {
    await page.getByRole('button', { name: /新建样品/i }).click();
    
    await expect(page.locator('text=/新建样品|创建样品/i')).toBeVisible();
  });

  test('opens new test modal', async ({ page }) => {
    await page.getByRole('button', { name: /新建检测/i }).click();
    
    await expect(page.locator('text=/新建检测|创建检测/i')).toBeVisible();
  });

  test('creates new sample', async ({ page }) => {
    await page.getByRole('button', { name: /新建样品/i }).click();
    
    await page.getByLabel('样品名称').fill('测试样品');
    await page.getByLabel('样品编号').fill('SAMPLE-001');
    
    await page.getByRole('button', { name: /创建|提交/i }).click();
    
    await expect(page.locator('text=测试样品')).toBeVisible({ timeout: 5000 });
  });

  test('filters samples by status', async ({ page }) => {
    await page.locator('select').first().selectOption('待检');
    
    await page.waitForTimeout(500);
  });

  test('searches samples', async ({ page }) => {
    await page.getByPlaceholder(/搜索/i).fill('测试');
    
    await page.waitForTimeout(500);
  });
});
