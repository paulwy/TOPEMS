# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: workflows.spec.ts >> Workflow Tests >> multi-step workflow navigation
- Location: e2e/workflows.spec.ts:50:3

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
  3  | test.describe('Workflow Tests', () => {
  4  |   test.beforeEach(async ({ page }) => {
> 5  |     await page.goto('/login');
     |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/login
  6  |     await page.getByPlaceholder('请输入用户名').fill('admin');
  7  |     await page.getByPlaceholder('请输入密码').fill('admin123');
  8  |     await page.getByRole('button', { name: '登录' }).click();
  9  |     await page.waitForURL('**/dashboard');
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