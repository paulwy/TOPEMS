import { test, expect } from '@playwright/test';
import { navigateTo, expectUrl } from './helpers/auth';
import { API_URL } from '../utils/testUtils';

/** 以超管 admin 页面登录（test_admin 未绑 pm 角色，会被权限守卫拦截） */
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
 * PM 项目数据流 E2E（真后端断言，非「可达不崩」级）
 *
 * 方法：先以 admin 调真后端 /api/pm/projects 取真记录（10 条，信封键
 * projects，ORDER BY created_at DESC 首页可见），再以登录态打开列表页 /
 * 详情弹窗，断言前端确实渲染后端返回的 name + code 双真实键——证明接的
 * 是真数据。
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

interface ProjectRecord {
  id: string;
  name: string;
  code: string | null;
}

async function firstProject(token: string): Promise<ProjectRecord> {
  const res = await fetch(`${API_URL}/api/pm/projects?page=1&page_size=10`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  const d = data?.data;
  const items: ProjectRecord[] = d?.projects ?? d?.items ?? (Array.isArray(d) ? d : []);
  // 取首条 name 与 code 均非空的记录做双真实键断言（防合成假编号）
  const p = items.find((r) => r?.id && r?.name && r?.code);
  if (!p) throw new Error('后端 PM 项目列表无双键齐全记录，无法做数据流断言');
  return p;
}

test.describe('PM 项目数据流（真后端断言）', () => {
  // TC-PM-001：列表页渲染后端项目记录（name + code 双真实键）
  test('TC-PM-001 项目列表展示后端返回的项目记录', async ({ page }) => {
    const token = await adminToken();
    const project = await firstProject(token);

    await pageLoginAsSuperAdmin(page);
    await navigateTo(page, '/pm/projects');
    await expectUrl(page, /pm\/projects/);

    // 前端列表正文必须出现后端取到的项目名称与编号（真数据流，而非空表/mock）
    await expect(page.locator('body')).toContainText(project.name, { timeout: 10000 });
    await expect(page.locator('body')).toContainText(project.code as string, { timeout: 10000 });
  });

  // TC-PM-002：详情弹窗渲染后端项目记录
  test('TC-PM-002 项目详情弹窗展示后端返回的项目记录', async ({ page }) => {
    const token = await adminToken();
    const project = await firstProject(token);

    await pageLoginAsSuperAdmin(page);
    await navigateTo(page, '/pm/projects');
    await expect(page.locator('body')).toContainText(project.code as string, { timeout: 10000 });

    // 打开造数记录所在行的「查看」详情弹窗（CrudPage 行操作，MUI Dialog +
    // FormBuilder view 模式：文本值渲染在禁用 input 的 value 上，须用 toHaveValue 断言）
    await page
      .locator('tr', { hasText: project.code as string })
      .getByRole('button', { name: '查看' })
      .click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await expect(dialog.locator('input[name="name"]')).toHaveValue(project.name, {
      timeout: 5000,
    });
    await expect(dialog.locator('input[name="code"]')).toHaveValue(project.code as string, {
      timeout: 5000,
    });
  });
});
