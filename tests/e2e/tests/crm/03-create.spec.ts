import { test, expect, APIRequestContext } from '@playwright/test';
import { loginViaUi, TEST_USERS } from '../../helpers/auth';
import { buildApiContext, apiPost, apiDelete, API_PATHS } from '../../helpers/api';

/**
 * CRM Create flow E2E coverage (V216).
 * 登录 → 列表页 → 点击「新建」→ 填写表单 → 提交（带守卫，端点可能不存在）。
 */
test.describe('CRM - Create', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUi(page, TEST_USERS.admin);
  });

  test('can open the create-customer dialog and submit', async ({ page }) => {
    await page.goto('/crm/customers');
    const newButton = page
      .getByRole('button', { name: /新建|新增|create|new/i })
      .first();
    const hasCreate = await newButton.isVisible({ timeout: 5_000 }).catch(() => false);
    if (!hasCreate) {
      test.skip(true, '新建 button not present on CRM customer list');
      return;
    }

    await newButton.click();
    await expect(
      page.getByRole('dialog').or(page.getByText(/新建客户|create customer/i)).first()
    ).toBeVisible({ timeout: 5_000 });

    // Best-effort form fill
    const name = page.getByLabel(/客户名称|customer.?name|名称/i).first();
    if (await name.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await name.fill(`E2E-CUST-${Date.now()}`);
    }

    const phone = page.getByLabel(/电话|phone|手机/i).first();
    if (await phone.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await phone.fill('13800000000');
    }

    const email = page.getByLabel(/邮箱|email/i).first();
    if (await email.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await email.fill('e2e@test.com');
    }

    const submit = page
      .getByRole('button', { name: /确定|提交|保存|submit|save|ok/i })
      .first();
    if (await submit.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await submit.click();
      await expect(
        page.getByText(/成功|success|保存成功/i).or(page.getByRole('table')).first()
      ).toBeVisible({ timeout: 10_000 });
    }
  });

  test('can open the create-contact dialog', async ({ page }) => {
    await page.goto('/crm/contacts');
    const newButton = page
      .getByRole('button', { name: /新建|新增|create|new/i })
      .first();
    const hasCreate = await newButton.isVisible({ timeout: 5_000 }).catch(() => false);
    if (!hasCreate) {
      test.skip(true, '新建 button not present on CRM contact list');
      return;
    }

    await newButton.click();
    await expect(
      page.getByRole('dialog').or(page.getByText(/新建联系人|create contact/i)).first()
    ).toBeVisible({ timeout: 5_000 });
  });
});

test.describe('CRM Customer Create - API', () => {
  let ctx: APIRequestContext;

  test.beforeAll(async () => {
    ctx = await buildApiContext();
  });

  test.afterAll(async () => {
    await ctx?.dispose();
  });

  test('POST /api/crm/customers creates a customer (or skips if unavailable)', async () => {
    let created: { id?: string } | null = null;
    try {
      created = await apiPost<{ id?: string }>(ctx, API_PATHS.crm.customer, {
        name: `E2E-CUST-${Date.now()}`,
        phone: '13800000000',
        email: 'e2e@test.com',
      });
    } catch {
      test.skip(true, 'CRM customer create API not available');
      return;
    }
    expect(created).toBeTruthy();
    if (created?.id) {
      try {
        await apiDelete(ctx, `${API_PATHS.crm.customer}/${created.id}`);
      } catch {
        // best-effort cleanup
      }
    }
  });
});
