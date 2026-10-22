import { test, expect } from '@playwright/test';
import { navigateTo, expectUrl } from './helpers/auth';
import { API_URL } from '../utils/testUtils';

/** 以超管 admin 页面登录（test_admin 未绑 qms 角色，会被权限守卫拦截） */
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
 * QMS 质量标准数据流 E2E（真后端断言，非「可达不崩」级）
 *
 * 方法：先以 admin 调真后端 /api/qms/standards 取造数标记记录（空库域，仅
 * 1 条 E2E 造数「E2E质量标准2099」，信封键 standards），再以登录态打开
 * 列表页 / 详情弹窗，断言前端确实渲染后端返回的 code + name 双真实键——
 * 证明接的是真数据。
 *
 * 注意：后端 POST /standards 忽略传入 code、自动编号（QS-XXXXXXXX），断言
 * 键必须取列表实际返回值而非造数请求值。
 *
 * 前置：真后端栈已起（scripts/dev/run-e2e-stack.sh login），API_URL 指向 8099；
 * 造数记录已存在（2026-10-23 批14 qms-standard 补测时 API 造数）。
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

interface StandardRecord {
  id: string;
  code: string;
  name: string;
}

async function markerStandard(token: string): Promise<StandardRecord> {
  const res = await fetch(`${API_URL}/api/qms/standards?page=1&page_size=10`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  const d = data?.data;
  const items: StandardRecord[] = d?.standards ?? d?.items ?? (Array.isArray(d) ? d : []);
  // 取造数标记记录（name 含 2099，空库域仅 1 条）
  const s = items.find((r) => r?.id && r?.code && r?.name?.includes('2099'));
  if (!s) throw new Error('后端 QMS 标准列表无 2099 造数记录，无法做数据流断言');
  return s;
}

test.describe('QMS 质量标准数据流（真后端断言）', () => {
  // TC-QMS-001：列表页渲染后端标准记录（code + name 双真实键）
  test('TC-QMS-001 标准列表展示后端返回的标准记录', async ({ page }) => {
    const token = await adminToken();
    const standard = await markerStandard(token);

    await pageLoginAsSuperAdmin(page);
    await navigateTo(page, '/qms/standards');
    await expectUrl(page, /qms\/standards/);

    // 前端列表正文必须出现后端取到的标准编号与名称（真数据流，而非空表/mock）
    await expect(page.locator('body')).toContainText(standard.code, { timeout: 10000 });
    await expect(page.locator('body')).toContainText(standard.name, { timeout: 10000 });
  });

  // TC-QMS-002：详情弹窗渲染后端标准记录
  test('TC-QMS-002 标准详情弹窗展示后端返回的标准记录', async ({ page }) => {
    const token = await adminToken();
    const standard = await markerStandard(token);

    await pageLoginAsSuperAdmin(page);
    await navigateTo(page, '/qms/standards');
    await expect(page.locator('body')).toContainText(standard.code, { timeout: 10000 });

    // 打开造数记录所在行的「查看」详情弹窗（CrudPage 行操作，MUI Dialog +
    // FormBuilder view 模式：文本值渲染在禁用 input 的 value 上，须用 toHaveValue 断言）
    await page
      .locator('tr', { hasText: standard.code })
      .getByRole('button', { name: '查看' })
      .click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await expect(dialog.locator('input[name="code"]')).toHaveValue(standard.code, {
      timeout: 5000,
    });
    await expect(dialog.locator('input[name="name"]')).toHaveValue(standard.name, {
      timeout: 5000,
    });
  });
});
