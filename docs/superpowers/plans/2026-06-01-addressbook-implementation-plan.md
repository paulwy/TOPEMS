# 通讯录功能实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 TOPEMS ERP 系统实现一站式综合通讯录功能，整合员工、部门、公司联系人，提供搜索筛选、分组浏览、详情查看、导出等能力，并为其他模块提供 API 支撑。

**Architecture:** 采用前后端分离架构，后端使用 Rust + Axum 提供 RESTful API，前端使用 React + TypeScript 实现左侧树 + 右侧列表的交互界面。通过数据库视图整合三类联系人数据，确保数据一致性和查询性能。

**Tech Stack:**
- **后端**: Rust, Axum, SQLx, PostgreSQL
- **前端**: React, TypeScript, Tailwind CSS
- **工具**: Git, Cargo, npm

---

## 1. 文件结构映射

### 1.1 后端文件

```
services/topems-erp/backend/
├── src/
│   ├── api/
│   │   ├── addressbook.rs          # 通讯录 API 路由和处理函数
│   │   └── mod.rs                  # 添加 addressbook 模块导出
│   ├── models/
│   │   ├── addressbook.rs          # 通讯录数据模型和请求/响应结构
│   │   └── mod.rs                  # 添加 addressbook 模型导出
│   └── main.rs                     # 注册通讯录路由
└── Cargo.toml                      # 添加必要的依赖
```

### 1.2 前端文件

```
services/topems-erp/frontend/
├── src/
│   ├── pages/
│   │   └── AddressbookPage.tsx    # 通讯录主页面
│   ├── components/
│   │   └── addressbook/
│   │       ├── AddressbookSidebar.tsx      # 左侧边栏（部门树+快速筛选）
│   │       ├── AddressbookHeader.tsx       # 顶部工具栏
│   │       ├── AddressbookFilters.tsx      # 筛选工具栏
│   │       ├── AddressbookList.tsx         # 联系人列表
│   │       ├── ContactCard.tsx             # 联系人卡片
│   │       └── ContactDetailModal.tsx      # 详情弹窗
│   ├── api/
│   │   └── addressbook.ts          # 前端 API 调用封装
│   ├── types/
│   │   └── addressbook.ts          # TypeScript 类型定义
│   └── App.tsx                     # 添加路由配置
└── package.json                    # 确保必要的依赖
```

---

## 2. 实施任务列表

### 任务 1: 数据库层 - 创建通讯录视图

**Files:**
- Create: `services/topems-erp/backend/src/main.rs` (添加视图创建 SQL)

- [ ] **Step 1: 在 main.rs 中添加通讯录视图创建 SQL**

打开 `/Users/xingzhai/TOPEMS/services/topems-erp/backend/src/main.rs`，在 `init_db` 函数中添加视图创建语句（约第 766 行之后）：

```rust
// 在 tracing::info!("✅ ERP数据库表初始化完成"); 之前添加

// 创建通讯录联合视图
sqlx::query(
    r#"
    CREATE OR REPLACE VIEW v_addressbook AS
    SELECT
        'EMPLOYEE' as contact_type,
        e.id,
        e.name,
        e.employee_number as code,
        e.position,
        e.email,
        e.phone,
        e.department_id,
        d.name as department_name,
        d.code as department_code,
        e.status,
        e.created_at,
        e.updated_at
    FROM employees e
    LEFT JOIN departments d ON e.department_id = d.id

    UNION ALL

    SELECT
        'DEPARTMENT' as contact_type,
        d.id,
        d.name,
        d.code,
        NULL::varchar as position,
        NULL::varchar as email,
        NULL::varchar as phone,
        d.parent_id as department_id,
        p.name as department_name,
        p.code as department_code,
        d.status,
        d.created_at,
        d.updated_at
    FROM departments d
    LEFT JOIN departments p ON d.parent_id = p.id

    UNION ALL

    SELECT
        'COMPANY' as contact_type,
        c.id,
        c.name,
        c.registration_number as code,
        NULL::varchar as position,
        c.email,
        c.contact_phone as phone,
        NULL::uuid as department_id,
        NULL::varchar as department_name,
        NULL::varchar as department_code,
        c.status,
        c.created_at,
        c.updated_at
    FROM companies c
    "#
)
.execute(pool)
.await?;
```

- [ ] **Step 2: 为通讯录视图创建索引**

在同一位置添加：

```rust
// 为通讯录视图查询创建索引
sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_addressbook_contact_type ON v_addressbook(contact_type)"#)
    .execute(pool)
    .await?;
sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_addressbook_name ON v_addressbook(name)"#)
    .execute(pool)
    .await?;
sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_addressbook_department_id ON v_addressbook(department_id)"#)
    .execute(pool)
    .await?;
sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_addressbook_status ON v_addressbook(status)"#)
    .execute(pool)
    .await?;
```

- [ ] **Step 3: 提交数据库层更改**

```bash
cd /Users/xingzhai/TOPEMS/services/topems-erp/backend
git add src/main.rs
git commit -m "feat(addressbook): add database view for unified addressbook

- Create v_addressbook view combining employees, departments, and companies
- Add indexes for contact_type, name, department_id, and status fields
- Support unified contact queries across all contact types"
```

---

### 任务 2: 后端模型层 - 定义数据模型

**Files:**
- Create: `services/topems-erp/backend/src/models/addressbook.rs`

- [ ] **Step 1: 创建 addressbook.rs 模型文件**

创建文件 `/Users/xingzhai/TOPEMS/services/topems-erp/backend/src/models/addressbook.rs`：

