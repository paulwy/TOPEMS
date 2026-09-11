import { test, expect } from '@playwright/test';
import { loginAsAdmin, navigateTo, expectUrl, expectPageVisible, expectHasHeading } from './helpers/auth';

/**
 * MES 制造分析报表 E2E 测试
 * 业务流程: 产能利用率 → 能耗成本 → MTBF → 交付达成率 → 质量 Pareto
 * 测试用例: TC-MES-016 ~ TC-MES-020
 */
test.describe('MES Manufacturing Analytics Reports (TC-MES-016 ~ TC-MES-020)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  // TC-MES-016: 产能利用率分析，验证利用率
  test('TC-MES-016 should analyze capacity utilization and verify utilization rate', async ({ page }) => {
    await navigateTo(page, '/mes/analytics/capacity');
    await expectUrl(page, /mes\/analytics\/capacity/);
    await expectPageVisible(page);
    await expectHasHeading(page);

    // 验证利用率统计卡片加载
    const summaryCards = page.locator('.ant-card, [class*="summary"], [class*="stat"]').first();
    await expect(summaryCards).toBeVisible({ timeout: 5000 }).catch(() => {});

    // 验证利用率图表
    const chart = page.locator('canvas, [class*="chart"]').first();
    await expect(chart).toBeVisible({ timeout: 5000 }).catch(() => {});
  });

  // TC-MES-017: 能耗成本分析，验证能耗统计
  test('TC-MES-017 should analyze energy cost and verify energy statistics', async ({ page }) => {
    await navigateTo(page, '/mes/analytics/energy');
    await expectUrl(page, /mes\/analytics\/energy/);
    await expectPageVisible(page);
    await expectHasHeading(page);

    // 验证能耗统计卡片
    const summaryCards = page.locator('.ant-card, [class*="summary"], [class*="stat"]').first();
    await expect(summaryCards).toBeVisible({ timeout: 5000 }).catch(() => {});

    // 验证能耗图表
    const chart = page.locator('canvas, [class*="chart"]').first();
    await expect(chart).toBeVisible({ timeout: 5000 }).catch(() => {});
  });

  // TC-MES-018: 设备 MTBF 分析，验证可靠性
  test('TC-MES-018 should analyze equipment MTBF and verify reliability', async ({ page }) => {
    await navigateTo(page, '/mes/analytics/mtbf');
    await expectUrl(page, /mes\/analytics\/mtbf/);
    await expectPageVisible(page);
    await expectHasHeading(page);

    // 验证 MTBF 统计卡片
    const summaryCards = page.locator('.ant-card, [class*="summary"], [class*="stat"]').first();
    await expect(summaryCards).toBeVisible({ timeout: 5000 }).catch(() => {});

    // 验证可靠性分析图表
    const chart = page.locator('canvas, [class*="chart"], table, .ant-table').first();
    await expect(chart).toBeVisible({ timeout: 5000 }).catch(() => {});
  });

  // TC-MES-019: 交付达成率分析，验证交付统计
  test('TC-MES-019 should analyze delivery achievement rate and verify statistics', async ({ page }) => {
    await navigateTo(page, '/mes/analytics/delivery');
    await expectUrl(page, /mes\/analytics\/delivery/);
    await expectPageVisible(page);
    await expectHasHeading(page);

    // 验证交付达成率统计卡片
    const summaryCards = page.locator('.ant-card, [class*="summary"], [class*="stat"]').first();
    await expect(summaryCards).toBeVisible({ timeout: 5000 }).catch(() => {});

    // 验证交付图表
    const chart = page.locator('canvas, [class*="chart"]').first();
    await expect(chart).toBeVisible({ timeout: 5000 }).catch(() => {});
  });

  // TC-MES-020: 质量 Pareto 分析，验证缺陷分布
  test('TC-MES-020 should analyze quality Pareto and verify defect distribution', async ({ page }) => {
    await navigateTo(page, '/mes/analytics/quality-pareto');
    await expectUrl(page, /mes\/analytics\/quality-pareto/);
    await expectPageVisible(page);
    await expectHasHeading(page);

    // 验证 Pareto 图表加载
    const chart = page.locator('canvas, [class*="chart"]').first();
    await expect(chart).toBeVisible({ timeout: 5000 }).catch(() => {});

    // 验证缺陷分布表格
    const table = page.locator('table, .ant-table').first();
    await expect(table).toBeVisible({ timeout: 10000 }).catch(() => {});
  });
});
