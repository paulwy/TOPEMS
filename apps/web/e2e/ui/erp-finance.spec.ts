import { test, expect } from '@playwright/test';
import { navigateTo, expectUrl } from './helpers/auth';
import { API_URL } from '../utils/testUtils';

/** 以超管 admin 页面登录（test_admin 未绑 erp/finance 角色，会被权限守卫拦截） */
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
 * ERP 财务凭证数据流 E2E（真后端断言，非「可达不崩」级）
 *
 * 方法：先用 admin 调真后端取第一条凭证（id/voucher_no），再以登录态打开
 * 列表页（/erp/voucher-management）与详情页（/finance/vouchers/:id），
 * 断言前端正文确实渲染了后端返回的凭证号——证明列表/详情接的是真数据。
 *
 * 前置：真后端栈已起（scripts/dev/run-e2e-stack.sh login），API_URL 指向 8099；
 * finance.vouchers 已有种子 记202609*。
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

interface VoucherRecord {
  id: string;
  voucher_no: string;
}

async function firstVoucher(token: string): Promise<VoucherRecord> {
  const res = await fetch(`${API_URL}/api/finance/vouchers?page=1&page_size=10`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  // 后端列表实际直接返回数组（非 {items,total} 信封），真键为 voucher_no
  const items: VoucherRecord[] = data?.data?.items ?? (Array.isArray(data?.data) ? data.data : []);
  const v = items[0];
  if (!v?.id || !v?.voucher_no) {
    throw new Error('后端凭证列表为空或结构异常，无法做数据流断言');
  }
  return v;
}

test.describe('ERP 财务凭证数据流（真后端断言）', () => {
  // TC-ERP-001：列表页渲染后端凭证记录
  test('TC-ERP-001 凭证列表展示后端返回的凭证记录', async ({ page }) => {
    const token = await adminToken();
    const voucher = await firstVoucher(token);

    await pageLoginAsSuperAdmin(page);
    await navigateTo(page, '/erp/voucher-management');
    await expectUrl(page, /erp\/voucher-management/);

    // 前端列表正文必须出现后端取到的凭证号（真数据流，而非空表/mock）
    await expect(page.locator('body')).toContainText(voucher.voucher_no, { timeout: 10000 });
  });

  // TC-ERP-002：详情页渲染后端凭证记录
  test('TC-ERP-002 凭证详情页展示后端返回的凭证记录', async ({ page }) => {
    const token = await adminToken();
    const voucher = await firstVoucher(token);

    await pageLoginAsSuperAdmin(page);
    await navigateTo(page, `/finance/vouchers/${voucher.id}`);
    await expect(page).toHaveURL(/finance\/vouchers\//);

    await expect(page.locator('body')).toContainText(voucher.voucher_no, { timeout: 10000 });
  });
});
