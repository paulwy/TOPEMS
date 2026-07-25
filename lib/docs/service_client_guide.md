# TOPEMS Service Client SDK 使用指南

## 概述

`topems-shared` 提供了一套完整的服务客户端 SDK，用于在微服务架构中进行服务间通信。SDK 封装了 HTTP 请求处理、错误处理、认证等通用逻辑，覆盖 25 个服务客户端。

SDK 同时提供两种调用模式：

| 模式 | 适用场景 | 说明 |
|------|----------|------|
| 具体客户端（旧） | 向后兼容、稳定 API | 每个服务一个 `XxxServiceClient` 结构体 + 工厂函数 |
| 泛型 + trait（新） | 新代码推荐 | `TypedServiceClient<T>` + `define_service_api!` 宏，自动服务发现 |

## 快速开始

### 安装依赖

在 `Cargo.toml` 中添加：

```toml
[dependencies]
topems-shared = { path = "../lib" }
```

### 创建客户端

```rust
use topems_shared::service_client::create_iam_client;

let client = create_iam_client()?;
```

### 发送请求

```rust
use serde_json::json;

let users = client.get::<serde_json::Value>("/api/core/iam/users").await?;
let new_user = client
    .post::<serde_json::Value, _>("/api/core/iam/users", &json!({"name": "John"}))
    .await?;
```

## 核心 API

### BaseServiceClient

基础客户端，所有服务客户端的基类。

```rust
use topems_shared::service_client::BaseServiceClient;

let client = BaseServiceClient::new("http://localhost:8000")?;
```

#### 请求方法

| 方法 | 说明 | 参数 |
|------|------|------|
| `get<T>(path)` | GET 请求 | `path`: 请求路径 |
| `post<T, B>(path, body)` | POST 请求 | `path`: 请求路径, `body`: 请求体 |
| `put<T, B>(path, body)` | PUT 请求 | `path`: 请求路径, `body`: 请求体 |
| `delete<T>(path)` | DELETE 请求 | `path`: 请求路径 |
| `get_without_response(path)` | GET 请求（无响应体） | `path`: 请求路径 |

#### 认证与自定义 Header

```rust
let mut client = BaseServiceClient::new("http://localhost:8000")?;

// 设置 Bearer Token
client.set_auth_token("your-token");

// 添加自定义 Header
client.add_header("X-Request-Id", "12345");
```

### 服务客户端工厂函数

SDK 提供 25 个服务的工厂函数，端口划分遵循 [config/services.yaml](../../config/services.yaml) 与 [config/env/.env.production.template](../../config/env/.env.production.template) 的统一规范：

| 工厂函数 | 服务 | 环境变量 | 默认地址 | 端口 | 分组 |
|----------|------|----------|----------|------|------|
| `create_iam_client()` | IAM 身份认证 | `IAM_SERVICE_URL` | `http://localhost:8000` | 8000 | Group1 (unified-core) |
| `create_doc_client()` | 文档管理 | `DOC_SERVICE_URL` | `http://localhost:8000` | 8000 | Group1 (unified-core) |
| `create_workflow_client()` | 工作流引擎 | `WORKFLOW_SERVICE_URL` | `http://localhost:8000` | 8000 | Group1 (unified-core) |
| `create_notification_client()` | 通知中心 | `NOTIFICATION_SERVICE_URL` | `http://localhost:8000` | 8000 | Group1 (unified-core) |
| `create_monitor_client()` | 系统监控 | `MONITOR_SERVICE_URL` | `http://localhost:8000` | 8000 | Group1 (unified-core) |
| `create_erp_client()` | ERP 企业资源计划 | `ERP_SERVICE_URL` | `http://localhost:8010` | 8010 | Group2 (经营管理) |
| `create_finance_client()` | 财务管理 | `FINANCE_SERVICE_URL` | `http://localhost:8011` | 8011 | Group2 (经营管理) |
| `create_ai_client()` | AI 人工智能 | `AI_SERVICE_URL` | `http://localhost:8013` | 8013 | Group2 (经营管理) |
| `create_hrm_client()` | 人力资源 | `HRM_SERVICE_URL` | `http://localhost:8020` | 8020 | Group2 (协同办公) |
| `create_pm_client()` | 项目管理 | `PM_SERVICE_URL` | `http://localhost:8023` | 8023 | Group2 (协同办公) |
| `create_crm_client()` | 客户关系管理 | `CRM_SERVICE_URL` | `http://localhost:8029` | 8029 | Group2 (协同办公) |
| `create_mes_client()` | 制造执行系统 | `MES_SERVICE_URL` | `http://localhost:8030` | 8030 | Group2 (生产制造) |
| `create_pdm_client()` | 产品数据管理 | `PDM_SERVICE_URL` | `http://localhost:8031` | 8031 | Group2 (生产制造) |
| `create_scm_client()` | 供应链管理 | `SCM_SERVICE_URL` | `http://localhost:8040` | 8040 | Group2 (供应链) |
| `create_wms_client()` | 仓储管理 | `WMS_SERVICE_URL` | `http://localhost:8041` | 8041 | Group2 (供应链) |
| `create_srm_client()` | 供应商关系管理 | `SRM_SERVICE_URL` | `http://localhost:8042` | 8042 | Group2 (供应链) |
| `create_qms_client()` | 质量管理 | `QMS_SERVICE_URL` | `http://localhost:8050` | 8050 | Group2 (质量/研发) |
| `create_lims_client()` | 实验室信息管理 | `LIMS_SERVICE_URL` | `http://localhost:8051` | 8051 | Group2 (质量/研发) |
| `create_ehs_client()` | 环境健康安全 | `EHS_SERVICE_URL` | `http://localhost:8052` | 8052 | Group2 (质量/研发) |
| `create_rd_client()` | 研发管理 | `RD_SERVICE_URL` | `http://localhost:8053` | 8053 | Group2 (质量/研发) |
| `create_bi_client()` | 商业智能 | `BI_SERVICE_URL` | `http://localhost:8060` | 8060 | Group2 (数据/门户) |
| `create_portal_client()` | 门户聚合 | `PORTAL_SERVICE_URL` | `http://localhost:8063` | 8063 | Group2 (数据/门户) |
| `create_mobile_client()` | 移动端网关 | `MOBILE_SERVICE_URL` | `http://localhost:8070` | 8070 | Group2 (基础设施) |
| `create_gis_client()` | 地理信息 | `GIS_SERVICE_URL` | `http://localhost:8071` | 8071 | Group2 (基础设施) |
| `create_integration_client()` | 集成中台 | `INTEGRATION_SERVICE_URL` | `http://localhost:8072` | 8072 | Group2 (基础设施) |

