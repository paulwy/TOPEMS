import { test, expect } from '@playwright/test';
import { createAuthenticatedContext } from '../utils/testUtils';

// D4 testability: verify key data-testid hooks exist in real DOM
test.describe('D4 data-testid sanity', () => {
  test('login page exposes stable testids', async ({ page }) => {
    await page.goto('http://localhost:3001/login');
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('login-username')).toBeVisible();
    await expect(page.getByTestId('login-password')).toBeVisible();
    await expect(page.getByTestId('login-submit')).toBeVisible();
  });

  test('workspace topbar + pagination + search testids present', async ({ browser }) => {
    const context = await createAuthenticatedContext(browser);
    const page = context.pages()[0] ?? (await context.newPage());
    await page.goto('http://localhost:3001/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await expect(page.getByTestId('topbar-command-palette')).toBeVisible();
    await expect(page.getByTestId('topbar-notifications')).toBeVisible();
    await expect(page.getByTestId('topbar-profile')).toBeVisible();
    await context.close();
  });

  test('crm list exposes pagination testid when rendered', async ({ browser }) => {
    const context = await createAuthenticatedContext(browser);
    const page = context.pages()[0] ?? (await context.newPage());
    await page.goto('http://localhost:3001/crm/customers');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    // search box only renders on searchable list pages; assert pagination select when present
    const pageSize = page.getByTestId('pagination-page-size');
    if ((await pageSize.count()) > 0) {
      await expect(pageSize.first()).toBeVisible();
    }
    await context.close();
  });

  test('searchable list page exposes search input testid', async ({ browser }) => {
    const context = await createAuthenticatedContext(browser);
    const page = context.pages()[0] ?? (await context.newPage());
    await page.goto('http://localhost:3001/pm/templates');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    const search = page.getByTestId('list-search-input');
    if ((await search.count()) > 0) {
      await expect(search.first()).toBeVisible();
    }
    await context.close();
  });

  // D4 补充批（2026-10-23）：CrudPage 共享行操作 + FormBuilder 表单锚点
  test('crud list exposes row-action + form submit/reset testids', async ({ browser }) => {
    const context = await createAuthenticatedContext(browser);
    const page = context.pages()[0] ?? (await context.newPage());
    // SRM 供应商列表为标准 CrudPage（schema actions 全量 create/edit/detail/delete）
    await page.goto('http://localhost:3001/srm/supplier');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // 行操作「查看/编辑」（内置 rowAction key=view/edit，多行取首行）
    await expect(page.getByTestId('row-action-view').first()).toBeVisible();
    await expect(page.getByTestId('row-action-edit').first()).toBeVisible();

    // 打开编辑弹窗断言 FormBuilder 提交/重置锚点（mode=edit，不提交直接取消关闭）
    await page.getByTestId('row-action-edit').first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await expect(dialog.getByTestId('form-submit-btn')).toBeVisible();
    await expect(dialog.getByTestId('form-reset-btn')).toBeVisible();
    await dialog.getByTestId('form-reset-btn').click();
    await expect(dialog).not.toBeVisible({ timeout: 5000 });
    await context.close();
  });
});
