> 🚨 路由版本过渡中：本文档描述路径含 /v1 为旧格式，新生产路径去掉 /v1。详见 [路由统一计划](../superpowers/plans/2026-07-15-route-unification-contract.md)

# TOPEMS API 版本管理和 Schema 隔离工具使用指南

## 1. 概述

本指南介绍 TOPEMS 系统中的 API 版本管理和 Schema 隔离辅助工具的使用方法。

## 2. API 版本管理工具

### 2.1 主要功能

- 提供版本化路由前缀工具
- 提供 API 信息查询路由
- 支持向后兼容性

### 2.2 使用示例

#### 2.2.1 创建版本化路由

```rust
use axum::Router;
use topems_shared::{default_versioned_router};

// 定义你的基本路由（不需要包含 /api/v1 前缀）
let api_routes = Router::new()
    .route("/employees", get(list_employees).post(create_employee));

// 使用 default_versioned_router 同时支持 /api/v1 和 /api
let app = default_versioned_router(api_routes);
```

#### 2.2.2 添加 API 信息路由

```rust
use topems_shared::{create_api_info_router};

let app = Router::new()
    .merge(create_api_info_router("your-service-name"));
```

#### 2.2.3 使用 API 前缀函数

```rust
use topems_shared::api_prefix;

let prefix = api_prefix("v1"); // 返回 "/api/v1"
```

## 3. Schema 隔离工具

### 3.1 主要功能

- 提供所有模块的 Schema 常量
- 提供表名前缀化函数
- 确保每个服务只访问自己的 Schema

### 3.2 使用示例

#### 3.2.1 使用表名前缀化函数

```rust
use topems_shared::{hrm_table, erp_table, pm_table};

// HRM 模块
let employees_table = hrm_table("employees"); // 返回 "hrm.employees"
let departments_table = hrm_table("departments"); // 返回 "hrm.departments"

// ERP 模块
let assets_table = erp_table("assets"); // 返回 "erp.assets"

// PM 模块
let projects_table = pm_table("projects"); // 返回 "pm.projects"
```

#### 3.2.2 在 SQL 查询中使用

```rust
// 之前：
let result = sqlx::query_as("SELECT * FROM hrm.employees")
    .fetch_all(&pool)
    .await;

// 之后（使用辅助函数）：
let employees_table = hrm_table("employees");
let result = sqlx::query_as(&format!("SELECT * FROM {}", employees_table))
    .fetch_all(&pool)
    .await;
```

## 4. 常量列表

### 4.1 Schema 常量

| 常量 | 对应服务 |
|------|---------|
| HRM_SCHEMA | 人力资源管理 |
| ERP_SCHEMA | 企业资源计划 |
| PM_SCHEMA | 项目管理 |
| CRM_SCHEMA | 客户关系管理 |
| QMS_SCHEMA | 质量管理 |
| MES_SCHEMA | 制造执行 |
| WMS_SCHEMA | 仓储管理 |
| SRM_SCHEMA | 供应商管理 |
| SCM_SCHEMA | 供应链管理 |
| PDM_SCHEMA | 产品数据管理 |
| LIMS_SCHEMA | 实验室管理 |
| RS_SCHEMA | 研发管理 |
| GIS_SCHEMA | 地理信息系统 |
| EHS_SCHEMA | 环境健康安全 |
| BI_SCHEMA | 商务智能 |
| AI_SCHEMA | 人工智能 |
| IM_SCHEMA | 即时通讯 |
| INTEGRATION_SCHEMA | 集成平台 |
| MAIL_SCHEMA | 邮件服务 |
| MOBILE_SCHEMA | 移动端 |
| PORTAL_SCHEMA | 门户 |

## 5. 最佳实践

1. **使用辅助函数而非硬编码**: 尽量使用 `hrm_table()`, `erp_table()` 等函数，而非直接在 SQL 中写表名
2. **版本化路由**: 新服务建议使用 `versioned_router` 来确保路由一致性
3. **向后兼容性**: 如需调整 API 结构，考虑同时支持旧接口和新接口
