# TOPEMS 集成测试指南

## 概述

本文档说明如何在 TOPEMS 项目中编写和运行集成测试，确保服务间数据流转的正确性。

## 集成测试架构

### 测试金字塔

```
        ╱╲
       ╱  ╲         E2E 测试 (少量)
      ╱────╲
     ╱      ╲       集成测试 (适量)
    ╱────────╲
   ╱          ╲     单元测试 (大量)
  ╱────────────╲
```

### 测试分层

| 层级 | 范围 | 工具 | 速度 |
|------|------|------|------|
| 单元测试 | 函数/方法 | cargo test, jest | 快 |
| 集成测试 | 服务内模块 | cargo test, jest | 中 |
| API 测试 | 单个服务 API | curl, Postman, K6 | 中 |
| E2E 测试 | 跨服务 | Playwright, Cypress | 慢 |

---

## 集成测试框架

### 后端 (Rust)

#### 依赖配置

```toml
# Cargo.toml
[dev-dependencies]
tokio = { version = "1", features = ["full"] }
axum-test = "13"
serde_json = "1"
reqwest = { version = "0.11", features = ["json"] }
testcontainers = "0.15"
testcontainers-modules = { version = "0.4", features = ["postgres", "redis"] }
sqlx = { version = "0.7", features = ["runtime-tokio-rustls", "postgres", "uuid", "chrono"] }
```

#### 测试设置

```rust
// tests/common/mod.rs
use sqlx::PgPool;
use testcontainers::*;

pub struct TestApp {
    pub app: axum::Router,
    pub pool: PgPool,
    pub redis: redis::Client,
}

impl TestApp {
    pub async fn new() -> Self {
        // 启动测试容器
        let docker = clients::Cli::default();
        let postgres = docker.run(images::postgres::Postgres::default());
        let redis = docker.run(images::redis::Redis::default());
        
        // 创建连接池
        let pg_url = format!("postgres://postgres:postgres@localhost:{}/postgres", postgres.get_host_port(5432).unwrap());
        let pool = PgPool::connect(&pg_url).await.unwrap();
        
        // 运行迁移
        sqlx::migrate!("./migrations").run(&pool).await.unwrap();
        
        // 构建应用
        let app = create_app(pool.clone(), redis_client.clone()).await;
        
        Self { app, pool, redis: redis_client }
    }
    
    pub async fn cleanup(&self) {
        // 清理数据
        sqlx::query("TRUNCATE TABLE users, employees, etc")
            .execute(&self.pool)
            .await
            .unwrap();
    }
}
```

#### API 集成测试

```rust
// tests/api/hrm_employees_test.rs
use axum::http::{Request, StatusCode};
use tower::ServiceExt;
use serde_json::json;

#[tokio::test]
async fn test_create_employee() {
    let app = TestApp::new().await;
    
    // 登录获取 token
    let login_response = app.app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/iam/auth/login")
                .header("content-type", "application/json")
                .body(Body::from(json!({
                    "username": "admin",
                    "password": "admin123"
                }).to_string()))
                .unwrap()
        )
        .await
        .unwrap();
    
    let body: serde_json::Value = serde_json::from_slice(
        &axum::body::to_bytes(login_response.into_body(), 1000).await.unwrap()
    ).unwrap();
    let token = body["data"]["token"].as_str().unwrap();
    
    // 创建员工
    let response = app.app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/hrm/employees")
                .header("authorization", format!("Bearer {}", token))
                .header("content-type", "application/json")
                .body(Body::from(json!({
                    "name": "张三",
                    "email": "zhangsan@example.com",
                    "department_id": 1
                }).to_string()))
                .unwrap()
        )
        .await
        .unwrap();
    
    assert_eq!(response.status(), StatusCode::CREATED);
    
    app.cleanup().await;
}
```

#### 跨服务集成测试

```rust
// tests/integration/scm_wms_srm_test.rs
/// 测试 SCM-WMS-SRM 数据同步
#[tokio::test]
async fn test_scm_wms_data_sync() {
    let scm_app = start_service("scm", 8040).await;
    let wms_app = start_service("wms", 8041).await;
    let srm_app = start_service("srm", 8042).await;
    
    let token = login(&scm_app).await;
    
    // 1. SCM 创建采购订单
    let po = create_purchase_order(&scm_app, &token, json!({
        "supplier_id": 1,
        "items": [{"product_id": 1, "quantity": 100}]
    })).await;
    
    // 2. 验证 SRM 收到通知
    tokio::time::sleep(Duration::from_millis(500)).await;
    let notifications = get_notifications(&srm_app, &token).await;
    assert!(notifications.iter().any(|n| n.message.contains("采购订单")));
    
    // 3. SRM 确认订单
    confirm_order(&srm_app, &token, po.id).await;
    
    // 4. 验证 SCM 状态更新
    tokio::time::sleep(Duration::from_millis(500)).await;
    let updated_po = get_purchase_order(&scm_app, &token, po.id).await;
    assert_eq!(updated_po.status, "confirmed");
    
    // 5. 验证 WMS 创建入库单
    let stock_in = get_stock_in_by_po(&wms_app, &token, po.id).await;
    assert!(stock_in.is_some());
}
```

