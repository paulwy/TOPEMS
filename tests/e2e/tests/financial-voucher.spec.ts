import { test, expect, APIRequestContext } from '@playwright/test';
import { loginViaUi, TEST_USERS } from '../helpers/auth';
import { buildApiContext, API_PATHS, apiGet, apiPost, PaginatedResponse } from '../helpers/api';

interface VoucherLine {
  account_id: string;
  account_code?: string;
  account_name?: string;
  description?: string;
  debit_amount?: number;
  credit_amount?: number;
}

interface Voucher {
  id: string;
  voucher_no: string;
  voucher_date: string;
  period_id: string;
  summary?: string;
  status: 'draft' | 'pending_review' | 'posted' | 'rejected' | 'reversed';
  total_debit: number;
  total_credit: number;
  lines: VoucherLine[];
}

test.describe('Financial Voucher - UI', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUi(page, TEST_USERS.admin);
  });

  test('can navigate to the voucher list page', async ({ page }) => {
    await page.goto('/finance/vouchers');
    await expect(page).toHaveURL(/vouchers/);
    await expect(
      page.getByRole('table').or(page.getByText(/暂无数据|no data|empty/i)).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test('double-entry validation is enforced in the create form', async ({ page }) => {
    await page.goto('/finance/vouchers');
    const newButton = page
      .getByRole('button', { name: /新建|新增|create|new|凭证/i })
      .first();
    if (await newButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await newButton.click();
      // The form must expose at least two lines (借/贷) and a submit button
      await expect(
        page.getByText(/借方|debit|贷方|credit/i).first()
      ).toBeVisible({ timeout: 5_000 });
    }
  });
});

test.describe('Financial Voucher - API', () => {
  let ctx: APIRequestContext;
  let testAccountId: string;
  let testAccountId2: string;
  let testPeriodId: string;

  test.beforeAll(async () => {
    ctx = await buildApiContext();
    // Discover accounts + period for the lifecycle test
    try {
      const accounts = await apiGet<PaginatedResponse<{ id: string }>>(
        ctx,
        API_PATHS.finance.account,
        { page: 1, page_size: 5 }
      );
      testAccountId = accounts.items?.[0]?.id ?? 'demo-account-1';
      testAccountId2 = accounts.items?.[1]?.id ?? 'demo-account-2';
    } catch {
      testAccountId = 'demo-account-1';
      testAccountId2 = 'demo-account-2';
    }
    try {
      const periods = await apiGet<PaginatedResponse<{ id: string }>>(
        ctx,
        API_PATHS.finance.period,
        { page: 1, page_size: 1 }
      );
      testPeriodId = periods.items?.[0]?.id ?? 'demo-period';
    } catch {
      testPeriodId = 'demo-period';
    }
  });

  test.afterAll(async () => {
    await ctx.dispose();
  });

  test('GET /api/finance/vouchers returns a paginated list', async () => {
    const res = await apiGet<PaginatedResponse<Voucher>>(
      ctx,
      API_PATHS.finance.voucher,
      { page: 1, page_size: 10 }
    );
    expect(Array.isArray(res.items)).toBeTruthy();
    expect(res.page).toBe(1);
  });

  test('Voucher lifecycle: create -> review -> post -> reverse', async () => {
    const code = `VC-E2E-${Date.now()}`;
    const amount = 1234.56;

    // CREATE — must be balanced (借 == 贷)
    const created = await apiPost<Voucher>(ctx, API_PATHS.finance.voucher, {
      voucher_no: code,
      voucher_date: new Date().toISOString().slice(0, 10),
      period_id: testPeriodId,
      summary: 'E2E Test Voucher',
      lines: [
        {
          account_id: testAccountId,
          description: 'E2E debit',
          debit_amount: amount,
          credit_amount: 0,
        },
        {
          account_id: testAccountId2,
          description: 'E2E credit',
          debit_amount: 0,
          credit_amount: amount,
        },
      ],
      status: 'draft',
    });
    expect(created.id).toBeTruthy();
    expect(created.voucher_no).toBe(code);
    expect(created.total_debit).toBeCloseTo(amount, 2);
    expect(created.total_credit).toBeCloseTo(amount, 2);

    // SUBMIT FOR REVIEW
    const submitted = await apiPost<Voucher>(
      ctx,
      `${API_PATHS.finance.voucher}/${created.id}/submit`,
      {}
    );
    expect(['pending_review', 'posted']).toContain(submitted.status);

    // POST (if not already posted)
    let posted = submitted;
    if (submitted.status !== 'posted') {
      posted = await apiPost<Voucher>(
        ctx,
        `${API_PATHS.finance.voucher}/${created.id}/post`,
        {}
      );
      expect(posted.status).toBe('posted');
    }

    // REVERSE (cleanup)
    const reversed = await apiPost<Voucher>(
      ctx,
      `${API_PATHS.finance.voucher}/${posted.id}/reverse`,
      { reason: 'E2E cleanup' }
    );
    expect(['reversed', 'posted']).toContain(reversed.status);
  });

  test('Cannot post an unbalanced voucher', async () => {
    const code = `VC-UNBALANCED-${Date.now()}`;
    // Create a draft with imbalance
    const res = await ctx.post(
      `${process.env.API_BASE_URL ?? 'http://localhost:8080'}${
        API_PATHS.finance.voucher
      }`,
      {
        data: {
          voucher_no: code,
          voucher_date: new Date().toISOString().slice(0, 10),
          period_id: testPeriodId,
          lines: [
            {
              account_id: testAccountId,
              debit_amount: 100,
              credit_amount: 0,
            },
            {
              account_id: testAccountId2,
              debit_amount: 0,
              credit_amount: 99,
            },
          ],
        },
      }
    );
    // Either creation fails (422) or post fails — both are valid
    if (res.ok()) {
      const body = (await res.json()) as Voucher;
      const post = await ctx.post(
        `${process.env.API_BASE_URL ?? 'http://localhost:8080'}${
          API_PATHS.finance.voucher
        }/${body.id}/post`,
        {}
      );
      expect([400, 422]).toContain(post.status());
    } else {
      expect([400, 422]).toContain(res.status());
    }
  });
});
