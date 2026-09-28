import { test, expect } from '@playwright/test';

test.describe('AI设置页面', () => {
  test.beforeEach(async ({ page }) => {
    // 先登录
    await page.goto('/login');
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');

    // 跳转到AI设置页面
    await page.goto('/ai/settings');
  });

  test('应该显示AI设置页面', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('AI设置');
    await expect(page.locator('text=默认模型')).toBeVisible();
    await expect(page.locator('text=最大Token数')).toBeVisible();
    await expect(page.locator('text=温度')).toBeVisible();
  });

  test('应该能够修改AI设置', async ({ page }) => {
    // 修改温度
    await page.fill('input[placeholder="温度"]', '0.8');
    // 点击保存按钮
    await page.click('button:has-text("保存")');
    // 显示成功提示
    await expect(page.locator('.ant-message-success')).toContainText('保存成功');
  });

  test('应该能够切换流式输出开关', async ({ page }) => {
    await page.click('button[role="switch"]');
    await expect(page.locator('button[role="switch"]')).toHaveAttribute('aria-checked', 'true');
  });
});
