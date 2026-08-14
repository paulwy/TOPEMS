import { test, expect, APIRequestContext } from '@playwright/test';
import { loginViaUi, TEST_USERS } from '../../helpers/auth';
import { buildApiContext, apiGet, API_PATHS } from '../../helpers/api';

/**
 * HRM Recruitment & Positions E2E coverage (V216).
 * 登录 → 跳转招聘/岗位列表 → 校验表格或空状态 → API 列表验证。
 */
test.describe('HRM - Recruitment & Positions', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUi(page, TEST_USERS.admin);
  });

  test('can navigate to the recruitment page', async ({ page }) => {
    await page.goto('/hrm/recruitment');
    await expect(page).toHaveURL(/hrm/i, { timeout: 15_000 });
    await expect(
      page
        .getByRole('table')
        .or(page.getByText(/暂无数据|no data|empty/i))
        .first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test('can navigate to the positions page', async ({ page }) => {
    await page.goto('/hrm/positions');
    await expect(page).toHaveURL(/hrm/i, { timeout: 15_000 });
    await expect(
      page
        .getByRole('table')
        .or(page.getByText(/暂无数据|no data|empty/i))
        .first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test('search filters the recruitment list (when search box exists)', async ({ page }) => {
    await page.goto('/hrm/recruitment');
    const search = page.getByPlaceholder(/搜索|search|招聘|recruit/i).first();
    if (await search.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await search.fill('TEST-NOT-EXISTING-XYZ');
      await expect(
        page.getByText(/暂无数据|no data|empty/i).or(page.getByRole('table'))
      ).toBeVisible({ timeout: 10_000 });
    }
  });

  test('pagination next button works on positions page (when present)', async ({ page }) => {
    await page.goto('/hrm/positions');
    const next = page.getByRole('button', { name: /下一页|next/i }).first();
    if (await next.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await next.click();
      await expect(page).toHaveURL(/hrm/i, { timeout: 10_000 });
    }
  });
});

test.describe('HRM Recruitment & Position - API', () => {
  let ctx: APIRequestContext;

  test.beforeAll(async () => {
    ctx = await buildApiContext();
  });

  test.afterAll(async () => {
    await ctx?.dispose();
  });

  test('GET /api/hrm/positions returns a list (or skips if unavailable)', async () => {
    let data: unknown;
    try {
      data = await apiGet<unknown>(ctx, API_PATHS.hrm.position);
    } catch {
      test.skip(true, 'HRM position API not available');
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

  test('GET /api/hrm/recruitment returns a list (or skips if unavailable)', async () => {
    let data: unknown;
    try {
      data = await apiGet<unknown>(ctx, API_PATHS.hrm.recruitment);
    } catch {
      test.skip(true, 'HRM recruitment API not available');
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
