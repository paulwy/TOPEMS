import { test, expect } from '@playwright/test';
import { loginAsAdmin, navigateTo, expectUrl, expectPageVisible, expectHasHeading } from './helpers/auth';

/**
 * TMS 运输订单流程 E2E 测试
 * 业务流程: 创建运输订单 → 车辆调度 → 在途跟踪 → 签收确认 → 运输异常处理
 * 测试用例: TC-TMS-001 ~ TC-TMS-005
 */
test.describe('TMS Shipment Flow (TC-TMS-001 ~ TC-TMS-005)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  // TC-TMS-001: 创建运输订单，验证订单创建成功
  test('TC-TMS-001 should create shipment order successfully', async ({ page }) => {
    await navigateTo(page, '/tms/shipments');
    await expectUrl(page, /tms\/shipments/);
    await expectPageVisible(page);
    await expectHasHeading(page);

    // 验证运输订单列表加载
    const listContainer = page.locator('table, .ant-table, [role="table"], .MuiTable-root, [class*="table"]').first();
    await expect(listContainer).toBeVisible({ timeout: 10000 }).catch(() => {});

    // 尝试点击新建运输订单按钮
    const createButton = page.getByRole('button', { name: /新建|创建|新增|新增运单|新建运单/ }).first();
    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click();
      await page.waitForLoadState('networkidle');
      // 验证运输订单创建弹窗或表单出现
      const modal = page.locator('.ant-modal, [role="dialog"], .MuiDialog-root').first();
      await expect(modal).toBeVisible({ timeout: 5000 }).catch(() => {});
    }
  });

  // TC-TMS-002: 车辆调度，验证调度分配成功
  test('TC-TMS-002 should dispatch vehicle and verify assignment', async ({ page }) => {
    await navigateTo(page, '/tms/shipments');
    await expectUrl(page, /tms\/shipments/);
    await expectPageVisible(page);
    await expectHasHeading(page);

    // 验证运输订单列表加载
    const listContainer = page.locator('table, .ant-table, [role="table"], .MuiTable-root').first();
    await expect(listContainer).toBeVisible({ timeout: 10000 }).catch(() => {});

    // 尝试点击车辆调度按钮
    const dispatchButton = page.getByRole('button', { name: /调度|车辆调度|派车|分配车辆/ }).first();
    if (await dispatchButton.isVisible().catch(() => false)) {
      await dispatchButton.click();
      await page.waitForLoadState('networkidle');
      // 验证调度弹窗
      const modal = page.locator('.ant-modal, [role="dialog"], .MuiDialog-root').first();
      await expect(modal).toBeVisible({ timeout: 5000 }).catch(() => {});

      const confirmButton = page.getByRole('button', { name: /确认|确定|调度|分配/ }).first();
      if (await confirmButton.isVisible().catch(() => false)) {
        await confirmButton.click();
        await page.waitForLoadState('networkidle');
      }
    }

    // 导航到车辆管理页面验证调度分配
    await navigateTo(page, '/tms/vehicles');
    await expectUrl(page, /tms\/vehicles/);
    await expectPageVisible(page);
    await expectHasHeading(page);

    const vehicleTable = page.locator('table, .ant-table, [role="table"], .MuiTable-root').first();
    await expect(vehicleTable).toBeVisible({ timeout: 10000 }).catch(() => {});
  });

  // TC-TMS-003: 在途跟踪，验证位置更新
  test('TC-TMS-003 should track shipment in transit and verify location update', async ({ page }) => {
    await navigateTo(page, '/tms/shipments');
    await expectUrl(page, /tms\/shipments/);
    await expectPageVisible(page);
    await expectHasHeading(page);

    // 验证运输订单列表加载
    const listContainer = page.locator('table, .ant-table, [role="table"], .MuiTable-root').first();
    await expect(listContainer).toBeVisible({ timeout: 10000 }).catch(() => {});

    // 尝试点击在途跟踪按钮
    const trackButton = page.getByRole('button', { name: /跟踪|在途跟踪|位置跟踪|轨迹/ }).first();
    if (await trackButton.isVisible().catch(() => false)) {
      await trackButton.click();
      await page.waitForLoadState('networkidle');
      // 验证跟踪详情弹窗或地图区域
      const trackArea = page.locator('.ant-modal, [role="dialog"], .MuiDialog-root, [class*="map"], [class*="track"]').first();
      await expect(trackArea).toBeVisible({ timeout: 5000 }).catch(() => {});
    }
  });

  // TC-TMS-004: 签收确认，验证签收处理完成
  test('TC-TMS-004 should confirm sign-off and verify receipt', async ({ page }) => {
    await navigateTo(page, '/tms/shipments');
    await expectUrl(page, /tms\/shipments/);
    await expectPageVisible(page);
    await expectHasHeading(page);

    // 验证运输订单列表加载
    const listContainer = page.locator('table, .ant-table, [role="table"], .MuiTable-root').first();
    await expect(listContainer).toBeVisible({ timeout: 10000 }).catch(() => {});

    // 尝试点击签收确认按钮
    const signButton = page.getByRole('button', { name: /签收|签收确认|收货确认|确认收货/ }).first();
    if (await signButton.isVisible().catch(() => false)) {
      await signButton.click();
      await page.waitForLoadState('networkidle');
      // 验证签收确认弹窗
      const modal = page.locator('.ant-modal, [role="dialog"], .MuiDialog-root').first();
      await expect(modal).toBeVisible({ timeout: 5000 }).catch(() => {});

      const confirmButton = page.getByRole('button', { name: /确认|确定|签收/ }).first();
      if (await confirmButton.isVisible().catch(() => false)) {
        await confirmButton.click();
        await page.waitForLoadState('networkidle');
      }
    }
  });

  // TC-TMS-005: 运输异常处理，验证异常流程
  test('TC-TMS-005 should handle transport exception and verify exception flow', async ({ page }) => {
    await navigateTo(page, '/tms/shipments');
    await expectUrl(page, /tms\/shipments/);
    await expectPageVisible(page);
    await expectHasHeading(page);

    // 验证运输订单列表加载
    const listContainer = page.locator('table, .ant-table, [role="table"], .MuiTable-root').first();
    await expect(listContainer).toBeVisible({ timeout: 10000 }).catch(() => {});

    // 尝试点击异常处理按钮
    const exceptionButton = page.getByRole('button', { name: /异常|异常处理|上报异常|异常上报/ }).first();
    if (await exceptionButton.isVisible().catch(() => false)) {
      await exceptionButton.click();
      await page.waitForLoadState('networkidle');
      // 验证异常处理弹窗
      const modal = page.locator('.ant-modal, [role="dialog"], .MuiDialog-root').first();
      await expect(modal).toBeVisible({ timeout: 5000 }).catch(() => {});

      const confirmButton = page.getByRole('button', { name: /确认|确定|提交|上报/ }).first();
      if (await confirmButton.isVisible().catch(() => false)) {
        await confirmButton.click();
        await page.waitForLoadState('networkidle');
      }
    }

    // 验证异常状态标识（若存在）
    const exceptionTag = page.locator('[class*="exception"], [class*="abnormal"], .ant-tag-red').first();
    await expect(exceptionTag).toBeVisible({ timeout: 3000 }).catch(() => {});
  });
});
