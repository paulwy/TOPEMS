# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: rs_page.spec.ts >> RS Page Tests >> opens experiment section
- Location: e2e/rs_page.spec.ts:34:3

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
  3  | test.describe('RS Page Tests', () => {
  4  |   test.beforeEach(async ({ page }) => {
  5  |     await page.goto('/login');
  6  |     await page.getByPlaceholder('请输入用户名').fill('admin');
  7  |     await page.getByPlaceholder('请输入密码').fill('admin123');
  8  |     await page.getByRole('button', { name: '登录' }).click();
> 9  |     await page.waitForURL('**/dashboard');
     |                ^ Error: page.waitForURL: Test timeout of 30000ms exceeded.
  10 |     
  11 |     await page.locator('h4', { hasText: '科研研发' }).click();
  12 |     await page.waitForURL('**/rs', { timeout: 10000 });
  13 |   });
  14 | 
  15 |   test('displays RS page correctly', async ({ page }) => {
  16 |     await expect(page.locator('text=项目列表').first()).toBeVisible({ timeout: 10000 });
  17 |   });
  18 | 
  19 |   test('displays projects section', async ({ page }) => {
  20 |     const projectsSection = page.locator('text=项目列表').first();
  21 |     await expect(projectsSection).toBeVisible({ timeout: 10000 });
  22 |   });
  23 | 
  24 |   test('displays experiments section', async ({ page }) => {
  25 |     await expect(page.locator('text=试验记录').first()).toBeVisible({ timeout: 10000 });
  26 |   });
  27 | 
  28 |   test('opens new project modal', async ({ page }) => {
  29 |     await page.getByRole('button', { name: '新建项目' }).first().click();
  30 |     
  31 |     await expect(page.locator('h3', { hasText: '新建项目' })).toBeVisible({ timeout: 5000 });
  32 |   });
  33 | 
  34 |   test('opens experiment section', async ({ page }) => {
  35 |     await page.locator('text=试验记录').first().click();
  36 |     await page.waitForTimeout(1000);
  37 |   });
  38 | 
  39 |   test('creates new project', async ({ page }) => {
  40 |     await page.getByRole('button', { name: '新建项目' }).first().click();
  41 |     
  42 |     await page.waitForSelector('input', { timeout: 5000 });
  43 |     
  44 |     const textInputs = page.locator('input[type="text"]');
  45 |     if ((await textInputs.count()) > 0) {
  46 |       await textInputs.first().fill('测试项目');
  47 |     }
  48 |     
  49 |     if ((await textInputs.count()) > 1) {
  50 |       await textInputs.nth(1).fill('TEST-001');
  51 |     }
  52 |     
  53 |     const createButton = page.getByRole('button', { name: '创建', exact: true });
  54 |     await createButton.click();
  55 |     
  56 |     await page.waitForTimeout(2000);
  57 |   });
  58 | 
  59 |   test('filters projects by status', async ({ page }) => {
  60 |     const select = page.locator('select').first();
  61 |     if (await select.isVisible()) {
  62 |       await select.selectOption('进行中');
  63 |     }
  64 |     await page.waitForTimeout(500);
  65 |   });
  66 | 
  67 |   test('searches projects', async ({ page }) => {
  68 |     await page.getByPlaceholder(/搜索/i).fill('测试');
  69 |     await page.waitForTimeout(500);
  70 |   });
  71 | 
  72 |   test('pagination works', async ({ page }) => {
  73 |     const nextButton = page.locator('button', { hasText: /下一页|>>/i });
  74 |     
  75 |     if (await nextButton.isVisible()) {
  76 |       await nextButton.click();
  77 |       await page.waitForTimeout(500);
  78 |     }
  79 |   });
  80 | });
  81 | 
```