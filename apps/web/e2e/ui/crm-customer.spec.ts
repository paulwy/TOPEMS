import { test, expect } from '@playwright/test';
import { navigateTo, expectUrl } from './helpers/auth';
import { API_URL } from '../utils/testUtils';

/** 以超管 admin 页面登录（test_admin 未绑 crm 角色，会被权限守卫拦截） */
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
 * CRM 客户数据流 E2E（真后端断言，非「可达不崩」级）
 *
 * 方法：先用 admin 调真后端取第一条客户记录（id/name），再以登录态打开
 * 列表页 / 详情页，断言前端正文确实渲染了后端返回的记录——证明列表/详情
 * 接的是真数据而非空壳/mock。
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

interface CustomerRecord {
  id: string;
  name: string;
}

async function firstCustomer(token: string): Promise<CustomerRecord> {
  const res = await fetch(`${API_URL}/api/crm/customers?page=1&page_size=10`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  const items: CustomerRecord[] = data?.data?.items ?? (Array.isArray(data?.data) ? data.data : []);
  const c = items[0];
  if (!c?.id || !c?.name) throw new Error('后端客户列表为空或结构异常，无法做数据流断言');
  return c;
}

test.describe('CRM 客户数据流（真后端断言）', () => {
  // TC-CRM-001：列表页渲染后端客户记录
  test('TC-CRM-001 客户列表展示后端返回的客户记录', async ({ page }) => {
    const token = await adminToken();
    const customer = await firstCustomer(token);

    await pageLoginAsSuperAdmin(page);
    await navigateTo(page, '/crm/customers');
    await expectUrl(page, /crm\/customers/);

    // 前端列表正文必须出现后端取到的客户名（真数据流，而非空表/mock）
    await expect(page.locator('body')).toContainText(customer.name, { timeout: 10000 });
  });

  // TC-CRM-002：详情页渲染后端客户记录
  test('TC-CRM-002 客户详情页展示后端返回的客户记录', async ({ page }) => {
    const token = await adminToken();
    const customer = await firstCustomer(token);

    await pageLoginAsSuperAdmin(page);
    await navigateTo(page, `/crm/customers/${customer.id}`);
    await expect(page).toHaveURL(/crm\/customers\//);

    await expect(page.locator('body')).toContainText(customer.name, { timeout: 10000 });
  });
});
