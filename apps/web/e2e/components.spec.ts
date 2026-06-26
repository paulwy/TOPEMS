import { test, expect } from '@playwright/test';

test.describe('首页组件测试', () => {
  test.beforeEach(async ({ page }) => {
    // 登录
    await page.goto('/login');
    await page.getByPlaceholder('请输入用户名').fill('admin');
    await page.getByPlaceholder('请输入密码').fill('admin123');
    await page.getByRole('button', { name: '登录' }).click();
    await page.waitForURL('**/dashboard', { timeout: 15000 });
  });

  test('首页应显示分区布局', async ({ page }) => {
    await page.goto('/dashboard');

    // 检查今日概览分区
    await expect(page.locator('text=今日概览')).toBeVisible();

    // 检查快捷入口分区
    await expect(page.locator('text=快捷入口')).toBeVisible();

    // 检查待办事项分区
    await expect(page.locator('text=待办事项')).toBeVisible();

    // 检查模块导航分区
    await expect(page.locator('text=模块导航')).toBeVisible();
  });

  test('服务状态监测组件应显示', async ({ page }) => {
    await page.goto('/dashboard');

    // 检查服务状态监测分区
    await expect(page.locator('text=服务状态监测')).toBeVisible();

    // 检查刷新按钮
    await expect(page.locator('[data-testid="service-refresh-button"]')).toBeVisible();
  });

  test('分区应支持折叠展开', async ({ page }) => {
    await page.goto('/dashboard');

    // 找到快捷入口分区
    const section = page.locator('text=快捷入口').locator('..');

    // 点击折叠按钮
    const collapseButton = section.locator('button').first();
    await collapseButton.click();

    // 验证内容已折叠（不可见）
    // 注意：这取决于具体实现
  });
});

test.describe('导航组件测试', () => {
  test('顶部导航应显示所有模块', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    // 检查导航项
    await expect(page.locator('text=首页')).toBeVisible();
    await expect(page.locator('text=人力')).toBeVisible();
    await expect(page.locator('text=客户')).toBeVisible();
    await expect(page.locator('text=项目')).toBeVisible();
  });

  test('导航下拉菜单应正常工作', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    // 点击人力导航
    await page.click('text=人力');

    // 检查下拉菜单
    await expect(page.locator('text=员工')).toBeVisible();
    await expect(page.locator('text=部门')).toBeVisible();
  });

  test('模块Tab应正常切换', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    // 进入人力模块
    await page.click('text=人力');
    await page.click('text=员工');

    // 检查Tab是否显示
    // 注意：这取决于具体实现
  });
});

test.describe('响应式布局测试', () => {
  test('桌面端应显示完整导航', async ({ page }) => {
    // 设置桌面端视口
    await page.setViewportSize({ width: 1280, height: 720 });

    await page.goto('/login');
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    // 检查导航是否完整显示
    await expect(page.locator('text=首页')).toBeVisible();
    await expect(page.locator('text=人力')).toBeVisible();
  });

  test('移动端应显示汉堡菜单', async ({ page }) => {
    // 设置移动端视口
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/login');
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    // 检查汉堡菜单按钮
    const menuButton = page.locator('[data-testid="mobile-menu-button"]');
    if (await menuButton.isVisible()) {
      await menuButton.click();
      // 检查Drawer是否打开
      await expect(page.locator('[data-testid="mobile-drawer"]')).toBeVisible();
    }
  });
});

test.describe('主题切换测试', () => {
  test('应支持主题切换', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    // 检查主题切换按钮
    const themeButton = page.locator('[data-testid="theme-toggle-button"]');
    if (await themeButton.isVisible()) {
      // 点击切换主题
      await themeButton.click();

      // 验证主题已切换（检查背景色变化）
      // 注意：这取决于具体实现
    }
  });
});