import { test, expect } from '@playwright/test';
import { loginViaUi, TEST_USERS } from '../../helpers/auth';

/**
 * MES Dashboard E2E coverage (V216).
 * 登录 → 跳转 /mes/dashboard → 校验页面加载（含空状态守卫）。
 */
test.describe('MES - Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUi(page, TEST_USERS.admin);
  });

  test('can navigate to the MES dashboard page', async ({ page }) => {
    await page.goto('/mes/dashboard');
    await expect(page).toHaveURL(/mes/i, { timeout: 15_000 });
    await expect(
      page
        .getByRole('table')
        .or(page.getByText(/暂无数据|no data|empty/i))
        .or(page.getByRole('heading'))
        .first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test('falls back to MES root when dashboard route is absent', async ({ page }) => {
    await page.goto('/mes');
    await expect(page).toHaveURL(/mes/i, { timeout: 15_000 });
    await expect(
      page
        .getByRole('table')
        .or(page.getByText(/暂无数据|no data|empty/i))
        .or(page.getByRole('heading'))
        .first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test('can navigate to the production kanban page', async ({ page }) => {
    await page.goto('/mes/production-kanban');
    await expect(page).toHaveURL(/mes/i, { timeout: 15_000 });
    await expect(
      page
        .getByRole('heading')
        .or(page.getByText(/看板|kanban/i))
        .or(page.getByText(/暂无数据|no data|empty/i))
        .first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test('can navigate to the APS scheduling page', async ({ page }) => {
    await page.goto('/mes/aps-scheduling');
    await expect(page).toHaveURL(/mes/i, { timeout: 15_000 });
    await expect(
      page
        .getByRole('heading')
        .or(page.getByText(/排程|scheduling/i))
        .or(page.getByText(/暂无数据|no data|empty/i))
        .first()
    ).toBeVisible({ timeout: 15_000 });
  });
});
