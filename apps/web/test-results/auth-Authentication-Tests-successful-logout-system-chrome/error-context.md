# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.ts >> Authentication Tests >> successful logout
- Location: e2e/auth.spec.ts:61:3

# Error details

```
TimeoutError: page.waitForURL: Timeout 10000ms exceeded.
=========================== logs ===========================
waiting for navigation to "**/dashboard" until "load"
============================================================
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - button "Toggle theme" [ref=e5]:
    - img
    - generic [ref=e6]: Toggle theme
  - generic [ref=e7]:
    - generic [ref=e8]:
      - heading "TOPEMS" [level=3] [ref=e9]
      - generic [ref=e10]: 企业数字化平台
      - heading "用户登录" [level=2] [ref=e11]
    - generic [ref=e12]:
      - generic [ref=e13]:
        - generic [ref=e14]:
          - text: 用户名
          - textbox "用户名" [ref=e15]:
            - /placeholder: 请输入用户名
            - text: admin
          - paragraph [ref=e16]: 字母或数字组合，最多20位
        - generic [ref=e17]:
          - text: 密码
          - generic [ref=e18]:
            - textbox "请输入密码" [ref=e19]: admin123
            - button [ref=e20]:
              - img [ref=e21]
          - paragraph [ref=e24]:
            - generic [ref=e25]: 大写字母
            - generic [ref=e27]: 小写字母
            - generic [ref=e29]: 数字
            - generic [ref=e31]: 特殊字符
        - button "登录" [ref=e33]
      - button "没有账号？立即注册" [ref=e35]
      - paragraph [ref=e37]: "演示账号: admin / admin123 (管理员) | user / user123 (普通员工)"
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Authentication Tests', () => {
  4  |   test.beforeEach(async ({ page }) => {
  5  |     await page.goto('/login');
  6  |   });
  7  | 
  8  |   test('displays login page correctly', async ({ page }) => {
  9  |     await expect(page.locator('text=TOPEMS')).toBeVisible();
  10 |     await expect(page.locator('text=用户登录')).toBeVisible();
  11 |     await expect(page.getByPlaceholder('请输入用户名')).toBeVisible();
  12 |     await expect(page.getByPlaceholder('请输入密码')).toBeVisible();
  13 |   });
  14 | 
  15 |   test('shows validation errors for empty fields', async ({ page }) => {
  16 |     await page.getByRole('button', { name: '登录' }).click();
  17 |     await page.waitForTimeout(500);
  18 |   });
  19 | 
  20 |   test('shows validation error for short username', async ({ page }) => {
  21 |     await page.getByPlaceholder('请输入用户名').fill('ab');
  22 |     await page.getByPlaceholder('请输入密码').fill('Test@1234');
  23 |     await page.getByRole('button', { name: '登录' }).click();
  24 |     await page.waitForTimeout(500);
  25 |   });
  26 | 
  27 |   test('successful login with valid credentials', async ({ page }) => {
  28 |     await page.getByPlaceholder('请输入用户名').fill('admin');
  29 |     await page.getByPlaceholder('请输入密码').fill('admin123');
  30 |     await page.getByRole('button', { name: '登录' }).click();
  31 |     
  32 |     await page.waitForURL('**/dashboard', { timeout: 10000 });
  33 |   });
  34 | 
  35 |   test('unsuccessful login with invalid credentials', async ({ page }) => {
  36 |     await page.getByPlaceholder('请输入用户名').fill('admin');
  37 |     await page.getByPlaceholder('请输入密码').fill('wrongpassword');
  38 |     await page.getByRole('button', { name: '登录' }).click();
  39 |     
  40 |     await page.waitForTimeout(1000);
  41 |   });
  42 | 
  43 |   test('password visibility toggle', async ({ page }) => {
  44 |     const passwordInput = page.getByPlaceholder('请输入密码');
  45 |     await expect(passwordInput).toHaveAttribute('type', 'password');
  46 |     
  47 |     const buttons = page.locator('button');
  48 |     if ((await buttons.count()) > 1) {
  49 |       await buttons.nth(1).click();
  50 |     }
  51 |   });
  52 | 
  53 |   test('navigates to registration mode', async ({ page }) => {
  54 |     const registerLink = page.getByText('没有账号？立即注册');
  55 |     if (await registerLink.isVisible()) {
  56 |       await registerLink.click();
  57 |       await expect(page.locator('text=用户注册')).toBeVisible();
  58 |     }
  59 |   });
  60 | 
  61 |   test('successful logout', async ({ page }) => {
  62 |     await page.getByPlaceholder('请输入用户名').fill('admin');
  63 |     await page.getByPlaceholder('请输入密码').fill('admin123');
  64 |     await page.getByRole('button', { name: '登录' }).click();
  65 |     
> 66 |     await page.waitForURL('**/dashboard', { timeout: 10000 });
     |                ^ TimeoutError: page.waitForURL: Timeout 10000ms exceeded.
  67 |     
  68 |     await page.waitForTimeout(500);
  69 |   });
  70 | 
  71 |   test('remembers login state', async ({ page, context }) => {
  72 |     await page.getByPlaceholder('请输入用户名').fill('admin');
  73 |     await page.getByPlaceholder('请输入密码').fill('admin123');
  74 |     await page.getByRole('button', { name: '登录' }).click();
  75 |     
  76 |     await page.waitForURL('**/dashboard', { timeout: 10000 });
  77 |     
  78 |     await page.context().storageState({ path: 'auth-state.json' });
  79 |     
  80 |     const newPage = await context.newPage();
  81 |     await newPage.goto('/dashboard');
  82 |     
  83 |     await newPage.waitForURL('**/dashboard', { timeout: 10000 });
  84 |   });
  85 | });
  86 | 
```