---

### 前端 (TypeScript)

#### 测试配置

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
    },
  },
});
```

#### 组件测试

```typescript
// tests/components/EmployeeList.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { EmployeeList } from '@/components/EmployeeList';

const server = setupServer(
  rest.get('/api/hrm/employees', (req, res, ctx) => {
    return res(ctx.json({
      code: 200,
      data: {
        list: [
          { id: 1, name: '张三', department: '研发部' },
          { id: 2, name: '李四', department: '产品部' },
        ],
        total: 2
      }
    }));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('EmployeeList', () => {
  it('renders employee list', async () => {
    render(<EmployeeList />);
    
    await waitFor(() => {
      expect(screen.getByText('张三')).toBeInTheDocument();
      expect(screen.getByText('李四')).toBeInTheDocument();
    });
  });
  
  it('handles API error', async () => {
    server.use(
      rest.get('/api/hrm/employees', (req, res, ctx) => {
        return res(ctx.status(500));
      })
    );
    
    render(<EmployeeList />);
    
    await waitFor(() => {
      expect(screen.getByText('加载失败')).toBeInTheDocument();
    });
  });
});
```

#### E2E 测试 (Playwright)

```typescript
// tests/e2e/login.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test('successful login', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // 填写表单
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'admin123');
    
    // 提交
    await page.click('button[type="submit"]');
    
    // 验证跳转
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('text=欢迎')).toBeVisible();
  });
  
  test('failed login', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'wrong');
    
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=用户名或密码错误')).toBeVisible();
  });
});
```

---

## 关键集成测试场景

### 1. 统一认证集成

```rust
// tests/integration/unified_auth_test.rs
/// 测试所有服务通过 unified-core 进行认证
#[tokio::test]
async fn test_all_services_auth() {
    let services = vec![
        ("unified-core", 8000),
        ("erp", 8010),
        ("hrm", 8020),
        ("ai", 8064),
    ];
    
    let token = login_unified_core().await;
    
    for (name, port) in services {
        let response = reqwest::Client::new()
            .get(&format!("http://localhost:{}/api/health", port))
            .header("Authorization", format!("Bearer {}", token))
            .send()
            .await
            .unwrap();
        
        assert!(
            response.status().is_success(),
            "{} service auth failed", name
        );
    }
}
```

### 2. 质量管理全流程

```rust
// tests/integration/qms_workflow_test.rs
/// QMS-LIMS-EHS 数据联动测试
#[tokio::test]
async fn test_quality_workflow() {
    let qms = start_service("qms", 8050).await;
    let lims = start_service("lims", 8051).await;
    let ehs = start_service("ehs", 8052).await;
    
    let token = login().await;
    
    // 1. QMS 创建质量标准
    let standard = create_standard(&qms, &token, json!({
        "name": "原材料检测标准",
        "items": [{"name": "纯度", "min": 99.0, "max": 100.0}]
    })).await;
    
    // 2. LIMS 创建检测任务
    let test = create_test(&lims, &token, json!({
        "standard_id": standard.id,
        "sample_id": 1
    })).await;
    
    // 3. 提交不合格结果
    submit_result(&lims, &token, test.id, json!({
        "value": 95.0,  // 低于标准
        "passed": false
    })).await;
    
    // 4. 验证 QMS 自动创建不合格项
    tokio::time::sleep(Duration::from_millis(500)).await;
    let ncrs = get_nonconformances(&qms, &token).await;
    assert!(ncrs.iter().any(|n| n.test_id == test.id));
    
    // 5. 验证 EHS 收到环境告警
    let alerts = get_alerts(&ehs, &token).await;
    assert!(!alerts.is_empty());
}
```

### 3. 供应链数据同步

```rust
// tests/integration/scm_workflow_test.rs
/// SCM-WMS-SRM 数据同步测试
#[tokio::test]
async fn test_supply_chain_sync() {
    let scm = start_service("scm", 8040).await;
    let wms = start_service("wms", 8041).await;
    let srm = start_service("srm", 8042).await;
    
    let token = login().await;
    
    // 1. 创建采购订单
    let po = create_po(&scm, &token, json!({
        "supplier_id": 1,
        "items": [{"product_id": 1, "quantity": 100, "price": 50.0}]
    })).await;
    
    // 2. SRM 自动接收订单
    tokio::time::sleep(Duration::from_millis(500)).await;
    let srm_orders = get_orders(&srm, &token).await;
    assert!(srm_orders.iter().any(|o| o.id == po.id));
    
    // 3. 供应商发货
    ship_order(&srm, &token, po.id, json!({
        "tracking_no": "SF1234567890",
        "estimated_arrival": "2026-06-25"
    })).await;
    
    // 4. WMS 自动创建入库单
    tokio::time::sleep(Duration::from_millis(500)).await;
    let stock_ins = get_stock_ins(&wms, &token).await;
    let stock_in = stock_ins.iter().find(|s| s.po_id == po.id);
    assert!(stock_in.is_some());
    
    // 5. 完成入库
    complete_stock_in(&wms, &token, stock_in.unwrap().id, json!({
        "received_quantity": 100,
        "location": "A-01-01"
    })).await;
    
    // 6. 验证 SCM 库存更新
    tokio::time::sleep(Duration::from_millis(500)).await;
    let inventory = get_inventory(&scm, &token, 1).await;
    assert_eq!(inventory.quantity, 100);
}
```

---

## 测试数据管理

### 测试数据隔离

```rust
// 每个测试使用独立的 schema
async fn setup_test_db(test_name: &str) -> PgPool {
    let schema = format!("test_{}", test_name);
    let pool = create_pool().await;
    
    sqlx::query(&format!("CREATE SCHEMA IF NOT EXISTS {}", schema))
        .execute(&pool)
        .await
        .unwrap();
    
    sqlx::query(&format!("SET search_path TO {}", schema))
        .execute(&pool)
        .await
        .unwrap();
    
    run_migrations(&pool).await;
    seed_test_data(&pool).await;
    
    pool
}
```

### Fixtures

```rust
// tests/fixtures/mod.rs
pub fn employee_fixture() -> serde_json::Value {
    json!({
        "name": "张三",
        "email": "zhangsan@example.com",
        "phone": "13800138000",
        "department_id": 1,
        "position": "工程师",
        "hire_date": "2026-01-01"
    })
}

