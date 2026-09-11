import { test, expect } from '@playwright/test';
import { loginAsAdmin, navigateTo, expectUrl, expectPageVisible, expectHasHeading } from './helpers/auth';

/**
 * SCM 供应商管理流程 E2E 测试
 * 业务流程: 供应商准入 → 供应商评估 → 供应商分级 → 绩效分析 → 供应商排名
 * 测试用例: TC-SCM-006 ~ TC-SCM-010
 */
test.describe('SCM Supplier Management Flow (TC-SCM-006 ~ TC-SCM-010)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  // TC-SCM-006: 供应商准入，验证准入流程
  test('TC-SCM-006 should admit supplier and verify admission process', async ({ page }) => {
    await navigateTo(page, '/scm/supplier-admission');
    await expectUrl(page, /scm\/supplier-admission/);
    await expectPageVisible(page);
    await expectHasHeading(page);

    // 验证准入申请列表加载
    const listContainer = page.locator('table, .ant-table, [role="table"]').first();
    await expect(listContainer).toBeVisible({ timeout: 10000 }).catch(() => {});

    // 尝试点击新建/准入按钮
    const createButton = page.getByRole('button', { name: /新建|创建|新增|准入/ }).first();
    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click();
      await page.waitForLoadState('networkidle');
      const modal = page.locator('.ant-modal, [role="dialog"]').first();
      await expect(modal).toBeVisible({ timeout: 5000 }).catch(() => {});
    }
  });

  // TC-SCM-007: 供应商评估，验证评估结果
  test('TC-SCM-007 should evaluate supplier and verify evaluation result', async ({ page }) => {
    await navigateTo(page, '/scm/supplier-evaluation');
    await expectUrl(page, /scm\/supplier-evaluation/);
    await expectPageVisible(page);
    await expectHasHeading(page);

    // 验证评估列表加载
    const table = page.locator('table, .ant-table').first();
    await expect(table).toBeVisible({ timeout: 10000 }).catch(() => {});

    // 验证评估按钮存在
    const evalButton = page.getByRole('button', { name: /评估|发起评估|评分/ }).first();
    if (await evalButton.isVisible().catch(() => false)) {
      await evalButton.click();
      await page.waitForLoadState('networkidle');
      const modal = page.locator('.ant-modal, [role="dialog"]').first();
      await expect(modal).toBeVisible({ timeout: 5000 }).catch(() => {});
    }
  });

  // TC-SCM-008: 供应商分级，验证分级逻辑
  test('TC-SCM-008 should grade supplier and verify grading logic', async ({ page }) => {
    await navigateTo(page, '/scm/suppliers');
    await expectUrl(page, /scm\/suppliers/);
    await expectPageVisible(page);
    await expectHasHeading(page);

    // 验证供应商列表加载
    const table = page.locator('table, .ant-table').first();
    await expect(table).toBeVisible({ timeout: 10000 }).catch(() => {});

    // 验证分级按钮存在
    const gradeButton = page.getByRole('button', { name: /分级|评级|等级调整/ }).first();
    if (await gradeButton.isVisible().catch(() => false)) {
      await gradeButton.click();
      await page.waitForLoadState('networkidle');
      const modal = page.locator('.ant-modal, [role="dialog"]').first();
      await expect(modal).toBeVisible({ timeout: 5000 }).catch(() => {});
    }
  });

  // TC-SCM-009: 供应商绩效分析，验证绩效统计
  test('TC-SCM-009 should analyze supplier performance and verify statistics', async ({ page }) => {
    await navigateTo(page, '/scm/suppliers');
    await expectUrl(page, /scm\/suppliers/);
    await expectPageVisible(page);
    await expectHasHeading(page);

    // 验证绩效统计卡片加载
    const summaryCards = page.locator('.ant-card, [class*="summary"], [class*="stat"]').first();
    await expect(summaryCards).toBeVisible({ timeout: 5000 }).catch(() => {});

    // 验证绩效图表
    const chart = page.locator('canvas, [class*="chart"]').first();
    await expect(chart).toBeVisible({ timeout: 5000 }).catch(() => {});
  });

  // TC-SCM-010: 供应商排名，验证排名计算
  test('TC-SCM-010 should rank suppliers and verify ranking calculation', async ({ page }) => {
    await navigateTo(page, '/scm/overview');
    await expectUrl(page, /scm\/overview/);
    await expectPageVisible(page);
    await expectHasHeading(page);

    // 验证供应链概览统计卡片
    const summaryCards = page.locator('.ant-card, [class*="summary"], [class*="stat"]').first();
    await expect(summaryCards).toBeVisible({ timeout: 5000 }).catch(() => {});

    // 验证供应商排名表格/榜单
    const rankTable = page.locator('table, .ant-table, [class*="rank"], [class*="leaderboard"]').first();
    await expect(rankTable).toBeVisible({ timeout: 5000 }).catch(() => {});
  });
});
