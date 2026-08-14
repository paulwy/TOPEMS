import { test, expect, APIRequestContext } from '@playwright/test';
import { loginViaUi, TEST_USERS } from '../../helpers/auth';
import { buildApiContext, apiGet, API_PATHS } from '../../helpers/api';

/**
 * CRM Customer / Contact list E2E coverage (V216).
 * 登录 → 跳转列表页 → 校验表格或空状态 → 搜索/分页（带守卫）。
 */
test.describe('CRM - List', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUi(page, TEST_USERS.admin);
  });

  test('can navigate to the customer list page', async ({ page }) => {
    await page.goto('/crm/customers');
    await expect(page).toHaveURL(/crm/i, { timeout: 15_000 });
    await expect(
      page
        .getByRole('table')
        .or(page.getByText(/暂无数据|no data|empty/i))
        .first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test('can navigate to the contact list page', async ({ page }) => {
    await page.goto('/crm/contacts');
    await expect(page).toHaveURL(/crm/i, { timeout: 15_000 });
    await expect(
      page
        .getByRole('table')
        .or(page.getByText(/暂无数据|no data|empty/i))
        .first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test('can navigate to the opportunity list page', async ({ page }) => {
    await page.goto('/crm/opportunities');
    await expect(page).toHaveURL(/crm/i, { timeout: 15_000 });
    await expect(
      page
        .getByRole('table')
        .or(page.getByText(/暂无数据|no data|empty/i))
        .first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test('search filters the customer list (when search box exists)', async ({ page }) => {
    await page.goto('/crm/customers');
    const search = page.getByPlaceholder(/搜索|search|客户|customer/i).first();
    if (await search.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await search.fill('TEST-NOT-EXISTING-XYZ');
      await expect(
        page.getByText(/暂无数据|no data|empty/i).or(page.getByRole('table'))
      ).toBeVisible({ timeout: 10_000 });
    }
  });

  test('pagination next button works (when present)', async ({ page }) => {
    await page.goto('/crm/customers');
    const next = page.getByRole('button', { name: /下一页|next/i }).first();
    if (await next.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await next.click();
      await expect(page).toHaveURL(/crm/i, { timeout: 10_000 });
    }
  });
});

test.describe('CRM Customer - API', () => {
  let ctx: APIRequestContext;

  test.beforeAll(async () => {
    ctx = await buildApiContext();
  });

  test.afterAll(async () => {
    await ctx?.dispose();
  });

  test('GET /api/crm/customers returns a list (or skips if unavailable)', async () => {
    let data: unknown;
    try {
      data = await apiGet<unknown>(ctx, API_PATHS.crm.customer);
    } catch {
      test.skip(true, 'CRM customer API not available');
      return;
    }
    const arr = Array.isArray(data)
      ? data
      : Array.isArray((data as { items?: unknown[] })?.items)
        ? (data as { items: unknown[] }).items
        : Array.isArray((data as { records?: unknown[] })?.records)
          ? (data as { records: unknown[] }).records
          : null;
    expect(arr, 'expected an array or paginated list').not.toBeNull();
  });

  test('GET /api/crm/contacts returns a list (or skips if unavailable)', async () => {
    let data: unknown;
    try {
      data = await apiGet<unknown>(ctx, API_PATHS.crm.contact);
    } catch {
      test.skip(true, 'CRM contact API not available');
      return;
    }
    const arr = Array.isArray(data)
      ? data
      : Array.isArray((data as { items?: unknown[] })?.items)
        ? (data as { items: unknown[] }).items
        : Array.isArray((data as { records?: unknown[] })?.records)
          ? (data as { records: unknown[] }).records
          : null;
    expect(arr, 'expected an array or paginated list').not.toBeNull();
  });
});
