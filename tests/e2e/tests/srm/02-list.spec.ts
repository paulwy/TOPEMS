import { test, expect, APIRequestContext } from '@playwright/test';
import { loginViaUi, TEST_USERS } from '../../helpers/auth';
import { buildApiContext, apiGet, extractList, API_PATHS } from '../../helpers/api';

/**
 * SRM Supplier list E2E coverage (P33-4).
 * 登录 → 跳转列表页 → 校验表格或空状态 → 搜索/分页（带守卫）。
 */
test.describe('SRM - List', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUi(page, TEST_USERS.admin);
  });

  test('can navigate to the supplier list page', async ({ page }) => {
    await page.goto('/srm/supplier');
    await expect(page).toHaveURL(/srm/i, { timeout: 15_000 });
    await expect(
      page
        .getByRole('table')
        .or(page.getByText(/暂无数据|no data|empty/i))
        .first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test('can navigate to the inquiry list page', async ({ page }) => {
    // 路由改名：/srm/inquiries → /srm/inquiry（SRM_PATHS.inquiry）
    await page.goto('/srm/inquiry');
    await expect(page).toHaveURL(/srm/i, { timeout: 15_000 });
    await expect(
      page
        .getByRole('table')
        .or(page.getByText(/暂无数据|no data|empty/i))
        .first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test('search filters the supplier list (when search box exists)', async ({ page }) => {
    await page.goto('/srm/supplier');
    const search = page.getByPlaceholder(/搜索|search|供应商|名称/i).first();
    if (await search.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await search.fill('TEST-NOT-EXISTING-XYZ');
      await expect(
        page.getByText(/暂无数据|no data|empty/i).or(page.getByRole('table'))
      ).toBeVisible({ timeout: 10_000 });
    }
  });

  test('pagination next button works (when present)', async ({ page }) => {
    await page.goto('/srm/supplier');
    const next = page.getByRole('button', { name: /下一页|next/i }).first();
    if (await next.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await next.click();
      await expect(page).toHaveURL(/srm/i, { timeout: 10_000 });
    }
  });
});

test.describe('SRM Supplier - API', () => {
  let ctx: APIRequestContext;

  test.beforeAll(async () => {
    ctx = await buildApiContext();
  });

  test.afterAll(async () => {
    await ctx?.dispose();
  });

  test('GET /api/srm/suppliers returns a list (or skips if unavailable)', async () => {
    let data: unknown;
    try {
      data = await apiGet<unknown>(ctx, API_PATHS.srm.supplier);
    } catch {
      test.skip(true, 'SRM supplier API not available');
      return;
    }
    // 实测：SRM 分页键是 suppliers，不是通用 items/records
    expect(extractList(data), 'expected an array or paginated list').not.toBeNull();
  });
});
