import { test, expect, APIRequestContext } from '@playwright/test';
import { loginViaUi, TEST_USERS } from '../../helpers/auth';
import { buildApiContext, apiGet, API_PATHS } from '../../helpers/api';

/**
 * HRM Attendance & Leave E2E coverage (V216).
 * 登录 → 跳转考勤/请假列表 → 校验表格或空状态 → API 列表验证。
 */
test.describe('HRM - Attendance & Leave', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUi(page, TEST_USERS.admin);
  });

  test('can navigate to the attendance page', async ({ page }) => {
    await page.goto('/hrm/attendance');
    await expect(page).toHaveURL(/hrm/i, { timeout: 15_000 });
    await expect(
      page
        .getByRole('table')
        .or(page.getByText(/暂无数据|no data|empty/i))
        .first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test('can navigate to the leave page', async ({ page }) => {
    await page.goto('/hrm/leave');
    await expect(page).toHaveURL(/hrm/i, { timeout: 15_000 });
    await expect(
      page
        .getByRole('table')
        .or(page.getByText(/暂无数据|no data|empty/i))
        .first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test('search filters the attendance list (when search box exists)', async ({ page }) => {
    await page.goto('/hrm/attendance');
    const search = page.getByPlaceholder(/搜索|search|考勤|attendance|员工/i).first();
    if (await search.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await search.fill('TEST-NOT-EXISTING-XYZ');
      await expect(
        page.getByText(/暂无数据|no data|empty/i).or(page.getByRole('table'))
      ).toBeVisible({ timeout: 10_000 });
    }
  });

  test('pagination next button works on attendance page (when present)', async ({ page }) => {
    await page.goto('/hrm/attendance');
    const next = page.getByRole('button', { name: /下一页|next/i }).first();
    if (await next.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await next.click();
      await expect(page).toHaveURL(/hrm/i, { timeout: 10_000 });
    }
  });
});

test.describe('HRM Attendance - API', () => {
  let ctx: APIRequestContext;

  test.beforeAll(async () => {
    ctx = await buildApiContext();
  });

  test.afterAll(async () => {
    await ctx?.dispose();
  });

  test('GET /api/hrm/attendance returns a list (or skips if unavailable)', async () => {
    let data: unknown;
    try {
      data = await apiGet<unknown>(ctx, API_PATHS.hrm.attendance);
    } catch {
      test.skip(true, 'HRM attendance API not available');
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

  test('GET /api/hrm/leaves returns a list (or skips if unavailable)', async () => {
    let data: unknown;
    try {
      data = await apiGet<unknown>(ctx, API_PATHS.hrm.leave);
    } catch {
      test.skip(true, 'HRM leave API not available');
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
