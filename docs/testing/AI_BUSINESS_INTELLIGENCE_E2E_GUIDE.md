# AI 业务智能 - 端到端测试指南

## 概述

本文档描述了 AI 业务智能模块的端到端（E2E）测试，包括测试环境配置、测试用例说明、运行方法和最佳实践。

## 测试文件

| 文件 | 测试数 | 描述 |
|------|--------|------|
| `ai-business-copilot.spec.ts` | 15 | 业务 Copilot 页面功能测试 |
| `ai-governance-dashboard.spec.ts` | 20 | 治理仪表盘页面功能测试 |
| `ai-business-intelligence-e2e.spec.ts` | 12 | 完整业务流程端到端测试 |
| **总计** | **47** | |

## 测试环境

### 前置条件

1. **Node.js** >= 20.0.0
2. **pnpm** >= 9.0.0
3. **Playwright** 已安装（`pnpm exec playwright install`）
4. **后端服务** 运行在 `http://localhost:8080`
5. **前端服务** 运行在 `http://localhost:3001`
6. **测试账号** 已配置（在 `e2e/utils/testUtils.ts` 中）

### 环境变量

```bash
# 前端服务地址
BASE_URL=http://localhost:3001

# 后端 API 地址
API_BASE_URL=http://localhost:8080/api

# 测试账号
TEST_USERNAME=admin
TEST_PASSWORD=admin123
```

## 运行测试

### 1. 启动服务

```bash
# 启动后端服务（在项目根目录）
cd /Users/xingzhai/TOPEMS
cargo run -p topems-unified-core

# 启动前端服务（在另一个终端）
cd /Users/xingzhai/TOPEMS/apps/web
pnpm dev --port 3001
```

### 2. 安装 Playwright 浏览器（首次运行）

```bash
cd /Users/xingzhai/TOPEMS/apps/web
pnpm exec playwright install chromium
```

### 3. 运行所有 AI 业务智能端到端测试

```bash
cd /Users/xingzhai/TOPEMS/apps/web

# 运行所有 AI 相关测试
pnpm exec playwright test --config=playwright.config.ts e2e/ui/ai-*.spec.ts

# 或者使用项目脚本
pnpm test:e2e:ai
```

### 4. 运行单个测试文件

```bash
# 业务 Copilot 测试
pnpm exec playwright test e2e/ui/ai-business-copilot.spec.ts

# 治理仪表盘测试
pnpm exec playwright test e2e/ui/ai-governance-dashboard.spec.ts

# 完整业务流程测试
pnpm exec playwright test e2e/ui/ai-business-intelligence-e2e.spec.ts
```

### 5. 运行特定测试用例

```bash
# 按测试名称过滤
pnpm exec playwright test e2e/ui/ai-business-copilot.spec.ts -g "页面应正确加载"

# 按项目（浏览器）过滤
pnpm exec playwright test e2e/ui/ai-*.spec.ts --project=chromium
```

### 6.  headed 模式运行（可视化）

```bash
pnpm exec playwright test e2e/ui/ai-business-copilot.spec.ts --headed
```

### 7. 查看测试报告

```bash
# 生成 HTML 报告
pnpm exec playwright show-report playwright-report/ui
```

## 测试用例说明

### 业务 Copilot 页面测试（15个）

#### 页面基础功能
1. **页面应正确加载并显示标题** - 验证页面标题和描述
2. **应显示业务模块选择器** - 验证 7 个业务模块都显示
3. **应能切换业务模块** - 验证模块切换功能
4. **应显示标签页导航** - 验证 4 个标签页都显示
5. **应能切换到智能表单标签页** - 验证标签页切换
6. **应能切换到文档智能标签页** - 验证标签页切换
7. **应能切换到治理仪表盘标签页** - 验证标签页切换
8. **智能对话标签页应显示输入框** - 验证对话输入区域
9. **智能表单应显示表单字段** - 验证表单字段渲染
10. **页面应响应式布局** - 验证桌面/平板/移动布局

#### 对话流程
11. **应能输入并发送消息** - 验证消息发送流程
12. **应能使用快捷操作** - 验证快捷操作按钮

#### 表单流程
13. **应能填写并提交表单** - 验证表单提交流程
14. **应能保存表单草稿** - 验证草稿保存功能

### 治理仪表盘页面测试（20个）

