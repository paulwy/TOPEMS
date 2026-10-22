import { test, expect } from '@playwright/test';
import { navigateTo, expectUrl } from './helpers/auth';
import { API_URL } from '../utils/testUtils';

/** 以超管 admin 页面登录（test_admin 未绑 wms 角色，会被权限守卫拦截） */
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
 * WMS 入库单数据流 E2E（真后端断言，非「可达不崩」级）
 *
 * 方法：先用 admin 调真后端取第一条入库单（id/order_number），再以登录态打开
 * 列表页 / 详情页，断言前端正文确实渲染了后端返回的记录——证明列表/详情
 * 接的是真数据而非空壳/mock。
 *
 * 前置：真后端栈已起（scripts/dev/run-e2e-stack.sh login），API_URL 指向 8099；
 * wms.inbound_orders 已有幂等种子 IB-DEMO-001/002。
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

interface InboundOrderRecord {
  id: string;
  order_number: string;
}

async function firstInboundOrder(token: string): Promise<InboundOrderRecord> {
  const res = await fetch(`${API_URL}/api/wms/inbound-orders?page=1&page_size=10`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  // 后端列表实际返回键为 orders（见 WmsInboundOrderPage 响应解包修复 d7d6131499）
  const items: InboundOrderRecord[] =
    data?.data?.orders ?? data?.data?.items ?? (Array.isArray(data?.data) ? data.data : []);
  const o = items[0];
  if (!o?.id || !o?.order_number) {
    throw new Error('后端入库单列表为空或结构异常，无法做数据流断言');
  }
  return o;
}

test.describe('WMS 入库单数据流（真后端断言）', () => {
  // TC-WMS-001：列表页渲染后端入库单记录
  test('TC-WMS-001 入库单列表展示后端返回的入库单记录', async ({ page }) => {
    const token = await adminToken();
    const order = await firstInboundOrder(token);

    await pageLoginAsSuperAdmin(page);
    await navigateTo(page, '/wms/inbound-orders');
    await expectUrl(page, /wms\/inbound-orders/);

    // 前端列表正文必须出现后端取到的入库单号（真数据流，而非空表/mock）
    await expect(page.locator('body')).toContainText(order.order_number, { timeout: 10000 });
  });

  // TC-WMS-002：详情页渲染后端入库单记录
  test('TC-WMS-002 入库单详情页展示后端返回的入库单记录', async ({ page }) => {
    const token = await adminToken();
    const order = await firstInboundOrder(token);

    await pageLoginAsSuperAdmin(page);
    await navigateTo(page, `/wms/inbound-orders/${order.id}`);
    await expect(page).toHaveURL(/wms\/inbound-orders\//);

    await expect(page.locator('body')).toContainText(order.order_number, { timeout: 10000 });
  });
});
