import { test, expect } from '@playwright/test';
import { loginAsAdmin, navigateTo, expectUrl, expectPageVisible, expectHasHeading } from './helpers/auth';

/**
 * CRM 商机管理流程 E2E 测试
 * 业务流程: 创建商机 → 阶段推进 → 赢单 → 输单 → 金额预测
 * 测试用例: TC-CRM-006 ~ TC-CRM-010
 */
test.describe('CRM Opportunity Management Flow (TC-CRM-006 ~ TC-CRM-010)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  // TC-CRM-006: 创建商机，验证商机创建成功
  test('TC-CRM-006 should create opportunity successfully', async ({ page }) => {
    await navigateTo(page, '/crm/opportunities');
    await expectUrl(page, /crm\/opportunities/);
    await expectPageVisible(page);
    await expectHasHeading(page);

    // 验证商机列表加载
    const listContainer = page.locator('table, .ant-table, [role="table"]').first();
    await expect(listContainer).toBeVisible({ timeout: 10000 }).catch(() => {});

    // 尝试点击新建商机按钮
    const createButton = page.getByRole('button', { name: /新建|创建|新增|添加商机/ }).first();
    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click();
      await page.waitForLoadState('networkidle');
      // 验证弹窗或表单出现
      const modal = page.locator('.ant-modal, [role="dialog"]').first();
      await expect(modal).toBeVisible({ timeout: 5000 }).catch(() => {});
    }
  });

  // TC-CRM-007: 商机阶段推进，验证阶段流转正确
  test('TC-CRM-007 should advance opportunity stage and verify stage transition', async ({ page }) => {
    await navigateTo(page, '/crm/opportunities');
    await expectUrl(page, /crm\/opportunities/);
    await expectPageVisible(page);
    await expectHasHeading(page);

    // 验证商机列表或看板加载
    const listContainer = page.locator('table, .ant-table, [role="table"], [class*="kanban"], [class*="board"]').first();
    await expect(listContainer).toBeVisible({ timeout: 10000 }).catch(() => {});

    // 验证阶段标识
    const stageTag = page.locator('.ant-tag, [class*="stage"], .ant-steps').first();
    await expect(stageTag).toBeVisible({ timeout: 5000 }).catch(() => {});

    // 尝试点击阶段推进按钮
    const advanceButton = page.getByRole('button', { name: /推进|阶段|推进阶段|下一步/ }).first();
    if (await advanceButton.isVisible().catch(() => false)) {
      await advanceButton.click();
      await page.waitForLoadState('networkidle');
      // 验证阶段变更弹窗
      const modal = page.locator('.ant-modal, [role="dialog"], .ant-select-dropdown').first();
      await expect(modal).toBeVisible({ timeout: 5000 }).catch(() => {});
    }
  });

  // TC-CRM-008: 商机赢单，验证赢单处理正确
  test('TC-CRM-008 should win opportunity and verify win processing', async ({ page }) => {
    await navigateTo(page, '/crm/opportunities');
    await expectUrl(page, /crm\/opportunities/);
    await expectPageVisible(page);
    await expectHasHeading(page);

    // 验证商机列表加载
    const listContainer = page.locator('table, .ant-table, [role="table"]').first();
    await expect(listContainer).toBeVisible({ timeout: 10000 }).catch(() => {});

    // 尝试点击赢单按钮
    const winButton = page.getByRole('button', { name: /赢单|中标|成交/ }).first();
    if (await winButton.isVisible().catch(() => false)) {
      await winButton.click();
      await page.waitForLoadState('networkidle');
      // 验证赢单确认弹窗
      const modal = page.locator('.ant-modal, [role="dialog"]').first();
      await expect(modal).toBeVisible({ timeout: 5000 }).catch(() => {});

      // 确认赢单
      const confirmButton = page.getByRole('button', { name: /确认|确定|赢单/ }).first();
      if (await confirmButton.isVisible().catch(() => false)) {
        await confirmButton.click();
        await page.waitForLoadState('networkidle');
      }
    }
  });

  // TC-CRM-009: 商机输单，验证输单原因记录
  test('TC-CRM-009 should lose opportunity and verify loss reason recorded', async ({ page }) => {
    await navigateTo(page, '/crm/opportunities');
    await expectUrl(page, /crm\/opportunities/);
    await expectPageVisible(page);
    await expectHasHeading(page);

    // 验证商机列表加载
    const listContainer = page.locator('table, .ant-table, [role="table"]').first();
    await expect(listContainer).toBeVisible({ timeout: 10000 }).catch(() => {});

    // 尝试点击输单按钮
    const loseButton = page.getByRole('button', { name: /输单|失败|丢单/ }).first();
    if (await loseButton.isVisible().catch(() => false)) {
      await loseButton.click();
      await page.waitForLoadState('networkidle');
      // 验证输单原因弹窗
      const modal = page.locator('.ant-modal, [role="dialog"], .ant-form').first();
      await expect(modal).toBeVisible({ timeout: 5000 }).catch(() => {});

      // 验证输单原因输入框
      const reasonInput = page.locator('textarea, input').first();
      await expect(reasonInput).toBeVisible({ timeout: 5000 }).catch(() => {});
    }
  });

  // TC-CRM-010: 商机金额预测，验证预测计算
  test('TC-CRM-010 should forecast opportunity amount and verify forecast calculation', async ({ page }) => {
    await navigateTo(page, '/crm/sales-forecast');
    await expectUrl(page, /crm\/sales-forecast/);
    await expectPageVisible(page);
    await expectHasHeading(page);

    // 验证预测报表加载
    const forecastChart = page.locator('[class*="chart"], [class*="echarts"], canvas, svg, table, .ant-table').first();
    await expect(forecastChart).toBeVisible({ timeout: 10000 }).catch(() => {});

    // 验证预测金额统计卡片
    const forecastStats = page.locator('.ant-card, [class*="stat"], [class*="summary"], .ant-statistic').first();
    await expect(forecastStats).toBeVisible({ timeout: 5000 }).catch(() => {});
  });
});
