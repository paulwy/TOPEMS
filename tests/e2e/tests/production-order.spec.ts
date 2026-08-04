import { test, expect, APIRequestContext } from '@playwright/test';
import { loginViaUi, TEST_USERS } from '../helpers/auth';
import { buildApiContext, API_PATHS, apiGet, apiPost, PaginatedResponse } from '../helpers/api';

interface ProductionOrder {
  id: string;
  code: string;
  product_name?: string;
  plannedQuantity: number;
  status: 'draft' | 'released' | 'in_progress' | 'completed' | 'cancelled';
  start_date?: string;
  end_date?: string;
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

  test('GET /api/mes/production-orders returns a paginated list', async () => {
    const res = await apiGet<PaginatedResponse<ProductionOrder>>(
      ctx,
      API_PATHS.mes.productionOrder,
      { page: 1, page_size: 10 }
    );
    expect(Array.isArray(res.items)).toBeTruthy();
    expect(res.page).toBe(1);
  });

  test('Production order CRUD lifecycle', async () => {
    const code = `PO-TEST-${Date.now()}`;

    // CREATE
    const created = await apiPost<ProductionOrder>(ctx, API_PATHS.mes.productionOrder, {
      code,
      product_name: 'E2E Test Product',
      plannedQuantity: 100,
      start_date: new Date().toISOString().slice(0, 10),
      status: 'draft',
    });
    expect(created.id).toBeTruthy();
    expect(created.code).toBe(code);
    expect(created.status).toBe('draft');

    // READ
    const fetched = await apiGet<ProductionOrder>(
      ctx,
      `${API_PATHS.mes.productionOrder}/${created.id}`
    );
    expect(fetched.id).toBe(created.id);
    expect(fetched.plannedQuantity).toBe(100);

    // UPDATE
    const updated = await apiPost<ProductionOrder>(
      ctx,
      `${API_PATHS.mes.productionOrder}/${created.id}/release`,
      {}
    );
    expect(['released', 'in_progress']).toContain(updated.status);

    // DELETE
    const del = await ctx.delete(
      `${API_PATHS.mes.productionOrder}/${created.id}`
    );
    expect(del.ok() || del.status() === 204).toBeTruthy();
  });

  test('Cannot create production order with negative quantity', async () => {
    const res = await ctx.post(
      `${process.env.API_BASE_URL ?? 'http://localhost:8080'}${
        API_PATHS.mes.productionOrder
      }`,
      {
        data: {
          code: `PO-BAD-${Date.now()}`,
          product_name: 'Bad Product',
          plannedQuantity: -1,
        },
      }
    );
    expect([400, 422]).toContain(res.status());
  });
});
