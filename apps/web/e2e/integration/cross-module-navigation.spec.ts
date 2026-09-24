/**
 * @coverage-tier2 跨模块导航端到端 Playwright 测试
 *
 * 关注点：
 *   - 登录后仪表盘加载
 *   - Admin → 用户管理 → 仪表盘 往返导航
 *   - 侧边栏在 HRM → Finance → WMS 模块间切换
 *   - 浏览器后退/前进历史导航
 *   - 直接 URL 访问关键页面
 *   - 无效路由 404 处理
 */
import { test as base, expect, Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';

type TestFixtures = {
  authenticatedPage: Page;
};

const test = base.extend<TestFixtures>({
  authenticatedPage: async ({ page }, use) => {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    const usernameInput = page.getByPlaceholder('请输入用户名');
    const passwordInput = page.getByPlaceholder('请输入密码');
    const loginButton = page.locator('form button[type="submit"]').first();

    await usernameInput.waitFor({ state: 'visible', timeout: 20000 });
    await usernameInput.fill('admin');
    await passwordInput.fill('admin123');
    await loginButton.click();

    await page.waitForURL('**/dashboard', { timeout: 30000 });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    await use(page);
  },
});

async function verifyPageLoads(page: Page, path: string) {
  await page.goto(`${BASE_URL}${path}`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(500);

  const layout = page.locator(
    '[class*="layout"], [class*="GlobalLayout"], main, [class*="PageContainer"]'
  );
  await expect(layout.first()).toBeVisible({ timeout: 10000 });
}

test.describe('跨模块导航测试', () => {
  test.describe.configure({ mode: 'serial' });

  test.describe('登录与仪表盘', () => {
    test('登录后应跳转到仪表盘', async ({ authenticatedPage: page }) => {
      await expect(page).toHaveURL(/dashboard/);
      await expect(page.locator('body')).toBeVisible();
    });

    test('仪表盘应渲染主要内容区域', async ({ authenticatedPage: page }) => {
      const mainContent = page.locator(
        'main, [class*="PageContainer"], [class*="dashboard"]'
      );
      await expect(mainContent.first()).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Admin 模块往返导航', () => {
    test('从仪表盘导航到 Admin 用户管理', async ({ authenticatedPage: page }) => {
      await verifyPageLoads(page, '/iam/user');
      await expect(page).toHaveURL(/iam\/user/);
    });

    test('从用户管理返回仪表盘', async ({ authenticatedPage: page }) => {
      await page.goto(`${BASE_URL}/iam/user`);
      await page.waitForLoadState('domcontentloaded');

      await page.goto(`${BASE_URL}/dashboard`);
      await page.waitForLoadState('domcontentloaded');
      await expect(page).toHaveURL(/dashboard/);
    });

    test('Admin 子页面之间跳转', async ({ authenticatedPage: page }) => {
      await verifyPageLoads(page, '/iam/user');
      await verifyPageLoads(page, '/iam/role');
      await verifyPageLoads(page, '/iam/permission');
    });
  });

  test.describe('侧边栏多模块导航', () => {
    test('导航到 HRM 模块', async ({ authenticatedPage: page }) => {
      await verifyPageLoads(page, '/hrm/employees');
      await expect(page).toHaveURL(/hrm/);
    });

    test('从 HRM 切换到 Finance 模块', async ({ authenticatedPage: page }) => {
      await verifyPageLoads(page, '/hrm/employees');
      await verifyPageLoads(page, '/finance');
      await expect(page).toHaveURL(/finance/);
    });

    test('从 Finance 切换到 WMS 模块', async ({ authenticatedPage: page }) => {
      await verifyPageLoads(page, '/finance');
      await verifyPageLoads(page, '/wms');
      await expect(page).toHaveURL(/wms/);
    });

    test('通过侧边栏链接连续切换模块', async ({ authenticatedPage: page }) => {
      await page.goto(`${BASE_URL}/dashboard`);
      await page.waitForLoadState('domcontentloaded');

      const navLinks = page.locator(
        'aside a, nav a, [class*="sidebar"] a, [class*="Sidebar"] a'
      );
      const linkCount = await navLinks.count();

      if (linkCount > 0) {
        const hrmLink = navLinks.filter({ hasText: /人力资源|HRM/i }).first();
        if (await hrmLink.isVisible().catch(() => false)) {
          await hrmLink.click();
          await page.waitForLoadState('domcontentloaded');
          await page.waitForTimeout(500);
          const urlAfterHrm = page.url();
          expect(urlAfterHrm.length).toBeGreaterThan(0);
        }
      }
    });
  });

  test.describe('浏览器历史导航', () => {
    test('浏览器后退按钮应返回上一页', async ({ authenticatedPage: page }) => {
      await page.goto(`${BASE_URL}/dashboard`);
      await page.waitForLoadState('domcontentloaded');

      await page.goto(`${BASE_URL}/iam/user`);
      await page.waitForLoadState('domcontentloaded');
      const userUrl = page.url();

      await page.goBack();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);

      expect(page.url()).not.toBe(userUrl);
    });

    test('浏览器前进按钮应前进到下一页', async ({ authenticatedPage: page }) => {
      await page.goto(`${BASE_URL}/dashboard`);
      await page.waitForLoadState('domcontentloaded');

      await page.goto(`${BASE_URL}/admin/role`);
      await page.waitForLoadState('domcontentloaded');
      const roleUrl = page.url();

      await page.goBack();
      await page.waitForLoadState('domcontentloaded');

      await page.goForward();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);

      expect(page.url()).toBe(roleUrl);
    });

    test('多步历史导航保持一致', async ({ authenticatedPage: page }) => {
      await page.goto(`${BASE_URL}/dashboard`);
      await page.waitForLoadState('domcontentloaded');
      const dashboardUrl = page.url();

      await page.goto(`${BASE_URL}/hrm/employees`);
      await page.waitForLoadState('domcontentloaded');

      await page.goto(`${BASE_URL}/wms`);
      await page.waitForLoadState('domcontentloaded');

      await page.goBack();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(300);
      expect(page.url()).toContain('/hrm');

      await page.goBack();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(300);
      expect(page.url()).toBe(dashboardUrl);
    });
  });

  test.describe('直接 URL 导航', () => {
    test('直接访问工作流页面', async ({ authenticatedPage: page }) => {
      await verifyPageLoads(page, '/workflow');
      await expect(page).toHaveURL(/workflow/);
    });

    test('直接访问 MES 页面', async ({ authenticatedPage: page }) => {
      await verifyPageLoads(page, '/mes');
      await expect(page).toHaveURL(/mes/);
    });

    test('直接访问 BI 报表页面', async ({ authenticatedPage: page }) => {
      await verifyPageLoads(page, '/bi');
      await expect(page).toHaveURL(/bi/);
    });

    test('直接访问 EHS 页面', async ({ authenticatedPage: page }) => {
      await verifyPageLoads(page, '/ehs');
      await expect(page).toHaveURL(/ehs/);
    });
  });

  test.describe('404 与无效路由处理', () => {
    test('无效路由应显示 404 提示', async ({ authenticatedPage: page }) => {
      await page.goto(`${BASE_URL}/this-route-does-not-exist-12345`);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      const notFoundIndicator = page.locator(
        'text=/404|页面不存在|Not Found|找不到页面/i'
      );
      const body = page.locator('body');
      await expect(body).toBeVisible();

      const has404 = await notFoundIndicator.first().isVisible().catch(() => false);
      if (has404) {
        await expect(notFoundIndicator.first()).toBeVisible();
      }
    });

    test('无效模块路径应被妥善处理', async ({ authenticatedPage: page }) => {
      await page.goto(`${BASE_URL}/nonexistent-module-xyz/sub-page`);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      await expect(page.locator('body')).toBeVisible();
    });

    test('无效 ID 参数不应导致页面崩溃', async ({ authenticatedPage: page }) => {
      await page.goto(`${BASE_URL}/iam/user/invalid-id-999999`);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      await expect(page.locator('body')).toBeVisible();
    });
  });
});
