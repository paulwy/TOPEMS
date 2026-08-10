import { test, expect, type Page } from '@playwright/test';

const e2eUser = {
  id: 'behavior-guardrails-admin',
  username: 'admin',
  email: 'admin@example.com',
  full_name: '行为铁律管理员',
  realName: '行为铁律管理员',
  name: '行为铁律管理员',
  isActive: true,
  is_superuser: true,
  isSuperuser: true,
  roles: ['admin'],
  permissions: ['*'],
};

async function mockBackend(page: Page) {
  await page.route('**/api/**', async (route) => {
    const requestUrl = new URL(route.request().url());
    const url = requestUrl.href;

    if (!requestUrl.pathname.startsWith('/api/')) {
      await route.continue();
      return;
    }

    if (url.includes('/notifications/unread-count')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ code: 0, success: true, data: 0, message: 'ok', timestamp: Date.now() }),
      });
      return;
    }

    if (url.includes('/notifications')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 0,
          success: true,
          data: { notifications: [], total: 0, page: 1, pagesize: 20, unread_count: 0 },
          message: 'ok',
          timestamp: Date.now(),
        }),
      });
      return;
    }

    if (url.includes('/auth/logout')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ code: 0, success: true, data: null, message: 'ok', timestamp: Date.now() }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ code: 0, success: true, data: [], message: 'ok', timestamp: Date.now() }),
    });
  });
}

async function seedAuthenticatedSession(page: Page) {
  await page.addInitScript((user) => {
    Object.defineProperty(window.screen, 'width', { value: 1440, configurable: true });
    Object.defineProperty(window.screen, 'height', { value: 900, configurable: true });
    if (!window.localStorage.getItem('token')) {
      window.localStorage.setItem('token', 'behavior.guardrails.token');
      window.localStorage.setItem('refresh_token', 'behavior.guardrails.refresh');
      window.localStorage.setItem('user', JSON.stringify(user));
      window.localStorage.setItem('roles', JSON.stringify(['admin']));
      window.localStorage.setItem('permissions', JSON.stringify(['*']));
      window.localStorage.setItem('current_tenant_id', 'default');
    }
    if (!window.localStorage.getItem('topems-theme-storage')) {
      window.localStorage.setItem(
        'topems-theme-storage',
        JSON.stringify({ state: { theme: 'light' }, version: 0 })
      );
    }
  }, e2eUser);
}

async function openDashboard(page: Page) {
  await mockBackend(page);
  await seedAuthenticatedSession(page);
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.app-header-logo')).toBeVisible();
}

test.describe('UI §15.3 行为铁律', () => {
  test.beforeEach(async ({ page }) => {
    await openDashboard(page);
  });

  test('退出登录必须先出现二次确认', async ({ page }) => {
    await page.getByRole('button', { name: '用户菜单' }).click();
    await page.getByRole('menuitem', { name: /退出登录/ }).click();

    const dialog = page.getByRole('dialog', { name: /确认退出登录/ });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/退出后清除本地会话需重登/)).toBeVisible();

    await dialog.getByRole('button', { name: '取消' }).click();
    await expect(dialog).toBeHidden();
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('点击 Header Logo 必须回到 dashboard', async ({ page }) => {
    await page.goto('/mes/production-orders', { waitUntil: 'networkidle' });
    await page.locator('.app-header-logo').click();
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('Ctrl/Cmd+K 必须打开全局命令面板搜索', async ({ page }) => {
    await page.evaluate(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'k',
          ctrlKey: true,
          bubbles: true,
          cancelable: true,
        })
      );
    });
    await expect(page.getByPlaceholder('搜索页面、操作...')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByPlaceholder('搜索页面、操作...')).toBeHidden();
  });

  test('主题切换必须写入 localStorage 并可跨刷新保持', async ({ page }) => {
    await page.getByRole('button', { name: '切换主题' }).click();
    await page.getByText('暗色', { exact: true }).click();

    await expect
      .poll(async () =>
        page.evaluate(() => {
          const raw = window.localStorage.getItem('topems-theme-storage');
          return raw ? JSON.parse(raw).state?.theme : null;
        })
      )
      .toBe('dark');

    await page.reload({ waitUntil: 'networkidle' });
    const persistedTheme = await page.evaluate(() => {
      const raw = window.localStorage.getItem('topems-theme-storage');
      return raw ? JSON.parse(raw).state?.theme : null;
    });
    expect(persistedTheme).toBe('dark');
  });

  test('详情页返回必须保留来源列表筛选参数', async ({ page }) => {
    const sourceSearch = '?q=V69Guard&page=2&pageSize=20&status=active';

    await page.evaluate((search) => {
      window.history.pushState(
        {
          usr: {
            from: {
              pathname: '/rd/project',
              search,
              customState: { q: 'V69Guard', page: 2, status: 'active' },
            },
          },
          key: 'behavior-guardrails-detail',
        },
        '',
        '/rd/project/behavior-guardrails-id'
      );
      window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }));
    }, sourceSearch);

    await expect(page).toHaveURL(/\/rd\/project\/behavior-guardrails-id/);
    await page.getByRole('button', { name: '返回' }).first().click();
    await expect.poll(() => page.url()).toContain(`/rd/project${sourceSearch}`);
  });

  test('Ctrl/Cmd+Space 必须唤起 AI 并写入当前上下文', async ({ page }) => {
    await page.keyboard.press('Control+Space');

    await expect(page).toHaveURL(/\/ai(\/dashboard)?$/);
    const aiContext = await page.evaluate(() => {
      const raw = window.localStorage.getItem('ai-copilot-context');
      return raw ? JSON.parse(raw) : null;
    });

    expect(aiContext).toMatchObject({
      pathname: '/dashboard',
      moduleCode: 'dashboard',
    });
  });
});
