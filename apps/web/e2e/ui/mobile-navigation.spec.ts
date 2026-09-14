/**
 * 移动端四层导航 e2e（Phase 5 收尾）
 *
 * 覆盖 iPhone 12 视口（390x844）下移动端导航的真实行为：
 *
 * 场景 A：SmartLayout 移动端分流（/dashboard）
 *   - 移动端走 MobileLayout（移动宿主），桌面 GlobalLayout 侧边栏不渲染
 *   - 移动端底部导航（首页/流程/通知/设置）渲染并可切换路由
 *
 * 场景 B：GlobalLayout 移动端视口响应式（/core/ 宿主）
 *   - <sm(480) 桌面侧边栏隐藏
 *   - <md(640) L1 业务域 Tabs 隐藏，移动端呈现为「请选择」下拉
 *   - MobileNav 抽屉可打开并导航
 *
 * 认证：createAuthenticatedContext 直接注入 localStorage，绕过登录表单。
 *
 * 运行：pnpm exec playwright test -c playwright.config.ts --project=mobile-iphone e2e/ui/mobile-navigation.spec.ts
 */
import { test, expect } from '@playwright/test';
import { createAuthenticatedContext } from '../utils/testUtils';

const HOST_PATH = '/core/e2e-nav-host';

test.describe('移动端四层导航 e2e', () => {
  let context: any;

  test.beforeAll(async ({ browser }) => {
    context = await createAuthenticatedContext(browser);
  });

  test.afterAll(async () => {
    await context?.close();
  });

  test('移动端 SmartLayout 分流到 MobileLayout，不渲染桌面侧边栏', async () => {
    const page = await context.newPage();
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    // 移动宿主：无桌面主导航侧边栏
    await expect(page.getByRole('navigation', { name: '主导航' })).toHaveCount(0);
    // 移动宿主特征：底部导航「首页」tab 存在
    await expect(page.getByText('首页', { exact: true }).first()).toBeVisible();
    await page.close();
  });

  test('移动端底部导航渲染并可切换路由', async () => {
    const page = await context.newPage();
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    // MobileLayout 底部 4 tab（首页/流程/通知/设置）
    const workflowTab = page.getByText('流程', { exact: true }).first();
    await expect(workflowTab).toBeVisible();
    await workflowTab.click();
    await expect(page).toHaveURL(/\/workflow/, { timeout: 15000 });
    await page.close();
  });

  test('GlobalLayout 移动端视口：桌面侧边栏与 L1 Tabs 隐藏，L1 呈下拉形态', async () => {
    const page = await context.newPage();
    await page.goto(HOST_PATH);
    await page.waitForLoadState('networkidle');
    // <sm：主导航侧边栏不渲染
    await expect(page.getByRole('navigation', { name: '主导航' })).toHaveCount(0);
    // <md：BusinessDomainTabs display:none → Header 内可见的 tablist 数量为 0
    await expect(page.locator('header [role="tablist"]:visible')).toHaveCount(0);
    // 移动端 L1 形态：「请选择」下拉入口
    await expect(page.getByRole('button', { name: '请选择' })).toBeVisible();
    await page.close();
  });

  test('移动端 MobileNav 抽屉可打开并导航', async () => {
    const page = await context.newPage();
    await page.goto(HOST_PATH);
    await page.waitForLoadState('networkidle');
    // MobileNav 触发按钮（aria-label=打开导航菜单）
    const menuButton = page.getByRole('button', { name: '打开导航菜单' });
    await expect(menuButton).toBeVisible();
    // 注：dev-tools 面板此前在窄视口溢出遮挡此按钮（已修复为 <sm 隐藏），正常点击即可
    await menuButton.click();
    // Drawer 出现当前 L1 域（platform 系统管理）的导航树项（如「数据字典」）
    const drawerItem = page.getByRole('button', { name: '数据字典' }).first();
    await expect(drawerItem).toBeVisible({ timeout: 10000 });
    await drawerItem.click();
    // 点击导航项后离开宿主路径
    await expect(page).not.toHaveURL(HOST_PATH, { timeout: 15000 });
    await page.close();
  });
});