```rust
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct AddressbookEntry {
    pub contact_type: String,
    pub id: Uuid,
    pub name: String,
    pub code: Option<String>,
    pub position: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub department_id: Option<Uuid>,
    pub department_name: Option<String>,
    pub department_code: Option<String>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct AddressbookDetail {
    pub contact_type: String,
    pub id: Uuid,
    pub name: String,
    pub code: Option<String>,
    pub position: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub department_id: Option<Uuid>,
    pub department_name: Option<String>,
    pub department_code: Option<String>,
    pub status: String,
    pub hire_date: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize)]
pub struct DepartmentNode {
    pub id: Uuid,
    pub name: String,
    pub code: Option<String>,
    pub children: Vec<DepartmentNode>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AddressbookQueryParams {
    #[serde(default)]
    pub type_: Option<String>,
    pub department_id: Option<Uuid>,
    pub search: Option<String>,
    pub status: Option<String>,
    #[serde(default = "default_page")]
    pub page: i64,
    #[serde(default = "default_page_size")]
    pub page_size: i64,
    pub fields: Option<String>,
}

fn default_page() -> i64 {
    1
}

fn default_page_size() -> i64 {
    20
}

#[derive(Debug, Clone, Deserialize)]
pub struct AddressbookSearchParams {
    #[serde(rename = "type")]
    pub contact_type: Option<String>,
    pub search: Option<String>,
    #[serde(default = "default_limit")]
    pub limit: i64,
    pub fields: Option<String>,
}

fn default_limit() -> i64 {
    10
}

#[derive(Debug, Clone, Deserialize)]
pub struct ExportParams {
    #[serde(rename = "type")]
    pub contact_type: Option<String>,
    #[serde(default = "default_format")]
    pub format: String,
}

fn default_format() -> String {
    "csv".to_string()
}

#[derive(Debug, Clone, Deserialize)]
pub struct ContactDetailParams {
    #[serde(rename = "type")]
    pub contact_type: String,
}
```

- [ ] **Step 2: 在 models/mod.rs 中添加导出**

打开 `/Users/xingzhai/TOPEMS/services/topems-erp/backend/src/models/mod.rs`，在文件末尾添加：

```rust
pub mod addressbook;
pub use addressbook::*;
```

- [ ] **Step 3: 提交模型层更改**

```bash
cd /Users/xingzhai/TOPEMS/services/topems-erp/backend
git add src/models/addressbook.rs src/models/mod.rs
git commit -m "feat(addressbook): add data models for addressbook

- AddressbookEntry for list queries
- AddressbookDetail for individual contact queries
- DepartmentNode for tree structure
- Query and search parameter structs
- Export parameter structs"
```

---

### 任务 3: 后端 API 层 - 实现通讯录接口

**Files:**
- Create: `services/topems-erp/backend/src/api/addressbook.rs`

- [ ] **Step 1: 创建 addressbook.rs API 文件**

创建文件 `/Users/xingzhai/TOPEMS/services/topems-erp/backend/src/api/addressbook.rs`：

