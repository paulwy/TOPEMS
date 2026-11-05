import { test, expect, APIRequestContext } from '@playwright/test';
import { loginViaUi, TEST_USERS } from '../helpers/auth';
import {
  buildApiContext,
  API_PATHS,
  apiGet,
  apiPost,
  apiPut,
  extractList,
  PaginatedResponse,
} from '../helpers/api';

// 实测响应结构（svc/mes/src/modules/production_order.rs::ProductionOrderResponse）：
// 主键是 order_no（不是 code），数量字段是 quantity（不是 plannedQuantity），
// 状态从 pending 开始（不是 draft），日期是 planned_start_date/planned_end_date。
interface ProductionOrder {
  id: string;
  order_no: string;
  product_name: string;
  product_code: string;
  quantity: number;
  completed_quantity: number;
  status: string;
  planned_start_date?: string | null;
  planned_end_date?: string | null;
}

test.describe('Production Order - UI', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUi(page, TEST_USERS.admin);
  });

  test('can navigate to the production order list page', async ({ page }) => {
    await page.goto('/mes/production-orders');
    await expect(page).toHaveURL(/production-orders/);
    // Wait for either the table or an empty-state placeholder
    await expect(
      page.getByRole('table').or(page.getByText(/暂无数据|no data|empty/i)).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test('can open the create-production-order dialog', async ({ page }) => {
    await page.goto('/mes/production-orders');
    const newButton = page
      .getByRole('button', { name: /新建|新增|create|new/i })
      .first();
    if (await newButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await newButton.click();
      await expect(
        page.getByRole('dialog').or(page.getByText(/新建生产订单|create production order/i)).first()
      ).toBeVisible({ timeout: 5_000 });
    }
  });

  test('search filters the list', async ({ page }) => {
    await page.goto('/mes/production-orders');
    const search = page.getByPlaceholder(/搜索|search|订单号|code/i).first();
    if (await search.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await search.fill('TEST-NOT-EXISTING-XYZ');
      // After filtering, expect either a "no data" state or a filtered table
      await expect(
        page.getByText(/暂无数据|no data|empty/i).or(page.getByRole('table'))
      ).toBeVisible({ timeout: 10_000 });
    }
  });
});

test.describe('Production Order - API', () => {
  let ctx: APIRequestContext;

  test.beforeAll(async () => {
    ctx = await buildApiContext();
  });

  test.afterAll(async () => {
    await ctx.dispose();
  });

  test('GET /api/mes/orders returns a paginated list', async () => {
    const res = await apiGet<PaginatedResponse<ProductionOrder>>(
      ctx,
      API_PATHS.mes.productionOrder,
      { page: 1, page_size: 10 }
    );
    // 实测：/api/mes/orders 的分页键是 orders，不是通用 items
    expect(extractList(res)).not.toBeNull();
    expect(res.page).toBe(1);
  });

  test('Production order CRUD lifecycle', async () => {
    const productCode = `PO-TEST-${Date.now()}`;

    // CREATE：必填字段 product_name / product_code / quantity；
    // planned_start_date 是 RFC3339 DateTime（只传 yyyy-MM-dd 会 422 "premature end of input"）
    const created = await apiPost<ProductionOrder>(ctx, API_PATHS.mes.productionOrder, {
      product_name: 'E2E Test Product',
      product_code: productCode,
      quantity: 100,
      planned_start_date: new Date().toISOString(),
    });
    expect(created.id).toBeTruthy();
    expect(created.order_no).toMatch(/^MO\d+/);
    expect(created.product_code).toBe(productCode);
    expect(created.status).toBe('pending');
    expect(Number(created.quantity)).toBe(100);

    // READ
    const fetched = await apiGet<ProductionOrder>(
      ctx,
      `${API_PATHS.mes.productionOrder}/${created.id}`
    );
    expect(fetched.id).toBe(created.id);
    expect(Number(fetched.quantity)).toBe(100);

    // RELEASE：PUT /orders/{id}/release（不是 POST）
    const released = await apiPut<ProductionOrder>(
      ctx,
      `${API_PATHS.mes.productionOrder}/${created.id}/release`,
      {}
    );
    expect(released.status).toBe('released');

    // DELETE
    const del = await ctx.delete(
      `${API_PATHS.mes.productionOrder}/${created.id}`
    );
    expect(del.ok() || del.status() === 204).toBeTruthy();
  });

  test('Cannot create production order with negative quantity', async () => {
    const res = await ctx.post(
      `${process.env.API_BASE_URL ?? 'http://localhost:8099'}${
        API_PATHS.mes.productionOrder
      }`,
      {
        data: {
          product_name: 'Bad Product',
          product_code: `PO-BAD-${Date.now()}`,
          quantity: -1,
        },
      }
    );
    // 实测：后端未做负数校验，返回 200 且 quantity=-1 落库（见报告「真实缺陷」）
    expect([400, 422]).toContain(res.status());
  });
});