> **端口区间划分**
> - `8000-8009` 平台核心服务（unified-core 承载 IAM/Doc/Workflow/File/IM/Mail/Notification/Monitor 等虚拟服务）
> - `8010-8019` 经营管理服务
> - `8020-8029` 协同办公服务
> - `8030-8039` 生产制造服务
> - `8040-8049` 供应链服务
> - `8050-8059` 质量/研发服务
> - `8060-8069` 数据/门户服务
> - `8070-8079` 基础设施服务

## 路径前缀约定

工厂函数返回的客户端 `base_url` 仅指向主机端口，业务方法内部会拼接完整路径。路径前缀遵循前端 [apiPath.ts](../../apps/web/src/utils/apiPath.ts) 的统一路由契约：

| 分组 | 路径格式 | 说明 |
|------|----------|------|
| Group1 (unified-core 虚拟服务) | `/api/core/{svc}/{resource}` | 由 unified-core:8000 承载 |
| Group2 (独立进程服务) | `/api/{svc}/{resource}` | 各服务独立 K8s deployment |

示例：

```rust
// Group1: doc/monitor/iam 等走 /api/core/*
doc_client.list_documents(1, 20).await?;       // GET /api/core/doc/documents?...
monitor_client.get_service_status().await?;     // GET /api/core/monitor/services/status

// Group2: erp/hrm/pm 等走 /api/{svc}/*
erp_client.list_assets(1, 20).await?;           // GET /api/erp/assets?...
hrm_client.list_employees().await?;             // GET /api/hrm/employees
rd_client.list_projects(1, 20).await?;          // GET /api/rd/projects?...
```

> **历史变更说明**
> - `topems-rs`（端口 8053）已重命名为 `topems-rd`，环境变量 `RS_SERVICE_URL` → `RD_SERVICE_URL`，工厂函数 `create_rs_client()` → `create_rd_client()`。
> - `topems-report`（端口 8061）已整合到 `topems-bi`（端口 8060），`create_report_client()` 已移除。
> - `topems-doc`（端口 8012）、`topems-monitor`（端口 8062）已并入 unified-core（端口 8000），路径前缀变更为 `/api/core/doc` 与 `/api/core/monitor`。

## 错误处理

### ServiceClientError

SDK 返回统一的错误类型 `ServiceClientError`：

```rust
use topems_shared::service_client::ServiceClientError;

match client.get::<serde_json::Value>("/api/core/iam/users").await {
    Ok(data) => println!("Success: {:?}", data),
    Err(ServiceClientError::InvalidUrl(msg)) => println!("Invalid URL: {}", msg),
    Err(ServiceClientError::HttpRequestError(e)) => println!("HTTP Error: {:?}", e),
    Err(ServiceClientError::ServiceError { status_code, message }) => {
        println!("Service Error {}: {}", status_code, message);
    }
}
```

