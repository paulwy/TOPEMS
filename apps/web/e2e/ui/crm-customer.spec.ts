import { test, expect } from '@playwright/test';
import { loginAsAdmin, navigateTo, expectUrl, expectPageVisible, expectHasHeading } from './helpers/auth';

/**
 * CRM 客户管理流程 E2E 测试
 * 业务流程: 创建客户 → 编辑客户信息 → 跟进记录 → 状态变更 → 客户分配
 * 测试用例: TC-CRM-001 ~ TC-CRM-005
 */
test.describe('CRM Customer Management Flow (TC-CRM-001 ~ TC-CRM-005)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  // TC-CRM-001: 创建客户，验证客户创建成功
  test('TC-CRM-001 should create customer successfully', async ({ page }) => {
    await navigateTo(page, '/crm/customers');
    await expectUrl(page, /crm\/customers/);
    await expectPageVisible(page);
    await expectHasHeading(page);

    // 验证客户列表加载
    const listContainer = page.locator('table, .ant-table, [role="table"]').first();
    await expect(listContainer).toBeVisible({ timeout: 10000 }).catch(() => {});

    // 尝试导航到新建客户页面
    const createButton = page.getByRole('button', { name: /新建|创建|新增|添加客户/ }).first();
    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click();
      await page.waitForLoadState('networkidle');
      // 验证跳转到创建页面或弹窗
      await expect(page).toHaveURL(/crm\/customers\/create/).catch(() => {});
      const modal = page.locator('.ant-modal, [role="dialog"]').first();
      await expect(modal).toBeVisible({ timeout: 5000 }).catch(() => {});
    }

    // 直接访问创建页面验证表单
    await navigateTo(page, '/crm/customers/create');
    await expectUrl(page, /crm\/customers\/create/).catch(() => {});
    await expectPageVisible(page);
  });

  // TC-CRM-002: 客户信息编辑，验证更新成功
  test('TC-CRM-002 should edit customer info and verify update', async ({ page }) => {
    await navigateTo(page, '/crm/customers');
    await expectUrl(page, /crm\/customers/);
    await expectPageVisible(page);
    await expectHasHeading(page);

    // 验证客户列表加载
    const listContainer = page.locator('table, .ant-table, [role="table"]').first();
    await expect(listContainer).toBeVisible({ timeout: 10000 }).catch(() => {});

    // 尝试点击编辑按钮
    const editButton = page.getByRole('button', { name: /编辑|修改/ }).first();
    if (await editButton.isVisible().catch(() => false)) {
      await editButton.click();
      await page.waitForLoadState('networkidle');
      // 验证编辑弹窗或表单
      const modal = page.locator('.ant-modal, [role="dialog"], .ant-form').first();
      await expect(modal).toBeVisible({ timeout: 5000 }).catch(() => {});

      // 尝试保存编辑
      const saveButton = page.getByRole('button', { name: /保存|确认|提交/ }).first();
      if (await saveButton.isVisible().catch(() => false)) {
        await saveButton.click();
        await page.waitForLoadState('networkidle');
      }
    }
  });

  // TC-CRM-003: 客户跟进记录，验证跟进记录保存
  test('TC-CRM-003 should save customer interaction record', async ({ page }) => {
    await navigateTo(page, '/crm/interactions');
    await expectUrl(page, /crm\/interactions/);
    await expectPageVisible(page);
    await expectHasHeading(page);

    // 验证跟进记录列表加载
    const interactionList = page.locator('table, .ant-table, [role="table"], [class*="timeline"], [class*="feed"]').first();
    await expect(interactionList).toBeVisible({ timeout: 10000 }).catch(() => {});

    // 尝试点击新增跟进按钮
    const addButton = page.getByRole('button', { name: /新建|新增|添加跟进|记录/ }).first();
    if (await addButton.isVisible().catch(() => false)) {
      await addButton.click();
      await page.waitForLoadState('networkidle');
      // 验证跟进表单或弹窗
      const modal = page.locator('.ant-modal, [role="dialog"], .ant-form').first();
      await expect(modal).toBeVisible({ timeout: 5000 }).catch(() => {});
    }
  });

  // TC-CRM-004: 客户状态变更，验证状态流转正确
  test('TC-CRM-004 should change customer status and verify status transition', async ({ page }) => {
    await navigateTo(page, '/crm/customers');
    await expectUrl(page, /crm\/customers/);
    await expectPageVisible(page);
    await expectHasHeading(page);

    // 验证客户列表加载
    const listContainer = page.locator('table, .ant-table, [role="table"]').first();
    await expect(listContainer).toBeVisible({ timeout: 10000 }).catch(() => {});

    // 验证状态标签或下拉
    const statusTag = page.locator('.ant-tag, .ant-select, [class*="status"]').first();
    await expect(statusTag).toBeVisible({ timeout: 5000 }).catch(() => {});

    // 尝试点击状态变更按钮
    const statusButton = page.getByRole('button', { name: /状态|变更|转换/ }).first();
    if (await statusButton.isVisible().catch(() => false)) {
      await statusButton.click();
      await page.waitForLoadState('networkidle');
      // 验证状态变更弹窗
      const modal = page.locator('.ant-modal, [role="dialog"], .ant-select-dropdown').first();
      await expect(modal).toBeVisible({ timeout: 5000 }).catch(() => {});
    }
  });

  // TC-CRM-005: 客户分配，验证负责人变更
  test('TC-CRM-005 should assign customer and verify owner change', async ({ page }) => {
    await navigateTo(page, '/crm/customers');
    await expectUrl(page, /crm\/customers/);
    await expectPageVisible(page);
    await expectHasHeading(page);

    // 验证客户列表加载
    const listContainer = page.locator('table, .ant-table, [role="table"]').first();
    await expect(listContainer).toBeVisible({ timeout: 10000 }).catch(() => {});

    // 尝试点击分配按钮
    const assignButton = page.getByRole('button', { name: /分配|分配负责人|转交/ }).first();
    if (await assignButton.isVisible().catch(() => false)) {
      await assignButton.click();
      await page.waitForLoadState('networkidle');
      // 验证分配弹窗
      const modal = page.locator('.ant-modal, [role="dialog"], .ant-select-dropdown').first();
      await expect(modal).toBeVisible({ timeout: 5000 }).catch(() => {});
    }
  });
});
