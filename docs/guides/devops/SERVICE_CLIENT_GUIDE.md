# TOPEMS 服务调用客户端使用指南

## 概述

TOPEMS 服务调用客户端库提供了统一的模块间通信机制，确保模块间通过 API 而不是直接访问数据库，实现了更好的架构解耦。

## 基本使用

### 环境变量配置

确保你的 .env 文件中有以下配置：

```env
HRM_SERVICE_URL=http://localhost:8011
IAM_SERVICE_URL=http://localhost:8000
PM_SERVICE_URL=http://localhost:8002
ERP_SERVICE_URL=http://localhost:8010
CRM_SERVICE_URL=http://localhost:8012
```

### HRM 服务客户端

```rust
use topems_shared::{create_hrm_client, Employee, Department, Company};

// 创建 HRM 客户端
let hrm_client = create_hrm_client()?;

// 检查健康状态
let is_healthy = hrm_client.get_health().await?;

// 获取员工
let employee: Employee = hrm_client.get_employee(employee_id).await?;

// 获取部门
let department: Department = hrm_client.get_department(department_id).await?;

// 获取公司
let company: Company = hrm_client.get_company(company_id).await?;

// 列出所有员工
let employees: Vec<Employee> = hrm_client.list_employees().await?;
```

### IAM 服务客户端

```rust
use topems_shared::{create_iam_client, User};

// 创建 IAM 客户端
let iam_client = create_iam_client()?;

// 检查健康状态
let is_healthy = iam_client.get_health().await?;

// 获取用户
let user: User = iam_client.get_user(user_id).await?;

// 列出所有用户
let users: Vec<User> = iam_client.list_users().await?;
```

### 基础客户端（自定义服务）

```rust
use topems_shared::service_client::BaseServiceClient;

// 创建自定义服务客户端
let client = BaseServiceClient::new("http://localhost:8002")?;

// 发起 GET 请求
let result: serde_json::Value = client.get("/api/v1/projects").await?;

// 发起 POST 请求
let project = serde_json::json!({ "name": "New Project" });
let result: serde_json::Value = client.post("/api/v1/projects", &project).await?;
```

## 架构规范

### 数据所有权

| 数据领域 | 负责模块 | 说明 |
|---------|---------|------|
| 员工、部门、公司 | HRM | 唯一数据源 |
| 项目、项目合同 | PM | 独立管理 |
| 客户、商机 | CRM | 独立管理 |
| 资产、财务 | ERP | 仅管理自身数据 |

### 禁止事项

- ❌ **禁止跨模块直接查询数据库**（如 ERP 直接查询 hrm.employees）
- ❌ **禁止跨模块 JOIN 表**
- ✅ **必须使用服务客户端调用其他模块的 API**

## 错误处理

服务客户端返回 `ServiceClientResult<T>` 类型，可能的错误包括：

- `HttpRequestError` - HTTP 请求失败
- `ServiceError` - 服务返回错误状态码
- `InvalidUrl` - URL 配置错误
- `ServiceNotFound` - 服务未找到

## 最佳实践

1. **创建客户端时尽量复用**，不要每次请求都创建新客户端
2. **错误处理要优雅**，考虑降级和缓存策略
3. **在后台服务中使用异步调用**，不要阻塞主线程

## 下一步

- [ ] 添加更多服务客户端（PM、ERP、CRM 等）
- [ ] 添加缓存机制减少服务间调用
- [ ] 添加断路器模式提高稳定性
- [ ] 添加请求追踪和日志记录

