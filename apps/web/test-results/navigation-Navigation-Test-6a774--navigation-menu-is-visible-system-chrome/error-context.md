# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: navigation.spec.ts >> Navigation Tests >> sidebar navigation menu is visible
- Location: e2e/navigation.spec.ts:31:3

# Error details

```
Test timeout of 30000ms exceeded while running "beforeEach" hook.
```

```
Error: page.waitForURL: Test timeout of 30000ms exceeded.
=========================== logs ===========================
waiting for navigation to "**/dashboard" until "load"
============================================================
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e7]:
    - generic [ref=e8]:
      - img [ref=e10]
      - heading "TOPEMS" [level=6] [ref=e12]
    - button [ref=e13] [cursor=pointer]:
      - img [ref=e14]
  - generic [ref=e16]:
    - generic [ref=e17]:
      - img [ref=e19]
      - heading "欢迎回来" [level=4] [ref=e28]
      - paragraph [ref=e29]: 请登录您的账号
    - generic [ref=e30]:
      - generic [ref=e32]:
        - generic [ref=e33]:
          - generic [ref=e34]: 用户名
          - generic [ref=e35]:
            - img [ref=e37]
            - textbox "用户名" [ref=e40]:
              - /placeholder: 请输入用户名
              - text: admin
            - group:
              - generic: 用户名
        - generic [ref=e41]:
          - generic [ref=e42]: 密码
          - generic [ref=e43]:
            - img [ref=e45]
            - textbox "密码" [ref=e48]:
              - /placeholder: 请输入密码
              - text: admin123
            - button [ref=e49] [cursor=pointer]:
              - img [ref=e50]
            - group:
              - generic: 密码
        - generic [ref=e53]:
          - generic [ref=e56]: 大写字母
          - generic [ref=e59]: 小写字母
          - generic [ref=e62]: 数字
          - generic [ref=e65]: 特殊字符
        - button "登录" [ref=e66] [cursor=pointer]: 登录
      - button "没有账号？立即注册" [ref=e68] [cursor=pointer]
      - generic [ref=e70]: "演示账号: admin / admin123 (管理员) | user / user123 (普通员工)"
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | // Run tests serially to avoid authentication state conflicts
  4  | test.describe.configure({ mode: 'serial' });
  5  | 
  6  | test.describe('Navigation Tests', () => {
  7  |   test.beforeEach(async ({ page }) => {
  8  |     await page.goto('/login');
  9  |     await page.waitForLoadState('networkidle');
  10 |     
  11 |     // Fill login form
  12 |     await page.getByPlaceholder('请输入用户名').fill('admin');
  13 |     await page.getByPlaceholder('请输入密码').fill('admin123');
  14 |     
  15 |     // Click login and wait for response
  16 |     await page.getByRole('button', { name: '登录' }).click();
  17 |     
  18 |     // Wait for navigation to complete
> 19 |     await page.waitForURL('**/dashboard', { timeout: 30000 });
     |                ^ Error: page.waitForURL: Test timeout of 30000ms exceeded.
  20 |     
  21 |     // Wait for page content to load and auth state to be saved
  22 |     await page.waitForLoadState('networkidle');
  23 |     
  24 |     // Wait for the dashboard content to be visible (ensures auth is working)
  25 |     await page.waitForSelector('h4:has-text("科研研发")', { timeout: 15000 });
  26 |     
  27 |     // Additional wait to ensure localStorage is saved
  28 |     await page.waitForTimeout(500);
  29 |   });
  30 | 
  31 |   test('sidebar navigation menu is visible', async ({ page }) => {
  32 |     await expect(page.locator('h4', { hasText: '科研研发' })).toBeVisible({ timeout: 10000 });
  33 |     await expect(page.locator('h4', { hasText: '实验室管理' })).toBeVisible({ timeout: 10000 });
  34 |     await expect(page.locator('h4', { hasText: '质量管理' })).toBeVisible({ timeout: 10000 });
  35 |   });
  36 | 
  37 |   test('navigates to RS page', async ({ page }) => {
  38 |     await page.locator('h4', { hasText: '科研研发' }).click();
  39 |     await page.waitForURL('**/rs', { timeout: 10000 });
  40 |     await page.waitForLoadState('networkidle');
  41 |     await expect(page.locator('text=/研发|R&D/i').first()).toBeVisible({ timeout: 10000 });
  42 |   });
  43 | 
  44 |   test('navigates to LIMS page', async ({ page }) => {
  45 |     await page.locator('h4', { hasText: '实验室管理' }).click();
  46 |     await page.waitForURL('**/lims', { timeout: 10000 });
  47 |     await page.waitForLoadState('networkidle');
  48 |     // Check for any content on the LIMS page
  49 |     const pageContent = page.locator('body');
  50 |     await expect(pageContent).toBeVisible();
  51 |   });
  52 | 
  53 |   test('navigates to QMS page', async ({ page }) => {
  54 |     await page.locator('h4', { hasText: '质量管理' }).click();
  55 |     await page.waitForURL('**/qms', { timeout: 10000 });
  56 |     await page.waitForLoadState('networkidle');
  57 |     await expect(page.locator('h1', { hasText: '质量管理' })).toBeVisible({ timeout: 10000 });
  58 |   });
  59 | 
  60 |   test('navigates back to dashboard', async ({ page }) => {
  61 |     await page.locator('h4', { hasText: '科研研发' }).click();
  62 |     await page.waitForURL('**/rs', { timeout: 10000 });
  63 |     await page.waitForLoadState('networkidle');
  64 |     
  65 |     await page.goBack();
  66 |     await page.waitForURL('**/dashboard', { timeout: 10000 });
  67 |     await page.waitForLoadState('networkidle');
  68 |     
  69 |     await expect(page.locator('h4', { hasText: '科研研发' })).toBeVisible({ timeout: 10000 });
  70 |   });
  71 | 
  72 |   test('breadcrumb navigation', async ({ page }) => {
  73 |     await page.locator('h4', { hasText: '科研研发' }).click();
  74 |     await page.waitForURL('**/rs', { timeout: 10000 });
  75 |     
  76 |     const pageContent = page.locator('body');
  77 |     await expect(pageContent).toBeVisible();
  78 |   });
  79 | 
  80 |   test('mobile navigation menu', async ({ page }) => {
  81 |     await page.setViewportSize({ width: 375, height: 667 });
  82 |     await page.waitForTimeout(500);
  83 |     
  84 |     const menuButton = page.locator('button').filter({ has: page.locator('svg') }).nth(0);
  85 |     await menuButton.click();
  86 |     await page.waitForTimeout(1000);
  87 |     
  88 |     await expect(page.locator('text=科研研发').first()).toBeEnabled();
  89 |   });
  90 | 
  91 |   test('keyboard navigation', async ({ page }) => {
  92 |     await page.keyboard.press('Alt+1');
  93 |     
  94 |     await page.waitForTimeout(500);
  95 |   });
  96 | });
  97 | 
```