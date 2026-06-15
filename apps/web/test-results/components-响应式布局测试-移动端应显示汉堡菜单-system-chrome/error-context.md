# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: components.spec.ts >> 响应式布局测试 >> 移动端应显示汉堡菜单
- Location: e2e/components.spec.ts:116:3

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
  57  |     await page.fill('input[name="username"]', 'admin');
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
> 120 |     await page.goto('/login');
      |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/login
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