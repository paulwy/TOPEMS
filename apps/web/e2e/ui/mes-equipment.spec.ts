import { test, expect } from '@playwright/test';
import { navigateTo, expectUrl } from './helpers/auth';
import { API_URL } from '../utils/testUtils';

/** 以超管 admin 页面登录（test_admin 未绑 mes 角色，会被权限守卫拦截） */
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
 * MES 设备台账数据流 E2E（真后端断言，非「可达不崩」级）
 *
 * 方法：先用 admin 调真后端取第一条设备（id/code/name），再以登录态打开
 * 列表页 / 详情页，断言前端正文确实渲染了后端返回的记录——证明列表/详情
 * 接的是真数据而非空壳/mock。
 *
 * 前置：真后端栈已起（scripts/dev/run-e2e-stack.sh login），API_URL 指向 8099；
 * mes.equipment 已有种子 EIR-EQ-TEST 等。
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

interface EquipmentRecord {
  id: string;
  code: string;
  name: string;
}

async function firstEquipment(token: string): Promise<EquipmentRecord> {
  const res = await fetch(`${API_URL}/api/mes/equipment?page=1&page_size=10`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  // 后端列表实际返回键为 equipments（见 EquipmentManagementPage 适配器 itemsField 声明）
  const items: EquipmentRecord[] =
    data?.data?.equipments ?? data?.data?.items ?? (Array.isArray(data?.data) ? data.data : []);
  const e = items[0];
  if (!e?.id || !e?.code || !e?.name) {
    throw new Error('后端设备列表为空或结构异常，无法做数据流断言');
  }
  return e;
}

test.describe('MES 设备台账数据流（真后端断言）', () => {
  // TC-MES-006：列表页渲染后端设备记录
  test('TC-MES-006 设备列表展示后端返回的设备记录', async ({ page }) => {
    const token = await adminToken();
    const equipment = await firstEquipment(token);

    await pageLoginAsSuperAdmin(page);
    await navigateTo(page, '/mes/equipment');
    await expectUrl(page, /mes\/equipment/);

    // 前端列表正文必须出现后端取到的设备编号与名称（真数据流，而非空表/mock）
    await expect(page.locator('body')).toContainText(equipment.code, { timeout: 10000 });
    await expect(page.locator('body')).toContainText(equipment.name, { timeout: 10000 });
  });

  // TC-MES-007：详情页渲染后端设备记录
  test('TC-MES-007 设备详情页展示后端返回的设备记录', async ({ page }) => {
    const token = await adminToken();
    const equipment = await firstEquipment(token);

    await pageLoginAsSuperAdmin(page);
    await navigateTo(page, `/mes/equipment/${equipment.id}`);
    await expect(page).toHaveURL(/mes\/equipment\//);

    // 详情页曾错接 ERP assetApi（按 id 查 ERP 资产），必须断言 MES 设备真键
    await expect(page.locator('body')).toContainText(equipment.code, { timeout: 10000 });
    await expect(page.locator('body')).toContainText(equipment.name, { timeout: 10000 });
  });
});