```rust
use anyhow::Result;
use axum::{
    extract::{Path, Query, State},
    http::HeaderMap,
    routing::{get},
    Json, Router,
};
use serde::Serialize;
use sqlx::postgres::PgPool;
use std::sync::Arc;
use uuid::Uuid;

use crate::models::{
    AddressbookDetail, AddressbookEntry, AddressbookQueryParams, AddressbookSearchParams,
    ContactDetailParams, DepartmentNode, ExportParams,
};
use topems_shared::{api_error, ApiResponse, PaginatedResponse};

pub struct AppState {
    pub db: PgPool,
}

pub async fn create_routes(db: PgPool) -> Result<Router> {
    let state = Arc::new(AppState { db });

    let app = Router::new()
        .route("/api/v1/addressbook", get(list_addressbook))
        .route("/api/v1/addressbook/search", get(search_addressbook))
        .route("/api/v1/addressbook/export", get(export_addressbook))
        .route(
            "/api/v1/addressbook/departments/tree",
            get(get_department_tree),
        )
        .route(
            "/api/v1/addressbook/{id}",
            get(get_contact_detail),
        )
        .with_state(state);

    Ok(app)
}

async fn list_addressbook(
    State(state): State<Arc<AppState>>,
    Query(params): Query<AddressbookQueryParams>,
) -> Json<ApiResponse<PaginatedResponse<AddressbookEntry>>> {
    let page = params.page.max(1);
    let page_size = params.page_size.min(100).max(1);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.clone().map(|s| format!("%{}%", s));

    let where_clauses = build_where_clauses(&params);

    let query = format!(
        r#"
        SELECT contact_type, id, name, code, position, email, phone,
               department_id, department_name, department_code, status,
               created_at, updated_at
        FROM v_addressbook
        WHERE {}
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
        "#,
        where_clauses
    );

    let result = sqlx::query_as::<_, AddressbookEntry>(&query)
        .bind(page_size)
        .bind(offset)
        .fetch_all(&state.db)
        .await;

    match result {
        Ok(entries) => {
            let count_query = format!(
                "SELECT COUNT(*) FROM v_addressbook WHERE {}",
                where_clauses
            );
            let total = sqlx::query_scalar::<_, i64>(&count_query)
                .fetch_one(&state.db)
                .await
                .unwrap_or(0);

            Json(ApiResponse::success(
                PaginatedResponse::new(entries, total, page, page_size),
                "获取通讯录成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取通讯录失败: {}", e);
            Json(api_error(500, "获取通讯录失败"))
        }
    }
}

fn build_where_clauses(params: &AddressbookQueryParams) -> String {
    let mut clauses = Vec::new();

    if let Some(ref type_) = params.type_ {
        clauses.push(format!("contact_type = '{}'", type_));
    }

    if let Some(department_id) = params.department_id {
        clauses.push(format!("department_id = '{}'", department_id));
    }

    if let Some(ref search) = params.search {
        clauses.push(format!(
            "(name ILIKE '%{}%' OR position ILIKE '%{}%' OR email ILIKE '%{}%' OR phone ILIKE '%{}%')",
            search, search, search, search
        ));
    }

    if let Some(ref status) = params.status {
        clauses.push(format!("status = '{}'", status));
    }

    if clauses.is_empty() {
        "1=1".to_string()
    } else {
        clauses.join(" AND ")
    }
}

async fn search_addressbook(
    State(state): State<Arc<AppState>>,
    Query(params): Query<AddressbookSearchParams>,
) -> Json<ApiResponse<Vec<serde_json::Value>>> {
    let limit = params.limit.min(100).max(1);
    let search_pattern = params.search.clone().map(|s| format!("%{}%", s));

    let mut query_str = String::from(
        r#"
        SELECT id, name, email, phone, department_name, position
        FROM v_addressbook
        WHERE contact_type = 'EMPLOYEE'
        "#,
    );

    if let Some(ref search) = params.search {
        query_str.push_str(&format!(
            " AND (name ILIKE '{}' OR email ILIKE '{}' OR phone ILIKE '{}')",
            search, search, search
        ));
    }

    query_str.push_str(&format!(" LIMIT {}", limit));

    let result = sqlx::query_as::<_, (Uuid, String, Option<String>, Option<String>, Option<String>, Option<String>)>(
        &query_str
    )
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(rows) => {
            let data: Vec<serde_json::Value> = rows
                .into_iter()
                .map(|(id, name, email, phone, department_name, position)| {
                    serde_json::json!({
                        "id": id,
                        "name": name,
                        "email": email,
                        "phone": phone,
                        "department_name": department_name,
                        "position": position
                    })
                })
                .collect();

            Json(ApiResponse::success(data, "搜索成功"))
        }
        Err(e) => {
            tracing::error!("搜索通讯录失败: {}", e);
            Json(api_error(500, "搜索失败"))
        }
    }
}

#[derive(Serialize)]
struct ExportRecord {
    contact_type: String,
    name: String,
    code: Option<String>,
    position: Option<String>,
    email: Option<String>,
    phone: Option<String>,
    department_name: Option<String>,
    status: String,
}

async fn export_addressbook(
    State(state): State<Arc<AppState>>,
    Query(params): Query<ExportParams>,
) -> Result<Json<ApiResponse<String>>, (axum::http::StatusCode, String)> {
    let contact_type_filter = params
        .contact_type
        .as_ref()
        .map(|t| format!("WHERE contact_type = '{}'", t))
        .unwrap_or_else(|| String::from(""));

    let query_str = format!(
        r#"
        SELECT contact_type, name, code, position, email, phone, department_name, status
        FROM v_addressbook
        {}
        ORDER BY contact_type, name
        "#,
        contact_type_filter
    );

    let result = sqlx::query_as::<_, ExportRecord>(&query_str)
        .fetch_all(&state.db)
        .await
        .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let csv_content = generate_csv(&result);

    Ok(Json(ApiResponse::success(csv_content, "导出成功")))
}

fn generate_csv(records: &[ExportRecord]) -> String {
    let mut csv = String::from("类型,姓名,编码,职位,邮箱,电话,部门,状态\n");

    for record in records {
        csv.push_str(&format!(
            "{},{},{},{},{},{},{},{}\n",
            record.contact_type,
            record.name,
            record.code.as_deref().unwrap_or(""),
            record.position.as_deref().unwrap_or(""),
            record.email.as_deref().unwrap_or(""),
            record.phone.as_deref().unwrap_or(""),
            record.department_name.as_deref().unwrap_or(""),
            record.status
        ));
    }

    csv
}

async fn get_department_tree(
    State(state): State<Arc<AppState>>,
) -> Json<ApiResponse<Vec<DepartmentNode>>> {
    let result = sqlx::query_as::<_, (Uuid, String, Option<String>, Option<Uuid>)>(
        r#"
        SELECT id, name, code, parent_id
        FROM departments
        WHERE status = 'active'
        ORDER BY name
        "#,
    )
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(rows) => {
            let tree = build_department_tree(rows);
            Json(ApiResponse::success(tree, "获取部门树成功"))
        }
        Err(e) => {
            tracing::error!("获取部门树失败: {}", e);
            Json(api_error(500, "获取部门树失败"))
        }
    }
}

fn build_department_tree(
    departments: Vec<(Uuid, String, Option<String>, Option<Uuid>)>,
) -> Vec<DepartmentNode> {
    use std::collections::HashMap;

    let mut node_map: HashMap<Uuid, DepartmentNode> = HashMap::new();
    let mut children_map: HashMap<Uuid, Vec<Uuid>> = HashMap::new();
    let mut root_ids: Vec<Uuid> = Vec::new();

    for (id, name, code, parent_id) in departments {
        let node = DepartmentNode {
            id,
            name,
            code,
            children: Vec::new(),
        };
        node_map.insert(id, node);

        match parent_id {
            Some(pid) => {
                children_map.entry(pid).or_default().push(id);
            }
            None => {
                root_ids.push(id);
            }
        }
    }

    for (parent_id, child_ids) in children_map {
        if let Some(parent) = node_map.get_mut(&parent_id) {
            for child_id in child_ids {
                if let Some(child) = node_map.remove(&child_id) {
                    parent.children.push(child);
                }
            }
        }
    }

    root_ids
        .into_iter()
        .filter_map(|id| node_map.remove(&id))
        .collect()
}

async fn get_contact_detail(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    Query(params): Query<ContactDetailParams>,
) -> Json<ApiResponse<AddressbookDetail>> {
    let query = match params.contact_type.as_str() {
        "EMPLOYEE" => format!(
            r#"
            SELECT 'EMPLOYEE' as contact_type, e.id, e.name, e.employee_number as code,
                   e.position, e.email, e.phone, e.department_id, d.name as department_name,
                   d.code as department_code, e.status, e.hire_date, e.created_at, e.updated_at
            FROM employees e
            LEFT JOIN departments d ON e.department_id = d.id
            WHERE e.id = '{}'
            "#,
            id
        ),
        "DEPARTMENT" => format!(
            r#"
            SELECT 'DEPARTMENT' as contact_type, d.id, d.name, d.code, NULL as position,
                   NULL as email, NULL as phone, d.parent_id as department_id,
                   p.name as department_name, p.code as department_code, d.status,
                   NULL as hire_date, d.created_at, d.updated_at
            FROM departments d
            LEFT JOIN departments p ON d.parent_id = p.id
            WHERE d.id = '{}'
            "#,
            id
        ),
        "COMPANY" => format!(
            r#"
            SELECT 'COMPANY' as contact_type, c.id, c.name, c.registration_number as code,
                   NULL as position, c.email, c.contact_phone as phone, NULL as department_id,
                   NULL as department_name, NULL as department_code, c.status,
                   NULL as hire_date, c.created_at, c.updated_at
            FROM companies c
            WHERE c.id = '{}'
            "#,
            id
        ),
        _ => {
            return Json(api_error(400, "无效的联系人类型"));
        }
    };

    let result = sqlx::query_as::<_, AddressbookDetail>(&query)
        .fetch_optional(&state.db)
        .await;

    match result {
        Ok(Some(detail)) => Json(ApiResponse::success(detail, "获取联系人详情成功")),
        Ok(None) => Json(api_error(404, "联系人不存在")),
        Err(e) => {
            tracing::error!("获取联系人详情失败: {}", e);
            Json(api_error(500, "获取联系人详情失败"))
        }
    }
}
```

