# 后端服务规范

本文档定义 TOPEMS 后端微服务的开发规范和最佳实践。

## 目录

- [服务架构](#服务架构)
- [项目结构](#项目结构)
- [数据模型](#数据模型)
- [服务开发流程](#服务开发流程)
- [API 实现](#api-实现)
- [插件开发](#插件开发)
- [配置管理](#配置管理)

---

## 服务架构

### 1. 服务列表

| 服务 | 端口 | 说明 |
|------|------|------|
| Unified Core | 8000 | 统一核心服务（IAM, DOC, FILE） |
| HRM | 8020 | 人力资源管理 |
| CRM | 8029 | 客户关系管理 |
| PM | 8023 | 项目管理 |
| MES | 8030 | 生产制造执行 |
| PDM | 8031 | 产品数据管理 |
| QMS | 8050 | 质量管理系统 |
| AI | 8013 AI 服务 |

### 2. 服务通信

- 同步通信：REST API（HTTP/JSON）
- 异步通信：事件驱动（Kafka/Redis Pub/Sub）

---

## 项目结构

### 标准目录结构

```
svc/my-service/
├── Cargo.toml              # 依赖配置
├── src/
│   ├── main.rs             # 入口文件
│   ├── lib.rs              # 库入口
│   ├── api/
│   │   ├── mod.rs
│   │   ├── routes.rs       # 路由配置
│   │   └── handlers.rs     # 请求处理
│   ├── model/
│   │   ├── mod.rs
│   │   ├── entity.rs       # 数据实体
│   │   └── dto.rs          # 数据传输对象
│   ├── service/
│   │   ├── mod.rs
│   │   └── business.rs     # 业务逻辑
│   ├── repository/
│   │   ├── mod.rs
│   │   └── db_ops.rs       # 数据库操作
│   ├── config/
│   │   ├── mod.rs
│   │   └── settings.rs     # 配置结构
│   ├── middleware/
│   │   ├── mod.rs
│   │   └── auth.rs         # 认证中间件
│   └── error/
│       ├── mod.rs
│       └── types.rs        # 错误类型
├── migrations/             # 数据库迁移
│   ├── 20240101000000_create_table.sql
│   └── 20240102000000_add_column.sql
└── tests/
    └── integration_test.rs
```

---

## 数据模型

### 1. 实体定义

```rust
// src/model/entity.rs
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Employee {
    pub id: Uuid,
    pub company_id: Uuid,
    pub department_id: Option<Uuid>,
    pub employee_number: String,
    pub name: String,
    pub gender: String,
    pub birth_date: Option<DateTime<Utc>>,
    pub hire_date: DateTime<Utc>,
    pub email: String,
    pub phone: Option<String>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateEmployeeRequest {
    pub company_id: Uuid,
    pub department_id: Option<Uuid>,
    pub employee_number: String,
    pub name: String,
    pub gender: String,
    pub birth_date: Option<String>,
    pub hire_date: String,
    pub email: String,
    pub phone: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateEmployeeRequest {
    pub department_id: Option<Uuid>,
    pub name: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct EmployeeQuery {
    pub id: Uuid,
    pub name: String,
    pub department_name: Option<String>,
    pub status: String,
}
```

### 2. DTO 定义

```rust
// src/model/dto.rs
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

#[derive(Debug, Serialize, Deserialize)]
pub struct EmployeeDetailDTO {
    pub id: String,
    pub employee_number: String,
    pub name: String,
    pub gender: String,
    pub age: Option<i32>,
    pub department: DepartmentDTO,
    pub position: PositionDTO,
    pub hire_date: String,
    pub status: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DepartmentDTO {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PositionDTO {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PaginatedResponse<T> {
    pub items: Vec<T>,
    pub page: i32,
    pub page_size: i32,
    pub total: i64,
    pub total_pages: i32,
}
```

---

## 服务开发流程

### 1. 创建新服务

```bash
# 1. 创建服务目录
mkdir -p svc/my-service/src/{api,model,service,repository,config,middleware,error}
mkdir -p svc/my-service/migrations

# 2. 创建 Cargo.toml
cd svc/my-service
cargo init --lib

# 3. 添加依赖
cargo add actix-web serde serde_json sqlx uuid chrono thiserror
```

### 2. 实现 Repository 层

```rust
// src/repository/db_ops.rs
use crate::model::entity::Employee;
use sqlx::PgPool;
use uuid::Uuid;

pub struct EmployeeRepository {
    pool: PgPool,
}

impl EmployeeRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn find_all(&self) -> Result<Vec<Employee>, sqlx::Error> {
        sqlx::query_as!(
            Employee,
            "SELECT * FROM hrm.employees ORDER BY created_at DESC"
        )
        .fetch_all(&self.pool)
        .await
    }

    pub async fn find_by_id(&self, id: Uuid) -> Result<Option<Employee>, sqlx::Error> {
        sqlx::query_as!(
            Employee,
            "SELECT * FROM hrm.employees WHERE id = $1",
            id
        )
        .fetch_optional(&self.pool)
        .await
    }

    pub async fn create(&self, employee: &Employee) -> Result<Employee, sqlx::Error> {
        sqlx::query_as!(
            Employee,
            r#"
            INSERT INTO hrm.employees (
                id, company_id, department_id, employee_number, 
                name, gender, birth_date, hire_date, email, phone, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
            "#,
            employee.id,
            employee.company_id,
            employee.department_id,
            employee.employee_number,
            employee.name,
            employee.gender,
            employee.birth_date,
            employee.hire_date,
            employee.email,
            employee.phone,
            employee.status
        )
        .fetch_one(&self.pool)
        .await
    }

    pub async fn update(&self, id: Uuid, employee: &Employee) -> Result<Option<Employee>, sqlx::Error> {
        sqlx::query_as!(
            Employee,
            r#"
            UPDATE hrm.employees 
            SET department_id = $1, name = $2, email = $3, phone = $4, 
                status = $5, updated_at = NOW()
            WHERE id = $6
            RETURNING *
            "#,
            employee.department_id,
            employee.name,
            employee.email,
            employee.phone,
            employee.status,
            id
        )
        .fetch_optional(&self.pool)
        .await
    }

    pub async fn delete(&self, id: Uuid) -> Result<bool, sqlx::Error> {
        let result = sqlx::query!("DELETE FROM hrm.employees WHERE id = $1", id)
            .execute(&self.pool)
            .await?;
        Ok(result.rows_affected() > 0)
    }

    pub async fn count_by_department(&self, department_id: Uuid) -> Result<i64, sqlx::Error> {
        let result = sqlx::query_scalar!(
            "SELECT COUNT(*) FROM hrm.employees WHERE department_id = $1",
            department_id
        )
        .fetch_one(&self.pool)
        .await?;
        Ok(result)
    }
}
```

### 3. 实现 Service 层

```rust
// src/service/business.rs
use crate::error::{ServiceError, ServiceResult};
use crate::model::entity::{Employee, CreateEmployeeRequest, UpdateEmployeeRequest};
use crate::repository::db_ops::EmployeeRepository;
use chrono::Utc;
use uuid::Uuid;

pub struct EmployeeService {
    repository: EmployeeRepository,
}

impl EmployeeService {
    pub fn new(repository: EmployeeRepository) -> Self {
        Self { repository }
    }

    pub async fn get_all(&self) -> ServiceResult<Vec<Employee>> {
        self.repository.find_all()
            .await
            .map_err(|e| ServiceError::DatabaseError(e))
    }

    pub async fn get_by_id(&self, id: Uuid) -> ServiceResult<Option<Employee>> {
        self.repository.find_by_id(id)
            .await
            .map_err(|e| ServiceError::DatabaseError(e))
    }

    pub async fn create(&self, request: CreateEmployeeRequest) -> ServiceResult<Employee> {
        // 业务校验
        if request.name.is_empty() {
            return Err(ServiceError::ValidationError("姓名不能为空".to_string()));
        }

        let employee = Employee {
            id: Uuid::new_v4(),
            company_id: request.company_id,
            department_id: request.department_id,
            employee_number: request.employee_number,
            name: request.name,
            gender: request.gender,
            birth_date: request.birth_date.and_then(|s| s.parse().ok()),
            hire_date: request.hire_date.parse().unwrap_or_else(|_| Utc::now()),
            email: request.email,
            phone: request.phone,
            status: "active".to_string(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };

        self.repository.create(&employee)
            .await
            .map_err(|e| ServiceError::DatabaseError(e))
    }

    pub async fn update(&self, id: Uuid, request: UpdateEmployeeRequest) -> ServiceResult<Option<Employee>> {
        let existing = match self.repository.find_by_id(id).await.map_err(|e| ServiceError::DatabaseError(e))? {
            Some(e) => e,
            None => return Ok(None),
        };

        let employee = Employee {
            department_id: request.department_id.or(existing.department_id),
            name: request.name.unwrap_or(existing.name),
            email: request.email.unwrap_or(existing.email),
            phone: request.phone.or(existing.phone),
            status: request.status.unwrap_or(existing.status),
            ..existing
        };

        self.repository.update(id, &employee)
            .await
            .map_err(|e| ServiceError::DatabaseError(e))
    }

    pub async fn delete(&self, id: Uuid) -> ServiceResult<bool> {
        self.repository.delete(id)
            .await
            .map_err(|e| ServiceError::DatabaseError(e))
    }
}
```

---

## API 实现

### 1. 错误类型定义

```rust
// src/error/types.rs
use actix_web::{HttpResponse, StatusCode};
use serde_json::json;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ServiceError {
    #[error("数据库错误: {0}")]
    DatabaseError(#[from] sqlx::Error),
    
    #[error("资源不存在: {0}")]
    NotFound(String),
    
    #[error("验证错误: {0}")]
    ValidationError(String),
    
    #[error("权限不足")]
    Forbidden,
    
    #[error("认证失败")]
    Unauthorized,
    
    #[error("内部错误: {0}")]
    InternalError(String),
}

pub type ServiceResult<T> = Result<T, ServiceError>;

impl ServiceError {
    pub fn to_response(&self) -> (StatusCode, serde_json::Value) {
        match self {
            ServiceError::NotFound(msg) => (
                StatusCode::NOT_FOUND,
                json!({
                    "code": 404,
                    "message": msg,
                    "data": null
                }),
            ),
            ServiceError::ValidationError(msg) => (
                StatusCode::BAD_REQUEST,
                json!({
                    "code": 400,
                    "message": msg,
                    "data": null
                }),
            ),
            ServiceError::Forbidden => (
                StatusCode::FORBIDDEN,
                json!({
                    "code": 403,
                    "message": "权限不足",
                    "data": null
                }),
            ),
            ServiceError::Unauthorized => (
                StatusCode::UNAUTHORIZED,
                json!({
                    "code": 401,
                    "message": "认证失败",
                    "data": null
                }),
            ),
            _ => (
                StatusCode::INTERNAL_SERVER_ERROR,
                json!({
                    "code": 500,
                    "message": self.to_string(),
                    "data": null
                }),
            ),
        }
    }
}
```

### 2. Handlers 实现

```rust
// src/api/handlers.rs
use crate::error::{ServiceError, ServiceResult};
use crate::model::entity::{CreateEmployeeRequest, UpdateEmployeeRequest};
use crate::service::business::EmployeeService;
use actix_web::{web, HttpResponse};
use serde_json::json;
use uuid::Uuid;

pub async fn get_all(service: web::Data<EmployeeService>) -> ServiceResult<HttpResponse> {
    let employees = service.get_all().await?;
    Ok(HttpResponse::Ok().json(json!({
        "code": 200,
        "message": "success",
        "data": employees
    })))
}

pub async fn get_by_id(
    path: web::Path<Uuid>,
    service: web::Data<EmployeeService>
) -> ServiceResult<HttpResponse> {
    let id = path.into_inner();
    match service.get_by_id(id).await? {
        Some(employee) => Ok(HttpResponse::Ok().json(json!({
            "code": 200,
            "message": "success",
            "data": employee
        }))),
        None => Err(ServiceError::NotFound("员工不存在".to_string())),
    }
}

pub async fn create(
    request: web::Json<CreateEmployeeRequest>,
    service: web::Data<EmployeeService>
) -> ServiceResult<HttpResponse> {
    let employee = service.create(request.into_inner()).await?;
    Ok(HttpResponse::Created().json(json!({
        "code": 201,
        "message": "创建成功",
        "data": employee
    })))
}

pub async fn update(
    path: web::Path<Uuid>,
    request: web::Json<UpdateEmployeeRequest>,
    service: web::Data<EmployeeService>
) -> ServiceResult<HttpResponse> {
    let id = path.into_inner();
    match service.update(id, request.into_inner()).await? {
        Some(employee) => Ok(HttpResponse::Ok().json(json!({
            "code": 200,
            "message": "更新成功",
            "data": employee
        }))),
        None => Err(ServiceError::NotFound("员工不存在".to_string())),
    }
}

pub async fn delete(
    path: web::Path<Uuid>,
    service: web::Data<EmployeeService>
) -> ServiceResult<HttpResponse> {
    let id = path.into_inner();
    match service.delete(id).await? {
        true => Ok(HttpResponse::Ok().json(json!({
            "code": 200,
            "message": "删除成功",
            "data": null
        }))),
        false => Err(ServiceError::NotFound("员工不存在".to_string())),
    }
}
```

### 3. 路由配置

```rust
// src/api/routes.rs
use crate::api::handlers::{create, delete, get_all, get_by_id, update};
use actix_web::web;

pub fn configure_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/api/hrm")
            .route("/employees", web::get().to(get_all))
            .route("/employees", web::post().to(create))
            .route("/employees/{id}", web::get().to(get_by_id))
            .route("/employees/{id}", web::put().to(update))
            .route("/employees/{id}", web::delete().to(delete))
    );
}
```

### 4. Main 入口

```rust
// src/main.rs
use actix_web::{App, HttpServer};
use sqlx::PgPool;

mod api;
mod config;
mod error;
mod model;
mod repository;
mod service;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // 加载配置
    let settings = config::Settings::new().expect("无法加载配置");

    // 连接数据库
    let pool = PgPool::connect(&settings.database.url)
        .await
        .expect("无法连接数据库");

    // 启动服务
    HttpServer::new(move || {
        let repository = repository::db_ops::EmployeeRepository::new(pool.clone());
        let service = service::business::EmployeeService::new(repository);
        
        App::new()
            .app_data(web::Data::new(service))
            .app_data(web::Data::new(pool.clone()))
            .configure(api::routes::configure_routes)
    })
    .bind((settings.server.host, settings.server.port))?
    .run()
    .await
}
```

---

## 插件开发

### 1. 插件结构

```
plugins/
└── my-plugin/
    ├── Cargo.toml
    └── src/
        ├── lib.rs
        ├── handler.rs
        └── router.rs
```

### 2. 插件实现

```rust
// plugins/my-plugin/src/lib.rs
use actix_web::{web, App, HttpResponse, HttpServer};
use serde::{Deserialize, Serialize};
use topems_core::plugin::{Plugin, PluginInfo};

pub struct MyPlugin;

impl Plugin for MyPlugin {
    fn info(&self) -> PluginInfo {
        PluginInfo {
            name: "my-plugin".to_string(),
            version: "0.1.0".to_string(),
            description: "自定义插件示例".to_string(),
            author: "TOPEMS Team".to_string(),
            routes: vec!["/api/my-plugin/*".to_string()],
        }
    }

    fn mount(&self, app: &mut App) -> &mut App {
        app.service(
            web::scope("/api/my-plugin")
                .service(web::resource("/hello").route(web::get().to(hello_handler)))
                .service(web::resource("/data").route(web::get().to(data_handler)))
        )
    }
}

async fn hello_handler() -> HttpResponse {
    HttpResponse::Ok().json(serde_json::json!({
        "code": 200,
        "message": "success",
        "data": "Hello from my-plugin!"
    }))
}

async fn data_handler() -> HttpResponse {
    HttpResponse::Ok().json(serde_json::json!({
        "code": 200,
        "message": "success",
        "data": {
            "items": [],
            "total": 0
        }
    }))
}
```

---

## 配置管理

### 1. Settings 结构

```rust
// src/config/settings.rs
use serde::Deserialize;
use std::env;

#[derive(Debug, Deserialize, Clone)]
pub struct Settings {
    pub server: ServerConfig,
    pub database: DatabaseConfig,
    pub redis: RedisConfig,
    pub jwt: JwtConfig,
}

#[derive(Debug, Deserialize, Clone)]
pub struct ServerConfig {
    pub host: String,
    pub port: u16,
}

#[derive(Debug, Deserialize, Clone)]
pub struct DatabaseConfig {
    pub url: String,
    pub max_connections: u32,
}

#[derive(Debug, Deserialize, Clone)]
pub struct RedisConfig {
    pub url: String,
}

#[derive(Debug, Deserialize, Clone)]
pub struct JwtConfig {
    pub secret: String,
    pub expiration: u64,
}

impl Settings {
    pub fn new() -> Result<Self, config::ConfigError> {
        let settings = config::Config::builder()
            .add_source(config::Environment::default())
            .build()?;
        
        settings.try_deserialize()
    }
}
```

### 2. 环境变量配置

```bash
# .env
DATABASE_URL=postgres://topems:topems_secret@localhost:5432/topems
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
SERVER_HOST=0.0.0.0
SERVER_PORT=8020
```

---

**文档版本**: v1.0
**最后更新**: 2026-06-24
