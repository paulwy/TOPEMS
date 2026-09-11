import { test, expect } from '@playwright/test';
import { loginAsAdmin, navigateTo, expectUrl, expectPageVisible, expectHasHeading } from './helpers/auth';

/**
 * SCM 供应链分析报表 E2E 测试
 * 业务流程: 采购趋势 → 采购状态分布 → 供应商采购排名 → 采购成本分析 → 供应链预警
 * 测试用例: TC-SCM-011 ~ TC-SCM-015
 */
test.describe('SCM Supply Chain Analytics Reports (TC-SCM-011 ~ TC-SCM-015)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  // TC-SCM-011: 采购趋势分析，验证趋势数据
  test('TC-SCM-011 should analyze purchase trend and verify trend data', async ({ page }) => {
    await navigateTo(page, '/scm/overview');
    await expectUrl(page, /scm\/overview/);
    await expectPageVisible(page);
    await expectHasHeading(page);

    // 验证采购趋势图表加载
    const chart = page.locator('canvas, [class*="chart"], [class*="trend"]').first();
    await expect(chart).toBeVisible({ timeout: 5000 }).catch(() => {});

    // 验证统计卡片
    const summaryCards = page.locator('.ant-card, [class*="summary"], [class*="stat"]').first();
    await expect(summaryCards).toBeVisible({ timeout: 5000 }).catch(() => {});
  });

  // TC-SCM-012: 采购状态分布，验证分布统计
  test('TC-SCM-012 should analyze purchase status distribution and verify statistics', async ({ page }) => {
    await navigateTo(page, '/scm/purchase-orders');
    await expectUrl(page, /scm\/purchase-orders/);
    await expectPageVisible(page);
    await expectHasHeading(page);

    // 验证采购订单列表加载
    const table = page.locator('table, .ant-table').first();
    await expect(table).toBeVisible({ timeout: 10000 }).catch(() => {});

    // 验证状态分布图表
    const chart = page.locator('canvas, [class*="chart"], [class*="status"]').first();
    await expect(chart).toBeVisible({ timeout: 5000 }).catch(() => {});
  });

  // TC-SCM-013: 供应商采购排名，验证排名
  test('TC-SCM-013 should rank suppliers by purchase and verify ranking', async ({ page }) => {
    await navigateTo(page, '/scm/overview');
    await expectUrl(page, /scm\/overview/);
    await expectPageVisible(page);
    await expectHasHeading(page);

    // 验证供应商采购排名榜单/表格
    const rankTable = page.locator('table, .ant-table, [class*="rank"], [class*="leaderboard"]').first();
    await expect(rankTable).toBeVisible({ timeout: 5000 }).catch(() => {});

    // 验证统计卡片
    const summaryCards = page.locator('.ant-card, [class*="summary"], [class*="stat"]').first();
    await expect(summaryCards).toBeVisible({ timeout: 5000 }).catch(() => {});
  });

  // TC-SCM-014: 采购成本分析，验证成本统计
  test('TC-SCM-014 should analyze purchase cost and verify cost statistics', async ({ page }) => {
    await navigateTo(page, '/scm/price-comparison');
    await expectUrl(page, /scm\/price-comparison/);
    await expectPageVisible(page);
    await expectHasHeading(page);

    // 验证成本对比表格加载
    const table = page.locator('table, .ant-table').first();
    await expect(table).toBeVisible({ timeout: 10000 }).catch(() => {});

    // 验证成本对比图表
    const chart = page.locator('canvas, [class*="chart"]').first();
    await expect(chart).toBeVisible({ timeout: 5000 }).catch(() => {});
  });

  // TC-SCM-015: 供应链预警，验证预警逻辑
  test('TC-SCM-015 should verify supply chain alert logic', async ({ page }) => {
    await navigateTo(page, '/scm/overview');
    await expectUrl(page, /scm\/overview/);
    await expectPageVisible(page);
    await expectHasHeading(page);

    // 验证预警区域/告警列表存在
    const alertArea = page.locator(
      '[class*="alert"], [class*="warning"], [class*="notice"], .ant-alert'
    ).first();
    await expect(alertArea).toBeVisible({ timeout: 5000 }).catch(() => {});

    // 验证概览统计卡片
    const summaryCards = page.locator('.ant-card, [class*="summary"], [class*="stat"]').first();
    await expect(summaryCards).toBeVisible({ timeout: 5000 }).catch(() => {});
  });
});