- [ ] **Step 2: 在 api/mod.rs 中添加导出**

打开 `/Users/xingzhai/TOPEMS/services/topems-erp/backend/src/api/mod.rs`，在末尾添加：

```rust
pub mod addressbook;
```

- [ ] **Step 3: 在 main.rs 中注册路由**

打开 `/Users/xingzhai/TOPEMS/services/topems-erp/backend/src/main.rs`，找到 `let protected_routes = Router::new()` 部分（约第 92 行），在 `.merge(api::company::create_routes(pool.clone()).await?)` 之后添加：

```rust
.merge(api::addressbook::create_routes(pool.clone()).await?)
```

- [ ] **Step 4: 编译检查**

```bash
cd /Users/xingzhai/TOPEMS/services/topems-erp/backend
cargo check 2>&1 | head -50
```

预期：如果编译失败，记录错误信息并修复

- [ ] **Step 5: 提交 API 层更改**

```bash
cd /Users/xingzhai/TOPEMS/services/topems-erp/backend
git add src/api/addressbook.rs src/api/mod.rs src/main.rs
git commit -m "feat(addressbook): implement RESTful API for addressbook

- GET /api/v1/addressbook - List contacts with pagination and filters
- GET /api/v1/addressbook/search - Quick search for other modules
- GET /api/v1/addressbook/export - Export contacts to CSV
- GET /api/v1/addressbook/departments/tree - Get department tree structure
- GET /api/v1/addressbook/{id} - Get contact detail by type"
```

---

### 任务 4: 前端类型定义

**Files:**
- Create: `services/topems-erp/frontend/src/types/addressbook.ts`

- [ ] **Step 1: 创建 TypeScript 类型定义文件**

创建文件 `/Users/xingzhai/TOPEMS/services/topems-erp/frontend/src/types/addressbook.ts`：

```typescript
export type ContactType = 'EMPLOYEE' | 'DEPARTMENT' | 'COMPANY';

export interface AddressbookEntry {
  contact_type: ContactType;
  id: string;
  name: string;
  code?: string;
  position?: string;
  email?: string;
  phone?: string;
  department_id?: string;
  department_name?: string;
  department_code?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface AddressbookDetail extends AddressbookEntry {
  hire_date?: string;
}

export interface DepartmentNode {
  id: string;
  name: string;
  code?: string;
  children: DepartmentNode[];
}

export interface AddressbookQueryParams {
  type?: ContactType;
  department_id?: string;
  search?: string;
  status?: string;
  page?: number;
  page_size?: number;
  fields?: string;
}

export interface AddressbookSearchParams {
  type?: ContactType;
  search: string;
  limit?: number;
  fields?: string;
}

export interface ExportParams {
  type?: ContactType;
  format?: 'csv' | 'xlsx';
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}
```

- [ ] **Step 2: 提交类型定义**

```bash
cd /Users/xingzhai/TOPEMS/services/topems-erp/frontend
mkdir -p src/types
git add src/types/addressbook.ts
git commit -m "feat(addressbook): add TypeScript type definitions for addressbook"
```

---

### 任务 5: 前端 API 客户端

**Files:**
- Create: `services/topems-erp/frontend/src/api/addressbook.ts`

- [ ] **Step 1: 创建 API 调用封装**

创建文件 `/Users/xingzhai/TOPEMS/services/topems-erp/frontend/src/api/addressbook.ts`：

```typescript
import apiClient from './client';
import type {
  AddressbookEntry,
  AddressbookDetail,
  AddressbookQueryParams,
  AddressbookSearchParams,
  ApiResponse,
  DepartmentNode,
  ExportParams,
  PaginatedResponse,
} from '../types/addressbook';

export const addressbookApi = {
  getContacts: async (
    params: AddressbookQueryParams
  ): Promise<ApiResponse<PaginatedResponse<AddressbookEntry>>> => {
    const response = await apiClient.get('/api/v1/addressbook', { params });
    return response.data;
  },

  getContactDetail: async (
    id: string,
    contactType: string
  ): Promise<ApiResponse<AddressbookDetail>> => {
    const response = await apiClient.get(`/api/v1/addressbook/${id}`, {
      params: { type: contactType },
    });
    return response.data;
  },

  search: async (
    params: AddressbookSearchParams
  ): Promise<ApiResponse<any[]>> => {
    const response = await apiClient.get('/api/v1/addressbook/search', {
      params,
    });
    return response.data;
  },

  getDepartmentTree: async (): Promise<ApiResponse<DepartmentNode[]>> => {
    const response = await apiClient.get(
      '/api/v1/addressbook/departments/tree'
    );
    return response.data;
  },

  exportContacts: async (
    params: ExportParams
  ): Promise<Blob> => {
    const response = await apiClient.get('/api/v1/addressbook/export', {
      params,
      responseType: 'blob',
    });
    return response.data;
  },
};
```

