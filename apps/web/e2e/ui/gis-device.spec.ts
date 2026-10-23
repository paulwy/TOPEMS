import { test, expect } from '@playwright/test';
import { navigateTo, expectUrl } from './helpers/auth';
import { API_URL } from '../utils/testUtils';

/** 以超管 admin 页面登录（test_admin 未绑 gis 角色，会被权限守卫拦截） */
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
 * GIS 设备注册数据流 E2E（真后端断言，非「可达不崩」级）
 *
 * 方法：先以 admin 调真后端 /api/gis/devices 取真记录（非空库域，仅 1 条
 * 真记录 GPS-TRUCK-001/运输卡车001，信封键 items），再以登录态打开列表页 /
 * 编辑弹窗，断言前端确实渲染后端返回的 device_code + device_name 双真实键——
 * 证明接的是真数据。
 *
 * 注意：该页非 CrudPage，为 React useQuery 自管理表格；无「查看」详情弹窗，
 * 详情以行内编辑按钮（data-testid=device-edit-btn，Pencil）打开的自建 Dialog
 * 为准，TextField 无 name 属性、须按 label（设备编码/设备名称）定位并断言 input value。
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

interface DeviceRecord {
  id: string;
  device_code: string;
  device_name: string;
}

async function markerDevice(token: string): Promise<DeviceRecord> {
  const res = await fetch(`${API_URL}/api/gis/devices?page=1&page_size=10`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  const d = data?.data;
  const items: DeviceRecord[] = d?.items ?? (Array.isArray(d) ? d : []);
  // 取真记录（非空库域仅 1 条 GPS-TRUCK-001，双键齐全即可作为断言锚点）
  const s = items.find((r) => r?.id && r?.device_code && r?.device_name);
  if (!s) throw new Error('后端 GIS 设备列表无 device_code/device_name 齐全记录，无法做数据流断言');
  return s;
}

test.describe('GIS 设备注册数据流（真后端断言）', () => {
  // TC-GIS-001：列表页渲染后端设备记录（device_code + device_name 双真实键）
  test('TC-GIS-001 设备列表展示后端返回的设备记录', async ({ page }) => {
    const token = await adminToken();
    const device = await markerDevice(token);

    await pageLoginAsSuperAdmin(page);
    await navigateTo(page, '/gis/devices');
    await expectUrl(page, /gis\/devices/);

    // 前端列表正文必须出现后端取到的设备编码与名称（真数据流，而非空表/mock）
    await expect(page.locator('body')).toContainText(device.device_code, { timeout: 10000 });
    await expect(page.locator('body')).toContainText(device.device_name, { timeout: 10000 });
  });

  // TC-GIS-002：编辑弹窗渲染后端设备记录
  test('TC-GIS-002 设备编辑弹窗展示后端返回的设备记录', async ({ page }) => {
    const token = await adminToken();
    const device = await markerDevice(token);

    await pageLoginAsSuperAdmin(page);
    await navigateTo(page, '/gis/devices');
    await expect(page.locator('body')).toContainText(device.device_code, { timeout: 10000 });

    // 打开真记录所在行的编辑弹窗（行内操作编辑按钮 device-edit-btn，
    // 自建 Dialog + TextField，openEdit 把 row 键填入 form，断言 input value）
    await page
      .locator('tr', { hasText: device.device_code })
      .getByTestId('device-edit-btn')
      .click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await expect(dialog.getByLabel('设备编码')).toHaveValue(device.device_code, { timeout: 5000 });
    await expect(dialog.getByLabel('设备名称')).toHaveValue(device.device_name, { timeout: 5000 });
  });
});
