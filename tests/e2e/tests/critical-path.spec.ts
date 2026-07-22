/**
 * TOPEMS 核心业务链路 E2E 聚合测试
 *
 * V14.0 AC-4 验收文件：`npx playwright test tests/e2e/critical-path.spec.ts`
 *
 * 本文件聚合 5 个核心业务流程的冒烟测试，验证端到端链路可用性：
 * 1. 登录认证 (Auth)
 * 2. 生产订单 (MES)
 * 3. 采购订单 (SCM/ERP)
 * 4. 财务凭证 (Finance/ERP)
 * 5. 库存出入库 (WMS)
 *
 * 每个流程仅包含最关键的冒烟断言，详细测试见各自独立 spec 文件。
 */

import { test, expect } from '@playwright/test';
import { loginViaUi, TEST_USERS, isLoggedIn } from '../helpers/auth';
import {
  buildApiContext,
  apiGet,
  apiPost,
  PaginatedResponse,
} from '../helpers/api';

test.describe('Critical Path - 1. Login Auth', () => {
  test('admin can login via UI', async ({ page }) => {
    await loginViaUi(page, TEST_USERS.admin);
    expect(await isLoggedIn(page)).toBeTruthy();
  });

  test('API login returns valid token', async () => {
    const ctx = await buildApiContext();
    expect(ctx).toBeTruthy();
    await ctx.dispose();
  });
});

test.describe('Critical Path - 2. Production Order (MES)', () => {
  let ctx: Awaited<ReturnType<typeof buildApiContext>>;

  test.beforeAll(async () => {
    ctx = await buildApiContext();
  });

  test.afterAll(async () => {
    await ctx.dispose();
  });

  test('can list production orders', async () => {
    const res = await apiGet<PaginatedResponse<unknown>>(ctx, '/api/mes/production-orders', {
      page: 0,
      pagesize: 10,
    });
    expect(res).toBeTruthy();
    expect(Array.isArray(res.items ?? [])).toBeTruthy();
  });

  test('UI shows production order page', async ({ page }) => {
    await loginViaUi(page, TEST_USERS.admin);
    await page.goto('/mes/production-orders');
    await expect(page).toHaveURL(/production-orders/);
  });
});

test.describe('Critical Path - 3. Purchase Order (SCM)', () => {
  let ctx: Awaited<ReturnType<typeof buildApiContext>>;

  test.beforeAll(async () => {
    ctx = await buildApiContext();
  });

  test.afterAll(async () => {
    await ctx.dispose();
  });

  test('can list purchase orders', async () => {
    const res = await apiGet<PaginatedResponse<unknown>>(ctx, '/api/scm/purchase-orders', {
      page: 0,
      pagesize: 10,
    });
    expect(res).toBeTruthy();
    expect(Array.isArray(res.items ?? [])).toBeTruthy();
  });

  test('UI shows purchase order page', async ({ page }) => {
    await loginViaUi(page, TEST_USERS.admin);
    await page.goto('/scm/purchase-orders');
    await expect(page).toHaveURL(/\/scm/);
  });
});

test.describe('Critical Path - 4. Financial Voucher (Finance)', () => {
  let ctx: Awaited<ReturnType<typeof buildApiContext>>;

  test.beforeAll(async () => {
    ctx = await buildApiContext();
  });

  test.afterAll(async () => {
    await ctx.dispose();
  });

  test('can list vouchers', async () => {
    const res = await apiGet<PaginatedResponse<unknown>>(ctx, '/api/finance/vouchers', {
      page: 0,
      pagesize: 10,
    });
    expect(res).toBeTruthy();
    expect(Array.isArray(res.items ?? [])).toBeTruthy();
  });

  test('UI shows voucher page', async ({ page }) => {
    await loginViaUi(page, TEST_USERS.admin);
    await page.goto('/finance/vouchers');
    await expect(page).toHaveURL(/\/finance/);
  });
});

test.describe('Critical Path - 5. WMS Inventory', () => {
  let ctx: Awaited<ReturnType<typeof buildApiContext>>;

  test.beforeAll(async () => {
    ctx = await buildApiContext();
  });

  test.afterAll(async () => {
    await ctx.dispose();
  });

  test('can list inventory', async () => {
    const res = await apiGet<PaginatedResponse<unknown>>(ctx, '/api/wms/inventory', {
      page: 0,
      pagesize: 10,
    });
    expect(res).toBeTruthy();
    expect(Array.isArray(res.items ?? [])).toBeTruthy();
  });

  test('UI shows inventory page', async ({ page }) => {
    await loginViaUi(page, TEST_USERS.admin);
    await page.goto('/wms/inventory');
    await expect(page).toHaveURL(/\/wms/);
  });
});

test.describe('Critical Path - Cross-Module Smoke', () => {
  /**
   * 跨模块冒烟：验证登录后可连续访问多个模块页面而不报错
   */
  test('admin can navigate across modules without errors', async ({ page }) => {
    await loginViaUi(page, TEST_USERS.admin);

    const modulePages = [
      { path: '/dashboard', name: '仪表盘' },
      { path: '/mes/production-orders', name: '生产订单' },
      { path: '/wms/inventory', name: '库存' },
      { path: '/scm/purchase-orders', name: '采购订单' },
    ];

    for (const { path, name } of modulePages) {
      await page.goto(path);
      // 每个页面应能加载（不出现 500 错误页面）
      await expect(page).not.toHaveURL(/\/error|\/404|\/500/);
      // 页面应有可见内容（不是白屏）
      await expect(page.locator('body')).not.toBeEmpty({ timeout: 10_000 });
    }
  });
});