- [ ] **Step 2: 提交 API 客户端**

```bash
cd /Users/xingzhai/TOPEMS/services/topems-erp/frontend
git add src/api/addressbook.ts
git commit -m "feat(addressbook): add API client for addressbook"
```

---

### 任务 6: 前端组件 - 联系人卡片

**Files:**
- Create: `services/topems-erp/frontend/src/components/addressbook/ContactCard.tsx`

- [ ] **Step 1: 创建 ContactCard 组件**

创建文件 `/Users/xingzhai/TOPEMS/services/topems-erp/frontend/src/components/addressbook/ContactCard.tsx`：

```typescript
import React from 'react';
import type { AddressbookEntry } from '../../types/addressbook';

interface ContactCardProps {
  contact: AddressbookEntry;
  onClick: (contact: AddressbookEntry) => void;
}

const ContactCard: React.FC<ContactCardProps> = ({ contact, onClick }) => {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'EMPLOYEE':
        return '👤';
      case 'DEPARTMENT':
        return '🏢';
      case 'COMPANY':
        return '🏛️';
      default:
        return '📇';
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; color: string }> = {
      active: { label: '活跃', color: 'bg-green-100 text-green-800' },
      inactive: { label: '停用', color: 'bg-gray-100 text-gray-800' },
    };
    const config = statusMap[status] || {
      label: status,
      color: 'bg-gray-100 text-gray-800',
    };
    return (
      <span
        className={`px-2 py-1 text-xs font-medium rounded-full ${config.color}`}
      >
        {config.label}
      </span>
    );
  };

  return (
    <div
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onClick(contact)}
    >
      <div className="flex items-start space-x-3">
        <div className="text-2xl">{getTypeIcon(contact.contact_type)}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900 truncate">
              {contact.name}
            </h3>
            {getStatusBadge(contact.status)}
          </div>

          {contact.position && (
            <p className="text-sm text-gray-500 mt-1">{contact.position}</p>
          )}

          {contact.department_name && (
            <p className="text-sm text-gray-400 mt-1">
              🏢 {contact.department_name}
            </p>
          )}

          <div className="mt-2 space-y-1">
            {contact.email && (
              <p className="text-xs text-gray-500 flex items-center">
                <span className="mr-1">📧</span>
                <span className="truncate">{contact.email}</span>
              </p>
            )}
            {contact.phone && (
              <p className="text-xs text-gray-500 flex items-center">
                <span className="mr-1">📱</span>
                {contact.phone}
              </p>
            )}
          </div>

          <div className="mt-2 text-xs text-gray-400">
            {contact.contact_type === 'EMPLOYEE' && contact.code && (
              <span>工号: {contact.code}</span>
            )}
            {contact.contact_type === 'DEPARTMENT' && contact.code && (
              <span>编码: {contact.code}</span>
            )}
            {contact.contact_type === 'COMPANY' && contact.code && (
              <span>注册号: {contact.code}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactCard;
```

- [ ] **Step 2: 提交联系人卡片组件**

```bash
cd /Users/xingzhai/TOPEMS/services/topems-erp/frontend
mkdir -p src/components/addressbook
git add src/components/addressbook/ContactCard.tsx
git commit -m "feat(addressbook): add ContactCard component"
```

---

### 任务 7: 前端组件 - 详情弹窗

**Files:**
- Create: `services/topems-erp/frontend/src/components/addressbook/ContactDetailModal.tsx`

- [ ] **Step 1: 创建 ContactDetailModal 组件**

创建文件 `/Users/xingzhai/TOPEMS/services/topems-erp/frontend/src/components/addressbook/ContactDetailModal.tsx`：

```typescript
import React from 'react';
import type { AddressbookDetail } from '../../types/addressbook';

interface ContactDetailModalProps {
  contact: AddressbookDetail | null;
  isOpen: boolean;
  onClose: () => void;
}

const ContactDetailModal: React.FC<ContactDetailModalProps> = ({
  contact,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !contact) return null;

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      EMPLOYEE: '员工',
      DEPARTMENT: '部门',
      COMPANY: '公司',
    };
    return labels[type] || type;
  };

  const handleEmailClick = () => {
    if (contact.email) {
      window.location.href = `mailto:${contact.email}`;
    }
  };

  const handlePhoneClick = () => {
    if (contact.phone) {
      window.location.href = `tel:${contact.phone}`;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="text-lg font-medium text-gray-900">联系人详情</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <span className="sr-only">关闭</span>
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div className="flex items-center space-x-4">
              <div className="text-4xl">
                {contact.contact_type === 'EMPLOYEE' && '👤'}
                {contact.contact_type === 'DEPARTMENT' && '🏢'}
                {contact.contact_type === 'COMPANY' && '🏛️'}
              </div>
              <div>
                <h4 className="text-xl font-semibold text-gray-900">
                  {contact.name}
                </h4>
                <p className="text-sm text-gray-500">{getTypeLabel(contact.contact_type)}</p>
              </div>
            </div>

            <div className="space-y-3">
              {contact.position && (
                <div className="flex items-center">
                  <span className="w-20 text-sm text-gray-500">职位</span>
                  <span className="text-sm text-gray-900">{contact.position}</span>
                </div>
              )}

              {contact.department_name && (
                <div className="flex items-center">
                  <span className="w-20 text-sm text-gray-500">部门</span>
                  <span className="text-sm text-gray-900">{contact.department_name}</span>
                </div>
              )}

              {contact.email && (
                <div className="flex items-center">
                  <span className="w-20 text-sm text-gray-500">邮箱</span>
                  <button
                    onClick={handleEmailClick}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    {contact.email}
                  </button>
                </div>
              )}

              {contact.phone && (
                <div className="flex items-center">
                  <span className="w-20 text-sm text-gray-500">电话</span>
                  <button
                    onClick={handlePhoneClick}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    {contact.phone}
                  </button>
                </div>
              )}

              {contact.code && (
                <div className="flex items-center">
                  <span className="w-20 text-sm text-gray-500">编码</span>
                  <span className="text-sm text-gray-900">{contact.code}</span>
                </div>
              )}

              <div className="flex items-center">
                <span className="w-20 text-sm text-gray-500">状态</span>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${
                    contact.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {contact.status === 'active' ? '活跃' : '停用'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 p-4 border-t bg-gray-50">
            {contact.email && (
              <button
                onClick={handleEmailClick}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
              >
                📧 发送邮件
              </button>
            )}
            {contact.phone && (
              <button
                onClick={handlePhoneClick}
                className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700"
              >
                📞 拨打电话
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactDetailModal;
```

