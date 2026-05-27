import { test, expect } from '@playwright/test';

test.describe('RS Page Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('请输入用户名').fill('admin');
    await page.getByPlaceholder('请输入密码').fill('admin123');
    await page.getByRole('button', { name: '登录' }).click();
    await page.waitForURL('**/dashboard');
    
    await page.locator('text=RS研发').first().click();
    await page.waitForURL('**/rs');
  });

  test('displays RS page correctly', async ({ page }) => {
    await expect(page.locator('text=/研发管理|项目列表/i')).toBeVisible();
    await expect(page.locator('text=/实验列表|实验管理/i')).toBeVisible();
  });

  test('displays projects section', async ({ page }) => {
    await expect(page.locator('text=项目列表')).toBeVisible();
  });

  test('displays experiments section', async ({ page }) => {
    await expect(page.locator('text=实验列表')).toBeVisible();
  });

  test('opens new project modal', async ({ page }) => {
    await page.getByRole('button', { name: /新建项目/i }).click();
    
    await expect(page.locator('text=/新建项目|创建项目/i')).toBeVisible();
    await expect(page.getByLabel('项目名称')).toBeVisible();
    await expect(page.getByLabel('项目编号')).toBeVisible();
  });

  test('opens new experiment modal', async ({ page }) => {
    await page.getByRole('button', { name: /新建实验/i }).click();
    
    await expect(page.locator('text=/新建实验|创建实验/i')).toBeVisible();
  });

  test('creates new project', async ({ page }) => {
    await page.getByRole('button', { name: /新建项目/i }).click();
    
    await page.getByLabel('项目名称').fill('测试项目');
    await page.getByLabel('项目编号').fill('TEST-001');
    
    await page.getByRole('button', { name: /创建|提交/i }).click();
    
    await expect(page.locator('text=测试项目')).toBeVisible({ timeout: 5000 });
  });

  test('filters projects by status', async ({ page }) => {
    await page.locator('select').first().selectOption('进行中');
    
    await page.waitForTimeout(500);
  });

  test('searches projects', async ({ page }) => {
    await page.getByPlaceholder(/搜索/i).fill('测试');
    
    await page.waitForTimeout(500);
  });

  test('pagination works', async ({ page }) => {
    const nextButton = page.locator('button', { hasText: /下一页|>>/i });
    
    if (await nextButton.isVisible()) {
      await nextButton.click();
      await page.waitForTimeout(500);
    }
  });
});
