import { test, expect } from '@playwright/test';
import { loginViaUi, TEST_USERS } from '../../helpers/auth';

/**
 * CRM Dashboard E2E coverage (V216).
 * 登录 → 跳转 /crm/dashboard → 校验页面加载（含空状态守卫）。
 */
test.describe('CRM - Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUi(page, TEST_USERS.admin);
  });

  test('can navigate to the CRM dashboard page', async ({ page }) => {
    await page.goto('/crm/dashboard');
    await expect(page).toHaveURL(/crm/i, { timeout: 15_000 });
    await expect(
      page
        .getByRole('table')
        .or(page.getByText(/暂无数据|no data|empty/i))
        .or(page.getByRole('heading'))
        .first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test('falls back to CRM root when dashboard route is absent', async ({ page }) => {
    await page.goto('/crm');
    await expect(page).toHaveURL(/crm/i, { timeout: 15_000 });
    await expect(
      page
        .getByRole('table')
        .or(page.getByText(/暂无数据|no data|empty/i))
        .or(page.getByRole('heading'))
        .first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test('can navigate to the sales funnel page', async ({ page }) => {
    await page.goto('/crm/sales-funnel');
    await expect(page).toHaveURL(/crm/i, { timeout: 15_000 });
    await expect(
      page
        .getByRole('heading')
        .or(page.getByText(/漏斗|funnel/i))
        .or(page.getByText(/暂无数据|no data|empty/i))
        .first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test('can navigate to the RFM customer segmentation page', async ({ page }) => {
    await page.goto('/crm/rfm');
    await expect(page).toHaveURL(/crm/i, { timeout: 15_000 });
    await expect(
      page
        .getByRole('heading')
        .or(page.getByText(/RFM|分群|segmentation/i))
        .or(page.getByText(/暂无数据|no data|empty/i))
        .first()
    ).toBeVisible({ timeout: 15_000 });
  });
});
