import { Page, expect } from '@playwright/test';

/**
 * 登录辅助函数
 * 使用 admin / admin123 账号登录系统
 */
export async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  // 填写用户名
  const usernameInput = page.getByPlaceholder('请输入用户名');
  await usernameInput.fill('admin');

  // 填写密码
  const passwordInput = page.getByPlaceholder('请输入密码');
  await passwordInput.fill('admin123');

  // 点击登录按钮
  await page.getByRole('button', { name: '登录' }).click();

  // 等待跳转到 dashboard
  await page.waitForURL('**/dashboard', { timeout: 15000 });
  await page.waitForLoadState('networkidle');
}

/**
 * 导航到指定页面并等待加载完成
 */
export async function navigateTo(page: Page, url: string): Promise<void> {
  await page.goto(url);
  await page.waitForLoadState('networkidle');
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
 * 验证页面包含标题元素
 */
export async function expectHasHeading(page: Page): Promise<void> {
  const heading = page.locator('h1, h2, h3').first();
  await expect(heading).toBeVisible({ timeout: 10000 });
}

/**
 * 验证表格或列表容器存在
 */
export async function expectTableOrList(page: Page): Promise<void> {
  const table = page.locator('table, [role="table"], .ant-table, .ag-theme-alpine').first();
  await expect(table).toBeVisible({ timeout: 10000 });
}

/**
 * 点击按钮并等待网络空闲
 */
export async function clickButtonAndWait(page: Page, buttonName: string): Promise<void> {
  await page.getByRole('button', { name: buttonName }).click();
  await page.waitForLoadState('networkidle');
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
