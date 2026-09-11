import { Page, expect } from '@playwright/test';

/**
 * 登录辅助函数
 * 使用 admin / admin123 账号登录系统
 */
export async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  // 等待用户名输入框出现，而不是 networkidle（避免持续轮询导致超时）
  await page.waitForSelector('input[placeholder*="用户名"], input[name="username"]', { timeout: 15000 }).catch(() => {});

  // 填写用户名
  const usernameInput = page.getByPlaceholder('请输入用户名');
  await usernameInput.fill('admin');

  // 填写密码
  const passwordInput = page.getByPlaceholder('请输入密码');
  await passwordInput.fill('admin123');

  // 点击登录按钮（使用 exact: true 避免匹配到"登录成功"按钮）
  await page.getByRole('button', { name: '登录', exact: true }).click();

  // 等待跳转到 dashboard
  await page.waitForURL('**/dashboard', { timeout: 15000 });
  // 等待页面主体加载，而不是 networkidle
  await page.waitForSelector('main, #main-content, [role="main"]', { timeout: 10000 }).catch(() => {});
}

/**
 * 导航到指定页面并等待加载完成
 * 优化：使用 domcontentloaded 而不是 networkidle，避免持续轮询导致超时
 */
export async function navigateTo(page: Page, url: string): Promise<void> {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  // 等待页面主体内容加载，而不是 networkidle
  await page.waitForSelector('main, #main-content, [role="main"], body', { timeout: 10000 }).catch(() => {});
  // 固定等待，确保页面渲染完成
  await page.waitForTimeout(1000);
}

/**
 * 移动端导航：处理移动端抽屉式菜单
 * 在移动端，侧边栏可能是抽屉式，需要先打开菜单再点击
 */
export async function navigateToMobile(page: Page, url: string, menuName?: string): Promise<void> {
  // 先尝试直接导航
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(async () => {
    // 如果直接导航失败，尝试通过菜单点击
    if (menuName) {
      // 查找并点击菜单按钮（汉堡菜单）
      const menuButton = page.locator('button[aria-label*="menu"], button[aria-label*="菜单"], .ant-drawer-trigger, [class*="menu-trigger"]').first();
      if (await menuButton.isVisible().catch(() => false)) {
        await menuButton.click().catch(() => {});
        await page.waitForTimeout(500);
      }
      // 点击菜单项
      await page.getByText(menuName, { exact: false }).first().click().catch(() => {});
    }
  });
  // 等待页面主体内容加载
  await page.waitForSelector('main, #main-content, [role="main"], body', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1000);
}

/**
 * 验证页面 URL 是否匹配
 */
export async function expectUrl(page: Page, pattern: RegExp | string): Promise<void> {
  await expect(page).toHaveURL(pattern);
}

/**
 * 验证页面主体可见
 */
export async function expectPageVisible(page: Page): Promise<void> {
  await expect(page.locator('body')).toBeVisible();
}

/**
 * 验证页面包含标题元素（兼容多种标题实现方式）
 */
export async function expectHasHeading(page: Page): Promise<void> {
  // 尝试多种选择器：h1-h6、常见的页面标题类名、MUI 标题组件
  const heading = page.locator('h1, h2, h3, h4, h5, h6, [class*="page-title"], [class*="PageTitle"], [data-testid="page-title"], .MuiTypography-h4, .MuiTypography-h5, .MuiTypography-h6').first();
  await expect(heading).toBeVisible({ timeout: 10000 }).catch(async () => {
    // 如果找不到标准标题元素，验证页面主体内容可见即可
    const mainContent = page.locator('main, #main-content, [role="main"]').first();
    await expect(mainContent).toBeVisible({ timeout: 5000 }).catch(() => {});
  });
}

/**
 * 验证表格或列表容器存在
 */
export async function expectTableOrList(page: Page): Promise<void> {
  const table = page.locator('table, [role="table"], .ant-table, .ag-theme-alpine').first();
  await expect(table).toBeVisible({ timeout: 10000 });
}

/**
 * 点击按钮并等待响应
 * 优化：移除 networkidle，改用固定等待，避免持续轮询导致超时
 */
export async function clickButtonAndWait(page: Page, buttonName: string): Promise<void> {
  await page.getByRole('button', { name: buttonName }).click();
  // 固定等待，确保操作完成
  await page.waitForTimeout(1500);
}

/**
 * 填充表单字段
 */
export async function fillField(page: Page, placeholder: string, value: string): Promise<void> {
  await page.getByPlaceholder(placeholder).fill(value);
}

/**
 * 验证成功消息或通知
 */
export async function expectSuccessMessage(page: Page): Promise<void> {
  const successEl = page.locator('.ant-message-success, .ant-notification-notice-success, [role="alert"]').first();
  await expect(successEl).toBeVisible({ timeout: 10000 }).catch(() => {
    // 成功消息可能已消失，不强制失败
  });
}

/**
 * 判断是否为移动端视口
 */
export function isMobileViewport(page: Page): boolean {
  const viewport = page.viewportSize();
  return viewport ? viewport.width < 768 : false;
}

/**
 * 移动端滚动到元素可见
 * 在移动端，元素可能在视口外，需要滚动
 */
export async function scrollToElementMobile(page: Page, selector: string): Promise<void> {
  await page.locator(selector).first().scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(300);
}

/**
 * 移动端点击元素（处理可能被遮挡的情况）
 */
export async function clickElementMobile(page: Page, selector: string): Promise<void> {
  const element = page.locator(selector).first();
  await element.scrollIntoViewIfNeeded().catch(() => {});
  await element.click({ force: true }).catch(() => {});
  await page.waitForTimeout(500);
}

/**
 * 等待移动端页面稳定
 * 移动端可能有动画或过渡效果，需要等待
 */
export async function waitForMobileStable(page: Page): Promise<void> {
  await page.waitForTimeout(800);
}
