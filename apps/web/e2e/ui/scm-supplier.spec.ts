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
 * SCM 供应商数据流 E2E（真后端断言，非「可达不崩」级）
 *
 * 方法：先用 admin 调真后端 /api/scm/suppliers 取真记录，再以登录态打开
 * 列表页 / 详情弹窗，断言前端确实渲染后端返回的字段——证明接的是真数据。
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

interface SupplierRecord {
  id: string;
  supplier_no: string | null;
  name: string;
  email: string | null;
}

async function firstSupplier(token: string): Promise<SupplierRecord> {
  const res = await fetch(`${API_URL}/api/scm/suppliers?page=1&page_size=10`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  const items: SupplierRecord[] =
    data?.data?.items ?? (Array.isArray(data?.data) ? data.data : []);
  // 取首条 supplier_no 与 name 均非空的记录做双真实键断言（防合成假编号）
  const s = items.find((r) => r?.id && r?.name && r?.supplier_no);
  if (!s) throw new Error('后端供应商列表无双键齐全记录，无法做数据流断言');
  return s;
}

test.describe('SCM 供应商数据流（真后端断言）', () => {
  // TC-SCM-006：列表页渲染后端供应商记录（supplier_no + name 双真实键）
  test('TC-SCM-006 供应商列表展示后端返回的供应商记录', async ({ page }) => {
    const token = await adminToken();
    const supplier = await firstSupplier(token);

    await pageLoginAsSuperAdmin(page);
    await navigateTo(page, '/scm/suppliers');
    await expectUrl(page, /scm\/suppliers/);

    // 前端列表正文必须出现后端取到的供应商编码与名称（真数据流，而非空表/mock）
    await expect(page.locator('body')).toContainText(supplier.supplier_no as string, {
      timeout: 10000,
    });
    await expect(page.locator('body')).toContainText(supplier.name, { timeout: 10000 });
  });

  // TC-SCM-007：详情弹窗渲染后端供应商记录（列表不展示、仅详情展示的 email）
  test('TC-SCM-007 供应商详情弹窗展示后端返回的供应商记录', async ({ page }) => {
    const token = await adminToken();
    const res = await fetch(`${API_URL}/api/scm/suppliers?page=1&page_size=10`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    const items: SupplierRecord[] = data?.data?.items ?? [];
    // 取首条 name 与 email 均非空的记录，email 在列表列不展示、详情弹窗展示
    const supplier = items.find((r) => r?.id && r?.name && r?.email) ?? items[0];
    if (!supplier?.name) throw new Error('后端供应商列表为空，无法做详情断言');

    await pageLoginAsSuperAdmin(page);
    await navigateTo(page, '/scm/suppliers');
    await expect(page.locator('body')).toContainText(supplier.name, { timeout: 10000 });

    // 打开首行「查看」详情弹窗（CrudPage 行操作，MUI Dialog + FormBuilder view 模式：
    // 文本值渲染在禁用 input 的 value 上，不在文本流里，须用 toHaveValue 断言）
    await page.getByRole('button', { name: '查看' }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await expect(dialog.locator('input[name="name"]')).toHaveValue(supplier.name, {
      timeout: 5000,
    });
    if (supplier.email) {
      await expect(dialog.locator('input[name="email"]')).toHaveValue(supplier.email, {
        timeout: 5000,
      });
    }
  });
});
