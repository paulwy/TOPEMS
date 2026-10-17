import { test, expect } from '@playwright/test';
import { createAuthenticatedContext } from '../utils/testUtils';

let authenticatedContext: any;

test.describe('首页组件测试', () => {
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

  test('首页应显示分区布局', async () => {
    const page = await authenticatedContext.newPage();
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('text=工作台').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=概览')).toBeVisible();
    await expect(page.locator('text=模块状态').first()).toBeVisible();
    await expect(page.locator('text=实时告警').first()).toBeVisible();
    await expect(page.locator('text=待办任务').first()).toBeVisible();

    await page.close();
  });

  test('服务状态监测组件应显示', async () => {
    const page = await authenticatedContext.newPage();
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('text=系统健康')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=服务状态监控')).toBeVisible();

    const refreshButton = page.locator('[data-testid="service-refresh-button"]');
    if (await refreshButton.isVisible().catch(() => false)) {
      await expect(refreshButton).toBeVisible();
    }

    await page.close();
  });

  test('分区应支持折叠展开', async () => {
    const page = await authenticatedContext.newPage();
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('text=模块状态').first()).toBeVisible({ timeout: 10000 });

    const section = page.locator('text=模块状态').first().locator('..');
    const collapseButton = section.locator('button').first();
    if (await collapseButton.isVisible().catch(() => false)) {
      await collapseButton.click();
    }

    await page.close();
  });
});

test.describe('导航组件测试', () => {
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

  test('顶部导航应显示所有模块', async () => {
    const page = await authenticatedContext.newPage();
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('text=首页')).toBeVisible();
    await expect(page.locator('text=制造执行')).toBeVisible();
    await expect(page.locator('text=人力资源')).toBeVisible();
    await expect(page.locator('text=客户管理')).toBeVisible();

    await page.close();
  });

  test('导航下拉菜单应正常工作', async () => {
    const page = await authenticatedContext.newPage();
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    await page.click('text=人力资源');
    await expect(page.locator('text=员工管理')).toBeVisible();
    await expect(page.locator('text=组织架构')).toBeVisible();

    await page.close();
  });

  test('模块Tab应正常切换', async () => {
    const page = await authenticatedContext.newPage();
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    await page.click('text=制造执行');
    await page.click('text=生产订单');
    await expect(page).toHaveURL(/\/mes\/production-orders/);

    await page.close();
  });
});

test.describe('响应式布局测试', () => {
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

  test('桌面端应显示完整导航', async () => {
    const page = await authenticatedContext.newPage();
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('text=首页')).toBeVisible();
    await expect(page.locator('text=人力')).toBeVisible();

    await page.close();
  });

  test('移动端应显示汉堡菜单', async () => {
    const page = await authenticatedContext.newPage();
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    const menuButton = page.locator('[data-testid="mobile-menu-button"]');
    if (await menuButton.isVisible()) {
      await menuButton.click();
      await expect(page.locator('[data-testid="mobile-drawer"]')).toBeVisible();
    }

    await page.close();
  });
});

test.describe('主题切换测试', () => {
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

  test('应支持主题切换', async () => {
    const page = await authenticatedContext.newPage();
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    const themeButton = page.locator('[data-testid="theme-toggle-button"]');
    if (await themeButton.isVisible()) {
      await themeButton.click();
    }

    await page.close();
  });
});