import { test, expect } from '@playwright/test';
import { navigateTo, expectUrl } from './helpers/auth';
import { API_URL } from '../utils/testUtils';

/** 以超管 admin 页面登录（test_admin 未绑 qms/pdm 角色，会被权限守卫拦截） */
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
 * QMS/POM 空库域真数据流 E2E（真后端断言，非「可达不崩」级）
 *
 * 方法：beforeAll 以 admin 真调 /api/qms/standards 与 /api/pdm/products 造唯一记录
 * （时间戳编号），再以登录态打开列表页/详情页，断言前端渲染后端返回的真实键——
 * 证明空库域页面接的是真数据流（非空表/mock）。
 *
 * 前置：真后端栈已起（scripts/dev/run-e2e-stack.sh up），API_URL 指向 8099。
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

let stdName = '';
let stdCategory = '';
let stdId = '';
let prdNo = '';
let prdName = '';

test.beforeAll(async () => {
  const token = await adminToken();
  const ts = Date.now();

  // 造 QMS 检验标准（唯一编号）
  stdName = `E2E标准-${ts}`;
  stdCategory = 'E2E类别';
  const stdRes = await fetch(`${API_URL}/api/qms/standards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name: stdName, category: stdCategory, description: 'e2e seed' }),
  });
  const stdData = await stdRes.json();
  stdId = stdData?.data?.id || stdData?.data?.standard?.id || '';
  if (!stdId) throw new Error(`QMS 标准造数失败：${JSON.stringify(stdData).slice(0, 200)}`);

  // 造 PDM 产品（唯一编号）
  prdNo = `E2E-PRD-${ts}`;
  prdName = `E2E产品-${ts}`;
  const prdRes = await fetch(`${API_URL}/api/pdm/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ product_no: prdNo, name: prdName, status: 'active' }),
  });
  const prdData = await prdRes.json();
  const prdId = prdData?.data?.id || '';
  if (!prdId) throw new Error(`PDM 产品造数失败：${JSON.stringify(prdData).slice(0, 200)}`);
});

test.describe('QMS/POM 空库域真数据流（真后端断言）', () => {
  // TC-QMS-001：标准列表页渲染后端造数记录
  test('TC-QMS-001 标准列表展示后端返回的检验标准', async ({ page }) => {
    await pageLoginAsSuperAdmin(page);
    await navigateTo(page, '/qms/standards');
    await expectUrl(page, /qms\/standards/);

    await expect(page.locator('body')).toContainText(stdName, { timeout: 15000 });
    await expect(page.locator('body')).toContainText(stdCategory, { timeout: 5000 });
  });

  // TC-QMS-002：标准详情页渲染后端造数记录
  test('TC-QMS-002 标准详情展示后端返回的检验标准', async ({ page }) => {
    await pageLoginAsSuperAdmin(page);
    await navigateTo(page, `/qms/standards/${stdId}`);
    await expectUrl(page, /qms\/standards\//);

    await expect(page.locator('body')).toContainText(stdName, { timeout: 15000 });
  });

  // TC-PDM-001：产品列表页渲染后端造数记录（product_no + name 双真实键）
  test('TC-PDM-001 产品列表展示后端返回的产品记录', async ({ page }) => {
    await pageLoginAsSuperAdmin(page);
    await navigateTo(page, '/pdm/product');
    await expectUrl(page, /pdm\/product/);

    await expect(page.locator('body')).toContainText(prdNo, { timeout: 15000 });
    await expect(page.locator('body')).toContainText(prdName, { timeout: 5000 });
  });
});
