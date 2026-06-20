# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: lims_page.spec.ts >> LIMS Page Tests >> displays tests section
- Location: e2e/lims_page.spec.ts:23:3

# Error details

```
TimeoutError: page.waitForURL: Timeout 15000ms exceeded.
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
  3  | test.describe('LIMS Page Tests', () => {
  4  |   test.beforeEach(async ({ page }) => {
  5  |     await page.goto('/login');
  6  |     await page.getByPlaceholder('请输入用户名').fill('admin');
  7  |     await page.getByPlaceholder('请输入密码').fill('admin123');
  8  |     await page.getByRole('button', { name: '登录' }).click();
> 9  |     await page.waitForURL('**/dashboard', { timeout: 15000 });
     |                ^ TimeoutError: page.waitForURL: Timeout 15000ms exceeded.
  10 |     
  11 |     await page.locator('h4', { hasText: '实验室管理' }).click();
  12 |     await page.waitForURL('**/lims', { timeout: 15000 });
  13 |   });
  14 | 
  15 |   test('displays LIMS page correctly', async ({ page }) => {
  16 |     await expect(page.locator('h1', { hasText: '检验管理' })).toBeVisible();
  17 |   });
  18 | 
  19 |   test('displays samples section', async ({ page }) => {
  20 |     await expect(page.locator('text=样品列表').first()).toBeVisible();
  21 |   });
  22 | 
  23 |   test('displays tests section', async ({ page }) => {
  24 |     await page.waitForTimeout(500);
  25 |   });
  26 | 
  27 |   test('opens new sample modal', async ({ page }) => {
  28 |     const newSampleButton = page.getByRole('button', { name: /新建样品/i });
  29 |     if (await newSampleButton.isVisible()) {
  30 |       await newSampleButton.click();
  31 |       await page.waitForTimeout(1000);
  32 |     }
  33 |   });
  34 | 
  35 |   test('opens new test modal', async ({ page }) => {
  36 |     const newTestButton = page.getByRole('button', { name: /新建检测/i });
  37 |     if (await newTestButton.isVisible()) {
  38 |       await newTestButton.click();
  39 |       await page.waitForTimeout(1000);
  40 |     }
  41 |   });
  42 | 
  43 |   test('creates new sample', async ({ page }) => {
  44 |     const newSampleButton = page.getByRole('button', { name: /新建样品/i });
  45 |     if (await newSampleButton.isVisible()) {
  46 |       await newSampleButton.click();
  47 |       
  48 |       await page.waitForTimeout(1000);
  49 |       
  50 |       const textInputs = page.locator('input[type="text"]');
  51 |       if ((await textInputs.count()) > 0) {
  52 |         await textInputs.first().fill('测试样品');
  53 |       }
  54 |       
  55 |       const createButton = page.getByRole('button', { name: '创建', exact: true });
  56 |       if (await createButton.isVisible()) {
  57 |         await createButton.click();
  58 |       }
  59 |       
  60 |       await page.waitForTimeout(1000);
  61 |     }
  62 |   });
  63 | 
  64 |   test('filters samples by status', async ({ page }) => {
  65 |     const select = page.locator('select').first();
  66 |     if (await select.isVisible()) {
  67 |       await select.selectOption('待检');
  68 |     }
  69 |     await page.waitForTimeout(500);
  70 |   });
  71 | 
  72 |   test('searches samples', async ({ page }) => {
  73 |     const searchInput = page.locator('input').filter({ hasNot: page.locator('svg') }).first();
  74 |     if (await searchInput.isVisible()) {
  75 |       await searchInput.fill('测试');
  76 |     }
  77 |     await page.waitForTimeout(500);
  78 |   });
  79 | });
  80 | 
```