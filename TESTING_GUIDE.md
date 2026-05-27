# TOPEMS Testing Framework Guide

TOPEMS 系统的完整测试框架，包括后端 Rust 测试、前端 React 测试和性能测试。

## 目录结构

```
TOPEMS/
├── services/
│   └── backend/              # Rust 后端测试
│       ├── src/              # 源代码
│       ├── Cargo.toml        # Rust 依赖配置
│       └── tests/            # 测试目录
│           ├── unit/         # 单元测试
│           ├── integration/   # 集成测试
│           └── common/       # 测试工具
├── frontend/                 # React 前端测试
│   ├── src/
│   │   └── __tests__/       # Jest 单元测试
│   │       ├── components/  # 组件测试
│   │       ├── hooks/       # Hook 测试
│   │       └── utils/       # 工具函数测试
│   ├── e2e/                 # Playwright E2E 测试
│   ├── jest.config.js       # Jest 配置
│   └── playwright.config.ts # Playwright 配置
├── tests/
│   ├── fixtures/            # 测试数据
│   └── load/                # 性能测试
└── scripts/                 # 测试脚本
```

## 1. 环境设置

### 首次设置

运行测试环境设置脚本：

```bash
./scripts/setup-test-env.sh
```

该脚本将安装：
- Rust 测试依赖（cargo-tarpaulin）
- Frontend 测试依赖（Jest、Playwright）
- Playwright 浏览器
- k6 性能测试工具

### 手动安装依赖

#### Rust 依赖

```bash
cd services/backend
cargo fetch
```

#### Frontend 依赖

```bash
cd frontend
npm install
```

#### Playwright 浏览器

```bash
npx playwright install --with-deps
```

## 2. 后端测试（Rust）

### 2.1 运行测试

#### 运行所有测试

```bash
cd services/backend
cargo test
```

#### 运行单元测试

```bash
cargo test --test unit
```

#### 运行集成测试

```bash
cargo test --test integration
```

#### 运行特定模块测试

```bash
cargo test validation_tests
cargo test api_tests
```

### 2.2 测试覆盖率

#### 安装覆盖率工具

```bash
cargo install cargo-tarpaulin
```

#### 生成覆盖率报告

```bash
./scripts/run-test-coverage.sh
```

或手动运行：

```bash
cd services/backend
cargo tarpaulin --out html --out xml --fail-under 80
```

报告将生成在：
- HTML 报告：`coverage/index.html`
- XML 报告：`cobertura.xml`
- JSON 报告：`tarpaulin-report.json`

### 2.3 后端测试模块

#### 单元测试 (`tests/unit/`)

- `auth_tests.rs` - 认证模块测试
- `validation_tests.rs` - 验证逻辑测试
- `api_handler_tests.rs` - API 处理器测试
- `repository_tests.rs` - 数据仓库测试
- `service_tests.rs` - 服务层测试

#### 集成测试 (`tests/integration/`)

- `api_tests.rs` - API 端点测试
- `database_tests.rs` - 数据库操作测试
- `auth_flow_tests.rs` - 认证流程测试
- `workflow_tests.rs` - 工作流测试

#### 测试工具 (`tests/common/`)

- `test_client.rs` - HTTP 测试客户端
- `test_database.rs` - 测试数据库管理
- `mock_auth.rs` - Mock 认证
- `test_fixtures.rs` - 测试数据生成

## 3. 前端测试（React）

### 3.1 运行测试

#### 运行所有单元测试

```bash
cd frontend
npm test
```

#### 运行测试并监视变化

```bash
npm run test:watch
```

#### 运行带覆盖率的测试

```bash
npm run test:coverage
```

### 3.2 E2E 测试（Playwright）

#### 安装 Playwright

```bash
npx playwright install --with-deps
```

#### 运行 E2E 测试

```bash
cd frontend
npm run e2e
```

#### 交互模式运行 E2E 测试

```bash
npm run e2e:ui
```

#### 调试模式

```bash
npm run e2e:debug
```

### 3.3 前端测试模块

#### 组件测试 (`src/__tests__/components/`)

- `LoginPage.test.tsx` - 登录页面测试
- `DashboardPage.test.tsx` - 仪表盘测试
- `Rspage.test.tsx` - 研发页面测试
- `Limspage.test.tsx` - 质检页面测试

#### Hook 测试 (`src/__tests__/hooks/`)

- `useAuth.test.ts` - 认证 Hook 测试
- `usePermission.test.ts` - 权限 Hook 测试

#### 工具函数测试 (`src/__tests__/utils/`)

- `validation.test.ts` - 验证函数测试
- `formatters.test.ts` - 格式化函数测试

#### E2E 测试 (`e2e/`)

- `auth.spec.ts` - 登录登出测试
- `navigation.spec.ts` - 导航测试
- `rs_page.spec.ts` - RS 页面测试
- `lims_page.spec.ts` - LIMS 页面测试
- `workflows.spec.ts` - 工作流测试

## 4. 性能测试（k6）

### 4.1 运行性能测试

#### 交互式选择

```bash
./scripts/run-performance-tests.sh
```

#### 单独运行测试

```bash
# API 负载测试
k6 run tests/load/api-load-test.js

# 页面加载测试
k6 run tests/load/page-load-test.js

# 并发用户测试
k6 run tests/load/concurrent-users-test.js
```

### 4.2 性能基准

#### API 响应时间

- 平均响应时间：< 100ms
- 中位数响应时间：< 80ms
- 95 百分位：< 200ms
- 99 百分位：< 500ms

