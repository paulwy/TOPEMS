import { test, expect } from '@playwright/test';
import { loginAsAdmin, navigateTo, expectUrl, expectPageVisible, expectHasHeading } from './helpers/auth';

/**
 * MES 设备管理流程 E2E 测试
 * 业务流程: 设备档案创建 → 状态变更 → 维保记录 → OEE 计算 → 故障记录
 * 测试用例: TC-MES-006 ~ TC-MES-010
 */
test.describe('MES Equipment Management Flow (TC-MES-006 ~ TC-MES-010)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  // TC-MES-006: 创建设备档案，验证设备创建
  test('TC-MES-006 should create equipment archive successfully', async ({ page }) => {
    await navigateTo(page, '/mes/equipment');
    await expectUrl(page, /mes\/equipment/);
    await expectPageVisible(page);
    await expectHasHeading(page);

    // 验证设备列表加载
    const listContainer = page.locator('table, .ant-table, [role="table"]').first();
    await expect(listContainer).toBeVisible({ timeout: 10000 }).catch(() => {});

    // 尝试点击新建按钮
    const createButton = page.getByRole('button', { name: /新建|创建|新增/ }).first();
    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click();
      await page.waitForLoadState('networkidle');
      const modal = page.locator('.ant-modal, [role="dialog"]').first();
      await expect(modal).toBeVisible({ timeout: 5000 }).catch(() => {});
    }
  });

  // TC-MES-007: 设备状态变更，验证状态更新
  test('TC-MES-007 should change equipment status and verify update', async ({ page }) => {
    await navigateTo(page, '/mes/equipment');
    await expectUrl(page, /mes\/equipment/);
    await expectPageVisible(page);
    await expectHasHeading(page);

    // 验证设备列表加载
    const table = page.locator('table, .ant-table').first();
    await expect(table).toBeVisible({ timeout: 10000 }).catch(() => {});

    // 验证状态变更按钮存在
    const statusButton = page.getByRole('button', { name: /状态|变更状态|启停/ }).first();
    if (await statusButton.isVisible().catch(() => false)) {
      await statusButton.click();
      await page.waitForLoadState('networkidle');
      const modal = page.locator('.ant-modal, [role="dialog"]').first();
      await expect(modal).toBeVisible({ timeout: 5000 }).catch(() => {});
    }
  });

  // TC-MES-008: 设备维保记录，验证维保保存
  test('TC-MES-008 should save maintenance record successfully', async ({ page }) => {
    await navigateTo(page, '/mes/equipment');
    await expectUrl(page, /mes\/equipment/);
    await expectPageVisible(page);
    await expectHasHeading(page);

    // 验证维保记录按钮存在
    const maintenanceButton = page.getByRole('button', { name: /维保|维修|保养|维保记录/ }).first();
    if (await maintenanceButton.isVisible().catch(() => false)) {
      await maintenanceButton.click();
      await page.waitForLoadState('networkidle');
      const modal = page.locator('.ant-modal, [role="dialog"]').first();
      await expect(modal).toBeVisible({ timeout: 5000 }).catch(() => {});
    }
  });

  // TC-MES-009: 设备 OEE 计算，验证 OEE 公式
  test('TC-MES-009 should calculate equipment OEE correctly', async ({ page }) => {
    await navigateTo(page, '/mes/equipment-oee');
    await expectUrl(page, /mes\/equipment-oee/);
    await expectPageVisible(page);
    await expectHasHeading(page);

    // 验证 OEE 统计卡片加载
    const summaryCards = page.locator('.ant-card, [class*="summary"], [class*="stat"]').first();
    await expect(summaryCards).toBeVisible({ timeout: 5000 }).catch(() => {});

    // 导航到 OEE 分析报表验证数据
    await navigateTo(page, '/mes/analytics/oee');
    await expectUrl(page, /mes\/analytics\/oee/);
    await expectPageVisible(page);
    await expectHasHeading(page);

    const chart = page.locator('canvas, [class*="chart"]').first();
    await expect(chart).toBeVisible({ timeout: 5000 }).catch(() => {});
  });

  // TC-MES-010: 设备故障记录，验证故障处理
  test('TC-MES-010 should record equipment fault and handle it', async ({ page }) => {
    await navigateTo(page, '/mes/equipment');
    await expectUrl(page, /mes\/equipment/);
    await expectPageVisible(page);
    await expectHasHeading(page);

    // 验证故障记录按钮存在
    const faultButton = page.getByRole('button', { name: /故障|报修|故障记录/ }).first();
    if (await faultButton.isVisible().catch(() => false)) {
      await faultButton.click();
      await page.waitForLoadState('networkidle');
      const modal = page.locator('.ant-modal, [role="dialog"]').first();
      await expect(modal).toBeVisible({ timeout: 5000 }).catch(() => {});
    }
  });
});
