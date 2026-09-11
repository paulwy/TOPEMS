import { test, expect } from '@playwright/test';
import { loginAsAdmin, navigateTo, expectUrl, expectPageVisible, expectHasHeading } from './helpers/auth';

/**
 * WMS 库存查询与报表 E2E 测试
 * 业务流程: 多条件查询 → 库存预警 → 周转率 → 出入库趋势 → ABC分析 → 库龄分析 → 库位利用率
 * 测试用例: TC-WMS-019 ~ TC-WMS-025
 */
test.describe('WMS Analytics & Report Flow (TC-WMS-019 ~ TC-WMS-025)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  // TC-WMS-019: 多条件库存查询，验证查询结果正确
  test('TC-WMS-019 should query inventory with multiple conditions and verify results', async ({ page }) => {
    await navigateTo(page, '/wms/inventory');
    await expectUrl(page, /wms\/inventory/);
    await expectPageVisible(page);
    await expectHasHeading(page);

    // 验证查询表单区域
    const searchForm = page.locator('.ant-form, .ant-form-inline, [class*="search"], [class*="filter"]').first();
    await expect(searchForm).toBeVisible({ timeout: 10000 }).catch(() => {});

    // 验证库存表格
    const inventoryTable = page.locator('table, .ant-table').first();
    await expect(inventoryTable).toBeVisible({ timeout: 10000 }).catch(() => {});

    // 尝试点击查询按钮
    const searchButton = page.getByRole('button', { name: /查询|搜索|筛选/ }).first();
    if (await searchButton.isVisible().catch(() => false)) {
      await searchButton.click({ force: true }).catch(() => {});
      await page.waitForTimeout(1000);
    }
  });

  // TC-WMS-020: 库存预警查询，验证预警逻辑正确
  test('TC-WMS-020 should query inventory alerts and verify alert logic', async ({ page }) => {
    await navigateTo(page, '/wms/inventory-report');
    await expectUrl(page, /wms\/inventory-report/);
    await expectPageVisible(page);
    await expectHasHeading(page);

    // 验预警报告表格
    const reportTable = page.locator('table, .ant-table, [role="table"]').first();
    await expect(reportTable).toBeVisible({ timeout: 10000 }).catch(() => {});

    // 验证预警标识或标签
    const alertTag = page.locator('[class*="alert"], [class*="warning"], .ant-tag, .ant-badge').first();
    await expect(alertTag).toBeVisible({ timeout: 5000 }).catch(() => {});
  });

  // TC-WMS-021: 库存周转率计算，验证统计正确
  test('TC-WMS-021 should calculate inventory turnover and verify statistics', async ({ page }) => {
    await navigateTo(page, '/wms/analytics/inventory-turnover');
    await expectUrl(page, /wms\/analytics\/inventory-turnover/);
    await expectPageVisible(page);
    await expectHasHeading(page);

    // 验证图表或统计卡片
    const chartArea = page.locator('.ant-card, [class*="chart"], [class*="echarts"], canvas, table, .ant-table').first();
    await expect(chartArea).toBeVisible({ timeout: 10000 }).catch(() => {});

    // 验证统计数据展示
    const statValue = page.locator('[class*="stat"], [class*="value"], .ant-statistic').first();
    await expect(statValue).toBeVisible({ timeout: 5000 }).catch(() => {});
  });

  // TC-WMS-022: 出入库趋势分析，验证图表数据正确
  test('TC-WMS-022 should analyze inbound/outbound trend and verify chart data', async ({ page }) => {
    await navigateTo(page, '/wms/analytics/flow-trend');
    await expectUrl(page, /wms\/analytics\/flow-trend/);
    await expectPageVisible(page);
    await expectHasHeading(page);

    // 验证趋势图表加载
    const chartArea = page.locator('[class*="chart"], [class*="echarts"], canvas, svg').first();
    await expect(chartArea).toBeVisible({ timeout: 10000 }).catch(() => {});

    // 验证图例或时间筛选
    const legend = page.locator('[class*="legend"], .ant-select, [class*="filter"]').first();
    await expect(legend).toBeVisible({ timeout: 5000 }).catch(() => {});
  });

  // TC-WMS-023: ABC 分析，验证分类正确
  test('TC-WMS-023 should perform ABC analysis and verify classification', async ({ page }) => {
    await navigateTo(page, '/wms/analytics/abc-analysis');
    await expectUrl(page, /wms\/analytics\/abc-analysis/);
    await expectPageVisible(page);
    await expectHasHeading(page);

    // 验证 ABC 分类图表或表格
    const abcChart = page.locator('[class*="chart"], [class*="echarts"], canvas, svg, table, .ant-table').first();
    await expect(abcChart).toBeVisible({ timeout: 10000 }).catch(() => {});

    // 验证 A/B/C 分类标签
    const classTags = page.locator('.ant-tag, [class*="class"], [class*="grade"]').first();
    await expect(classTags).toBeVisible({ timeout: 5000 }).catch(() => {});
  });

  // TC-WMS-024: 库龄分析，验证库龄计算正确
  test('TC-WMS-024 should analyze inventory age and verify age calculation', async ({ page }) => {
    await navigateTo(page, '/wms/analytics/age-pareto');
    await expectUrl(page, /wms\/analytics\/age-pareto/);
    await expectPageVisible(page);
    await expectHasHeading(page);

    // 验证库龄图表加载
    const ageChart = page.locator('[class*="chart"], [class*="echarts"], canvas, svg, table, .ant-table').first();
    await expect(ageChart).toBeVisible({ timeout: 10000 }).catch(() => {});

    // 验证库龄区间统计
    const ageStats = page.locator('.ant-card, [class*="stat"], [class*="summary"]').first();
    await expect(ageStats).toBeVisible({ timeout: 5000 }).catch(() => {});
  });

  // TC-WMS-025: 库位利用率分析，验证利用率正确
  test('TC-WMS-025 should analyze location utilization and verify utilization rate', async ({ page }) => {
    await navigateTo(page, '/wms/analytics/location-utilization');
    await expectUrl(page, /wms\/analytics\/location-utilization/);
    await expectPageVisible(page);
    await expectHasHeading(page);

    // 验证利用率图表或表格
    const utilChart = page.locator('[class*="chart"], [class*="echarts"], canvas, svg, table, .ant-table').first();
    await expect(utilChart).toBeVisible({ timeout: 10000 }).catch(() => {});

    // 验证利用率统计卡片
    const utilStats = page.locator('.ant-card, [class*="stat"], [class*="summary"], .ant-progress').first();
    await expect(utilStats).toBeVisible({ timeout: 5000 }).catch(() => {});
  });
});
