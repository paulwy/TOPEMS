import fs from 'node:fs';
import path from 'node:path';
import { test, expect, type Page } from '@playwright/test';

const e2eUser = {
  id: 'ui-template-admin',
  username: 'admin',
  email: 'admin@example.com',
  full_name: 'UI 模板管理员',
  realName: 'UI 模板管理员',
  name: 'UI 模板管理员',
  isActive: true,
  is_superuser: true,
  isSuperuser: true,
  roles: ['admin'],
  permissions: ['*'],
};

const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 },
];

const pageSamples = [
  { id: 'dashboard', label: 'Dashboard 模板', path: '/dashboard' },
  { id: 'list', label: 'ListPageTemplate 模板', path: '/crm/customers' },
  { id: 'create', label: 'FormPageTemplate 新建模板', path: '/crm/customers/create' },
  { id: 'detail', label: 'DetailPageTemplate 详情模板', path: '/crm/customers/p3-ui-template' },
  { id: 'settings', label: 'SettingsPageTemplate 设置模板', path: '/admin/system-settings' },
  { id: 'ai-dashboard', label: 'AI Dashboard 模板', path: '/ai/dashboard' },
];

async function mockBackend(page: Page) {
  await page.route('**/api/**', async (route) => {
    const requestUrl = new URL(route.request().url());
    if (!requestUrl.pathname.startsWith('/api/')) {
      await route.continue();
      return;
    }

    const now = Date.now();
    if (requestUrl.href.includes('/notifications/unread-count')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ code: 0, success: true, data: 0, message: 'ok', timestamp: now }),
      });
      return;
    }

    if (requestUrl.href.includes('/notifications')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 0,
          success: true,
          data: { notifications: [], total: 0, page: 1, pagesize: 20, unread_count: 0 },
          message: 'ok',
          timestamp: now,
        }),
      });
      return;
    }

    const row = {
      id: 'p3-ui-template',
      code: 'P3-UI-001',
      name: 'P3 UI 模板样例',
      customer_name: 'P3 UI 模板样例',
      status: 'active',
      created_at: new Date(now).toISOString(),
    };

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        code: 0,
        success: true,
        data: {
          items: [row],
          list: [row],
          records: [row],
          data: [row],
          total: 1,
          page: 1,
          pageSize: 20,
          ...row,
        },
        message: 'ok',
        timestamp: now,
      }),
    });
  });
}

async function seedAuthenticatedSession(page: Page) {
  await page.addInitScript((user) => {
    window.localStorage.setItem('token', 'ui.template.token');
    window.localStorage.setItem('refresh_token', 'ui.template.refresh');
    window.localStorage.setItem('user', JSON.stringify(user));
    window.localStorage.setItem('roles', JSON.stringify(['admin']));
    window.localStorage.setItem('permissions', JSON.stringify(['*']));
    window.localStorage.setItem('current_tenant_id', 'default');
    window.localStorage.setItem(
      'topems-theme-storage',
      JSON.stringify({ state: { theme: 'light' }, version: 0 })
    );
  }, e2eUser);
}

async function openSample(page: Page, samplePath: string) {
  await mockBackend(page);
  await seedAuthenticatedSession(page);
  await page.goto(samplePath, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.app-header-logo')).toBeVisible();
  await expect(page.locator('#main-content')).toBeVisible();
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const main = document.querySelector('#main-content');
    if (!main) return Number.POSITIVE_INFINITY;
    return main.scrollWidth - main.clientWidth;
  });
  expect(overflow).toBeLessThanOrEqual(8);
}

test.describe('P3 页面模板 UI 细节校验', () => {
  for (const sample of pageSamples) {
    test(`${sample.label} 必须满足基础布局约束`, async ({ page }) => {
      await page.setViewportSize(viewports[0]);
      await openSample(page, sample.path);

      await expect(page.locator('body')).not.toContainText('Cannot find module');
      await expect(page.locator('body')).not.toContainText('Unhandled Runtime Error');
      await expectNoHorizontalOverflow(page);

      const mainBox = await page.locator('#main-content').boundingBox();
      expect(mainBox?.width).toBeGreaterThan(300);
      expect(mainBox?.height).toBeGreaterThan(300);
    });
  }
});

test.describe('P3 响应式三档截图', () => {
  const outputDir = path.resolve(process.cwd(), 'test-results', 'responsive-screenshots');

  test.beforeAll(() => {
    fs.mkdirSync(outputDir, { recursive: true });
  });

  for (const viewport of viewports) {
    for (const sample of pageSamples) {
      test(`${sample.label} ${viewport.name} 截图`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await openSample(page, sample.path);
        await expectNoHorizontalOverflow(page);

        await page.screenshot({
          path: path.join(outputDir, `${sample.id}-${viewport.name}.png`),
          fullPage: true,
        });
      });
    }
  }
});
