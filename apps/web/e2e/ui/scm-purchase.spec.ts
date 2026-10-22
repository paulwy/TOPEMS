import { test, expect } from '@playwright/test';
import { navigateTo, expectUrl } from './helpers/auth';
import { API_URL } from '../utils/testUtils';

/** 以超管 admin 页面登录（test_admin 未绑 scm 角色，会被权限守卫拦截） */
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
 * SCM 采购订单数据流 E2E（真后端断言，非「可达不崩」级）
 *
 * 方法：先用 admin 调真后端 /api/scm/purchase-orders 取首条真记录
 * （order_number），再以登录态打开列表页 / 详情弹窗，断言前端确实渲染
 * 后端返回的采购单号——证明页面接的是 SCM 真数据（此前该路由复用
 * erp/PurchaseOrderPage 接 /api/erp/purchase-orders 空端点，已修复）。
 *
 * 前置：真后端栈已起（scripts/dev/run-e2e-stack.sh login），API_URL 指向 8099。
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

interface PurchaseOrderRecord {
  id: string;
  order_number: string;
}

async function firstPurchaseOrder(token: string): Promise<PurchaseOrderRecord> {
  const res = await fetch(`${API_URL}/api/scm/purchase-orders?page=1&page_size=10`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  const items: PurchaseOrderRecord[] =
    data?.data?.items ?? (Array.isArray(data?.data) ? data.data : []);
  const o = items.find((r) => r?.id && r?.order_number);
  if (!o) throw new Error('后端采购订单列表为空或结构异常，无法做数据流断言');
  return o;
}

test.describe('SCM 采购订单数据流（真后端断言）', () => {
  // TC-SCM-001：列表页渲染后端采购订单记录（真实键 order_number）
  test('TC-SCM-001 采购订单列表展示后端返回的采购订单记录', async ({ page }) => {
    const token = await adminToken();
    const order = await firstPurchaseOrder(token);

    await pageLoginAsSuperAdmin(page);
    await navigateTo(page, '/scm/purchase-orders');
    await expectUrl(page, /scm\/purchase-orders/);

    // 前端列表正文必须出现后端取到的采购单号（真数据流，而非空表/mock）
    await expect(page.locator('body')).toContainText(order.order_number, { timeout: 10000 });
  });

  // TC-SCM-002：详情弹窗渲染后端采购订单记录
  test('TC-SCM-002 采购订单详情弹窗展示后端返回的采购订单记录', async ({ page }) => {
    const token = await adminToken();
    const order = await firstPurchaseOrder(token);

    await pageLoginAsSuperAdmin(page);
    await navigateTo(page, '/scm/purchase-orders');
    await expect(page.locator('body')).toContainText(order.order_number, { timeout: 10000 });

    // 打开首行「查看」详情弹窗（CrudPage 行操作，MUI Dialog + FormBuilder view 模式：
    // 文本值渲染在禁用 input 的 value 上，不在文本流里，须用 toHaveValue 断言）
    await page.getByRole('button', { name: '查看' }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await expect(dialog.locator('input[name="order_number"]')).toHaveValue(order.order_number, {
      timeout: 5000,
    });
  });
});
