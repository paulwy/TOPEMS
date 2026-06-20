# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: simple.spec.ts >> has theme toggle
- Location: e2e/simple.spec.ts:12:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('button').filter({ hasText: /Theme|Dark|Light/i })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('button').filter({ hasText: /Theme|Dark|Light/i })

```

```yaml
- heading "TOPEMS" [level=6]
- button
- heading "欢迎回来" [level=4]
- paragraph: 请登录您的账号
- text: 用户名
- textbox "用户名":
  - /placeholder: 请输入用户名
- text: 密码
- textbox "密码":
  - /placeholder: 请输入密码
- button
- text: 大写字母 小写字母 数字 特殊字符
- button "登录"
- button "没有账号？立即注册"
- text: "演示账号: admin / admin123 (管理员) | user / user123 (普通员工)"
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test('login page loads successfully', async ({ page }) => {
  4  |   await page.goto('/login');
  5  |   await expect(page).toHaveTitle(/TOPEMS/);
  6  |   await expect(page.getByText('TOPEMS')).toBeVisible();
  7  |   await expect(page.getByText('用户登录')).toBeVisible();
  8  |   await expect(page.getByPlaceholder('请输入用户名')).toBeVisible();
  9  |   await expect(page.getByPlaceholder('请输入密码')).toBeVisible();
  10 | });
  11 | 
  12 | test('has theme toggle', async ({ page }) => {
  13 |   await page.goto('/login');
> 14 |   await expect(page.locator('button').filter({ hasText: /Theme|Dark|Light/i })).toBeVisible({ timeout: 5000 });
     |                                                                                 ^ Error: expect(locator).toBeVisible() failed
  15 | });
  16 | 
```