- [ ] **Step 2: 提交详情弹窗组件**

```bash
cd /Users/xingzhai/TOPEMS/services/topems-erp/frontend
git add src/components/addressbook/ContactDetailModal.tsx
git commit -m "feat(addressbook): add ContactDetailModal component"
```

---

### 任务 8: 前端组件 - 左侧边栏

**Files:**
- Create: `services/topems-erp/frontend/src/components/addressbook/AddressbookSidebar.tsx`

- [ ] **Step 1: 创建 AddressbookSidebar 组件**

创建文件 `/Users/xingzhai/TOPEMS/services/topems-erp/frontend/src/components/addressbook/AddressbookSidebar.tsx`：

```typescript
import React, { useState } from 'react';
import type { DepartmentNode, ContactType } from '../../types/addressbook';

interface AddressbookSidebarProps {
  departmentTree: DepartmentNode[];
  selectedDepartmentId: string | null;
  selectedType: ContactType | null;
  onDepartmentSelect: (departmentId: string | null) => void;
  onTypeSelect: (type: ContactType | null) => void;
}

const AddressbookSidebar: React.FC<AddressbookSidebarProps> = ({
  departmentTree,
  selectedDepartmentId,
  selectedType,
  onDepartmentSelect,
  onTypeSelect,
}) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const renderTreeNode = (node: DepartmentNode, level: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes.has(node.id);
    const isSelected = selectedDepartmentId === node.id;

    return (
      <div key={node.id}>
        <div
          className={`flex items-center py-2 px-3 cursor-pointer hover:bg-gray-100 rounded-md ${
            isSelected ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
          }`}
          style={{ paddingLeft: `${level * 1.5 + 0.75}rem` }}
          onClick={() => onDepartmentSelect(node.id)}
        >
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleNode(node.id);
              }}
              className="mr-1 text-gray-400 hover:text-gray-600"
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          ) : (
            <span className="mr-1 w-3" />
          )}
          <span className="flex-1 text-sm truncate">{node.name}</span>
          {hasChildren && (
            <span className="text-xs text-gray-400">{node.children.length}</span>
          )}
        </div>
        {hasChildren && isExpanded && (
          <div>
            {node.children.map((child) => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const typeOptions: { type: ContactType | null; label: string }[] = [
    { type: null, label: '全部' },
    { type: 'EMPLOYEE', label: '员工' },
    { type: 'DEPARTMENT', label: '部门' },
    { type: 'COMPANY', label: '公司' },
  ];

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-full overflow-y-auto">
      <div className="p-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          快速筛选
        </h3>
        <div className="space-y-1">
          {typeOptions.map(({ type, label }) => (
            <button
              key={type || 'all'}
              onClick={() => onTypeSelect(type)}
              className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                selectedType === type
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {type === null && '📇 '}
              {type === 'EMPLOYEE' && '👤 '}
              {type === 'DEPARTMENT' && '🏢 '}
              {type === 'COMPANY' && '🏛️ '}
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-gray-200 p-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          部门结构
        </h3>
        <button
          onClick={() => onDepartmentSelect(null)}
          className={`w-full text-left px-3 py-2 text-sm rounded-md mb-2 transition-colors ${
            selectedDepartmentId === null
              ? 'bg-blue-50 text-blue-700 font-medium'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          🏢 所有部门
        </button>
        <div className="space-y-1">
          {departmentTree.map((node) => renderTreeNode(node))}
        </div>
      </div>
    </div>
  );
};

export default AddressbookSidebar;
```

- [ ] **Step 2: 提交左侧边栏组件**

```bash
cd /Users/xingzhai/TOPEMS/services/topems-erp/frontend
git add src/components/addressbook/AddressbookSidebar.tsx
git commit -m "feat(addressbook): add AddressbookSidebar component with department tree"
```

---

### 任务 9: 前端组件 - 顶部工具栏和筛选栏

**Files:**
- Create: `services/topems-erp/frontend/src/components/addressbook/AddressbookHeader.tsx`
- Create: `services/topems-erp/frontend/src/components/addressbook/AddressbookFilters.tsx`

- [ ] **Step 1: 创建 AddressbookHeader 组件**

创建文件 `/Users/xingzhai/TOPEMS/services/topems-erp/frontend/src/components/addressbook/AddressbookHeader.tsx`：

```typescript
import React, { useState } from 'react';
import { addressbookApi } from '../../api/addressbook';
import type { ContactType, ExportParams } from '../../types/addressbook';

