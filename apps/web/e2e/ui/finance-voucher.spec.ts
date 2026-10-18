import { test, expect } from '@playwright/test';
import { navigateTo } from './helpers/auth';
import { API_URL } from '../utils/testUtils';

/**
 * 财务凭证数据流 E2E（真后端断言）
 *
 * 与 crm-customer.spec 同一范本：admin 调真后端取第一条凭证（id/voucher_no），
 * 登录后打开详情页，断言前端正文渲染后端凭证号——证明详情接真数据。
 * 前置：真后端栈已起（run-e2e-stack.sh login），API_URL=8099。
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
  const items: VoucherRecord[] = data?.data?.items ?? (Array.isArray(data?.data) ? data.data : []);
  const v = items[0];
  if (!v?.id || !v?.voucher_no) throw new Error('后端凭证列表为空或结构异常，无法做数据流断言');
  return v;
}

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

test.describe('财务凭证数据流（真后端断言）', () => {
  // TC-FIN-001：凭证详情页渲染后端凭证号
  test('TC-FIN-001 凭证详情页展示后端返回的凭证号', async ({ page }) => {
    const token = await adminToken();
    const voucher = await firstVoucher(token);

    await pageLoginAsSuperAdmin(page);
    await navigateTo(page, `/finance/vouchers/${voucher.id}`);
    await expect(page).toHaveURL(/finance\/vouchers\//);

    await expect(page.locator('body')).toContainText(voucher.voucher_no, { timeout: 10000 });
  });
});
