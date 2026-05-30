import { test, expect } from '@playwright/test';

test('login page loads successfully', async ({ page }) => {
  await page.goto('/login');
  await expect(page).toHaveTitle(/TOPEMS/);
  await expect(page.getByText('TOPEMS')).toBeVisible();
  await expect(page.getByText('用户登录')).toBeVisible();
  await expect(page.getByPlaceholder('请输入用户名')).toBeVisible();
  await expect(page.getByPlaceholder('请输入密码')).toBeVisible();
});

test('has theme toggle', async ({ page }) => {
  await page.goto('/login');
  await expect(page.locator('button').filter({ hasText: /Theme|Dark|Light/i })).toBeVisible({ timeout: 5000 });
});