pub fn purchase_order_fixture() -> serde_json::Value {
    json!({
        "supplier_id": 1,
        "items": [
            {"product_id": 1, "quantity": 100, "price": 50.0},
            {"product_id": 2, "quantity": 50, "price": 100.0}
        ],
        "expected_delivery": "2026-07-01"
    })
}
```

---

## 性能测试

### K6 负载测试

```javascript
// tests/performance/login_test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 100 },
    { duration: '1m', target: 500 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const url = 'http://localhost:8000/api/iam/auth/login';
  const payload = JSON.stringify({
    username: 'admin',
    password: 'admin123',
  });
  const params = {
    headers: { 'Content-Type': 'application/json' },
  };
  
  const res = http.post(url, payload, params);
  
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });
  
  sleep(1);
}
```

---

## 持续集成

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
        ports:
          - 5432:5432
      redis:
        image: redis:7
        ports:
          - 6379:6379
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Install Rust
        uses: dtolnay/rust-toolchain@stable
      
      - name: Cache Cargo
        uses: actions/cache@v3
        with:
          path: ~/.cargo
          key: ${{ runner.os }}-cargo-${{ hashFiles('**/Cargo.lock') }}
      
      - name: Run unit tests
        run: cargo test --workspace
      
      - name: Run integration tests
        run: cargo test --workspace --test integration
      
      - name: Run service tests
        run: ./scripts/run-core-tests.sh
  
  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'pnpm'
      
      - run: pnpm install
      - run: pnpm test
      - run: pnpm test:e2e
```

---

## 测试最佳实践

### 1. 测试独立性

```rust
// ✅ 好的做法：每个测试独立
#[tokio::test]
async fn test_a() {
    let app = TestApp::new().await;  // 独立的测试环境
    // 测试逻辑
    app.cleanup().await;
}

// ❌ 不好的做法：测试间共享状态
static mut SHARED_STATE: Option<TestApp> = None;  // 反模式
```

### 2. 测试命名

```rust
// ✅ 清晰描述测试内容
#[test]
fn test_employee_creation_with_valid_data_succeeds() {}

#[test]
fn test_employee_creation_with_invalid_email_fails() {}

// ❌ 命名不清晰
#[test]
fn test1() {}
```

### 3. AAA 模式

```rust
#[test]
fn test_create_employee() {
    // Arrange - 准备
    let app = TestApp::new().await;
    let employee_data = employee_fixture();
    
    // Act - 执行
    let result = create_employee(&app, employee_data).await;
    
    // Assert - 断言
    assert!(result.is_ok());
    assert_eq!(result.unwrap().name, "张三");
}
```

### 4. 测试覆盖率目标

| 类型 | 目标覆盖率 |
|------|-----------|
| 业务逻辑 | > 80% |
| API 处理器 | > 70% |
| 数据模型 | > 60% |
| 工具函数 | > 90% |
| 整体项目 | > 70% |

---

## 常用命令

```bash
# 运行所有测试
cargo test --workspace
pnpm test

# 运行特定测试
cargo test test_create_employee
pnpm test EmployeeList

# 运行集成测试
cargo test --test integration
pnpm test:e2e

# 运行性能测试
k6 run tests/performance/login_test.js

# 查看覆盖率
cargo tarpaulin
pnpm test:coverage

# 监视模式
cargo watch -x test
pnpm test --watch
```

---

## 相关文档

- [API 文档](../api/README.md)
- [部署指南 - 监控](../deployment-guide.md#监控配置)
- [架构设计 - 测试策略](../architecture/overview.md)
- [故障排查 - 测试问题](../TROUBLESHOOTING.md)
