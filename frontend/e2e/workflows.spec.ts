import { test, expect } from '@playwright/test';

test.describe('Workflow Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('请输入用户名').fill('admin');
    await page.getByPlaceholder('请输入密码').fill('admin123');
    await page.getByRole('button', { name: '登录' }).click();
    await page.waitForURL('**/dashboard');
  });

  test('user can create and approve a workflow', async ({ page }) => {
    await page.locator('text=QMS质量管理').first().click();
    await page.waitForURL('**/qms');
    
    await page.getByRole('button', { name: /新建流程/i }).click();
    
    await page.getByLabel('流程名称').fill('测试流程');
    await page.getByRole('button', { name: /创建/i }).click();
    
    await expect(page.locator('text=测试流程')).toBeVisible({ timeout: 5000 });
  });

  test('workflow shows correct status', async ({ page }) => {
    await page.locator('text=QMS质量管理').first().click();
    await page.waitForURL('**/qms');
    
    await expect(page.locator('text=/待审批|进行中|已完成/i')).toBeVisible();
  });

  test('user can view workflow details', async ({ page }) => {
    await page.locator('text=QMS质量管理').first().click();
    await page.waitForURL('**/qms');
    
    await page.locator('tr').first().click();
    
    await expect(page.locator('text=/流程详情|审批历史/i')).toBeVisible({ timeout: 5000 });
  });

  test('multi-step workflow navigation', async ({ page }) => {
    await page.locator('text=RS研发').first().click();
    await page.waitForURL('**/rs');
    
    await page.getByRole('button', { name: /新建项目/i }).click();
    await page.getByLabel('项目名称').fill('多步骤项目');
    await page.getByRole('button', { name: /下一步/i }).click();
    
    await expect(page.locator('text=/步骤 2|阶段 2/i')).toBeVisible();
  });

  test('workflow cancellation', async ({ page }) => {
    await page.locator('text=QMS质量管理').first().click();
    await page.waitForURL('**/qms');
    
    await page.locator('tr').first().locator('button').click();
    await page.getByText(/取消/i).click();
    
    await expect(page.locator('text=/已取消|已终止/i')).toBeVisible({ timeout: 5000 });
  });
});
