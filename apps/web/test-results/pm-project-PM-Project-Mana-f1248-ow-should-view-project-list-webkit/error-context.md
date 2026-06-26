# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: pm-project.spec.ts >> PM Project Management Flow >> should view project list
- Location: e2e/pm-project.spec.ts:68:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=Test Project 1782424490284')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('text=Test Project 1782424490284')

```

```yaml
- banner:
  - paragraph: T
  - heading "TOPEMS" [level=6]
  - button "企业资源"
  - button "项目管理"
  - button "研发管理"
  - button "供应链"
  - button "客户关系"
  - button "AI助手"
  - button "地理信息"
  - button "人力资源"
  - button "即时通讯"
  - button "生产执行"
  - button "工作流"
  - button "仓储管理"
  - button "文档中心"
  - button "通知中心"
  - button "权限管理"
  - button "系统集成"
  - button "质量管理"
  - button "环境健康"
  - button "通知"
  - button
  - button "用户菜单": 陈
- text: 项目列表
- button
- text: 任务管理
- button
- text: 甘特图
- button
- text: 风险管理
- button
- text: 合同管理
- button
- text: 时间线
- button
- text: 报表分析
- button
- text: 资源管理
- button
- main:
  - navigation:
    - list:
      - listitem:
        - link "首页":
          - /url: /dashboard
      - listitem:
        - paragraph: 项目
  - heading "项目管理" [level=5]
  - paragraph: 管理所有类型的项目，跟踪进度和状态
  - button "刷新"
  - button "创建项目"
  - textbox "搜索项目名称或编号...": Test Project 1782424490284
  - text: 类型
  - combobox "类型"
  - text: 状态
  - combobox "状态"
  - button "刷新"
  - button "导出" [disabled]
  - table:
    - rowgroup:
      - row "# 项目名称 项目编码 类型 状态 进度 预算 开始日期 结束日期 操作 配置列":
        - columnheader:
          - checkbox
        - columnheader "#"
        - columnheader "项目名称"
        - columnheader "项目编码"
        - columnheader "类型"
        - columnheader "状态"
        - columnheader "进度"
        - columnheader "预算"
        - columnheader "开始日期"
        - columnheader "结束日期"
        - columnheader "操作"
        - columnheader "配置列":
          - button "配置列"
    - rowgroup:
      - row "📋 暂无数据 暂无数据，点击添加按钮创建新记录":
        - cell "📋 暂无数据 暂无数据，点击添加按钮创建新记录":
          - heading "📋" [level=3]
          - heading "暂无数据" [level=6]
          - paragraph: 暂无数据，点击添加按钮创建新记录
  - paragraph: 每页行数
  - combobox "每页行数": "10"
  - paragraph: 0-0 共 0 条
  - button "Go to previous page"
  - button "Go to next page" [disabled]
- contentinfo:
  - paragraph: © 2024 TOPEMS 化工新材料数字化平台
  - button "帮助中心"
  - button "使用文档"
  - button "联系支持"
- button "AI助手"
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
  17  |     await page.waitForURL('**/dashboard', { timeout: 15000 });
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
> 79  |     await expect(page.locator('text=' + testProject.name)).toBeVisible();
      |                                                            ^ Error: expect(locator).toBeVisible() failed
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
  118 |     }
  119 | 
  120 |     await page.waitForTimeout(1000);
  121 |   });
  122 | });
```