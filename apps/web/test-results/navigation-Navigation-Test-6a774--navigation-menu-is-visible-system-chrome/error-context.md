# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: navigation.spec.ts >> Navigation Tests >> sidebar navigation menu is visible
- Location: e2e/navigation.spec.ts:31:3

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/login
Call log:
  - navigating to "http://localhost:3000/login", waiting until "load"

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e6]:
    - heading "无法访问此网站" [level=1] [ref=e7]
    - paragraph [ref=e8]:
      - strong [ref=e9]: localhost
      - text: 拒绝了我们的连接请求。
    - generic [ref=e10]:
      - paragraph [ref=e11]: 请试试以下办法：
      - list [ref=e12]:
        - listitem [ref=e13]: 检查网络连接
        - listitem [ref=e14]:
          - link "检查代理服务器和防火墙" [ref=e15] [cursor=pointer]:
            - /url: "#buttons"
    - generic [ref=e16]: ERR_CONNECTION_REFUSED
  - generic [ref=e17]:
    - button "重新加载" [ref=e19] [cursor=pointer]
    - button "详情" [ref=e20] [cursor=pointer]
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
> 8  |     await page.goto('/login');
     |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/login
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
  19 |     await page.waitForURL('**/dashboard', { timeout: 30000 });
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