interface AddressbookHeaderProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  selectedType: ContactType | null;
}

const AddressbookHeader: React.FC<AddressbookHeaderProps> = ({
  searchValue,
  onSearchChange,
  selectedType,
}) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const params: ExportParams = {
        type: selectedType || undefined,
        format: 'csv',
      };
      const blob = await addressbookApi.exportContacts(params);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `addressbook-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('导出失败:', error);
      alert('导出失败，请重试');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex-1 max-w-lg">
          <div className="relative">
            <input
              type="text"
              placeholder="搜索姓名、职位、电话、邮箱..."
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
          </div>
        </div>

        <div className="ml-4">
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            {isExporting ? '导出中...' : '📥 导出'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddressbookHeader;
```

- [ ] **Step 2: 创建 AddressbookFilters 组件**

创建文件 `/Users/xingzhai/TOPEMS/services/topems-erp/frontend/src/components/addressbook/AddressbookFilters.tsx`：

```typescript
import React from 'react';
import type { ContactType } from '../../types/addressbook';

interface AddressbookFiltersProps {
  selectedType: ContactType | null;
  selectedStatus: string | null;
  onTypeChange: (type: ContactType | null) => void;
  onStatusChange: (status: string | null) => void;
}

const AddressbookFilters: React.FC<AddressbookFiltersProps> = ({
  selectedType,
  selectedStatus,
  onTypeChange,
  onStatusChange,
}) => {
  const typeOptions: { type: ContactType | null; label: string }[] = [
    { type: null, label: '全部' },
    { type: 'EMPLOYEE', label: '员工' },
    { type: 'DEPARTMENT', label: '部门' },
    { type: 'COMPANY', label: '公司' },
  ];

  const statusOptions = [
    { value: null, label: '全部状态' },
    { value: 'active', label: '活跃' },
    { value: 'inactive', label: '停用' },
  ];

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-3">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">类型:</span>
          <div className="flex space-x-1">
            {typeOptions.map(({ type, label }) => (
              <button
                key={type || 'all'}
                onClick={() => onTypeChange(type)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  selectedType === type
                    ? 'bg-blue-100 text-blue-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="h-6 w-px bg-gray-300" />

        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">状态:</span>
          <select
            value={selectedStatus || ''}
            onChange={(e) => onStatusChange(e.target.value || null)}
            className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          >
            {statusOptions.map(({ value, label }) => (
              <option key={value || 'all'} value={value || ''}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default AddressbookFilters;
```

- [ ] **Step 3: 提交工具栏和筛选组件**

```bash
cd /Users/xingzhai/TOPEMS/services/topems-erp/frontend
git add src/components/addressbook/AddressbookHeader.tsx src/components/addressbook/AddressbookFilters.tsx
git commit -m "feat(addressbook): add AddressbookHeader and AddressbookFilters components"
```

---

### 任务 10: 前端组件 - 联系人列表

**Files:**
- Create: `services/topems-erp/frontend/src/components/addressbook/AddressbookList.tsx`

- [ ] **Step 1: 创建 AddressbookList 组件**

创建文件 `/Users/xingzhai/TOPEMS/services/topems-erp/frontend/src/components/addressbook/AddressbookList.tsx`：

```typescript
import React from 'react';
import ContactCard from './ContactCard';
import type { AddressbookEntry } from '../../types/addressbook';

interface AddressbookListProps {
  contacts: AddressbookEntry[];
  loading: boolean;
  onContactClick: (contact: AddressbookEntry) => void;
}

const AddressbookList: React.FC<AddressbookListProps> = ({
  contacts,
  loading,
  onContactClick,
}) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (contacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="text-6xl mb-4">📇</div>
        <p className="text-gray-500">暂无联系人</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {contacts.map((contact) => (
          <ContactCard
            key={`${contact.contact_type}-${contact.id}`}
            contact={contact}
            onClick={onContactClick}
          />
        ))}
      </div>
    </div>
  );
};

export default AddressbookList;
```

- [ ] **Step 2: 提交列表组件**

```bash
cd /Users/xingzhai/TOPEMS/services/topems-erp/frontend
git add src/components/addressbook/AddressbookList.tsx
git commit -m "feat(addressbook): add AddressbookList component"
```

---

### 任务 11: 前端页面 - 通讯录主页面

**Files:**
- Create: `services/topems-erp/frontend/src/pages/AddressbookPage.tsx`

- [ ] **Step 1: 创建 AddressbookPage 主页面**

创建文件 `/Users/xingzhai/TOPEMS/services/topems-erp/frontend/src/pages/AddressbookPage.tsx`：

