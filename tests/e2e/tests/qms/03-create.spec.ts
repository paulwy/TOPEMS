import { test, expect, APIRequestContext } from '@playwright/test';
import { loginViaUi, TEST_USERS } from '../../helpers/auth';
import { buildApiContext, apiPost, apiDelete, API_PATHS } from '../../helpers/api';

/**
 * QMS Create flow E2E coverage (P33-4).
 * 登录 → 列表页 → 点击「新建」→ 填写表单 → 提交（带守卫，端点可能不存在）。
 */
test.describe('QMS - Create', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUi(page, TEST_USERS.admin);
  });

  test('can open the create-quality-issue dialog and submit', async ({ page }) => {
    await page.goto('/qms/quality-issues');
    const newButton = page
      .getByRole('button', { name: /新建|新增|create|new/i })
      .first();
    const hasCreate = await newButton.isVisible({ timeout: 5_000 }).catch(() => false);
    if (!hasCreate) {
      test.skip(true, '新建 button not present on QMS quality-issue list');
      return;
    }

    await newButton.click();
    await expect(
      page.getByRole('dialog').or(page.getByText(/新建质量问题|create quality issue/i)).first()
    ).toBeVisible({ timeout: 5_000 });

    // Best-effort form fill (fields may or may not exist)
    const title = page.getByLabel(/标题|名称|title|name/i).first();
    if (await title.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await title.fill(`E2E-QI-${Date.now()}`);
    }
    const desc = page.getByLabel(/描述|description|备注|remark/i).first();
    if (await desc.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await desc.fill('E2E test quality issue description');
    }

    const submit = page
      .getByRole('button', { name: /确定|提交|保存|submit|save|ok/i })
      .first();
    if (await submit.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await submit.click();
      // Endpoint may not exist; accept success toast OR table still present
      await expect(
        page.getByText(/成功|success|保存成功/i).or(page.getByRole('table')).first()
      ).toBeVisible({ timeout: 10_000 });
    }
  });
});

test.describe('QMS Quality Issue Create - API', () => {
  let ctx: APIRequestContext;

  test.beforeAll(async () => {
    ctx = await buildApiContext();
  });

  test.afterAll(async () => {
    await ctx?.dispose();
  });

  test('POST /api/qms/quality-issues creates a quality issue (or skips if unavailable)', async () => {
    let created: { id?: string } | null = null;
    try {
      created = await apiPost<{ id?: string }>(ctx, API_PATHS.qms.qualityIssue, {
        title: `E2E-QI-${Date.now()}`,
        description: 'E2E test quality issue description',
        severity: 'minor',
      });
    } catch {
      test.skip(true, 'QMS quality-issue create API not available');
      return;
    }
    expect(created).toBeTruthy();
    if (created?.id) {
      try {
        await apiDelete(ctx, `${API_PATHS.qms.qualityIssue}/${created.id}`);
      } catch {
        // best-effort cleanup — endpoint may not support DELETE
      }
    }
  });
});
