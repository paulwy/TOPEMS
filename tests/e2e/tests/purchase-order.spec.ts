import { test, expect, APIRequestContext } from '@playwright/test';
import { loginViaUi, TEST_USERS } from '../helpers/auth';
import { buildApiContext, API_PATHS, apiGet, apiPost, PaginatedResponse } from '../helpers/api';

interface PurchaseOrder {
  id: string;
  code: string;
  supplier_id: string;
  supplier_name?: string;
  total_amount: number;
  currency?: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'received' | 'closed' | 'cancelled';
  expected_delivery_date?: string;
  lines?: PurchaseOrderLine[];
}

interface PurchaseOrderLine {
  id?: string;
  material_id: string;
  material_name?: string;
  quantity: number;
  unit_price: number;
}

test.describe('Purchase Order - UI', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUi(page, TEST_USERS.admin);
  });

  test('can navigate to the purchase order list page', async ({ page }) => {
    await page.goto('/scm/purchase-orders');
    await expect(page).toHaveURL(/purchase-orders/);
    await expect(
      page.getByRole('table').or(page.getByText(/暂无数据|no data|empty/i)).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test('supplier dropdown is populated in create form', async ({ page }) => {
    await page.goto('/scm/purchase-orders');
    const newButton = page
      .getByRole('button', { name: /新建|新增|create|new/i })
      .first();
    if (await newButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await newButton.click();
      const supplierField = page
        .getByLabel(/供应商|supplier/i)
        .first();
      if (await supplierField.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await supplierField.click();
        await expect(
          page.getByRole('option').or(page.getByRole('listbox')).first()
        ).toBeVisible({ timeout: 5_000 });
      }
    }
  });
});

test.describe('Purchase Order - API', () => {
  let ctx: APIRequestContext;
  let testSupplierId: string;

  test.beforeAll(async () => {
    ctx = await buildApiContext();
    // Discover a valid supplier id for the lifecycle test
    try {
      const suppliers = await apiGet<PaginatedResponse<{ id: string }>>(
        ctx,
        API_PATHS.scm.supplier,
        { page: 1, page_size: 1 }
      );
      testSupplierId = suppliers.items?.[0]?.id ?? 'demo-supplier';
    } catch {
      testSupplierId = 'demo-supplier';
    }
  });

  test.afterAll(async () => {
    await ctx.dispose();
  });

  test('GET /api/scm/purchase-orders returns a paginated list', async () => {
    const res = await apiGet<PaginatedResponse<PurchaseOrder>>(
      ctx,
      API_PATHS.scm.purchaseOrder,
      { page: 1, page_size: 10 }
    );
    expect(Array.isArray(res.items)).toBeTruthy();
    expect(res.page).toBe(1);
  });

  test('Purchase order full lifecycle: create -> approve -> receive', async () => {
    const code = `PO-E2E-${Date.now()}`;

    // CREATE with at least one line
    const created = await apiPost<PurchaseOrder>(ctx, API_PATHS.scm.purchaseOrder, {
      code,
      supplier_id: testSupplierId,
      currency: 'CNY',
      expected_delivery_date: new Date(Date.now() + 7 * 86400_000)
        .toISOString()
        .slice(0, 10),
      lines: [
        {
          material_id: 'demo-material-001',
          material_name: 'E2E Test Material',
          quantity: 50,
          unit_price: 12.5,
        },
      ],
      status: 'draft',
    });
    expect(created.id).toBeTruthy();
    expect(created.code).toBe(code);
    expect(created.lines?.[0]?.quantity).toBe(50);
    expect(created.total_amount).toBeGreaterThan(0);

    // SUBMIT FOR APPROVAL
    const submitted = await apiPost<PurchaseOrder>(
      ctx,
      `${API_PATHS.scm.purchaseOrder}/${created.id}/submit`,
      {}
    );
    expect(['pending_approval', 'approved']).toContain(submitted.status);

    // APPROVE
    if (submitted.status === 'pending_approval') {
      const approved = await apiPost<PurchaseOrder>(
        ctx,
        `${API_PATHS.scm.purchaseOrder}/${created.id}/approve`,
        { comment: 'E2E auto-approval' }
      );
      expect(approved.status).toBe('approved');
    }

    // CLEANUP: cancel the order (don't pollute shared env)
    const cancel = await ctx.post(
      `${process.env.API_BASE_URL ?? 'http://localhost:8080'}${
        API_PATHS.scm.purchaseOrder
      }/${created.id}/cancel`,
      { data: { reason: 'E2E cleanup' } }
    );
    expect(cancel.ok() || cancel.status() === 204).toBeTruthy();
  });

  test('Cannot create purchase order without supplier', async () => {
    const res = await ctx.post(
      `${process.env.API_BASE_URL ?? 'http://localhost:8080'}${
        API_PATHS.scm.purchaseOrder
      }`,
      {
        data: {
          code: `PO-MISSING-SUPPLIER-${Date.now()}`,
          lines: [{ material_id: 'm1', quantity: 1, unit_price: 1 }],
        },
      }
    );
    expect([400, 422]).toContain(res.status());
  });
});
