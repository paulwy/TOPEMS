import { test, expect, APIRequestContext } from '@playwright/test';
import { buildApiContext, API_PATHS, apiGet, apiPost, apiPut, apiDelete, fetchFirst, apiDeleteExpectError } from '../helpers/api';

const now = Date.now();
const randomSuffix = () => Math.floor(Math.random() * 10000);

test.describe('Auth & Health', () => {
  test('login with valid credentials', async ({ request }) => {
    const res = await request.post('http://localhost:8080/api/core/iam/auth/login', {
      data: { username: 'admin', password: 'admin123' },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.access_token).toBeTruthy();
    expect(body.data.user.username).toBe('admin');
    expect(body.data.user.roles).toContain('admin');
  });

  test('login with invalid credentials returns 401', async ({ request }) => {
    const res = await request.post('http://localhost:8080/api/core/iam/auth/login', {
      data: { username: 'admin', password: 'wrongpass' },
    });
    expect(res.status()).toBe(401);
  });

  test('login without credentials returns 400', async ({ request }) => {
    const res = await request.post('http://localhost:8080/api/core/iam/auth/login', {
      data: {},
    });
    expect(res.status()).toBe(400);
  });

  test('unauthenticated request returns 401', async ({ request }) => {
    const res = await request.get('http://localhost:8080/api/finance/expense-approvals');
    expect(res.status()).toBe(401);
  });

  test('health endpoint responds', async ({ request }) => {
    const res = await request.get('http://localhost:8080/api/core/iam/auth/health');
    expect(res.ok()).toBeTruthy();
  });
});

test.describe('Dashboard API', () => {
  let ctx: APIRequestContext;

  test.beforeAll(async () => {
    ctx = await buildApiContext();
  });

  test.afterAll(async () => {
    await ctx.dispose();
  });

  const modules = ['finance', 'ehs', 'crm', 'wms', 'hrm', 'pdm', 'qms', 'mes', 'pm', 'lims'] as const;

  for (const mod of modules) {
    test(`GET /api/${mod}/dashboard returns valid structure`, async () => {
      const res = await ctx.get(`http://localhost:8080/api/${mod}/dashboard`);
      expect(res.ok(), `${mod} dashboard should return 200`).toBeTruthy();
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data).toBeTruthy();
    });
  }
});

test.describe('Expense Approval CRUD Flow', () => {
  let ctx: APIRequestContext;
  let createdId: string;

  test.beforeAll(async () => {
    ctx = await buildApiContext();
  });

  test.afterAll(async () => {
    if (ctx) {
      try {
        if (createdId) {
          await apiDelete(ctx, `${API_PATHS.finance.expenseApproval}/${createdId}`);
        }
      } catch {}
      await ctx.dispose();
    }
  });

  test('list expense approvals and get first item', async () => {
    const item = await fetchFirst<any>(ctx, API_PATHS.finance.expenseApproval);
    expect(item).toBeTruthy();
    expect(item.id).toBeTruthy();
  });

  test('create a new expense approval', async () => {
    const res = await apiPost<any>(ctx, API_PATHS.finance.expenseApproval, {
      expense_no: `E2E-${now}-${randomSuffix()}`,
      employee_id: `e2e-${randomSuffix()}`,
      expense_date: '2026-07-24',
      expense_type: 'travel',
      status: 'draft',
      items: [
        { date: '2026-07-24', category: 'transport', amount: 100 + randomSuffix() },
      ],
    });
    expect(res.id).toBeTruthy();
    expect(res.expense_no).toContain('E2E-');
    createdId = res.id;
  });

  test('get created expense approval by id', async () => {
    expect(createdId).toBeTruthy();
    const res = await apiGet<any>(ctx, `${API_PATHS.finance.expenseApproval}/${createdId}`);
    expect(res.id).toBe(createdId);
    expect(res.status).toBe('draft');
  });

  test('update the expense approval status', async () => {
    const res = await apiPut<any>(ctx, `${API_PATHS.finance.expenseApproval}/${createdId}`, {
      status: 'submitted',
    });
    expect(res.status).toBe('submitted');
  });

  test('delete the expense approval', async () => {
    await apiDelete(ctx, `${API_PATHS.finance.expenseApproval}/${createdId}`);
    await apiDeleteExpectError(ctx, `${API_PATHS.finance.expenseApproval}/${createdId}`, 404);
    createdId = '';
  });
});

test.describe('Purchase Contract Flow', () => {
  let ctx: APIRequestContext;

  test.beforeAll(async () => {
    ctx = await buildApiContext();
  });

  test.afterAll(async () => {
    await ctx.dispose();
  });

  test('list purchase contracts has items', async () => {
    const res = await apiGet<any>(ctx, API_PATHS.scm.purchaseContract);
    expect(res.items.length).toBeGreaterThan(0);
  });

  test('filter by page and page_size', async () => {
    const res = await apiGet<any>(ctx, API_PATHS.scm.purchaseContract, {
      page: 1,
      page_size: 1,
    });
    expect(res.items.length).toBeLessThanOrEqual(1);
    expect(res.page).toBe(1);
  });
});

test.describe('QMS FMEA & SPC Flow', () => {
  let ctx: APIRequestContext;

  test.beforeAll(async () => {
    ctx = await buildApiContext();
  });

  test.afterAll(async () => {
    await ctx.dispose();
  });

  test('FMEA list returns analyses with RPN', async () => {
    const res = await apiGet<any>(ctx, API_PATHS.qms.fmea);
    expect(res.items.length).toBeGreaterThan(0);
    const first = res.items[0];
    expect(first.rpn).toBeGreaterThan(0);
    expect(first.title).toBeTruthy();
  });

  test('SPC charts list returns chart data', async () => {
    const res = await apiGet<any>(ctx, API_PATHS.qms.spc);
    expect(res.items.length).toBeGreaterThan(0);
    const first = res.items[0];
    expect(first.chart_name).toBeTruthy();
    expect(first.ucl).toBeGreaterThan(first.lcl);
  });

  test('create a new FMEA analysis', async () => {
    const res = await apiPost<any>(ctx, API_PATHS.qms.fmea, {
      title: `E2E测试-FMEA-${randomSuffix()}`,
      process: '测试工序',
      severity: 6,
      occurrence: 5,
      detection: 4,
      rpn: 120,
      status: 'open',
    });
    expect(res.id).toContain('FMEA-');
  });

  test('create a new SPC chart', async () => {
    const res = await apiPost<any>(ctx, API_PATHS.qms.spc, {
      chart_name: `E2E测试-SPC-${randomSuffix()}`,
      process: '测试线',
      metric: '测试指标',
      ucl: 105.0,
      lcl: 95.0,
      mean: 100.0,
      data_points: 50,
      status: 'stable',
    });
    expect(res.id).toContain('SPC-');
  });
});
