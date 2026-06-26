import { test, expect } from '@playwright/test';

test('login page loads successfully', async ({ page }) => {
  await page.goto('/login');
  await expect(page).toHaveTitle(/TOPEMS/);
  await expect(page.getByText('TOPEMS')).toBeVisible();
  await expect(page.getByPlaceholder('请输入用户名')).toBeVisible();
  await expect(page.getByPlaceholder('请输入密码')).toBeVisible();
  await expect(page.getByRole('button', { name: '登录' })).toBeVisible();
});

test('has login form elements', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByPlaceholder('请输入用户名')).toBeVisible();
  await expect(page.getByPlaceholder('请输入密码')).toBeVisible();
  await expect(page.getByRole('button', { name: '登录' })).toBeVisible();
});
