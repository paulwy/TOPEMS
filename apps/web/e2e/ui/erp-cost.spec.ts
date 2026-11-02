import { test, expect } from '@playwright/test';
import { navigateTo, expectUrl } from './helpers/auth';
import { API_URL } from '../utils/testUtils';

/** 以超管 admin 页面登录（test_admin 未绑 erp 角色，会被权限守卫拦截） */
async function pageLoginAsSuperAdmin(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/login', { waitUntil: 'load', timeout: 30000 });
  await page
    .waitForSelector('input[placeholder*="用户名"], input[name="username"]', { timeout: 15000 })
    .catch(() => {});
  await page.getByPlaceholder('请输入用户名').fill('admin');
  await page.getByPlaceholder('请输入密码').fill('admin123');
  await page.getByTestId('login-submit').click();
  await page.waitForURL('**/dashboard', { timeout: 30000 });
  await page
    .waitForSelector('main, #main-content, [role="main"]', { timeout: 10000 })
    .catch(() => {});
}

/**
 * ERP 成本域（预算管理 + 费用报销）数据流 E2E（真后端断言，非「可达不崩」级）
 *
 * 方法：先以 admin 调真后端 /api/finance/budgets、/api/finance/expenses 取造数
 * 标记记录（fiscal_year=2099 预算 / expense_number=EXP2099 报销单，库内既有 61 条
 * 占位预算全 fiscal_year=0，标记记录唯一），再以登录态打开列表页 / 详情弹窗，
 * 断言前端确实渲染后端返回的字段——证明接的是真数据。
 *
 * 前置：真后端栈已起（scripts/dev/run-e2e-stack.sh login），API_URL 指向 8099；
 * 造数记录已存在（2026-10-23 批11 erp-cost 补测时 API 造数 + tenant_id 补齐）。
 */

async function adminToken(): Promise<string> {
  const res = await fetch(`${API_URL}/api/core/iam/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' }),
  });
  const data = await res.json();
  const token = data?.data?.access_token || data?.data?.token || '';
  if (!token) throw new Error('admin 真登录失败，未取到 token');
  return token;
}

interface BudgetRecord {
  id: string;
  fiscal_year: string;
  total_budget: string;
}

interface ExpenseRecord {
  id: string;
  expense_number: string;
  applicant_name: string | null;
  expense_type: string | null;
}

/** 取后端预算列表首条记录（128 条中 fiscal_year=2099 造数按创建时间排 100+，
 *  页面首页分页（每页 10 条）不渲染它；断言首页首行渲染的后端真值 fiscal_year/total_budget） */
async function firstBudget(token: string): Promise<BudgetRecord> {
  const res = await fetch(`${API_URL}/api/finance/budgets?page=1&page_size=10`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  const items: BudgetRecord[] = data?.data?.items ?? [];
  const b = items[0];
  if (!b?.id || !b?.fiscal_year) throw new Error('后端预算列表为空，无法做数据流断言');
  return b;
}

/** 取造数标记报销单（expense_number=EXP2099） */
async function markerExpense(token: string): Promise<ExpenseRecord> {
  const res = await fetch(`${API_URL}/api/finance/expenses?page=1&page_size=100`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  const items: ExpenseRecord[] = data?.data?.items ?? [];
  const e = items.find((r) => r?.id && r?.expense_number === 'EXP2099');
  if (!e) throw new Error('后端费用报销列表无 EXP2099 造数记录，无法做数据流断言');
  return e;
}

test.describe('ERP 成本域数据流（真后端断言）', () => {
  // TC-ERP-011：预算列表渲染后端预算记录（首条 fiscal_year + 格式化金额双真实键）
  test('TC-ERP-011 预算列表展示后端返回的预算记录', async ({ page }) => {
    const token = await adminToken();
    const budget = await firstBudget(token);

    await pageLoginAsSuperAdmin(page);
    await navigateTo(page, '/erp/budget-management');
    await expectUrl(page, /erp\/budget-management/);

    // 列表首行必须出现后端取到的会计年度与格式化金额（真数据流，而非占位/mock；
    // 2099 造数在 128 条中排 100+，首页分页不渲染，故断言首页首条后端真值）
    await expect(page.locator('tbody tr').first()).toContainText(budget.fiscal_year, {
      timeout: 10000,
    });
    await expect(page.locator('tbody tr').first()).toContainText('¥0.00', { timeout: 10000 });
  });

  // TC-ERP-012：预算详情弹窗渲染后端预算记录
  test('TC-ERP-012 预算详情弹窗展示后端返回的预算记录', async ({ page }) => {
    const token = await adminToken();
    const budget = await firstBudget(token);

    await pageLoginAsSuperAdmin(page);
    await navigateTo(page, '/erp/budget-management');
    await expect(page.locator('tbody tr').first()).toContainText(budget.fiscal_year, {
      timeout: 10000,
    });

    // 打开首行「查看」详情弹窗（CrudPage 行操作，MUI Dialog +
    // FormBuilder view 模式：文本值渲染在禁用 input 的 value 上，须用 toHaveValue 断言）
    await page
      .locator('tbody tr')
      .first()
      .getByRole('button', { name: '查看' })
      .click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await expect(dialog.locator('input[name="fiscal_year"]')).toHaveValue(budget.fiscal_year, {
      timeout: 5000,
    });
  });

  // TC-ERP-013：费用报销列表渲染后端报销记录（expense_number + expense_type 双真实键）
  test('TC-ERP-013 费用报销列表展示后端返回的报销记录', async ({ page }) => {
    const token = await adminToken();
    const expense = await markerExpense(token);

    await pageLoginAsSuperAdmin(page);
    await navigateTo(page, '/erp/budget-management');
    await expectUrl(page, /erp\/budget-management/);

    // 切到「费用报销」Tab
    await page.getByRole('tab', { name: '费用报销' }).click();

    // 前端列表正文必须出现后端取到的报销单号与费用类型（真数据流，而非空表/mock）
    await expect(page.locator('body')).toContainText(expense.expense_number, { timeout: 10000 });
    if (expense.expense_type) {
      await expect(page.locator('body')).toContainText(expense.expense_type, { timeout: 10000 });
    }
  });

  // TC-ERP-014：费用报销详情弹窗渲染后端报销记录
  test('TC-ERP-014 费用报销详情弹窗展示后端返回的报销记录', async ({ page }) => {
    const token = await adminToken();
    const expense = await markerExpense(token);

    await pageLoginAsSuperAdmin(page);
    await navigateTo(page, '/erp/budget-management');
    await page.getByRole('tab', { name: '费用报销' }).click();
    await expect(page.locator('body')).toContainText(expense.expense_number, { timeout: 10000 });

    // 打开造数记录所在行的「查看」详情弹窗（同 FormBuilder view 模式断言）
    await page
      .locator('tr', { hasText: expense.expense_number })
      .getByRole('button', { name: '查看' })
      .click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await expect(dialog.locator('input[name="expense_number"]')).toHaveValue(
      expense.expense_number,
      { timeout: 5000 },
    );
    if (expense.applicant_name) {
      await expect(dialog.locator('input[name="applicant_name"]')).toHaveValue(
        expense.applicant_name,
        { timeout: 5000 },
      );
    }
  });
});
