# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: components.spec.ts >> 导航组件测试 >> 顶部导航应显示所有模块
- Location: e2e/components.spec.ts:55:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('input[name="username"]')

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
      - generic [ref=e31]:
        - generic [ref=e32]:
          - generic [ref=e33]: 用户名
          - generic [ref=e34]:
            - img [ref=e36]
            - textbox "用户名" [ref=e39]:
              - /placeholder: 请输入用户名
            - group:
              - generic: 用户名
        - generic [ref=e40]:
          - generic [ref=e41]: 密码
          - generic [ref=e42]:
            - img [ref=e44]
            - textbox "密码" [ref=e47]:
              - /placeholder: 请输入密码
            - button [ref=e48]:
              - img [ref=e49]
            - group:
              - generic: 密码
        - generic [ref=e52]:
          - generic [ref=e55]: 大写字母
          - generic [ref=e58]: 小写字母
          - generic [ref=e61]: 数字
          - generic [ref=e64]: 特殊字符
        - button "登录" [ref=e65] [cursor=pointer]
      - button "没有账号？立即注册" [ref=e67]
      - generic [ref=e69]: "演示账号: admin / admin123 (管理员) | user / user123 (普通员工)"
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | test.describe('首页组件测试', () => {
  4   |   test.beforeEach(async ({ page }) => {
  5   |     // 登录
  6   |     await page.goto('/login');
  7   |     await page.fill('input[name="username"]', 'admin');
  8   |     await page.fill('input[name="password"]', 'admin123');
  9   |     await page.click('button[type="submit"]');
  10  |     await page.waitForURL('/dashboard');
  11  |   });
  12  | 
  13  |   test('首页应显示分区布局', async ({ page }) => {
  14  |     await page.goto('/dashboard');
  15  | 
  16  |     // 检查今日概览分区
  17  |     await expect(page.locator('text=今日概览')).toBeVisible();
  18  | 
  19  |     // 检查快捷入口分区
  20  |     await expect(page.locator('text=快捷入口')).toBeVisible();
  21  | 
  22  |     // 检查待办事项分区
  23  |     await expect(page.locator('text=待办事项')).toBeVisible();
  24  | 
  25  |     // 检查模块导航分区
  26  |     await expect(page.locator('text=模块导航')).toBeVisible();
  27  |   });
  28  | 
  29  |   test('服务状态监测组件应显示', async ({ page }) => {
  30  |     await page.goto('/dashboard');
  31  | 
  32  |     // 检查服务状态监测分区
  33  |     await expect(page.locator('text=服务状态监测')).toBeVisible();
  34  | 
  35  |     // 检查刷新按钮
  36  |     await expect(page.locator('[data-testid="service-refresh-button"]')).toBeVisible();
  37  |   });
  38  | 
  39  |   test('分区应支持折叠展开', async ({ page }) => {
  40  |     await page.goto('/dashboard');
  41  | 
  42  |     // 找到快捷入口分区
  43  |     const section = page.locator('text=快捷入口').locator('..');
  44  | 
  45  |     // 点击折叠按钮
  46  |     const collapseButton = section.locator('button').first();
  47  |     await collapseButton.click();
  48  | 
  49  |     // 验证内容已折叠（不可见）
  50  |     // 注意：这取决于具体实现
  51  |   });
  52  | });
  53  | 
  54  | test.describe('导航组件测试', () => {
  55  |   test('顶部导航应显示所有模块', async ({ page }) => {
  56  |     await page.goto('/login');
> 57  |     await page.fill('input[name="username"]', 'admin');
      |                ^ Error: page.fill: Test timeout of 30000ms exceeded.
  58  |     await page.fill('input[name="password"]', 'admin123');
  59  |     await page.click('button[type="submit"]');
  60  |     await page.waitForURL('/dashboard');
  61  | 
  62  |     // 检查导航项
  63  |     await expect(page.locator('text=首页')).toBeVisible();
  64  |     await expect(page.locator('text=人力')).toBeVisible();
  65  |     await expect(page.locator('text=客户')).toBeVisible();
  66  |     await expect(page.locator('text=项目')).toBeVisible();
  67  |   });
  68  | 
  69  |   test('导航下拉菜单应正常工作', async ({ page }) => {
  70  |     await page.goto('/login');
  71  |     await page.fill('input[name="username"]', 'admin');
  72  |     await page.fill('input[name="password"]', 'admin123');
  73  |     await page.click('button[type="submit"]');
  74  |     await page.waitForURL('/dashboard');
  75  | 
  76  |     // 点击人力导航
  77  |     await page.click('text=人力');
  78  | 
  79  |     // 检查下拉菜单
  80  |     await expect(page.locator('text=员工')).toBeVisible();
  81  |     await expect(page.locator('text=部门')).toBeVisible();
  82  |   });
  83  | 
  84  |   test('模块Tab应正常切换', async ({ page }) => {
  85  |     await page.goto('/login');
  86  |     await page.fill('input[name="username"]', 'admin');
  87  |     await page.fill('input[name="password"]', 'admin123');
  88  |     await page.click('button[type="submit"]');
  89  |     await page.waitForURL('/dashboard');
  90  | 
  91  |     // 进入人力模块
  92  |     await page.click('text=人力');
  93  |     await page.click('text=员工');
  94  | 
  95  |     // 检查Tab是否显示
  96  |     // 注意：这取决于具体实现
  97  |   });
  98  | });
  99  | 
  100 | test.describe('响应式布局测试', () => {
  101 |   test('桌面端应显示完整导航', async ({ page }) => {
  102 |     // 设置桌面端视口
  103 |     await page.setViewportSize({ width: 1280, height: 720 });
  104 | 
  105 |     await page.goto('/login');
  106 |     await page.fill('input[name="username"]', 'admin');
  107 |     await page.fill('input[name="password"]', 'admin123');
  108 |     await page.click('button[type="submit"]');
  109 |     await page.waitForURL('/dashboard');
  110 | 
  111 |     // 检查导航是否完整显示
  112 |     await expect(page.locator('text=首页')).toBeVisible();
  113 |     await expect(page.locator('text=人力')).toBeVisible();
  114 |   });
  115 | 
  116 |   test('移动端应显示汉堡菜单', async ({ page }) => {
  117 |     // 设置移动端视口
  118 |     await page.setViewportSize({ width: 375, height: 667 });
  119 | 
  120 |     await page.goto('/login');
  121 |     await page.fill('input[name="username"]', 'admin');
  122 |     await page.fill('input[name="password"]', 'admin123');
  123 |     await page.click('button[type="submit"]');
  124 |     await page.waitForURL('/dashboard');
  125 | 
  126 |     // 检查汉堡菜单按钮
  127 |     const menuButton = page.locator('[data-testid="mobile-menu-button"]');
  128 |     if (await menuButton.isVisible()) {
  129 |       await menuButton.click();
  130 |       // 检查Drawer是否打开
  131 |       await expect(page.locator('[data-testid="mobile-drawer"]')).toBeVisible();
  132 |     }
  133 |   });
  134 | });
  135 | 
  136 | test.describe('主题切换测试', () => {
  137 |   test('应支持主题切换', async ({ page }) => {
  138 |     await page.goto('/login');
  139 |     await page.fill('input[name="username"]', 'admin');
  140 |     await page.fill('input[name="password"]', 'admin123');
  141 |     await page.click('button[type="submit"]');
  142 |     await page.waitForURL('/dashboard');
  143 | 
  144 |     // 检查主题切换按钮
  145 |     const themeButton = page.locator('[data-testid="theme-toggle-button"]');
  146 |     if (await themeButton.isVisible()) {
  147 |       // 点击切换主题
  148 |       await themeButton.click();
  149 | 
  150 |       // 验证主题已切换（检查背景色变化）
  151 |       // 注意：这取决于具体实现
  152 |     }
  153 |   });
  154 | });
```