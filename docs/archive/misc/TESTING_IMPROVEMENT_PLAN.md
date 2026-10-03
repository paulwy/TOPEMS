# TOPEMS 测试完善方案

## 🎯 目标
完善测试覆盖，量化测试覆盖率，补充前端测试、性能测试和安全测试！

---

## 1. 添加测试覆盖率工具

### 📦 工具选择
**推荐工具**：`cargo-tarpaulin`
- 优点：Rust官方推荐，支持workspace，配置简单
- 备选：`cargo-llvm-cov`（更快，但是需要LLVM工具链）

### 🔧 安装步骤
```bash
# 安装cargo-tarpaulin
cargo install cargo-tarpaulin

# 运行测试覆盖率
cargo tarpaulin --workspace --out html --out lcov

# 查看报告
open tarpaulin-report.html
```

### ⚙️ 配置
在`Cargo.toml`中添加配置：
```toml
[package.metadata.tarpaulin]
exclude-files = [
    "src/main.rs",
    "src/tests/*",
    "**/tests/**",
]
```

### 📊 目标
- 单元测试覆盖率：≥70%
- 核心模块覆盖率：≥80%
- 公共库覆盖率：≥90%

---

## 2. 补充前端测试

### 📦 工具选择
**推荐工具**：
- 单元测试：`Vitest` + `@testing-library/react`
- E2E测试：`Playwright`

### 🔧 安装步骤
```bash
# 安装前端测试依赖
cd apps/web
pnpm add -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event
pnpm add -D @playwright/test

# 安装Playwright浏览器
npx playwright install
```

### 📝 测试方案
#### 2.1 组件单元测试
**测试范围**：
- 所有AI模块组件
- 所有表单组件
- 所有表格组件
- 所有导航组件

**示例测试**：
```tsx
// src/pages/ai/AiModelSettingsPage.test.tsx
import { render, screen } from '@testing-library/react';
import { AiModelSettingsPage } from './AiModelSettingsPage';

describe('AiModelSettingsPage', () => {
  it('renders correctly', () => {
    render(<AiModelSettingsPage />);
    expect(screen.getByText('AI模型设置')).toBeInTheDocument();
  });
});
```

#### 2.2 E2E测试
**测试范围**：
- 登录流程
- AI设置流程
- 数据列表页流程
- 表单提交流程

**示例测试**：
```ts
// e2e/ai-settings.spec.ts
import { test, expect } from '@playwright/test';

test('can update AI settings', async ({ page }) => {
  // 登录
  await page.goto('/login');
  await page.fill('input[name="username"]', 'admin');
  await page.fill('input[name="password"]', 'admin123');
  await page.click('button[type="submit"]');
  
  // 导航到AI设置
  await page.goto('/ai/settings');
  
  // 修改配置
  await page.fill('input[name="temperature"]', '0.8');
  await page.click('button:has-text("保存")');
  
  // 验证
  expect(page.getByText('保存成功')).toBeVisible();
});
```

### 📊 目标
- 组件测试覆盖率：≥60%
- 核心流程E2E测试：100%覆盖

---

## 3. 补充性能测试

### 📦 工具选择
**推荐工具**：
- API性能测试：`k6`
- 基准测试：`criterion`

### 🔧 安装步骤
```bash
# 安装k6
brew install k6

# 安装criterion
cargo install criterion
```

### 📝 测试方案
#### 3.1 API性能测试
**测试范围**：
- 登录API
- 列表查询API
- 详情查询API
- 数据创建API
- 数据更新API

**示例测试**：
```javascript
// tests/performance/api-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 10, // 10个虚拟用户
  duration: '30s', // 持续30秒
};

export default function () {
  // 登录
  const loginRes = http.post('http://localhost:8099/api/core/iam/auth/login', {
    username: 'admin',
    password: 'admin123',
  });
  check(loginRes, { 'login successful': (r) => r.status === 200 });
  
  const token = loginRes.json('data.access_token');
  
  // 测试MES订单列表
  const res = http.get('http://localhost:8099/api/mes/orders?page=1&page_size=20', {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  check(res, { 'status is 200': (r) => r.status === 200 });
  
  sleep(1);
}
```

#### 3.2 基准测试
**测试范围**：
- 数据库查询性能
- 公共库函数性能
- 序列化/反序列化性能

