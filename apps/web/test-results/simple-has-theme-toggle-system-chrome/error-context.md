# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: simple.spec.ts >> has theme toggle
- Location: e2e/simple.spec.ts:12:1

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
> 13 |   await page.goto('/login');
     |              ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/login
  14 |   await expect(page.locator('button').filter({ hasText: /Theme|Dark|Light/i })).toBeVisible({ timeout: 5000 });
  15 | });
  16 | 
```