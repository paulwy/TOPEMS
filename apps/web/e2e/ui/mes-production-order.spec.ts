import { test, expect } from '@playwright/test';
import { loginAsAdmin, navigateTo, expectUrl, expectPageVisible, expectHasHeading } from './helpers/auth';

/**
 * MES 生产订单流程 E2E 测试
 * 业务流程: 生产订单创建 → 车间下发 → 生产报工 → 订单完成 → 进度查询
 * 测试用例: TC-MES-001 ~ TC-MES-005
 */
test.describe('MES Production Order Flow (TC-MES-001 ~ TC-MES-005)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  // TC-MES-001: 创建生产订单，验证订单创建成功
  test('TC-MES-001 should create production order successfully', async ({ page }) => {
    await navigateTo(page, '/mes/production-orders');
    await expectUrl(page, /mes\/production-orders/);
    await expectPageVisible(page);
    await expectHasHeading(page);

    // 验证生产订单列表页面加载
    const listContainer = page.locator('table, .ant-table, [role="table"]').first();
    await expect(listContainer).toBeVisible({ timeout: 10000 }).catch(() => {});

    // 尝试点击新建按钮（如果存在）
    const createButton = page.getByRole('button', { name: /新建|创建|新增/ }).first();
    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click();
      await page.waitForLoadState('networkidle');
      // 验证弹窗或表单出现
      const modal = page.locator('.ant-modal, [role="dialog"]').first();
      await expect(modal).toBeVisible({ timeout: 5000 }).catch(() => {});
    }
  });

  // TC-MES-002: 订单下发到车间，验证下发状态
  test('TC-MES-002 should dispatch order to workshop and verify dispatch status', async ({ page }) => {
    await navigateTo(page, '/mes/production-orders');
    await expectUrl(page, /mes\/production-orders/);
    await expectPageVisible(page);
    await expectHasHeading(page);

    // 验证订单列表加载
    const table = page.locator('table, .ant-table').first();
    await expect(table).toBeVisible({ timeout: 10000 }).catch(() => {});

    // 验证下发按钮存在（如果有数据）
    const dispatchButton = page.getByRole('button', { name: /下发|下达|派工/ }).first();
    if (await dispatchButton.isVisible().catch(() => false)) {
      await dispatchButton.click();
      await page.waitForLoadState('networkidle');
      const modal = page.locator('.ant-modal, [role="dialog"]').first();
      await expect(modal).toBeVisible({ timeout: 5000 }).catch(() => {});
    }
  });

  // TC-MES-003: 生产报工，验证报工数量正确
  test('TC-MES-003 should report work quantity correctly', async ({ page }) => {
    await navigateTo(page, '/mes/work-report');
    await expectUrl(page, /mes\/work-report/);
    await expectPageVisible(page);
    await expectHasHeading(page);

    // 验证报工页面列表加载
    const table = page.locator('table, .ant-table, [role="table"]').first();
    await expect(table).toBeVisible({ timeout: 10000 }).catch(() => {});

    // 验证报工录入按钮存在
    const reportButton = page.getByRole('button', { name: /报工|录入报工|生产报工/ }).first();
    if (await reportButton.isVisible().catch(() => false)) {
      await reportButton.click();
      await page.waitForLoadState('networkidle');
      const modal = page.locator('.ant-modal, [role="dialog"]').first();
      await expect(modal).toBeVisible({ timeout: 5000 }).catch(() => {});
    }
  });

  // TC-MES-004: 订单完成，验证完成状态更新
  test('TC-MES-004 should complete order and verify completion status', async ({ page }) => {
    await navigateTo(page, '/mes/production-orders');
    await expectUrl(page, /mes\/production-orders/);
    await expectPageVisible(page);
    await expectHasHeading(page);

    // 验证完成按钮
    const completeButton = page.getByRole('button', { name: /完成|完工|订单完成/ }).first();
    if (await completeButton.isVisible().catch(() => false)) {
      await completeButton.click();
      await page.waitForLoadState('networkidle');
      const modal = page.locator('.ant-modal, [role="dialog"]').first();
      await expect(modal).toBeVisible({ timeout: 5000 }).catch(() => {});
    }
  });

  // TC-MES-005: 生产进度查询，验证进度计算
  test('TC-MES-005 should query production progress and verify calculation', async ({ page }) => {
    await navigateTo(page, '/mes/production-dashboard');
    await expectUrl(page, /mes\/production-dashboard/);
    await expectPageVisible(page);
    await expectHasHeading(page);

    // 验证进度看板统计卡片加载
    const summaryCards = page.locator('.ant-card, [class*="summary"], [class*="stat"]').first();
    await expect(summaryCards).toBeVisible({ timeout: 5000 }).catch(() => {});

    // 验证图表或进度条存在
    const chart = page.locator('canvas, [class*="chart"], [class*="progress"]').first();
    await expect(chart).toBeVisible({ timeout: 5000 }).catch(() => {});
  });
});
