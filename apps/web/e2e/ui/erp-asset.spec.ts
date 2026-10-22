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
 * ERP 固定资产数据流 E2E（真后端断言，非「可达不崩」级）
 *
 * 方法：先用 admin 调真后端取第一条资产（name/asset_number），再以登录态打开
 * 列表页，断言前端正文确实渲染了后端返回的两个真实键——证明列表接的是
 * 真数据而非空壳/mock，且字段映射未失真（防按行号合成假编号）。
 *
 * 前置：真后端栈已起（scripts/dev/run-e2e-stack.sh login），API_URL 指向 8099；
 * erp.assets 已有种子 AST-0001。
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

interface AssetRecord {
  id: string;
  name: string;
  asset_number: string;
}

async function firstAsset(token: string): Promise<AssetRecord> {
  const res = await fetch(`${API_URL}/api/erp/assets?page=1&page_size=10`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  const items: AssetRecord[] = data?.data?.items ?? (Array.isArray(data?.data) ? data.data : []);
  const a = items[0];
  if (!a?.id || !a?.name || !a?.asset_number) {
    throw new Error('后端资产列表为空或结构异常，无法做数据流断言');
  }
  return a;
}

test.describe('ERP 固定资产数据流（真后端断言）', () => {
  // TC-ERP-006：列表页渲染后端资产名称
  test('TC-ERP-006 资产列表展示后端返回的资产名称', async ({ page }) => {
    const token = await adminToken();
    const asset = await firstAsset(token);

    await pageLoginAsSuperAdmin(page);
    await navigateTo(page, '/erp/asset-management');
    await expectUrl(page, /erp\/asset-management/);

    // 前端列表正文必须出现后端取到的资产名称（真数据流，而非空表/mock）
    await expect(page.locator('body')).toContainText(asset.name, { timeout: 10000 });
  });

  // TC-ERP-007：列表页渲染后端资产编号（第二真实键，防合成假编号）
  test('TC-ERP-007 资产列表展示后端返回的资产编号', async ({ page }) => {
    const token = await adminToken();
    const asset = await firstAsset(token);

    await pageLoginAsSuperAdmin(page);
    await navigateTo(page, '/erp/asset-management');
    await expectUrl(page, /erp\/asset-management/);

    // 资产编号为独立真实键，必须与后端一致（防前端按行号合成 AST* 假键）
    await expect(page.locator('body')).toContainText(asset.asset_number, { timeout: 10000 });
  });
});
