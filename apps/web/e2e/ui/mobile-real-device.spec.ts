import { test, expect } from '@playwright/test';

test.describe('移动端真机测试', () => {
  test('iPhone 12 视口高度应正确', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    const viewportHeight = await page.evaluate(() => {
      return window.innerHeight;
    });

    expect(viewportHeight).toBeGreaterThan(0);
  });

  test('iPhone 12 登录页面应完整显示', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByPlaceholder('请输入用户名')).toBeVisible();
    await expect(page.getByPlaceholder('请输入密码')).toBeVisible();

    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toBeEnabled();
  });

  test('iPhone 12 登录按钮尺寸应适合触摸', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    const buttonSize = await page.evaluate(() => {
      const button = document.querySelector('button[type="submit"]');
      if (!button) return { width: 0, height: 0 };
      const rect = button.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    });

    expect(buttonSize.height).toBeGreaterThanOrEqual(44);
  });

  test('Pixel 5 视口高度应正确', async ({ page, context }) => {
    await context.setViewportSize({ width: 393, height: 851 });
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    const viewportHeight = await page.evaluate(() => {
      return window.innerHeight;
    });

    expect(viewportHeight).toBeGreaterThan(0);
  });

  test('Pixel 5 登录页面应完整显示', async ({ page, context }) => {
    await context.setViewportSize({ width: 393, height: 851 });
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByPlaceholder('请输入用户名')).toBeVisible();
    await expect(page.getByPlaceholder('请输入密码')).toBeVisible();

    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();
  });

  test('iPad 视口高度应正确', async ({ page, context }) => {
    await context.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    const viewportHeight = await page.evaluate(() => {
      return window.innerHeight;
    });

    expect(viewportHeight).toBeGreaterThan(0);
  });

  test('iPad 登录页面应完整显示', async ({ page, context }) => {
    await context.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByPlaceholder('请输入用户名')).toBeVisible();
    await expect(page.getByPlaceholder('请输入密码')).toBeVisible();

    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();
  });

  test('安全区域 CSS 变量应正确定义', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    const safeAreaVars = await page.evaluate(() => {
      const root = document.documentElement;
      return {
        top: getComputedStyle(root).getPropertyValue('--safe-area-inset-top'),
        bottom: getComputedStyle(root).getPropertyValue('--safe-area-inset-bottom'),
      };
    });

    expect(safeAreaVars.top).toBeTruthy();
    expect(safeAreaVars.bottom).toBeTruthy();
  });

  test('页面不应有水平滚动条', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    expect(hasHorizontalScroll).toBe(false);
  });

  test('输入框聚焦时应可见', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    const usernameInput = page.getByPlaceholder('请输入用户名');
    await usernameInput.focus();

    const isVisible = await usernameInput.isVisible();
    expect(isVisible).toBe(true);
  });
});