```typescript
import React, { useEffect, useState, useCallback } from 'react';
import { addressbookApi } from '../api/addressbook';
import AddressbookSidebar from '../components/addressbook/AddressbookSidebar';
import AddressbookHeader from '../components/addressbook/AddressbookHeader';
import AddressbookFilters from '../components/addressbook/AddressbookFilters';
import AddressbookList from '../components/addressbook/AddressbookList';
import ContactDetailModal from '../components/addressbook/ContactDetailModal';
import type {
  AddressbookEntry,
  AddressbookDetail,
  DepartmentNode,
  ContactType,
} from '../types/addressbook';

const AddressbookPage: React.FC = () => {
  const [contacts, setContacts] = useState<AddressbookEntry[]>([]);
  const [departmentTree, setDepartmentTree] = useState<DepartmentNode[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(true);

  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<ContactType | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [selectedContact, setSelectedContact] = useState<AddressbookDetail | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const fetchContacts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await addressbookApi.getContacts({
        type: selectedType || undefined,
        department_id: selectedDepartmentId || undefined,
        status: selectedStatus || undefined,
        search: search || undefined,
        page,
        page_size: pageSize,
      });

      if (response.success) {
        setContacts(response.data.items);
        setTotal(response.data.total);
      }
    } catch (error) {
      console.error('获取通讯录失败:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedType, selectedDepartmentId, selectedStatus, search, page, pageSize]);

  const fetchDepartmentTree = useCallback(async () => {
    try {
      const response = await addressbookApi.getDepartmentTree();
      if (response.success) {
        setDepartmentTree(response.data);
      }
    } catch (error) {
      console.error('获取部门树失败:', error);
    }
  }, []);

  useEffect(() => {
    fetchDepartmentTree();
  }, [fetchDepartmentTree]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const handleContactClick = async (contact: AddressbookEntry) => {
    try {
      const response = await addressbookApi.getContactDetail(
        contact.id,
        contact.contact_type
      );
      if (response.success) {
        setSelectedContact(response.data);
        setDetailModalOpen(true);
      }
    } catch (error) {
      console.error('获取联系人详情失败:', error);
    }
  };

  const handleDepartmentSelect = (departmentId: string | null) => {
    setSelectedDepartmentId(departmentId);
    setPage(1);
  };

  const handleTypeSelect = (type: ContactType | null) => {
    setSelectedType(type);
    setPage(1);
  };

  const handleStatusChange = (status: string | null) => {
    setSelectedStatus(status);
    setPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="flex h-screen bg-gray-50">
      <AddressbookSidebar
        departmentTree={departmentTree}
        selectedDepartmentId={selectedDepartmentId}
        selectedType={selectedType}
        onDepartmentSelect={handleDepartmentSelect}
        onTypeSelect={handleTypeSelect}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <AddressbookHeader
          searchValue={search}
          onSearchChange={handleSearchChange}
          selectedType={selectedType}
        />

        <AddressbookFilters
          selectedType={selectedType}
          selectedStatus={selectedStatus}
          onTypeChange={handleTypeSelect}
          onStatusChange={handleStatusChange}
        />

        <div className="flex-1 overflow-y-auto">
          <AddressbookList
            contacts={contacts}
            loading={loading}
            onContactClick={handleContactClick}
          />
        </div>

        {totalPages > 1 && (
          <div className="bg-white border-t border-gray-200 px-6 py-3 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              共 {total} 条记录，第 {page} / {totalPages} 页
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 hover:bg-gray-50"
              >
                上一页
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 hover:bg-gray-50"
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>

      <ContactDetailModal
        contact={selectedContact}
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedContact(null);
        }}
      />
    </div>
  );
};

export default AddressbookPage;
```

- [ ] **Step 2: 提交通讯录主页面**

```bash
cd /Users/xingzhai/TOPEMS/services/topems-erp/frontend
git add src/pages/AddressbookPage.tsx
git commit -m "feat(addressbook): add AddressbookPage main page"
```

---

### 任务 12: 路由配置

**Files:**
- Modify: `services/topems-erp/frontend/src/App.tsx`

- [ ] **Step 1: 在 App.tsx 中添加路由配置**

打开 `/Users/xingzhai/TOPEMS/services/topems-erp/frontend/src/App.tsx`，找到路由配置部分（约第 20-30 行），在现有路由后添加：

```typescript
import AddressbookPage from './pages/AddressbookPage';

// 在路由配置数组中添加
{
  path: '/addressbook',
  element: <AddressbookPage />,
},
```

- [ ] **Step 2: 提交路由配置**

```bash
cd /Users/xingzhai/TOPEMS/services/topems-erp/frontend
git add src/App.tsx
git commit -m "feat(addressbook): add route configuration for addressbook page"
```

---

### 任务 13: 编译和测试

- [ ] **Step 1: 编译后端**

```bash
cd /Users/xingzhai/TOPEMS/services/topems-erp/backend
cargo build 2>&1 | tail -20
```

预期：编译成功，无错误

- [ ] **Step 2: 编译前端**

```bash
cd /Users/xingzhai/TOPEMS/services/topems-erp/frontend
npm run build 2>&1 | tail -30
```

预期：编译成功，无错误

- [ ] **Step 3: 测试后端 API**

```bash
cd /Users/xingzhai/TOPEMS/services/topems-erp/backend
# 启动后端服务（后台运行）
cargo run &
sleep 5

# 测试通讯录 API
curl -s http://localhost:8009/api/v1/addressbook | head -20
curl -s http://localhost:8009/api/v1/addressbook/departments/tree | head -20
```

预期：返回 JSON 格式的通讯录数据

- [ ] **Step 4: 提交所有更改**

```bash
cd /Users/xingzhai/TOPEMS
git add .
git commit -m "feat: implement complete addressbook feature

- Backend: database view, models, RESTful APIs
- Frontend: TypeScript types, API client, components, page
- Integration: routing and navigation

Closes #addressbook-feature"
```

---

## 3. 实施检查清单

### 3.1 功能验收
- [ ] 数据库视图创建成功
- [ ] API 接口返回正确数据
- [ ] 前端页面正常加载
- [ ] 搜索和筛选功能正常
- [ ] 详情弹窗正常显示
- [ ] 导出功能正常
- [ ] 部门树正常显示和交互

### 3.2 代码质量验收
- [ ] 后端编译无警告
- [ ] 前端编译无警告
- [ ] TypeScript 类型检查通过
- [ ] Git 提交信息规范

### 3.3 文档更新
- [ ] 更新 API 文档
- [ ] 更新前端组件文档

---

## 4. 后续工作（可选）

完成基础功能后，可以考虑以下增强：

1. **性能优化**：添加虚拟滚动、搜索防抖
2. **UI 增强**：添加卡片/列表视图切换、排序功能
3. **权限控制**：集成权限系统
4. **第三方集成**：添加飞书/Lark 通讯录同步
5. **高级功能**：收藏夹、最近联系、组织架构图

---

**计划完成时间**：约 2-3 小时
**难度等级**：中等
**依赖项**：无
