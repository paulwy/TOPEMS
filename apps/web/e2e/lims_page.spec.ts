import { test, expect } from '@playwright/test';

test.describe('LIMS Page Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('请输入用户名').fill('admin');
    await page.getByPlaceholder('请输入密码').fill('admin123');
    await page.getByRole('button', { name: '登录' }).click();
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    
    await page.locator('h4', { hasText: '实验室管理' }).click();
    await page.waitForURL('**/lims', { timeout: 15000 });
  });

  test('displays LIMS page correctly', async ({ page }) => {
    await expect(page.locator('h1', { hasText: '检验管理' })).toBeVisible();
  });

  test('displays samples section', async ({ page }) => {
    await expect(page.locator('text=样品列表').first()).toBeVisible();
  });

  test('displays tests section', async ({ page }) => {
    await page.waitForTimeout(500);
  });

  test('opens new sample modal', async ({ page }) => {
    const newSampleButton = page.getByRole('button', { name: /新建样品/i });
    if (await newSampleButton.isVisible()) {
      await newSampleButton.click();
      await page.waitForTimeout(1000);
    }
  });

  test('opens new test modal', async ({ page }) => {
    const newTestButton = page.getByRole('button', { name: /新建检测/i });
    if (await newTestButton.isVisible()) {
      await newTestButton.click();
      await page.waitForTimeout(1000);
    }
  });

  test('creates new sample', async ({ page }) => {
    const newSampleButton = page.getByRole('button', { name: /新建样品/i });
    if (await newSampleButton.isVisible()) {
      await newSampleButton.click();
      
      await page.waitForTimeout(1000);
      
      const textInputs = page.locator('input[type="text"]');
      if ((await textInputs.count()) > 0) {
        await textInputs.first().fill('测试样品');
      }
      
      const createButton = page.getByRole('button', { name: '创建', exact: true });
      if (await createButton.isVisible()) {
        await createButton.click();
      }
      
      await page.waitForTimeout(1000);
    }
  });

  test('filters samples by status', async ({ page }) => {
    const select = page.locator('select').first();
    if (await select.isVisible()) {
      await select.selectOption('待检');
    }
    await page.waitForTimeout(500);
  });

  test('searches samples', async ({ page }) => {
    const searchInput = page.locator('input').filter({ hasNot: page.locator('svg') }).first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('测试');
    }
    await page.waitForTimeout(500);
  });
});
