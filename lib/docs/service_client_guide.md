# TOPEMS Service Client SDK 使用指南

## 概述

`topems-shared` 提供了一套完整的服务客户端 SDK，用于在微服务架构中进行服务间通信。SDK 封装了 HTTP 请求处理、错误处理、认证等通用逻辑，提供了 24 个服务的专用客户端。

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

let client = create_iam_client().unwrap();
```

### 发送请求

```rust
use serde_json::json;

let users = client.get::<serde_json::Value>("/api/users").await?;
let new_user = client.post::<serde_json::Value, _>("/api/users", &json!({"name": "John"})).await?;
```

## 核心 API

### BaseServiceClient

基础客户端，所有服务客户端的基类。

#### 创建客户端

```rust
use topems_shared::service_client::BaseServiceClient;

let client = BaseServiceClient::new("http://localhost:8080")?;
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
let mut client = BaseServiceClient::new("http://localhost:8080")?;

// 设置 Bearer Token
client.set_auth_token("your-token");

// 添加自定义 Header
client.add_header("X-Request-Id", "12345");
```

#### URL 访问

```rust
let base_url = client.base_url();
```

### 服务客户端工厂函数

SDK 提供了 24 个服务的工厂函数：

| 工厂函数 | 服务 | 环境变量 | 默认地址 |
|----------|------|----------|----------|
| `create_iam_client()` | IAM 服务 | `IAM_SERVICE_URL` | `http://topems-iam:8000` |
| `create_hrm_client()` | HRM 服务 | `HRM_SERVICE_URL` | `http://topems-hrm:8001` |
| `create_qms_client()` | QMS 服务 | `QMS_SERVICE_URL` | `http://topems-qms:8002` |
| `create_mes_client()` | MES 服务 | `MES_SERVICE_URL` | `http://topems-mes:8003` |
| `create_erp_client()` | ERP 服务 | `ERP_SERVICE_URL` | `http://topems-erp:8004` |
| `create_wms_client()` | WMS 服务 | `WMS_SERVICE_URL` | `http://topems-wms:8005` |
| `create_scm_client()` | SCM 服务 | `SCM_SERVICE_URL` | `http://topems-scm:8006` |
| `create_pm_client()` | PM 服务 | `PM_SERVICE_URL` | `http://topems-pm:8007` |
| `create_crm_client()` | CRM 服务 | `CRM_SERVICE_URL` | `http://topems-crm:8008` |
| `create_finance_client()` | Finance 服务 | `FINANCE_SERVICE_URL` | `http://topems-finance:8011` |
| `create_doc_client()` | Doc 服务 | `DOC_SERVICE_URL` | `http://topems-doc:8012` |
| `create_ai_client()` | AI 服务 | `AI_SERVICE_URL` | `http://topems-ai:8013` |
| `create_pdm_client()` | PDM 服务 | `PDM_SERVICE_URL` | `http://topems-pdm:8014` |
| `create_srm_client()` | SRM 服务 | `SRM_SERVICE_URL` | `http://topems-srm:8015` |
| `create_lims_client()` | LIMS 服务 | `LIMS_SERVICE_URL` | `http://topems-lims:8016` |
| `create_ehs_client()` | EHS 服务 | `EHS_SERVICE_URL` | `http://topems-ehs:8017` |
| `create_rs_client()` | RS 服务 | `RS_SERVICE_URL` | `http://topems-rs:8018` |
| `create_bi_client()` | BI 服务 | `BI_SERVICE_URL` | `http://topems-bi:8019` |
| `create_report_client()` | Report 服务 | `REPORT_SERVICE_URL` | `http://topems-report:8020` |
| `create_mobile_client()` | Mobile 服务 | `MOBILE_SERVICE_URL` | `http://topems-mobile:8021` |
| `create_portal_client()` | Portal 服务 | `PORTAL_SERVICE_URL` | `http://topems-portal:8080` |
| `create_monitor_client()` | Monitor 服务 | `MONITOR_SERVICE_URL` | `http://topems-monitor:9090` |
| `create_gis_client()` | GIS 服务 | `GIS_SERVICE_URL` | `http://topems-gis:8022` |
| `create_integration_client()` | Integration 服务 | `INTEGRATION_SERVICE_URL` | `http://topems-integration:8023` |
| `create_notification_client()` | Notification 服务 | `NOTIFICATION_SERVICE_URL` | `http://topems-notification:8009` |

## 错误处理

### ServiceClientError

SDK 返回统一的错误类型 `ServiceClientError`：

```rust
use topems_shared::service_client::ServiceClientError;

match client.get::<serde_json::Value>("/api/users").await {
    Ok(data) => println!("Success: {:?}", data),
    Err(ServiceClientError::InvalidUrl(msg)) => println!("Invalid URL: {}", msg),
    Err(ServiceClientError::HttpRequestError(e)) => println!("HTTP Error: {:?}", e),
    Err(ServiceClientError::ServiceError { status_code, message }) => {
        println!("Service Error {}: {}", status_code, message);
    }
}
```

### 错误类型说明

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
    "http://localhost:8080"
)?;

let result = client.get::<serde_json::Value>("/api/data").await?;
```

## 配置

### 环境变量

客户端优先从环境变量读取服务地址，如果未设置则使用默认地址：

```bash
export IAM_SERVICE_URL=http://localhost:8000
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

// 不推荐
let client = IamServiceClient::new("http://topems-iam:8000")?;
```

### 2. 批量创建客户端

```rust
let iam_client = create_iam_client()?;
let hrm_client = create_hrm_client()?;
let finance_client = create_finance_client()?;
```

### 3. 错误处理

```rust
async fn get_user(client: &IamServiceClient, user_id: &str) -> Result<User, ServiceClientError> {
    client.get(&format!("/api/users/{}", user_id)).await
}
```

### 4. 认证令牌管理

```rust
let mut client = create_iam_client()?;
client.set_auth_token(&current_user.token);

let result = client.get::<serde_json::Value>("/api/protected").await?;
```

## 测试

SDK 提供了完整的单元测试，覆盖所有客户端创建和基础功能：

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
- 所有 24 个服务客户端工厂函数

## 版本兼容性

| SDK 版本 | TOPEMS 版本 |
|----------|-------------|
| 0.1.x | V3.0+ |

## 贡献指南

### 添加新服务客户端

1. 在 `lib/src/service_client/` 目录创建新的客户端文件
2. 在 `lib/src/service_client/mod.rs` 中导出新客户端
3. 添加工厂函数
4. 添加单元测试

### 示例客户端模板

```rust
use super::base_client::BaseServiceClient;
use super::error::{ServiceClientError, ServiceClientResult};

#[derive(Clone)]
pub struct MyServiceClient(BaseServiceClient);

impl MyServiceClient {
    pub fn new(base_url: &str) -> ServiceClientResult<Self> {
        Ok(Self(BaseServiceClient::new(base_url)?))
    }

    pub fn from_env() -> ServiceClientResult<Self> {
        let url = std::env::var("MY_SERVICE_URL")
            .unwrap_or_else(|_| "http://topems-my-service:8080".to_string());
        Self::new(&url)
    }

    pub async fn get_data(&self) -> ServiceClientResult<serde_json::Value> {
        self.0.get("/api/data").await
    }
}
```