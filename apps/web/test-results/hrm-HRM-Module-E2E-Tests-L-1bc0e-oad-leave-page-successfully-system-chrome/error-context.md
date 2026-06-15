# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: hrm.spec.ts >> HRM Module E2E Tests >> Leave Management Tests >> should load leave page successfully
- Location: e2e/hrm.spec.ts:87:5

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
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | test.describe('HRM Module E2E Tests', () => {
  4   |   test.beforeEach(async ({ page }) => {
> 5   |     await page.goto('/login');
      |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/login
  6   |     await page.getByPlaceholder('请输入用户名').fill('admin');
  7   |     await page.getByPlaceholder('请输入密码').fill('admin123');
  8   |     await page.getByRole('button', { name: '登录' }).click();
  9   |     await page.waitForURL('**/dashboard', { timeout: 15000 });
  10  |   });
  11  | 
  12  |   test.describe('Navigation Tests', () => {
  13  |     test('should navigate to HRM employee page', async ({ page }) => {
  14  |       await page.goto('/hrm/employees');
  15  |       await page.waitForLoadState('networkidle');
  16  |     });
  17  | 
  18  |     test('should navigate to HRM positions page', async ({ page }) => {
  19  |       await page.goto('/hrm/positions');
  20  |       await page.waitForLoadState('networkidle');
  21  |     });
  22  | 
  23  |     test('should navigate to HRM leave page', async ({ page }) => {
  24  |       await page.goto('/hrm/leave');
  25  |       await expect(page).toHaveURL(/.*/, { timeout: 10000 });
  26  |     });
  27  | 
  28  |     test('should navigate to HRM contracts page', async ({ page }) => {
  29  |       await page.goto('/hrm/contracts');
  30  |       await expect(page).toHaveURL(/.*/, { timeout: 10000 });
  31  |     });
  32  | 
  33  |     test('should navigate to HRM recruitment page', async ({ page }) => {
  34  |       await page.goto('/hrm/recruitment');
  35  |       await expect(page).toHaveURL(/.*/, { timeout: 10000 });
  36  |     });
  37  | 
  38  |     test('should navigate to HRM payroll page', async ({ page }) => {
  39  |       await page.goto('/hrm/payroll');
  40  |       await expect(page).toHaveURL(/.*/, { timeout: 10000 });
  41  |     });
  42  | 
  43  |     test('should navigate to HRM performance page', async ({ page }) => {
  44  |       await page.goto('/hrm/performance');
  45  |       await expect(page).toHaveURL(/.*/, { timeout: 10000 });
  46  |     });
  47  | 
  48  |     test('should navigate to HRM attendance page', async ({ page }) => {
  49  |       await page.goto('/hrm/attendance');
  50  |       await expect(page).toHaveURL(/.*/, { timeout: 10000 });
  51  |     });
  52  | 
  53  |     test('should navigate to HRM training page', async ({ page }) => {
  54  |       await page.goto('/hrm/training');
  55  |       await expect(page).toHaveURL(/\/hrm\/training/);
  56  |     });
  57  | 
  58  |     test('should navigate to HRM reports page', async ({ page }) => {
  59  |       await page.goto('/hrm/reports');
  60  |       await expect(page).toHaveURL(/\/hrm\/reports/);
  61  |     });
  62  |   });
  63  | 
  64  |   test.describe('Employee Management Tests', () => {
  65  |     test('should load employee page successfully', async ({ page }) => {
  66  |       await page.goto('/hrm/employees');
  67  |       const pageTitle = await page.title();
  68  |       expect(pageTitle).toBeTruthy();
  69  |     });
  70  | 
  71  |     test('should have employee page layout elements', async ({ page }) => {
  72  |       await page.goto('/hrm/employees');
  73  |       await page.waitForLoadState('networkidle');
  74  |       expect(true).toBe(true);
  75  |     });
  76  |   });
  77  | 
  78  |   test.describe('Position Management Tests', () => {
  79  |     test('should load position page successfully', async ({ page }) => {
  80  |       await page.goto('/hrm/positions');
  81  |       const pageTitle = await page.title();
  82  |       expect(pageTitle).toBeTruthy();
  83  |     });
  84  |   });
  85  | 
  86  |   test.describe('Leave Management Tests', () => {
  87  |     test('should load leave page successfully', async ({ page }) => {
  88  |       await page.goto('/hrm/leave');
  89  |       const pageTitle = await page.title();
  90  |       expect(pageTitle).toBeTruthy();
  91  |     });
  92  |   });
  93  | 
  94  |   test.describe('Attendance Management Tests', () => {
  95  |     test('should load attendance page successfully', async ({ page }) => {
  96  |       await page.goto('/hrm/attendance');
  97  |       const pageTitle = await page.title();
  98  |       expect(pageTitle).toBeTruthy();
  99  |     });
  100 |   });
  101 | 
  102 |   test.describe('Payroll Management Tests', () => {
  103 |     test('should load payroll page successfully', async ({ page }) => {
  104 |       await page.goto('/hrm/payroll');
  105 |       const pageTitle = await page.title();
```