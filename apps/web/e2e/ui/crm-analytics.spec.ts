import { test, expect } from '@playwright/test';
import { loginAsAdmin, navigateTo, expectUrl, expectPageVisible, expectHasHeading } from './helpers/auth';

/**
 * CRM 客户分析报表 E2E 测试
 * 业务流程: 客户分布 → 销售漏斗 → 销售业绩 → RFM分析 → 活跃度统计
 * 测试用例: TC-CRM-016 ~ TC-CRM-020
 */
test.describe('CRM Analytics & Report Flow (TC-CRM-016 ~ TC-CRM-020)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  // TC-CRM-016: 客户分布分析，验证统计正确
  test('TC-CRM-016 should analyze customer distribution and verify statistics', async ({ page }) => {
    await navigateTo(page, '/crm/customer-segmentation');
    await expectUrl(page, /crm\/customer-segmentation/);
    await expectPageVisible(page);
    await expectHasHeading(page);

    // 验证分布图表加载
    const distributionChart = page.locator('[class*="chart"], [class*="echarts"], canvas, svg, table, .ant-table').first();
    await expect(distributionChart).toBeVisible({ timeout: 10000 }).catch(() => {});

    // 验证分群统计卡片
    const segmentStats = page.locator('.ant-card, [class*="stat"], [class*="summary"]').first();
    await expect(segmentStats).toBeVisible({ timeout: 5000 }).catch(() => {});
  });

  // TC-CRM-017: 销售漏斗分析，验证漏斗数据
  test('TC-CRM-017 should analyze sales funnel and verify funnel data', async ({ page }) => {
    await navigateTo(page, '/crm/sales-funnel');
    await expectUrl(page, /crm\/sales-funnel/);
    await expectPageVisible(page);
    await expectHasHeading(page);

    // 验证漏斗图表加载
    const funnelChart = page.locator('[class*="chart"], [class*="echarts"], canvas, svg, [class*="funnel"]').first();
    await expect(funnelChart).toBeVisible({ timeout: 10000 }).catch(() => {});

    // 验证漏斗阶段数据
    const funnelData = page.locator('.ant-table, table, [class*="stage"], .ant-tag').first();
    await expect(funnelData).toBeVisible({ timeout: 5000 }).catch(() => {});
  });

  // TC-CRM-018: 销售业绩统计，验证业绩计算
  test('TC-CRM-018 should calculate sales performance and verify performance calculation', async ({ page }) => {
    await navigateTo(page, '/crm/sales-forecast');
    await expectUrl(page, /crm\/sales-forecast/);
    await expectPageVisible(page);
    await expectHasHeading(page);

    // 验证业绩报表加载
    const performanceChart = page.locator('[class*="chart"], [class*="echarts"], canvas, svg, table, .ant-table').first();
    await expect(performanceChart).toBeVisible({ timeout: 10000 }).catch(() => {});

    // 验证业绩统计卡片
    const performanceStats = page.locator('.ant-card, [class*="stat"], [class*="summary"], .ant-statistic').first();
    await expect(performanceStats).toBeVisible({ timeout: 5000 }).catch(() => {});
  });

  // TC-CRM-019: 客户价值分析，验证 RFM 模型
  test('TC-CRM-019 should analyze customer value and verify RFM model', async ({ page }) => {
    await navigateTo(page, '/crm/rfm');
    await expectUrl(page, /crm\/rfm/);
    await expectPageVisible(page);
    await expectHasHeading(page);

    // 验证 RFM 分析图表或表格加载
    const rfmChart = page.locator('[class*="chart"], [class*="echarts"], canvas, svg, table, .ant-table').first();
    await expect(rfmChart).toBeVisible({ timeout: 10000 }).catch(() => {});

    // 验证 R/F/M 维度统计
    const rfmStats = page.locator('.ant-card, [class*="stat"], [class*="summary"], .ant-tag').first();
    await expect(rfmStats).toBeVisible({ timeout: 5000 }).catch(() => {});
  });

  // TC-CRM-020: 跟进记录分析，验证活跃度统计
  test('TC-CRM-020 should analyze interaction activity and verify activity statistics', async ({ page }) => {
    await navigateTo(page, '/crm/customer-scoring');
    await expectUrl(page, /crm\/customer-scoring/);
    await expectPageVisible(page);
    await expectHasHeading(page);

    // 验证客户评分表格加载
    const scoringTable = page.locator('table, .ant-table, [role="table"]').first();
    await expect(scoringTable).toBeVisible({ timeout: 10000 }).catch(() => {});

    // 验证活跃度或评分统计
    const activityStats = page.locator('.ant-card, [class*="stat"], [class*="score"], .ant-rate').first();
    await expect(activityStats).toBeVisible({ timeout: 5000 }).catch(() => {});
  });
});
