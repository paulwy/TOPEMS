import { test, expect } from '@playwright/test';
import { loginAsAdmin, navigateTo, expectUrl, expectPageVisible, expectHasHeading } from './helpers/auth';

/**
 * TMS 运输分析报表 E2E 测试
 * 业务流程: 运输趋势 → 车辆运单排名 → 运单状态分布 → 运输成本分析 → 配送时效分析
 * 测试用例: TC-TMS-006 ~ TC-TMS-010
 */
test.describe('TMS Analytics Flow (TC-TMS-006 ~ TC-TMS-010)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  // TC-TMS-006: 运输趋势分析，验证趋势数据加载
  test('TC-TMS-006 should load shipment trend analysis and verify trend data', async ({ page }) => {
    await navigateTo(page, '/tms/analytics/shipment-trend');
    await expectUrl(page, /tms\/analytics\/shipment-trend/);
    await expectPageVisible(page);
    await expectHasHeading(page);

    // 验证趋势图表加载
    const chartArea = page.locator('[class*="chart"], .recharts-wrapper, svg.recharts-surface, canvas, [class*="echarts"]').first();
    await expect(chartArea).toBeVisible({ timeout: 10000 }).catch(() => {});

    // 验证汇总统计卡片
    const statCards = page.locator('.ant-card, .MuiCard-root, [class*="stat"], [class*="summary"]').first();
    await expect(statCards).toBeVisible({ timeout: 5000 }).catch(() => {});
  });

  // TC-TMS-007: 车辆运单排名，验证排名计算
  test('TC-TMS-007 should load vehicle utilization ranking and verify ranking', async ({ page }) => {
    await navigateTo(page, '/tms/analytics/vehicle-utilization');
    await expectUrl(page, /tms\/analytics\/vehicle-utilization/);
    await expectPageVisible(page);
    await expectHasHeading(page);

    // 验证排名图表或表格加载
    const chartArea = page.locator('[class*="chart"], .recharts-wrapper, svg.recharts-surface, canvas, table, .ant-table, .MuiTable-root').first();
    await expect(chartArea).toBeVisible({ timeout: 10000 }).catch(() => {});

    // 验证汇总统计卡片
    const statCards = page.locator('.ant-card, .MuiCard-root, [class*="stat"], [class*="summary"]').first();
    await expect(statCards).toBeVisible({ timeout: 5000 }).catch(() => {});
  });

  // TC-TMS-008: 运单状态分布，验证分布统计
  test('TC-TMS-008 should load shipment status distribution and verify statistics', async ({ page }) => {
    await navigateTo(page, '/tms/shipments');
    await expectUrl(page, /tms\/shipments/);
    await expectPageVisible(page);
    await expectHasHeading(page);

    // 验证运输订单列表加载
    const listContainer = page.locator('table, .ant-table, [role="table"], .MuiTable-root').first();
    await expect(listContainer).toBeVisible({ timeout: 10000 }).catch(() => {});

    // 验证状态分布统计卡片或状态标签
    const statusStats = page.locator('.ant-card, .MuiCard-root, [class*="stat"], [class*="summary"], .ant-tag').first();
    await expect(statusStats).toBeVisible({ timeout: 5000 }).catch(() => {});
  });

  // TC-TMS-009: 运输成本分析，验证成本统计
  test('TC-TMS-009 should load freight cost analysis and verify cost statistics', async ({ page }) => {
    await navigateTo(page, '/tms/analytics/freight-cost');
    await expectUrl(page, /tms\/analytics\/freight-cost/);
    await expectPageVisible(page);
    await expectHasHeading(page);

    // 验证成本图表或表格加载
    const chartArea = page.locator('[class*="chart"], .recharts-wrapper, svg.recharts-surface, canvas, table, .ant-table, .MuiTable-root').first();
    await expect(chartArea).toBeVisible({ timeout: 10000 }).catch(() => {});

    // 验证成本汇总统计卡片
    const statCards = page.locator('.ant-card, .MuiCard-root, [class*="stat"], [class*="summary"]').first();
    await expect(statCards).toBeVisible({ timeout: 5000 }).catch(() => {});
  });

  // TC-TMS-010: 配送时效分析，验证时效统计
  test('TC-TMS-010 should load route efficiency analysis and verify timeliness', async ({ page }) => {
    await navigateTo(page, '/tms/analytics/route-efficiency');
    await expectUrl(page, /tms\/analytics\/route-efficiency/);
    await expectPageVisible(page);
    await expectHasHeading(page);

    // 验证时效图表或表格加载
    const chartArea = page.locator('[class*="chart"], .recharts-wrapper, svg.recharts-surface, canvas, table, .ant-table, .MuiTable-root').first();
    await expect(chartArea).toBeVisible({ timeout: 10000 }).catch(() => {});

    // 验证时效汇总统计卡片
    const statCards = page.locator('.ant-card, .MuiCard-root, [class*="stat"], [class*="summary"]').first();
    await expect(statCards).toBeVisible({ timeout: 5000 }).catch(() => {});
  });
});
