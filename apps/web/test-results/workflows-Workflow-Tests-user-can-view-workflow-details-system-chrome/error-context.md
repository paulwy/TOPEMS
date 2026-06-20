# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: workflows.spec.ts >> Workflow Tests >> user can view workflow details
- Location: e2e/workflows.spec.ts:43:3

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
  3  | test.describe('Workflow Tests', () => {
  4  |   test.beforeEach(async ({ page }) => {
  5  |     await page.goto('/login');
  6  |     await page.getByPlaceholder('请输入用户名').fill('admin');
  7  |     await page.getByPlaceholder('请输入密码').fill('admin123');
  8  |     await page.getByRole('button', { name: '登录' }).click();
> 9  |     await page.waitForURL('**/dashboard');
     |                ^ Error: page.waitForURL: Test timeout of 30000ms exceeded.
  10 |   });
  11 | 
  12 |   test('user can create and approve a workflow', async ({ page }) => {
  13 |     await page.locator('h4', { hasText: '质量管理' }).click();
  14 |     await page.waitForURL('**/qms', { timeout: 10000 });
  15 |     
  16 |     const newWorkflowButton = page.getByRole('button', { name: /新建流程/i });
  17 |     if (await newWorkflowButton.isVisible()) {
  18 |       await newWorkflowButton.click();
  19 |       
  20 |       await page.waitForTimeout(1000);
  21 |       
  22 |       const textInputs = page.locator('input[type="text"]');
  23 |       if ((await textInputs.count()) > 0) {
  24 |         await textInputs.first().fill('测试流程');
  25 |       }
  26 |       
  27 |       const createButton = page.getByRole('button', { name: /创建/i });
  28 |       if (await createButton.isVisible()) {
  29 |         await createButton.click();
  30 |       }
  31 |       
  32 |       await page.waitForTimeout(1000);
  33 |     }
  34 |   });
  35 | 
  36 |   test('workflow shows correct status', async ({ page }) => {
  37 |     await page.locator('h4', { hasText: '质量管理' }).click();
  38 |     await page.waitForURL('**/qms', { timeout: 10000 });
  39 |     
  40 |     await page.waitForTimeout(500);
  41 |   });
  42 | 
  43 |   test('user can view workflow details', async ({ page }) => {
  44 |     await page.locator('h4', { hasText: '质量管理' }).click();
  45 |     await page.waitForURL('**/qms', { timeout: 10000 });
  46 |     
  47 |     await page.waitForTimeout(500);
  48 |   });
  49 | 
  50 |   test('multi-step workflow navigation', async ({ page }) => {
  51 |     await page.locator('h4', { hasText: '科研研发' }).click();
  52 |     await page.waitForURL('**/rs', { timeout: 10000 });
  53 |     
  54 |     const newProjectButton = page.getByRole('button', { name: /新建项目/i });
  55 |     if (await newProjectButton.isVisible()) {
  56 |       await newProjectButton.click();
  57 |       await page.waitForTimeout(1000);
  58 |     }
  59 |   });
  60 | 
  61 |   test('workflow cancellation', async ({ page }) => {
  62 |     await page.locator('h4', { hasText: '质量管理' }).click();
  63 |     await page.waitForURL('**/qms', { timeout: 10000 });
  64 |     
  65 |     await page.waitForTimeout(500);
  66 |   });
  67 | });
  68 | 
```