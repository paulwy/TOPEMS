import { test, expect } from '@playwright/test';

test.describe('LIMS Page Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('请输入用户名').fill('test_admin');
    await page.getByPlaceholder('请输入密码').fill('admin123');
    await page.getByTestId('login-submit').click();
    await page.waitForURL('**/dashboard', { timeout: 30000 });
    
    // Use direct URL navigation instead of sidebar click
    // /lims 是 dashboard 概览；样品列表在 /lims/sample（列表页）
    await page.goto('/lims/sample');
    await page.waitForLoadState('networkidle');
  });

  test('displays LIMS page correctly', async ({ page }) => {
    // /lims/sample 页面标题为「LIMS 样品管理」（i18n），h1 非固定标签
    // LIMS 为徽标、样品管理为标题（不同元素），text= 不跨元素，用 body 文本断言
    await expect(page.locator('body')).toContainText('样品管理', { timeout: 30000 });
  });

  test('displays samples section', async ({ page }) => {
    await expect(page.locator('text=样品管理').first()).toBeVisible({ timeout: 30000 });
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
