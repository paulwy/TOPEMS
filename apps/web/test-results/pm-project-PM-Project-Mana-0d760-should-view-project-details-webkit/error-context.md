# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: pm-project.spec.ts >> PM Project Management Flow >> should view project details
- Location: e2e/pm-project.spec.ts:82:3

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
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | test.describe('PM Project Management Flow', () => {
  4   |   const testProject = {
  5   |     name: 'Test Project ' + Date.now(),
  6   |     description: 'This is a test project description',
  7   |     manager: '项目经理',
  8   |     status: '进行中',
  9   |     priority: '高',
  10  |   };
  11  | 
  12  |   test.beforeEach(async ({ page }) => {
  13  |     await page.goto('/login');
  14  |     await page.getByPlaceholder('请输入用户名').fill('admin');
  15  |     await page.getByPlaceholder('请输入密码').fill('admin123');
  16  |     await page.getByRole('button', { name: '登录' }).click();
> 17  |     await page.waitForURL('**/dashboard', { timeout: 15000 });
      |                ^ TimeoutError: page.waitForURL: Timeout 15000ms exceeded.
  18  |   });
  19  | 
  20  |   test('should navigate to project management page', async ({ page }) => {
  21  |     await page.goto('/pm/projects');
  22  |     await page.waitForLoadState('networkidle');
  23  |     await expect(page).toHaveURL(/pm\/projects/);
  24  |   });
  25  | 
  26  |   test('should create a new project', async ({ page }) => {
  27  |     await page.goto('/pm/projects');
  28  |     await page.waitForLoadState('networkidle');
  29  | 
  30  |     const addButton = page.getByRole('button', { name: '新增' });
  31  |     if (await addButton.isVisible()) {
  32  |       await addButton.click();
  33  |     } else {
  34  |       await page.getByRole('button', { name: '创建项目' }).click();
  35  |     }
  36  | 
  37  |     await page.waitForLoadState('networkidle');
  38  | 
  39  |     await page.getByPlaceholder('请输入项目名称').fill(testProject.name);
  40  |     await page.getByPlaceholder('请输入项目描述').fill(testProject.description);
  41  | 
  42  |     const managerSelect = page.getByLabel('项目经理');
  43  |     if (await managerSelect.isVisible()) {
  44  |       await managerSelect.selectOption(testProject.manager);
  45  |     }
  46  | 
  47  |     const statusSelect = page.getByLabel('状态');
  48  |     if (await statusSelect.isVisible()) {
  49  |       await statusSelect.selectOption(testProject.status);
  50  |     }
  51  | 
  52  |     const prioritySelect = page.getByLabel('优先级');
  53  |     if (await prioritySelect.isVisible()) {
  54  |       await prioritySelect.selectOption(testProject.priority);
  55  |     }
  56  | 
  57  |     const saveButton = page.getByRole('button', { name: '保存' });
  58  |     if (await saveButton.isVisible()) {
  59  |       await saveButton.click();
  60  |     } else {
  61  |       await page.getByRole('button', { name: '提交' }).click();
  62  |     }
  63  | 
  64  |     await page.waitForTimeout(2000);
  65  |     await expect(page).toHaveURL(/pm\/projects/);
  66  |   });
  67  | 
  68  |   test('should view project list', async ({ page }) => {
  69  |     await page.goto('/pm/projects');
  70  |     await page.waitForLoadState('networkidle');
  71  | 
  72  |     const searchInput = page.getByPlaceholder('搜索项目');
  73  |     if (await searchInput.isVisible()) {
  74  |       await searchInput.fill(testProject.name);
  75  |       await page.keyboard.press('Enter');
  76  |     }
  77  | 
  78  |     await page.waitForTimeout(1000);
  79  |     await expect(page.locator('text=' + testProject.name)).toBeVisible();
  80  |   });
  81  | 
  82  |   test('should view project details', async ({ page }) => {
  83  |     await page.goto('/pm/projects');
  84  |     await page.waitForLoadState('networkidle');
  85  | 
  86  |     const searchInput = page.getByPlaceholder('搜索项目');
  87  |     if (await searchInput.isVisible()) {
  88  |       await searchInput.fill(testProject.name);
  89  |       await page.keyboard.press('Enter');
  90  |     }
  91  | 
  92  |     await page.waitForTimeout(1000);
  93  | 
  94  |     const rows = page.locator('tbody tr');
  95  |     const rowCount = await rows.count();
  96  |     if (rowCount > 0) {
  97  |       const firstRow = rows.first();
  98  |       const viewButton = firstRow.getByRole('button', { name: '查看' });
  99  |       if (await viewButton.isVisible()) {
  100 |         await viewButton.click();
  101 |       } else {
  102 |         await firstRow.click();
  103 |       }
  104 | 
  105 |       await page.waitForLoadState('networkidle');
  106 |       await expect(page).toHaveURL(/pm\/projects\/detail/);
  107 |       await expect(page.locator('text=' + testProject.name)).toBeVisible();
  108 |     }
  109 |   });
  110 | 
  111 |   test('should filter projects by status', async ({ page }) => {
  112 |     await page.goto('/pm/projects');
  113 |     await page.waitForLoadState('networkidle');
  114 | 
  115 |     const statusFilter = page.getByLabel('状态');
  116 |     if (await statusFilter.isVisible()) {
  117 |       await statusFilter.selectOption(testProject.status);
```