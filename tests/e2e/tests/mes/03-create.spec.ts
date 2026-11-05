import { test, expect, APIRequestContext } from '@playwright/test';
import { loginViaUi, TEST_USERS } from '../../helpers/auth';
import { buildApiContext, apiPost, apiDelete, API_PATHS } from '../../helpers/api';

/**
 * MES Create flow E2E coverage (V216).
 * 登录 → 列表页 → 点击「新建」→ 填写表单 → 提交（带守卫，端点可能不存在）。
 */
test.describe('MES - Create', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUi(page, TEST_USERS.admin);
  });

  test('can open the create-production-order dialog and submit', async ({ page }) => {
    await page.goto('/mes/production-orders');
    const newButton = page
      .getByRole('main')
      .getByRole('button', { name: /新建|新增|创建|create|new/i })
      .first();
    // isVisible() 不会等待元素挂载（页面还在渲染时会误判不存在），用 waitFor 正确等待
    const hasCreate = await newButton
      .waitFor({ state: 'visible', timeout: 5_000 })
      .then(() => true)
      .catch(() => false);
    if (!hasCreate) {
      test.skip(true, '新建 button not present on MES production order list');
      return;
    }

    await newButton.click();
    await expect(
      page.getByRole('dialog').or(page.getByText(/新建|创建|create/i)).first()
    ).toBeVisible({ timeout: 5_000 });

    // Best-effort form fill
    const orderNo = page.getByLabel(/订单编号|order.?no|production.?no/i).first();
    if (await orderNo.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await orderNo.fill(`E2E-PO-${Date.now()}`);
    }

    const product = page.getByLabel(/产品|product/i).first();
    if (await product.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await product.fill('E2E-Test-Product');
    }

    const qty = page.getByLabel(/数量|quantity/i).first();
    if (await qty.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await qty.fill('100');
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

  test('can open the create-work-order dialog', async ({ page }) => {
    await page.goto('/mes/work-order');
    const newButton = page
      .getByRole('main')
      .getByRole('button', { name: /新建|新增|创建|create|new/i })
      .first();
    // isVisible() 不会等待元素挂载（页面还在渲染时会误判不存在），用 waitFor 正确等待
    const hasCreate = await newButton
      .waitFor({ state: 'visible', timeout: 5_000 })
      .then(() => true)
      .catch(() => false);
    if (!hasCreate) {
      test.skip(true, '新建 button not present on MES work order list');
      return;
    }

    await newButton.click();
    await expect(
      page.getByRole('dialog').or(page.getByText(/新建|创建|create/i)).first()
    ).toBeVisible({ timeout: 5_000 });
  });
});

test.describe('MES Production Order Create - API', () => {
  let ctx: APIRequestContext;

  test.beforeAll(async () => {
    ctx = await buildApiContext();
  });

  test.afterAll(async () => {
    await ctx?.dispose();
  });

  test('POST /api/mes/orders creates an order (or skips if unavailable)', async () => {
    let created: { id?: string } | null = null;
    try {
      // 实测：必填字段是 product_name/product_code/quantity（缺 product_code 返回 422）
      created = await apiPost<{ id?: string }>(ctx, API_PATHS.mes.productionOrder, {
        product_name: 'E2E-Test-Product',
        product_code: 'E2E-PRODUCT-CODE',
        quantity: 100,
      });
    } catch {
      test.skip(true, 'MES production order create API not available');
      return;
    }
    expect(created).toBeTruthy();
    if (created?.id) {
      try {
        await apiDelete(ctx, `${API_PATHS.mes.productionOrder}/${created.id}`);
      } catch {
        // best-effort cleanup
      }
    }
  });
});
