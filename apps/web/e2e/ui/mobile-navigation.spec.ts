/**
 * 移动端导航 e2e（对齐 2026-10-16 定案后的新架构）
 *
 * 新架构事实（权威，旧的 SmartLayout / AdaptiveLayout / TabletLayout / GlobalLayout
 * 及 MobileNav 抽屉、BusinessDomainTabs 均已删除）：
 * - 主路由（/dashboard、/core/* 等）恒用桌面 V3 壳：GlobalLayoutV3
 *   = AppShell = TopBar + SideRail，不存在按设备/视口的分流。
 * - route.module === 'mobile' 的路由（/mobile/*）不套全局壳（ProtectedRouteWrapper
 *   跳过），自带壳：MobilePageTemplate → MobileLayoutV3
 *   → MobileHeader（MUI AppBar，<header role=banner>）+ 可选 BottomTabBar。
 *
 * 关键选择器（均取自组件源码，未做猜测）：
 * - 桌面侧边栏：SideRail.tsx 的 <nav aria-label='Main navigation'>
 * - 桌面顶栏品牌：TopBar.tsx 的 <header> 内品牌文案（GlobalLayoutV3 传 title='TOPEMS'）
 * - 移动端头部：MobileHeader.tsx（MUI AppBar → role=banner，标题为 h1）
 * - 底部导航：BottomTabBar.tsx 的 Paper className='bottom-tab-bar' 内
 *   MUI BottomNavigation → .MuiBottomNavigation-root / .MuiBottomNavigationAction-root
 *   标签文案来自 zh 词条 mobile.mobile_workbench_page.k26-k30（工作台/任务/扫码/审批/我的）
 *   与 mobile.mobile_task_list_page.k15-k19（首页/任务/扫码/审批/我的）
 *
 * 认证：createAuthenticatedContext 直接注入 localStorage，绕过登录表单。
 *
 * 运行：pnpm exec playwright test -c playwright.config.ts --project=mobile-iphone e2e/ui/mobile-navigation.spec.ts
 */
import { test, expect } from '@playwright/test';
import { createAuthenticatedContext } from '../utils/testUtils';

test.describe('移动端导航 e2e', () => {
  let context: any;

  test.beforeAll(async ({ browser }) => {
    context = await createAuthenticatedContext(browser);
  });

  test.afterAll(async () => {
    await context?.close();
  });

  test('移动端路由（/mobile/*）不渲染桌面全局壳，改由移动端壳承载', async () => {
    const page = await context.newPage();
    await page.goto('/mobile/workbench');
    await page.waitForLoadState('networkidle');
    // 桌面 V3 侧边导航不存在（ProtectedRouteWrapper 对 module==='mobile' 跳过全局壳）
    await expect(page.getByRole('navigation', { name: 'Main navigation' })).toHaveCount(0);
    // 移动端壳的头部（MUI AppBar → <header role=banner>）存在
    await expect(page.getByRole('banner')).toBeVisible();
    // 头部标题由 MobileHeader 的 h1 渲染（MobileWorkbenchPage 的 title = 工作台）
    await expect(page.getByRole('heading', { level: 1, name: '工作台' })).toBeVisible();
    await page.close();
  });

  test('移动端工作台底部导航（BottomTabBar）渲染，并可切换到任务页', async () => {
    const page = await context.newPage();
    await page.goto('/mobile/workbench');
    await page.waitForLoadState('networkidle');
    // BottomTabBar.tsx：Paper.className='bottom-tab-bar' 内渲染 MUI BottomNavigation
    const tabBar = page.locator('.bottom-tab-bar');
    await expect(tabBar).toBeVisible();
    await expect(page.locator('.MuiBottomNavigation-root')).toBeVisible();
    // 点击「任务」tab（MobileWorkbenchPage.handleTabChange: 'tasks' → MOBILE_PATHS.tasks）
    await tabBar.locator('.MuiBottomNavigationAction-root', { hasText: '任务' }).click();
    await expect(page).toHaveURL(/\/mobile\/tasks$/, { timeout: 15000 });
    await page.close();
  });

  test('移动端任务页底部导航可切换回首页', async () => {
    const page = await context.newPage();
    await page.goto('/mobile/tasks');
    await page.waitForLoadState('networkidle');
    const tabBar = page.locator('.bottom-tab-bar');
    await expect(tabBar).toBeVisible();
    // 点击「首页」tab（MobileTaskListPage.handleBottomTabChange: 'home' → MOBILE_PATHS.home）
    await tabBar.locator('.MuiBottomNavigationAction-root', { hasText: '首页' }).click();
    await expect(page).toHaveURL(/\/mobile\/home$/, { timeout: 15000 });
    await page.close();
  });

  test('桌面 V3 壳不随视口分流：/dashboard 在移动视口仍渲染 GlobalLayoutV3', async () => {
    const page = await context.newPage();
    // 显式设为 iPhone 12 视口，使断言与 project 无关（新架构不再按视口分流）
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    // SideRail 恒渲染：已核实 index.css / redesign-tokens.css 无针对 .redesign-siderail
    // 的窄屏隐藏规则（仅 --siderail-width / --siderail-expanded-width 两个宽度变量）
    await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
    // TopBar 品牌文案（GlobalLayoutV3 传入 title='TOPEMS'，在 <header> 内）
    await expect(page.getByText('TOPEMS', { exact: true })).toBeVisible();
    // 移动端底部导航仅出现在 /mobile/*，主路由不应渲染
    await expect(page.locator('.MuiBottomNavigation-root')).toHaveCount(0);
    await page.close();
  });
});
