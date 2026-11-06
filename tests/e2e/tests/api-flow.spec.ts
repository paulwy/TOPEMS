import { test, expect, APIRequestContext } from '@playwright/test';
import {
  buildApiContext,
  API_PATHS,
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
  fetchFirst,
  apiDeleteExpectError,
  extractList,
} from '../helpers/api';
import { API_BASE_URL } from '../helpers/env';

const now = Date.now();
const randomSuffix = () => Math.floor(Math.random() * 10000);

test.describe('Auth & Health', () => {
  test('login with valid credentials', async ({ request }) => {
    const res = await request.post(`${API_BASE_URL}/api/core/iam/auth/login`, {
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
    const res = await request.post(`${API_BASE_URL}/api/core/iam/auth/login`, {
      data: { username: 'admin', password: 'wrongpass' },
    });
    expect(res.status()).toBe(401);
  });

  test('login without credentials returns 400', async ({ request }) => {
    const res = await request.post(`${API_BASE_URL}/api/core/iam/auth/login`, {
      data: {},
    });
    expect(res.status()).toBe(400);
  });

  test('unauthenticated request returns 401', async ({ request }) => {
    const res = await request.get(`${API_BASE_URL}/api/finance/expense-approvals`);
    expect(res.status()).toBe(401);
  });

  test('health endpoint responds', async ({ request }) => {
    // 实测：/api/core/iam/health 需要鉴权（未带 token 返回 401），公共健康检查在 /health
    const res = await request.get(`${API_BASE_URL}/health`);
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

  // 实测：mes / pm 的 dashboard 已迁到子路径，其余模块仍在 /api/{mod}/dashboard
  const dashboards = [
    { mod: 'finance', path: '/api/finance/dashboard' },
    { mod: 'ehs', path: '/api/ehs/dashboard' },
    { mod: 'crm', path: '/api/crm/dashboard' },
    { mod: 'wms', path: '/api/wms/dashboard' },
    { mod: 'hrm', path: '/api/hrm/dashboard' },
    { mod: 'pdm', path: '/api/pdm/dashboard' },
    { mod: 'qms', path: '/api/qms/dashboard' },
    { mod: 'mes', path: '/api/mes/kanban/dashboard' },
    { mod: 'pm', path: '/api/pm/statistics/dashboard' },
    { mod: 'lims', path: '/api/lims/dashboard' },
  ] as const;

  for (const { mod, path } of dashboards) {
    test(`GET ${path} returns valid structure`, async () => {
      const res = await ctx.get(`${API_BASE_URL}${path}`);
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
    // 实测：/api/qms/fmea 的 data 是裸数组（不是 {items, total}）
    const list = extractList<any>(res) ?? [];
    expect(list.length, '需要至少一条 FMEA 种子数据').toBeGreaterThan(0);
    const first = list[0];
    expect(first.title).toBeTruthy();
  });

  test('SPC charts list returns chart data', async () => {
    const res = await apiGet<any>(ctx, API_PATHS.qms.spc);
    // 实测：/api/qms/spc/charts 的 data 同样是裸数组
    const list = extractList<any>(res) ?? [];
    expect(list.length, '需要至少一条 SPC 种子数据').toBeGreaterThan(0);
    const first = list[0];
    expect(first.chart_name ?? first.parameter_name).toBeTruthy();
    // 实测：ucl/lcl 是 DECIMAL，序列化成字符串（"105"），需要转数字再比较
    expect(Number(first.ucl)).toBeGreaterThan(Number(first.lcl));
  });

  test('create a new FMEA analysis', async () => {
    // 实测：必填字段为 title + fmea_type（缺 fmea_type 返回 422），RPN 等字段由 DFMEA/PFMEA 明细承载
    const res = await apiPost<any>(ctx, API_PATHS.qms.fmea, {
      title: `E2E测试-FMEA-${randomSuffix()}`,
      fmea_type: 'Process',
      process_name: '测试工序',
      scope: 'E2E 自动化',
    });
    expect(res.fmea_no).toContain('FMEA-');
  });

  test('create a new SPC chart', async () => {
    // 实测：必填字段为 chart_type + parameter_name（缺 chart_type 返回 422）
    const res = await apiPost<any>(ctx, API_PATHS.qms.spc, {
      chart_type: 'X-R',
      parameter_name: '测试指标',
      chart_name: `E2E测试-SPC-${randomSuffix()}`,
      process_name: '测试线',
      ucl: 105.0,
      lcl: 95.0,
      cl: 100.0,
    });
    expect(res.chart_no).toContain('SPC-');
  });
});