#### 页面基础功能
1. **页面应正确加载并显示标题** - 验证页面标题和描述
2. **应显示时间范围选择器** - 验证时间范围选择器
3. **应能切换时间范围** - 验证时间范围切换
4. **应显示治理评分** - 验证治理评分展示
5. **应显示治理等级** - 验证治理等级展示
6. **应显示关键指标卡片** - 验证关键指标展示
7. **应显示风险评估面板** - 验证风险评估展示
8. **应显示合规状态面板** - 验证合规状态展示
9. **应显示成本分析面板** - 验证成本分析展示
10. **应显示性能指标面板** - 验证性能指标展示
11. **应显示刷新按钮** - 验证刷新按钮
12. **点击刷新按钮应刷新数据** - 验证刷新功能
13. **应显示自动刷新开关** - 验证自动刷新开关
14. **应能切换自动刷新** - 验证自动刷新切换
15. **应显示最后更新时间** - 验证最后更新时间
16. **页面应响应式布局** - 验证响应式布局
17. **应能导出治理报告** - 验证报告导出功能
18. **应显示建议和改进项** - 验证建议展示

#### 数据加载测试
19. **页面加载时应显示加载状态** - 验证加载状态和 API 请求
20. **应能处理 API 错误** - 验证错误处理
21. **应能处理空数据** - 验证空数据状态

### 完整业务流程测试（12个）

#### 场景 1: 业务 Copilot 完整对话流程
1. **从模块选择到对话完成的完整流程** - 9 步完整流程
2. **多轮对话流程** - 验证多轮对话历史

#### 场景 2: 智能表单自动填充流程
3. **从表单选择到提交的完整流程** - 7 步完整流程
4. **表单验证流程** - 验证表单验证错误
5. **保存草稿流程** - 验证草稿保存

#### 场景 3: 文档智能处理流程
6. **从文档上传到分析完成的完整流程** - 9 步完整流程
7. **文档关键词搜索流程** - 验证文档搜索

#### 场景 4: 治理仪表盘监控流程
8. **从页面加载到数据导出的完整流程** - 15 步完整流程
9. **治理仪表盘自动刷新流程** - 验证自动刷新

#### 跨页面导航
10. **应能从业务 Copilot 导航到治理仪表盘** - 验证标签页导航
11. **应能直接访问治理仪表盘独立页面** - 验证直接访问

## 测试最佳实践

### 1. 测试隔离

- 每个测试用例使用独立的浏览器上下文
- 测试之间不共享状态
- 使用 `beforeEach` 进行测试初始化

### 2. 元素定位

- 优先使用 `role` 和 `name` 定位（可访问性优先）
- 其次使用 `text` 定位
- 避免使用 CSS 类名定位（容易变化）
- 对于复杂组件，使用 `data-testid` 属性

### 3. 等待策略

- 使用 `waitForLoadState('networkidle')` 等待网络空闲
- 使用 `waitForTimeout()` 进行短时间等待（避免过长）
- 使用 `waitForSelector()` 等待特定元素出现
- 避免使用固定的长时间等待

### 4. 错误处理

- 使用 `catch(() => false)` 处理可选元素的可见性检查
- 对于必须存在的元素，使用 `expect().toBeVisible()`
- 对于 API 错误，使用 `page.route()` 模拟错误响应

### 5. 测试数据

- 使用测试专用数据（如 "E2E 测试" 前缀）
- 避免修改生产数据
- 测试完成后清理测试数据

## 常见问题

### Q: 测试失败，提示 "page.goto: Timeout"

**A:** 确保前端服务已启动并运行在正确的端口。检查 `BASE_URL` 环境变量。

### Q: 测试失败，提示 "元素不可见"

**A:** 可能是页面加载较慢或元素选择器不正确。尝试增加等待时间或使用更精确的选择器。

### Q: 如何调试失败的测试？

**A:** 
1. 使用 `--headed` 模式运行测试，观察浏览器行为
2. 使用 `--debug` 模式逐步执行
3. 查看 `playwright-report/ui` 中的截图和视频
4. 使用 `page.pause()` 在测试中暂停

### Q: 如何只运行失败的测试？

**A:** 使用 `--last-failed` 参数：
```bash
pnpm exec playwright test --last-failed
```

## 持续集成

在 CI 环境中运行端到端测试：

```yaml
# GitHub Actions 示例
- name: Run AI E2E Tests
  run: |
    cd apps/web
    pnpm exec playwright install chromium
    pnpm exec playwright test e2e/ui/ai-*.spec.ts --project=chromium
  env:
    BASE_URL: http://localhost:3001
    CI: true
```

## 相关文档

- [联调测试计划](./AI_BUSINESS_INTEGRATION_TEST_PLAN.md)
- [API 文档](../DSH_BUSINESS_INTELLIGENCE_API.md)
- [工程化指南](../engineering/AI_ENGINEERING_GUIDE.md)
- [Playwright 官方文档](https://playwright.dev/docs/intro)
