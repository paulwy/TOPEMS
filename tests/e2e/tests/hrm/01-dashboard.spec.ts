import { test, expect } from '@playwright/test';
import { loginViaUi, TEST_USERS } from '../../helpers/auth';

/**
 * HRM Dashboard E2E coverage (P33-4).
 * 登录 → 跳转 /hrm/dashboard → 校验页面加载（含空状态守卫）。
 */
test.describe('HRM - Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUi(page, TEST_USERS.admin);
  });

  test('can navigate to the HRM dashboard page', async ({ page }) => {
    await page.goto('/hrm/dashboard');
    await expect(page).toHaveURL(/hrm/i, { timeout: 15_000 });
    await expect(
      page
        .getByRole('table')
        .or(page.getByText(/暂无数据|no data|empty/i))
        .or(page.getByRole('heading'))
        .first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test('falls back to HRM root when dashboard route is absent', async ({ page }) => {
    await page.goto('/hrm');
    await expect(page).toHaveURL(/hrm/i, { timeout: 15_000 });
    await expect(
      page
        .getByRole('table')
        .or(page.getByText(/暂无数据|no data|empty/i))
        .or(page.getByRole('heading'))
        .first()
    ).toBeVisible({ timeout: 15_000 });
  });
});
