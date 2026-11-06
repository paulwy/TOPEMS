import { test, expect } from '@playwright/test';
import { loginViaUi, TEST_USERS, isLoggedIn } from '../helpers/auth';

test.describe('BI Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUi(page, TEST_USERS.admin);
  });

  test('bi/dashboard page loads and shows header', async ({ page }) => {
    await page.goto('/bi/dashboard');
    await expect(page).toHaveURL(/\/bi\/dashboard/);

    // 页面标题
    await expect(page.getByRole('heading', { name: /BI 仪表盘|BI Dashboard/i })).toBeVisible({ timeout: 10000 });

    // 副标题
    await expect(page.getByText(/管理和创建您的个性化数据仪表盘/i)).toBeVisible();
  });

  test('dashboard tab shows card grid', async ({ page }) => {
    await page.goto('/bi/dashboard');
    await expect(page).toHaveURL(/\/bi\/dashboard/);

    // 等待卡片加载
    await page.waitForTimeout(2000);

    // 应该有"仪表盘"tab 按钮
    const dashboardTab = page.getByRole('tab', { name: /仪表盘|Dashboard/i });
    await expect(dashboardTab).toBeVisible();

    // 应该有"创建仪表盘"按钮（空态区域与页头各有一个同名入口，取第一个即可）
    const createBtn = page.getByRole('button', { name: /创建仪表盘|Create Dashboard/i }).first();
    await expect(createBtn).toBeVisible();
  });

  test('template tab switches to template list', async ({ page }) => {
    await page.goto('/bi/dashboard');
    await expect(page).toHaveURL(/\/bi\/dashboard/);

    // 点击"模板"tab
    const templateTab = page.getByRole('tab', { name: /模板|Template/i });
    await templateTab.click();

    // 等待切换
    await page.waitForTimeout(1000);

    // 应该显示模板分类按钮
    await expect(page.getByText(/分类|Category/i).first()).toBeVisible({ timeout: 5000 });
  });
});
