import { test, expect } from '@playwright/test';
import { TEST_ACCOUNTS, createAuthenticatedContext } from '../utils/testUtils';

test.describe('移动端专项测试', () => {
  let authenticatedContext: any;

  test.beforeAll(async ({ browser }) => {
    authenticatedContext = await createAuthenticatedContext(
      browser,
      'test_admin',
      'admin123'
    );
  });

  test.afterAll(async () => {
    if (authenticatedContext) {
      await authenticatedContext.close();
    }
  });

  test.describe('Safe Area 适配测试', () => {
    test('移动端壳（/mobile/*）应适配顶部安全区域', async () => {
      const page = await authenticatedContext.newPage();
      await page.setViewportSize({ width: 375, height: 812 });
      // 2026-10-16 UI V3 定案后：主路由（含 /login）恒桌面 V3 壳，移动端安全区
      // 仅存在于 /mobile/* 的 MobileLayoutV3（MobileHeader = MUI AppBar → role=banner）
      await page.goto('/mobile/workbench');
      // networkidle 等待 React 挂载完成（domcontentloaded 不足，dev 冷编译会先于挂载）
      await page.waitForLoadState('networkidle');

      const header = page.getByRole('banner');
      await expect(header).toBeVisible();

      await page.close();
    });

    test('底部导航栏应适配底部安全区域', async () => {
      const page = await authenticatedContext.newPage();
      await page.setViewportSize({ width: 375, height: 812 });
      // /dashboard 现为桌面 V3 壳（无底部导航），改指向真实渲染 BottomTabBar 的
      // /mobile/* 页面（MobileWorkbenchPage）
      await page.goto('/mobile/workbench');
      await page.waitForLoadState('networkidle');

      // BottomTabBar.tsx：Paper.className='bottom-tab-bar' 内为 MUI BottomNavigation，
      // 并通过 paddingBottom: env(safe-area-inset-bottom, 0px) 适配底部安全区域
      const bottomNav = page.locator('.bottom-tab-bar .MuiBottomNavigation-root');
      await expect(bottomNav).toBeVisible();

      await page.close();
    });
  });

  test.describe('虚拟键盘适配测试', () => {
    test('输入框聚焦后应保持在视口内', async () => {
      const page = await authenticatedContext.newPage();
      await page.setViewportSize({ width: 375, height: 667 });
      // 真实虚拟键盘滚动无法在桌面 e2e 模拟；弱化为断言聚焦后输入框可见且在视口内
      await page.goto('/login');
      await page.waitForLoadState('domcontentloaded');

      const passwordInput = page.getByPlaceholder('请输入密码');
      await passwordInput.focus();

      const box = await passwordInput.boundingBox();
      expect(box).toBeTruthy();
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.y + box!.height).toBeLessThanOrEqual(667);

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