#### 页面加载时间

- 首次内容绘制 (FCP)：< 1.5s
- 最大内容绘制 (LCP)：< 3s
- 可交互时间 (TTI)：< 3s
- 累计布局偏移 (CLS)：< 0.1

#### 并发用户

- 正常负载：> 100 用户
- 峰值负载：> 500 用户

### 4.3 性能测试场景

#### Smoke Test（烟雾测试）

```javascript
// 在 k6 配置中
scenarios: {
  smoke: {
    executor: 'constant-vus',
    vus: 10,
    duration: '30s',
  },
}
```

#### Load Test（负载测试）

```javascript
scenarios: {
  load: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '30s', target: 50 },
      { duration: '1m', target: 100 },
      { duration: '30s', target: 0 },
    ],
  },
}
```

#### Stress Test（压力测试）

```javascript
scenarios: {
  stress: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '30s', target: 100 },
      { duration: '1m', target: 200 },
      { duration: '30s', target: 0 },
    ],
  },
}
```

#### Spike Test（峰值测试）

```javascript
scenarios: {
  spike: {
    executor: 'spike',
    stages: [
      { duration: '10s', target: 100 },
      { duration: '1m', target: 500 },
      { duration: '10s', target: 0 },
    ],
  },
}
```

## 5. 测试数据管理

### 5.1 测试数据文件

测试数据位于 `tests/fixtures/` 目录：

- `test-data.json` - 通用测试数据
- `sample-users.json` - 测试用户数据
- `test-database-migration.sql` - 数据库迁移脚本

### 5.2 测试用户

默认测试用户：

| 用户名 | 密码 | 角色 | 权限 |
|--------|------|------|------|
| admin | admin123 | 管理员 | 全部权限 |
| user | user123 | 用户 | 读写权限 |
| guest | guest123 | 访客 | 只读权限 |

### 5.3 使用测试数据

在测试中使用测试数据：

```javascript
import testData from '../tests/fixtures/test-data.json';

test('uses test data', () => {
  const user = testData.test_users[0];
  expect(user.username).toBe('admin');
});
```

## 6. 测试覆盖率要求

### 6.1 覆盖率目标

| 类别 | 目标覆盖率 |
|------|----------|
| 后端 Rust | > 80% |
| 前端组件 | > 70% |
| 关键路径 | 100% |

### 6.2 查看覆盖率报告

#### 后端覆盖率

```bash
cd services/backend
cargo tarpaulin --out html
open coverage/index.html
```

#### 前端覆盖率

```bash
cd frontend
npm run test:coverage
open coverage/index.html
```

## 7. 常用测试命令

### 快速运行所有测试

```bash
./scripts/run-all-tests.sh
```

### 仅运行后端测试

```bash
cd services/backend && cargo test
```

### 仅运行前端测试

```bash
cd frontend && npm test
```

### 仅运行 E2E 测试

```bash
cd frontend && npm run e2e
```

### 仅运行性能测试

```bash
./scripts/run-performance-tests.sh
```

### 生成所有覆盖率报告

```bash
./scripts/run-test-coverage.sh
./scripts/run-frontend-coverage.sh
```

## 8. 调试技巧

### 8.1 前端测试调试

```bash
# 交互式运行测试
cd frontend
npm test -- --watch

# 运行特定测试文件
npm test -- LoginPage.test.tsx

# 运行特定测试
npm test -- --testNamePattern="renders login page"
```

### 8.2 E2E 测试调试

```bash
# 使用 Playwright UI
npm run e2e:ui

# 调试模式
npm run e2e:debug

# 只运行单个测试
npx playwright test auth.spec.ts --grep "successful login"
```

### 8.3 性能测试调试

```bash
# 详细输出
k6 run tests/load/api-load-test.js --verbose

# 只运行一个 VU
k6 run tests/load/api-load-test.js --vus 1 --duration 10s
```

## 9. CI/CD 集成

### 9.1 GitHub Actions 示例

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup
        run: ./scripts/setup-test-env.sh
        
      - name: Backend Tests
        run: cd services/backend && cargo test
        
      - name: Frontend Tests
        run: cd frontend && npm test
        
      - name: E2E Tests
        run: cd frontend && npm run e2e
```

## 10. 常见问题

### 10.1 测试超时

如果测试超时，可以增加超时时间：

```javascript
// Playwright
test.setTimeout(60000);

// Jest
jest.setTimeout(60000);
```

### 10.2 数据库连接问题

确保测试数据库正在运行：

```bash
docker-compose up -d postgres
```

### 10.3 Playwright 浏览器问题

重新安装 Playwright 浏览器：

```bash
npx playwright install --with-deps
```

## 11. 最佳实践

1. **测试隔离**：每个测试应该独立运行，不依赖其他测试
2. **测试命名**：使用描述性的测试名称
3. **Mock 外部依赖**：API 调用、数据库等应该 mock
4. **覆盖率目标**：保持高覆盖率，特别是关键路径
5. **定期运行**：将测试集成到 CI/CD 流程中
6. **性能监控**：定期运行性能测试，监控性能变化
7. **测试数据**：使用真实的测试数据，避免硬编码

## 12. 获取帮助

- 查阅 [Jest 文档](https://jestjs.io/docs/getting-started)
- 查阅 [Playwright 文档](https://playwright.dev/docs/intro)
- 查阅 [k6 文档](https://k6.io/docs/)
- 查阅 [Rust 测试文档](https://doc.rust-lang.org/rust-by-example/testing.html)