| 错误类型 | 说明 |
|----------|------|
| `InvalidUrl` | URL 无效或为空 |
| `HttpRequestError` | HTTP 请求失败（网络错误、超时等） |
| `ServiceError` | 服务返回非成功状态码 |

## 通用客户端

对于未提供专用客户端的服务，可以使用 `GenericServiceClient`：

```rust
use topems_shared::service_client::create_generic_client;

let client = create_generic_client(
    "my-service",
    "MY_SERVICE_URL",
    "http://localhost:8080",
)?;

let result = client.get::<serde_json::Value>("/api/data").await?;
```

## 泛型 + trait 模式（推荐新代码）

新代码建议使用 `TypedServiceClient<T>` + `define_service_api!` 宏，一行声明服务元数据，自动支持 Consul 服务发现、环境变量回退、默认端口回退：

```rust
use topems_shared::service_client::{
    api::erp_api::ErpApi,
    trait_api::TypedServiceClient,
    define_service_api,
};

// 1. 声明服务元数据（一行）
define_service_api!(
    InventoryApi,
    "topems-inventory",
    8090,
    Some("INVENTORY_SERVICE_URL"),
    "/api/inventory"
);

// 2. 在 TypedServiceClient<InventoryApi> 上实现业务方法
impl TypedServiceClient<InventoryApi> {
    pub async fn list_items(&self, page: i32, page_size: i32)
        -> Result<Vec<serde_json::Value>, Box<dyn std::error::Error>> {
        let path = format!("/items?page={}&page_size={}", page, page_size);
        self.get(&self.build_path(&path)).await
    }
}

// 3. 使用（自动服务发现）
let client = TypedServiceClient::<InventoryApi>::discover_default().await?;
let items = client.list_items(1, 20).await?;
```

详见 [examples.rs](../src/service_client/examples.rs) 与 [trait_api.rs](../src/service_client/trait_api.rs)。

## 配置

### 环境变量

客户端优先从环境变量读取服务地址，未设置则使用默认地址：

```bash
export IAM_SERVICE_URL=http://localhost:8000
export RD_SERVICE_URL=http://localhost:8053
```

### 超时配置

默认超时配置：

- 请求超时：30 秒
- 连接超时：5 秒

## 最佳实践

### 1. 使用工厂函数创建客户端

```rust
// 推荐
let client = create_iam_client()?;

// 不推荐：硬编码地址
let client = IamServiceClient::new("http://localhost:8000")?;
```

### 2. 批量创建客户端

```rust
let iam_client = create_iam_client()?;
let hrm_client = create_hrm_client()?;
let finance_client = create_finance_client()?;
```

### 3. 认证令牌管理

```rust
let mut client = create_iam_client()?;
client.set_auth_token(&current_user.token);

let result = client.get::<serde_json::Value>("/api/core/iam/protected").await?;
```

### 4. 跨服务并行调用

```rust
use topems_shared::service_client::{
    api::{hrm_api::HrmApi, finance_api::FinanceApi, workflow_api::WorkflowApi},
    trait_api::TypedServiceClient,
};

let hrm = TypedServiceClient::<HrmApi>::discover_default().await?;
let finance = TypedServiceClient::<FinanceApi>::discover_default().await?;
let workflow = TypedServiceClient::<WorkflowApi>::discover_default().await?;

let (employees, accounts, tasks) = tokio::try_join!(
    hrm.list_employees(),
    finance.list_accounts(),
    workflow.get_my_pending_tasks(1, 10),
)?;
```

## 测试

SDK 提供完整的单元测试，覆盖所有客户端创建和基础功能：

```bash
cd lib
cargo test --test service_client_test
```

### 测试覆盖

- 客户端初始化（有效/无效 URL）
- 请求方法（GET/POST/PUT/DELETE）
- 错误处理
- 认证 Header
- 自定义 Header
- 24 个服务客户端工厂函数（含 `create_rd_client`）

## 贡献指南

### 添加新服务客户端

1. 在 `lib/src/service_client/` 目录创建新的客户端文件（使用 `define_service_client!` 宏）
2. 在 `lib/src/service_client/mod.rs` 中导出新客户端并添加工厂函数
3. 端口号与路径前缀需遵循 `config/services.yaml` 与 `apiPath.ts` 的统一约定
4. 添加单元测试到 `lib/tests/service_client_test.rs`
5. 同步更新本指南与 `config/env/.env.production.template`

### 示例客户端模板

```rust
use super::generic::ApiResponse;

crate::define_service_client!(
    MyServiceClient,
    "MY_SERVICE_URL",
    "http://localhost:8080",
    {
        list_items(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/my-service/items?page={}&pagesize={}"
        }
    }
);
```

## 版本兼容性

| SDK 版本 | TOPEMS 版本 |
|----------|-------------|
| 0.1.x | V5.14.0+ |
