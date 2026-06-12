# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: lims_page.spec.ts >> LIMS Page Tests >> searches samples
- Location: e2e/lims_page.spec.ts:72:3

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
  3  | test.describe('LIMS Page Tests', () => {
  4  |   test.beforeEach(async ({ page }) => {
> 5  |     await page.goto('/login');
     |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/login
  6  |     await page.getByPlaceholder('请输入用户名').fill('admin');
  7  |     await page.getByPlaceholder('请输入密码').fill('admin123');
  8  |     await page.getByRole('button', { name: '登录' }).click();
  9  |     await page.waitForURL('**/dashboard', { timeout: 15000 });
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