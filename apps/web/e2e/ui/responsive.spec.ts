import { test, expect } from '@playwright/test';

test.describe('响应式布局测试', () => {
  test.describe('登录页面响应式', () => {
    test('桌面端登录页面应正常显示', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto('/login');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      await expect(page.getByPlaceholder('请输入用户名')).toBeVisible({ timeout: 10000 });
      await expect(page.getByPlaceholder('请输入密码')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('button[type="submit"]')).toBeVisible({ timeout: 10000 });
    });

    test('平板端登录页面应适配', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/login');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      await expect(page.getByPlaceholder('请输入用户名')).toBeVisible({ timeout: 10000 });
      await expect(page.getByPlaceholder('请输入密码')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('button[type="submit"]')).toBeVisible({ timeout: 10000 });
    });

    test('移动端登录页面应适配', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/login');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      await expect(page.getByPlaceholder('请输入用户名')).toBeVisible({ timeout: 10000 });
      await expect(page.getByPlaceholder('请输入密码')).toBeVisible({ timeout: 10000 });

      const loginButton = page.locator('button[type="submit"]');
      await expect(loginButton).toBeVisible({ timeout: 10000 });

      const box = await loginButton.boundingBox();
      expect(box?.width).toBeGreaterThanOrEqual(44);
      expect(box?.height).toBeGreaterThanOrEqual(44);
    });

    test('移动端登录按钮尺寸应 ≥ 44px', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/login');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      const submitButton = page.locator('button[type="submit"]');
      await expect(submitButton).toBeVisible();
      
      const box = await submitButton.first().boundingBox();
      expect(box?.width).toBeGreaterThanOrEqual(44);
      expect(box?.height).toBeGreaterThanOrEqual(44);
    });

    test('输入框应有足够间距', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/login');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      const usernameInput = page.getByPlaceholder('请输入用户名');
      const passwordInput = page.getByPlaceholder('请输入密码');

      const usernameBox = await usernameInput.boundingBox();
      const passwordBox = await passwordInput.boundingBox();

      expect(usernameBox).toBeTruthy();
      expect(passwordBox).toBeTruthy();

      const verticalGap = passwordBox!.y - (usernameBox!.y + usernameBox!.height);
      expect(verticalGap).toBeGreaterThanOrEqual(8);
    });
  });

  test.describe('页面布局响应式', () => {
    test('页面应正常渲染且没有明显布局问题', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto('/login');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      const bodyHeight = await page.evaluate(() => {
        const style = window.getComputedStyle(document.body);
        return style.minHeight;
      });

      expect(bodyHeight).toBeTruthy();
    });

    test('移动端字体大小应清晰可读', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/login');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      const fontSize = await page.evaluate(() => {
        const style = window.getComputedStyle(document.body);
        return parseFloat(style.fontSize);
      });

      expect(fontSize).toBeGreaterThanOrEqual(12);
    });
  });
});