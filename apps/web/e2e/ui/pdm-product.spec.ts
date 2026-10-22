import { test, expect } from '@playwright/test';
import { navigateTo, expectUrl } from './helpers/auth';
import { API_URL } from '../utils/testUtils';

/** 以超管 admin 页面登录（test_admin 未绑 pdm 角色，会被权限守卫拦截） */
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
 * PDM 产品数据流 E2E（真后端断言，非「可达不崩」级）
 *
 * 方法：先以 admin 调真后端 /api/pdm/products 取造数标记记录（空库域，仅
 * 1 条 E2E 造数 PDM-PRD-2099，信封键 products），再以登录态打开列表页 /
 * 详情弹窗，断言前端确实渲染后端返回的 product_no + name 双真实键——证明
 * 接的是真数据。
 *
 * 背景：前端 Product 类型/schema 键 code 与后端真键 product_no 曾全链错位
 * （列表编号列空渲 + 创建 422），批15 补测抓到并已修复三处对齐。
 *
 * 前置：真后端栈已起（scripts/dev/run-e2e-stack.sh login），API_URL 指向 8099；
 * 造数记录已存在（2026-10-23 批15 pdm-product 补测时 API 造数）。
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

interface ProductRecord {
  id: string;
  product_no: string;
  name: string;
}

async function markerProduct(token: string): Promise<ProductRecord> {
  const res = await fetch(`${API_URL}/api/pdm/products?page=1&page_size=10`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  const d = data?.data;
  const items: ProductRecord[] = d?.products ?? d?.items ?? (Array.isArray(d) ? d : []);
  // 取造数标记记录（product_no=PDM-PRD-2099，空库域仅 1 条）
  const p = items.find((r) => r?.id && r?.product_no && r?.name);
  if (!p) throw new Error('后端 PDM 产品列表无 PDM-PRD-2099 造数记录，无法做数据流断言');
  return p;
}

test.describe('PDM 产品数据流（真后端断言）', () => {
  // TC-PDM-001：列表页渲染后端产品记录（product_no + name 双真实键）
  test('TC-PDM-001 产品列表展示后端返回的产品记录', async ({ page }) => {
    const token = await adminToken();
    const product = await markerProduct(token);

    await pageLoginAsSuperAdmin(page);
    await navigateTo(page, '/pdm/product');
    await expectUrl(page, /pdm\/product/);

    // 前端列表正文必须出现后端取到的产品编号与名称（真数据流，而非空表/mock）
    await expect(page.locator('body')).toContainText(product.product_no, { timeout: 10000 });
    await expect(page.locator('body')).toContainText(product.name, { timeout: 10000 });
  });

  // TC-PDM-002：详情弹窗渲染后端产品记录
  test('TC-PDM-002 产品详情弹窗展示后端返回的产品记录', async ({ page }) => {
    const token = await adminToken();
    const product = await markerProduct(token);

    await pageLoginAsSuperAdmin(page);
    await navigateTo(page, '/pdm/product');
    await expect(page.locator('body')).toContainText(product.product_no, { timeout: 10000 });

    // 打开造数记录所在行的「查看」详情弹窗（CrudPage 行操作，MUI Dialog +
    // FormBuilder view 模式：文本值渲染在禁用 input 的 value 上，须用 toHaveValue 断言）
    await page
      .locator('tr', { hasText: product.product_no })
      .getByRole('button', { name: '查看' })
      .click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await expect(dialog.locator('input[name="product_no"]')).toHaveValue(product.product_no, {
      timeout: 5000,
    });
    await expect(dialog.locator('input[name="name"]')).toHaveValue(product.name, {
      timeout: 5000,
    });
  });
});
