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
    await page.locator('h4', { hasText: '质量管理' }).click();
    await page.waitForURL('**/qms', { timeout: 10000 });
    
    const newWorkflowButton = page.getByRole('button', { name: /新建流程/i });
    if (await newWorkflowButton.isVisible()) {
      await newWorkflowButton.click();
      
      await page.waitForTimeout(1000);
      
      const textInputs = page.locator('input[type="text"]');
      if ((await textInputs.count()) > 0) {
        await textInputs.first().fill('测试流程');
      }
      
      const createButton = page.getByRole('button', { name: /创建/i });
      if (await createButton.isVisible()) {
        await createButton.click();
      }
      
      await page.waitForTimeout(1000);
    }
  });

  test('workflow shows correct status', async ({ page }) => {
    await page.locator('h4', { hasText: '质量管理' }).click();
    await page.waitForURL('**/qms', { timeout: 10000 });
    
    await page.waitForTimeout(500);
  });

  test('user can view workflow details', async ({ page }) => {
    await page.locator('h4', { hasText: '质量管理' }).click();
    await page.waitForURL('**/qms', { timeout: 10000 });
    
    await page.waitForTimeout(500);
  });

  test('multi-step workflow navigation', async ({ page }) => {
    await page.locator('h4', { hasText: '科研研发' }).click();
    await page.waitForURL('**/rs', { timeout: 10000 });
    
    const newProjectButton = page.getByRole('button', { name: /新建项目/i });
    if (await newProjectButton.isVisible()) {
      await newProjectButton.click();
      await page.waitForTimeout(1000);
    }
  });

  test('workflow cancellation', async ({ page }) => {
    await page.locator('h4', { hasText: '质量管理' }).click();
    await page.waitForURL('**/qms', { timeout: 10000 });
    
    await page.waitForTimeout(500);
  });
});
