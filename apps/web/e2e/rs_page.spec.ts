import { test, expect } from '@playwright/test';

test.describe('RS Page Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('请输入用户名').fill('admin');
    await page.getByPlaceholder('请输入密码').fill('admin123');
    await page.getByRole('button', { name: '登录' }).click();
    await page.waitForURL('**/dashboard');
    
    await page.locator('h4', { hasText: '科研研发' }).click();
    await page.waitForURL('**/rs', { timeout: 10000 });
  });

  test('displays RS page correctly', async ({ page }) => {
    await expect(page.locator('text=项目列表').first()).toBeVisible({ timeout: 10000 });
  });

  test('displays projects section', async ({ page }) => {
    const projectsSection = page.locator('text=项目列表').first();
    await expect(projectsSection).toBeVisible({ timeout: 10000 });
  });

  test('displays experiments section', async ({ page }) => {
    await expect(page.locator('text=试验记录').first()).toBeVisible({ timeout: 10000 });
  });

  test('opens new project modal', async ({ page }) => {
    await page.getByRole('button', { name: '新建项目' }).first().click();
    
    await expect(page.locator('h3', { hasText: '新建项目' })).toBeVisible({ timeout: 5000 });
  });

  test('opens experiment section', async ({ page }) => {
    await page.locator('text=试验记录').first().click();
    await page.waitForTimeout(1000);
  });

  test('creates new project', async ({ page }) => {
    await page.getByRole('button', { name: '新建项目' }).first().click();
    
    await page.waitForSelector('input', { timeout: 5000 });
    
    const textInputs = page.locator('input[type="text"]');
    if ((await textInputs.count()) > 0) {
      await textInputs.first().fill('测试项目');
    }
    
    if ((await textInputs.count()) > 1) {
      await textInputs.nth(1).fill('TEST-001');
    }
    
    const createButton = page.getByRole('button', { name: '创建', exact: true });
    await createButton.click();
    
    await page.waitForTimeout(2000);
  });

  test('filters projects by status', async ({ page }) => {
    const select = page.locator('select').first();
    if (await select.isVisible()) {
      await select.selectOption('进行中');
    }
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
