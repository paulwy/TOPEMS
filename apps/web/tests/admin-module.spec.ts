import { test as base, expect, Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3002';

type TestFixtures = {
  authenticatedPage: Page;
};

const test = base.extend<TestFixtures>({
  authenticatedPage: async ({ page }, use) => {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    const usernameInput = page.locator('input[placeholder="请输入用户名"]');
    const passwordInput = page.locator('input[placeholder="请输入密码"]');
    const loginButton = page.locator('button:has-text("登录")');

    await usernameInput.waitFor({ state: 'visible', timeout: 10000 });
    await usernameInput.fill('admin');
    await passwordInput.fill('admin123');
    await loginButton.click();

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await use(page);
  },
});

async function verifyPageLoads(page: Page, path: string) {
  await page.goto(`${BASE_URL}${path}`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  const layout = page.locator('[class*="layout"], [class*="GlobalLayout"], main, [class*="PageContainer"]');
  await expect(layout.first()).toBeVisible({ timeout: 10000 });
}

test.describe('统一身份管理 (Admin) 模块', () => {
  test.describe.configure({ mode: 'serial' });

  test.describe('概览分组', () => {
    test('仪表盘 - 应该正确加载', async ({ authenticatedPage: page }) => {
      await verifyPageLoads(page, '/admin/dashboard');

      const statCards = page.locator('[class*="MuiCard"], [class*="card"], [class*="stat"]');
      const cardCount = await statCards.count();
      expect(cardCount).toBeGreaterThan(0);
    });
  });

  test.describe('租户管理分组', () => {
    test('租户管理 - 应该正常加载', async ({ authenticatedPage: page }) => {
      await verifyPageLoads(page, '/admin/tenant');
    });

    test('租户详情 - 应该正常加载', async ({ authenticatedPage: page }) => {
      await verifyPageLoads(page, '/admin/tenant-detail');
    });

    test('租户计费 - 应该正常加载', async ({ authenticatedPage: page }) => {
      await verifyPageLoads(page, '/admin/tenant-billing');
    });
  });

  test.describe('用户权限分组', () => {
    test('用户管理 - 应该正常加载', async ({ authenticatedPage: page }) => {
      await verifyPageLoads(page, '/admin/user');
    });

    test('角色管理 - 应该正常加载', async ({ authenticatedPage: page }) => {
      await verifyPageLoads(page, '/admin/role');
    });

    test('权限管理 - 应该正常加载', async ({ authenticatedPage: page }) => {
      await verifyPageLoads(page, '/admin/permission');
    });

    test('账号管理 - 应该正常加载', async ({ authenticatedPage: page }) => {
      await verifyPageLoads(page, '/admin/account');
    });

    test('银行账号 - 应该正常加载', async ({ authenticatedPage: page }) => {
      await verifyPageLoads(page, '/admin/bank-account');
    });

    test('公司结构 - 应该正常加载', async ({ authenticatedPage: page }) => {
      await verifyPageLoads(page, '/admin/company-structure');
    });
  });

  test.describe('系统配置分组', () => {
    test('数据字典 - 应该正常加载', async ({ authenticatedPage: page }) => {
      await verifyPageLoads(page, '/admin/dictionary');
    });

    test('系统管理 - 应该正常加载', async ({ authenticatedPage: page }) => {
      await verifyPageLoads(page, '/admin/system');
    });

    test('插件管理 - 应该正常加载', async ({ authenticatedPage: page }) => {
      await verifyPageLoads(page, '/admin/plugin');
    });
  });

  test.describe('运维工具分组', () => {
    test('数据库结构 - 应该正常加载', async ({ authenticatedPage: page }) => {
      await verifyPageLoads(page, '/admin/database');
    });

    test('数据迁移 - 应该正常加载', async ({ authenticatedPage: page }) => {
      await verifyPageLoads(page, '/admin/migration');
    });

    test('配置调试 - 应该正常加载', async ({ authenticatedPage: page }) => {
      await verifyPageLoads(page, '/admin/config-debug');
    });
  });

  test.describe('监控审计分组', () => {
    test('审计日志 - 应该正常加载', async ({ authenticatedPage: page }) => {
      await verifyPageLoads(page, '/admin/audit-log');
    });

    test('系统监控 - 应该正常加载', async ({ authenticatedPage: page }) => {
      await verifyPageLoads(page, '/admin/monitor');
    });

    test('性能监控 - 应该正常加载', async ({ authenticatedPage: page }) => {
      await verifyPageLoads(page, '/admin/performance');
    });
  });

  test.describe('兼容性测试 - 旧路径重定向', () => {
    test('IAM 旧路径应该重定向到 Admin', async ({ authenticatedPage: page }) => {
      await page.goto(`${BASE_URL}/iam/dashboard`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      expect(page.url()).toContain('/admin/dashboard');
    });

    test('旧 /iam/users 应该重定向到 /admin/user', async ({ authenticatedPage: page }) => {
      await page.goto(`${BASE_URL}/iam/users`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      expect(page.url()).toContain('/admin/user');
    });

    test('旧 /iam/roles 应该重定向到 /admin/role', async ({ authenticatedPage: page }) => {
      await page.goto(`${BASE_URL}/iam/roles`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      expect(page.url()).toContain('/admin/role');
    });
  });

  test.describe('导航功能测试', () => {
    test('侧边栏导航应该正常工作', async ({ authenticatedPage: page }) => {
      await page.goto(`${BASE_URL}/admin/dashboard`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      const navLinks = page.locator('aside a, nav a, [class*="sidebar"] a, [class*="Sidebar"] a');
      const initialUrl = page.url();

      if ((await navLinks.count()) > 0) {
        const userManagementLink = navLinks.filter({ hasText: /用户管理|用户/ }).first();
        if (await userManagementLink.isVisible()) {
          await userManagementLink.click();
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(500);
          expect(page.url()).not.toBe(initialUrl);
        }
      }
    });

    test('面包屑导航应该正确显示', async ({ authenticatedPage: page }) => {
      await page.goto(`${BASE_URL}/admin/user`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      const breadcrumbs = page.locator('[class*="breadcrumb"], [class*="Breadcrumb"], nav[aria-label*="breadcrumb"]').first();
      if (await breadcrumbs.isVisible()) {
        const text = await breadcrumbs.innerText();
        expect(text.length).toBeGreaterThan(0);
      }
    });
  });

  test.describe('权限控制测试', () => {
    test('无权限用户应该看到权限提示', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      const usernameInput = page.locator('input[placeholder="请输入用户名"]');
      const passwordInput = page.locator('input[placeholder="请输入密码"]');
      const loginButton = page.locator('button:has-text("登录")');

      await usernameInput.waitFor({ state: 'visible', timeout: 10000 });
      await usernameInput.fill('user');
      await passwordInput.fill('admin123');
      await loginButton.click();

      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      await page.goto(`${BASE_URL}/admin/dashboard`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      const unauthorizedText = page.locator('text=权限不足');
      await expect(unauthorizedText).toBeVisible({ timeout: 5000 });

      const permissionMessage = page.locator('text=您没有访问此页面的权限');
      await expect(permissionMessage).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('响应式布局测试', () => {
    test('移动端视图应该正确显示', async ({ authenticatedPage: page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(`${BASE_URL}/admin/dashboard`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      const layout = page.locator('[class*="layout"], [class*="GlobalLayout"], main, [class*="PageContainer"]');
      await expect(layout.first()).toBeVisible({ timeout: 5000 });
    });

    test('平板视图应该正确显示', async ({ authenticatedPage: page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto(`${BASE_URL}/admin/dashboard`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      const layout = page.locator('[class*="layout"], [class*="GlobalLayout"], main, [class*="PageContainer"]');
      await expect(layout.first()).toBeVisible({ timeout: 5000 });
    });
  });
});