**示例测试**：
```rust
// benches/db_benchmark.rs
use criterion::{black_box, criterion_group, criterion_main, Criterion};
use topems_shared_db::decimal::big_decimal_to_f64;

fn benchmark_big_decimal_to_f64(c: &mut Criterion) {
    let decimal = rust_decimal::Decimal::from_str("12345.6789").unwrap();
    c.bench_function("big_decimal_to_f64", |b| {
        b.iter(|| big_decimal_to_f64(black_box(&decimal)))
    });
}

criterion_group!(benches, benchmark_big_decimal_to_f64);
criterion_main!(benches);
```

### 📊 目标
- API响应时间：P95 < 500ms
- 列表查询：P95 < 300ms
- 单用户并发：100用户无错误

---

## 4. 补充安全测试

### 📦 工具选择
**推荐工具**：
- 依赖漏洞扫描：`cargo audit`
- API安全测试：`OWASP ZAP`
- 认证授权测试：自定义测试

### 🔧 安装步骤
```bash
# 安装cargo-audit
cargo install cargo-audit

# 安装OWASP ZAP
brew install --cask zap
```

### 📝 测试方案
#### 4.1 依赖漏洞扫描
```bash
# 运行依赖漏洞扫描
cargo audit

# 自动修复可修复的漏洞
cargo audit fix
```

#### 4.2 API安全测试
**测试范围**：
- 认证绕过测试
- 授权越权测试
- SQL注入测试
- XSS测试
- CSRF测试

**示例测试**：
```rust
// tests/security/auth_test.rs
#[tokio::test]
async fn test_unauthorized_access() {
    // 测试没有token访问受保护API
    let res = reqwest::get("http://localhost:8099/api/mes/orders")
        .await
        .unwrap();
    assert_eq!(res.status(), 401);
}

#[tokio::test]
async fn test_tenant_isolation() {
    // 测试租户隔离
    let tenant1_token = login("tenant1", "admin", "admin123").await;
    let tenant2_token = login("tenant2", "admin", "admin123").await;
    
    // tenant1访问自己的订单
    let res1 = reqwest::Client::new()
        .get("http://localhost:8099/api/mes/orders")
        .header("Authorization", format!("Bearer {}", tenant1_token))
        .send()
        .await
        .unwrap();
    assert_eq!(res1.status(), 200);
    
    // tenant2访问tenant1的订单（应该404或者空列表）
    let res2 = reqwest::Client::new()
        .get("http://localhost:8099/api/mes/orders")
        .header("Authorization", format!("Bearer {}", tenant2_token))
        .send()
        .await
        .unwrap();
    // 应该看不到tenant1的数据
}
```

#### 4.3 RLS策略测试
**测试范围**：
- 验证RLS策略是否正确
- 验证租户隔离是否生效
- 验证权限控制是否正确

### 📊 目标
- 依赖漏洞：0个高危漏洞
- 认证绕过：0个漏洞
- 租户隔离：100%正确
- SQL注入：0个漏洞

---

## 🚀 实施计划

### 第一阶段（1周）：测试覆盖率
1. 安装cargo-tarpaulin
2. 运行测试覆盖率
3. 分析覆盖率报告
4. 补充核心模块的单元测试

### 第二阶段（2周）：前端测试
1. 安装Vitest和Testing Library
2. 编写核心组件测试
3. 安装Playwright
4. 编写核心流程E2E测试

### 第三阶段（1周）：性能测试
1. 安装k6
2. 编写API性能测试脚本
3. 运行性能测试
4. 优化慢查询

### 第四阶段（1周）：安全测试
1. 运行cargo audit
2. 修复依赖漏洞
3. 编写认证授权测试
4. 验证RLS策略

---

## 📊 预期成果

| 测试类型 | 完成前 | 完成后 |
|---------|--------|--------|
| 单元测试覆盖率 | 未知 | ≥70% |
| 前端组件测试 | 0个 | ≥50个 |
| E2E测试 | 0个 | ≥10个 |
| API性能测试 | 0个 | ≥20个 |
| 安全测试 | 0个 | ≥15个 |

---

## 🎉 总结

这个方案将帮助我们：
1. 量化测试覆盖率
2. 补充前端测试
3. 验证性能
4. 确保安全

完成后，项目将达到生产级标准！🚀
