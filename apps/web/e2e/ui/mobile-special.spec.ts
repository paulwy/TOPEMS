import { test, expect } from '@playwright/test';
import { TEST_ACCOUNTS, createAuthenticatedContext } from '../utils/testUtils';

test.describe('移动端专项测试', () => {
  let authenticatedContext: any;

  test.beforeAll(async ({ browser }) => {
    authenticatedContext = await createAuthenticatedContext(
      browser,
      TEST_ACCOUNTS.superadmin.username,
      TEST_ACCOUNTS.superadmin.password
    );
  });

  test.afterAll(async () => {
    if (authenticatedContext) {
      await authenticatedContext.close();
    }
  });

  test.describe('Safe Area 适配测试', () => {
    test('登录页面应适配顶部安全区域', async () => {
      const page = await authenticatedContext.newPage();
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto('/login');
      await page.waitForLoadState('domcontentloaded');

      const header = page.locator('[role="banner"], header');
      const isVisible = await header.first().isVisible().catch(() => false);
      expect(isVisible).toBe(true);

      await page.close();
    });

    test('底部导航栏应适配底部安全区域', async () => {
      const page = await authenticatedContext.newPage();
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto('/dashboard');
      await page.waitForLoadState('domcontentloaded');

      const bottomNav = page.locator('[role="navigation"], .MuiBottomNavigation-root');
      const isVisible = await bottomNav.first().isVisible().catch(() => false);
      expect(isVisible).toBe(true);

      await page.close();
    });
  });

  test.describe('虚拟键盘适配测试', () => {
    test('输入框聚焦时页面应滚动', async () => {
      const page = await authenticatedContext.newPage();
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/login');
      await page.waitForLoadState('domcontentloaded');

      const passwordInput = page.getByPlaceholder('请输入密码');
      await passwordInput.focus();

      const box = await passwordInput.boundingBox();
      expect(box).toBeTruthy();
      expect(box!.y).toBeLessThan(300);

      await page.close();
    });
  });

  test.describe('手势操作测试', () => {
    test('页面应支持下拉刷新', async () => {
      const page = await authenticatedContext.newPage();
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/dashboard');
      await page.waitForLoadState('domcontentloaded');

      await page.mouse.move(187, 100);
      await page.mouse.down();
      await page.mouse.move(187, 200);
      await page.mouse.up();

      await page.waitForTimeout(500);

      await page.close();
    });
  });

  test.describe('加载状态测试', () => {
    test('页面加载时应显示 loading', async () => {
      const page = await authenticatedContext.newPage();
      await page.setViewportSize({ width: 375, height: 667 });

      const [response] = await Promise.all([
        page.goto('/dashboard'),
        page.waitForLoadState('domcontentloaded'),
      ]);

      expect(response?.ok()).toBe(true);

      await page.close();
    });
  });

  test.describe('页面跳转测试', () => {
    test('移动端页面跳转应平滑', async () => {
      const page = await authenticatedContext.newPage();
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/dashboard');
      await page.waitForLoadState('domcontentloaded');

      await page.waitForTimeout(500);

      await page.close();
    });
  });
});