# TOPEMS 模板管理系统实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现统一的模板管理系统，支持工作流、文档、表单、报表、通知等多种模板类型的创建、管理和应用

**Architecture:** 基于现有的 doc 服务扩展模板管理功能，新增独立的模板服务，使用 PostgreSQL 存储模板数据，前端采用 React + TypeScript 实现模板管理和应用界面

**Tech Stack:** 
- 后端: Rust (Axum), PostgreSQL (sqlx)
- 前端: React, TypeScript, Tailwind CSS, TanStack Query
- 模板引擎: Handlebars/Mustache
- AI: OpenAI API

---

## 第一阶段：数据库层

### 1.1 创建数据库迁移脚本

**Files:**
- Create: `svc/doc/src/db/migrations/20260613000001_extend_templates.sql`

```sql
-- 扩展 templates 表，添加新字段
ALTER TABLE templates ADD COLUMN IF NOT EXISTS type VARCHAR(50) NOT NULL DEFAULT 'document';
ALTER TABLE templates ADD COLUMN IF NOT EXISTS module VARCHAR(100);
ALTER TABLE templates ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS ai_enabled BOOLEAN DEFAULT false;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS use_count INTEGER DEFAULT 0;

-- 创建模板分类表
CREATE TABLE IF NOT EXISTS template_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    type VARCHAR(50) NOT NULL,
    icon VARCHAR(50),
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建模板变量表
CREATE TABLE IF NOT EXISTS template_variables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES templates(id) ON DELETE CASCADE,
    key VARCHAR(100) NOT NULL,
    label VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'string',
    required BOOLEAN DEFAULT false,
    default_value JSONB,
    options JSONB,
    data_source VARCHAR(255),
    validation_rules JSONB,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建模板实例表
CREATE TABLE IF NOT EXISTS template_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES templates(id),
    instance_type VARCHAR(50) NOT NULL,
    instance_id VARCHAR(100) NOT NULL,
    variables_values JSONB,
    rendered_content TEXT,
    created_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建模板版本表
CREATE TABLE IF NOT EXISTS template_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES templates(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    content TEXT NOT NULL,
    variables JSONB,
    change_summary TEXT,
    created_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_templates_type ON templates(type);
CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category_id);
CREATE INDEX IF NOT EXISTS idx_templates_module ON templates(module);
CREATE INDEX IF NOT EXISTS idx_templates_is_active ON templates(is_active);
CREATE INDEX IF NOT EXISTS idx_templates_is_public ON templates(is_public);
CREATE INDEX IF NOT EXISTS idx_variables_template ON template_variables(template_id);
CREATE INDEX IF NOT EXISTS idx_instances_template ON template_instances(template_id);
CREATE INDEX IF NOT EXISTS idx_instances_type ON template_instances(instance_type);
CREATE INDEX IF NOT EXISTS idx_versions_template ON template_versions(template_id);

-- 创建审计日志表
CREATE TABLE IF NOT EXISTS template_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID,
    action VARCHAR(50) NOT NULL,
    old_value JSONB,
    new_value JSONB,
    performed_by VARCHAR(100),
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 插入默认分类
INSERT INTO template_categories (name, code, type, icon, description, sort_order) VALUES
    ('审批流程', 'approval', 'workflow', 'git-branch', '各类审批流程模板', 1),
    ('合同协议', 'contract', 'document', 'file-text', '合同协议文档模板', 2),
    ('数据表单', 'form', 'form', 'layout', '数据收集表单模板', 3),
    ('分析报表', 'report', 'report', 'bar-chart', '数据报表模板', 4),
    ('通知消息', 'notification', 'notification', 'bell', '通知消息模板', 5)
ON CONFLICT (code) DO NOTHING;
```

- [ ] **Step 1: 创建迁移脚本**

路径: `svc/doc/src/db/migrations/20260613000001_extend_templates.sql`

- [ ] **Step 2: 更新 main.rs 引入迁移脚本**

Modify: `svc/doc/src/main.rs` 在 migrations 数组中添加新的迁移

```rust
(
    "扩展模板表结构",
    include_str!("./db/migrations/20260613000001_extend_templates.sql"),
),
```

- [ ] **Step 3: 运行迁移验证**

Run: `cargo run --bin topems-doc` 
Expected: 数据库迁移成功执行，新表和索引创建完成

- [ ] **Step 4: 提交代码**

```bash
git add svc/doc/src/db/migrations/20260613000001_extend_templates.sql svc/doc/src/main.rs
git commit -m "feat(doc): 添加模板管理系统数据库表结构
- 添加 template_categories 分类表
- 添加 template_variables 变量表
- 添加 template_instances 实例表
- 添加 template_versions 版本表
- 添加 template_audit_log 审计日志表
- 添加相关索引和默认分类数据"
```

---

### 1.2 创建 Rust 模型定义

**Files:**
- Create: `svc/doc/src/models/template.rs`
- Modify: `svc/doc/src/models/mod.rs`

- [ ] **Step 1: 创建模板模型定义**

Create: `svc/doc/src/models/template.rs`

```rust
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Template {
    pub id: Uuid,
    pub name: String,
    pub code: String,
    #[sqlx(rename = "type")]
    pub template_type: String,
    pub category_id: Option<Uuid>,
    pub module: Option<String>,
    pub description: Option<String>,
    pub content: String,
    pub variables: Option<serde_json::Value>,
    pub is_active: Option<bool>,
    pub is_system: Option<bool>,
    pub is_public: Option<bool>,
    pub ai_enabled: Option<bool>,
    pub version: Option<i32>,
    pub view_count: Option<i32>,
    pub use_count: Option<i32>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub created_by: Option<String>,
    pub updated_by: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TemplateResponse {
    pub id: Uuid,
    pub name: String,
    pub code: String,
    pub template_type: String,
    pub category_id: Option<Uuid>,
    pub category_name: Option<String>,
    pub module: Option<String>,
    pub description: Option<String>,
    pub content: String,
    pub variables: Vec<TemplateVariable>,
    pub is_active: bool,
    pub is_system: bool,
    pub is_public: bool,
    pub ai_enabled: bool,
    pub version: i32,
    pub view_count: i32,
    pub use_count: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub created_by: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct TemplateCategory {
    pub id: Uuid,
    pub name: String,
    pub code: String,
    #[sqlx(rename = "type")]
    pub category_type: String,
    pub icon: Option<String>,
    pub description: Option<String>,
    pub sort_order: Option<i32>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct TemplateVariable {
    pub id: Uuid,
    pub template_id: Uuid,
    pub key: String,
    pub label: String,
    pub var_type: String,
    pub required: Option<bool>,
    pub default_value: Option<serde_json::Value>,
    pub options: Option<serde_json::Value>,
    pub data_source: Option<String>,
    pub validation_rules: Option<serde_json::Value>,
    pub sort_order: Option<i32>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TemplateVariableInput {
    pub key: String,
    pub label: String,
    pub var_type: String,
    pub required: bool,
    pub default_value: Option<serde_json::Value>,
    pub options: Option<serde_json::Value>,
    pub data_source: Option<String>,
    pub validation_rules: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct TemplateInstance {
    pub id: Uuid,
    pub template_id: Uuid,
    pub instance_type: String,
    pub instance_id: String,
    pub variables_values: Option<serde_json::Value>,
    pub rendered_content: Option<String>,
    pub created_by: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct TemplateVersion {
    pub id: Uuid,
    pub template_id: Uuid,
    pub version: i32,
    pub content: String,
    pub variables: Option<serde_json::Value>,
    pub change_summary: Option<String>,
    pub created_by: Option<String>,
    pub created_at: DateTime<Utc>,
}
```

- [ ] **Step 2: 更新 models/mod.rs 导出模型**

Modify: `svc/doc/src/models/mod.rs`

```rust
pub mod template;

pub use template::*;
```

- [ ] **Step 3: 提交代码**

```bash
git add svc/doc/src/models/template.rs svc/doc/src/models/mod.rs
git commit -m "feat(doc): 添加模板管理系统模型定义
- Template 模型及响应结构
- TemplateCategory 分类模型
- TemplateVariable 变量模型
- TemplateInstance 实例模型
- TemplateVersion 版本模型"
```

---

## 第二阶段：后端 API 层

### 2.1 创建 Repository 层

**Files:**
- Create: `svc/doc/src/db/repository/template_repository.rs`
- Modify: `svc/doc/src/db/repository/mod.rs`

- [ ] **Step 1: 创建模板 Repository**

Create: `svc/doc/src/db/repository/template_repository.rs`

```rust
use anyhow::Result;
use sqlx::PgPool;
use uuid::Uuid;
use crate::models::{Template, TemplateCategory, TemplateVariable};

pub struct TemplateRepository {
    pool: PgPool,
}

impl TemplateRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn list(
        &self,
        search: Option<&str>,
        template_type: Option<&str>,
        category_id: Option<&Uuid>,
        module: Option<&str>,
        is_active: Option<bool>,
        is_public: Option<bool>,
        limit: i64,
        offset: i64,
    ) -> Result<(Vec<Template>, i64)> {
        let mut query = String::from(
            "SELECT * FROM templates WHERE 1=1"
        );
        let mut count_query = String::from("SELECT COUNT(*) FROM templates WHERE 1=1");
        let mut conditions = Vec::new();

        if let Some(s) = search {
            let search_pattern = format!("%{}%", s);
            conditions.push(format!(" AND (name ILIKE '{}' OR code ILIKE '{}' OR description ILIKE '{}')", 
                search_pattern, search_pattern, search_pattern));
        }
        if let Some(t) = template_type {
            conditions.push(format!(" AND type = '{}'", t));
        }
        if let Some(c) = category_id {
            conditions.push(format!(" AND category_id = '{}'", c));
        }
        if let Some(m) = module {
            conditions.push(format!(" AND module = '{}'", m));
        }
        if let Some(active) = is_active {
            conditions.push(format!(" AND is_active = {}", active));
        }
        if let Some(public) = is_public {
            conditions.push(format!(" AND is_public = {}", public));
        }

        for condition in &conditions {
            query.push_str(condition);
            count_query.push_str(condition);
        }

        query.push_str(&format!(" ORDER BY created_at DESC LIMIT {} OFFSET {}", limit, offset));

        let templates = sqlx::query_as::<_, Template>(&query)
            .fetch_all(&self.pool)
            .await?;

        let total: (i64,) = sqlx::query_as(&count_query)
            .fetch_one(&self.pool)
            .await?;

        Ok((templates, total.0))
    }

    pub async fn find_by_id(&self, id: Uuid) -> Result<Option<Template>> {
        let template = sqlx::query_as::<_, Template>(
            "SELECT * FROM templates WHERE id = $1"
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;
        Ok(template)
    }

    pub async fn find_by_code(&self, code: &str) -> Result<Option<Template>> {
        let template = sqlx::query_as::<_, Template>(
            "SELECT * FROM templates WHERE code = $1"
        )
        .bind(code)
        .fetch_optional(&self.pool)
        .await?;
        Ok(template)
    }

    pub async fn create(&self, template: &Template) -> Result<Template> {
        let result = sqlx::query_as::<_, Template>(
            r#"
            INSERT INTO templates (id, name, code, type, category_id, module, description, content, variables, is_active, is_system, is_public, ai_enabled, version, view_count, use_count, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
            RETURNING *
            "#,
        )
        .bind(template.id)
        .bind(&template.name)
        .bind(&template.code)
        .bind(&template.template_type)
        .bind(&template.category_id)
        .bind(&template.module)
        .bind(&template.description)
        .bind(&template.content)
        .bind(&template.variables)
        .bind(&template.is_active)
        .bind(&template.is_system)
        .bind(&template.is_public)
        .bind(&template.ai_enabled)
        .bind(&template.version)
        .bind(&template.view_count)
        .bind(&template.use_count)
        .bind(&template.created_by)
        .fetch_one(&self.pool)
        .await?;
        Ok(result)
    }

    pub async fn update(&self, id: Uuid, template: &Template) -> Result<Option<Template>> {
        let result = sqlx::query_as::<_, Template>(
            r#"
            UPDATE templates 
            SET name = $2, code = $3, type = $4, category_id = $5, module = $6, 
                description = $7, content = $8, variables = $9, is_active = $10, 
                is_public = $11, ai_enabled = $12, updated_at = NOW()
            WHERE id = $1
            RETURNING *
            "#,
        )
        .bind(id)
        .bind(&template.name)
        .bind(&template.code)
        .bind(&template.template_type)
        .bind(&template.category_id)
        .bind(&template.module)
        .bind(&template.description)
        .bind(&template.content)
        .bind(&template.variables)
        .bind(&template.is_active)
        .bind(&template.is_public)
        .bind(&template.ai_enabled)
        .fetch_optional(&self.pool)
        .await?;
        Ok(result)
    }

    pub async fn delete(&self, id: Uuid) -> Result<bool> {
        let result = sqlx::query("DELETE FROM templates WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(result.rows_affected() > 0)
    }

    pub async fn increment_view_count(&self, id: Uuid) -> Result<()> {
        sqlx::query("UPDATE templates SET view_count = view_count + 1 WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    pub async fn increment_use_count(&self, id: Uuid) -> Result<()> {
        sqlx::query("UPDATE templates SET use_count = use_count + 1 WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }
}

pub struct TemplateCategoryRepository {
    pool: PgPool,
}

impl TemplateCategoryRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn list(&self) -> Result<Vec<TemplateCategory>> {
        let categories = sqlx::query_as::<_, TemplateCategory>(
            "SELECT * FROM template_categories ORDER BY sort_order ASC"
        )
        .fetch_all(&self.pool)
        .await?;
        Ok(categories)
    }

    pub async fn find_by_id(&self, id: Uuid) -> Result<Option<TemplateCategory>> {
        let category = sqlx::query_as::<_, TemplateCategory>(
            "SELECT * FROM template_categories WHERE id = $1"
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;
        Ok(category)
    }

    pub async fn find_by_code(&self, code: &str) -> Result<Option<TemplateCategory>> {
        let category = sqlx::query_as::<_, TemplateCategory>(
            "SELECT * FROM template_categories WHERE code = $1"
        )
        .bind(code)
        .fetch_optional(&self.pool)
        .await?;
        Ok(category)
    }

    pub async fn create(&self, category: &TemplateCategory) -> Result<TemplateCategory> {
        let result = sqlx::query_as::<_, TemplateCategory>(
            r#"
            INSERT INTO template_categories (id, name, code, type, icon, description, sort_order)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
            "#,
        )
        .bind(category.id)
        .bind(&category.name)
        .bind(&category.code)
        .bind(&category.category_type)
        .bind(&category.icon)
        .bind(&category.description)
        .bind(&category.sort_order)
        .fetch_one(&self.pool)
        .await?;
        Ok(result)
    }

    pub async fn update(&self, id: Uuid, category: &TemplateCategory) -> Result<Option<TemplateCategory>> {
        let result = sqlx::query_as::<_, TemplateCategory>(
            r#"
            UPDATE template_categories 
            SET name = $2, code = $3, type = $4, icon = $5, description = $6, sort_order = $7, updated_at = NOW()
            WHERE id = $1
            RETURNING *
            "#,
        )
        .bind(id)
        .bind(&category.name)
        .bind(&category.code)
        .bind(&category.category_type)
        .bind(&category.icon)
        .bind(&category.description)
        .bind(&category.sort_order)
        .fetch_optional(&self.pool)
        .await?;
        Ok(result)
    }

    pub async fn delete(&self, id: Uuid) -> Result<bool> {
        let result = sqlx::query("DELETE FROM template_categories WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(result.rows_affected() > 0)
    }
}
```

- [ ] **Step 2: 更新 repository/mod.rs**

Modify: `svc/doc/src/db/repository/mod.rs`

```rust
pub mod template_repository;

pub use template_repository::*;
```

- [ ] **Step 3: 提交代码**

```bash
git add svc/doc/src/db/repository/template_repository.rs svc/doc/src/db/repository/mod.rs
git commit -m "feat(doc): 添加模板 Repository 层
- TemplateRepository 实现模板 CRUD 操作
- TemplateCategoryRepository 实现分类 CRUD 操作
- 支持列表查询、分页、搜索过滤"
```

---

### 2.2 创建模板 API Handlers

**Files:**
- Create: `svc/doc/src/api/handlers/template.rs`
- Modify: `svc/doc/src/api/handlers/mod.rs`
- Modify: `svc/doc/src/main.rs`

- [ ] **Step 1: 创建模板 API Handlers**

Create: `svc/doc/src/api/handlers/template.rs`

```rust
use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use uuid::Uuid;
use crate::models::*;
use crate::db::repository::{TemplateRepository, TemplateCategoryRepository};
use crate::AppState;

#[derive(Debug, serde::Deserialize)]
pub struct ListTemplatesQuery {
    pub page: Option<u32>,
    pub page_size: Option<u32>,
    pub search: Option<String>,
    #[serde(rename = "type")]
    pub template_type: Option<String>,
    pub category: Option<Uuid>,
    pub module: Option<String>,
    pub is_active: Option<bool>,
    pub is_public: Option<bool>,
}

#[derive(Debug, serde::Deserialize)]
pub struct CreateTemplateRequest {
    pub name: String,
    pub code: String,
    #[serde(rename = "type")]
    pub template_type: String,
    pub category_id: Option<Uuid>,
    pub module: Option<String>,
    pub description: Option<String>,
    pub content: String,
    pub variables: Option<Vec<TemplateVariableInput>>,
    pub is_active: Option<bool>,
    pub is_public: Option<bool>,
    pub ai_enabled: Option<bool>,
}

#[derive(Debug, serde::Deserialize)]
pub struct UpdateTemplateRequest {
    pub name: Option<String>,
    pub code: Option<String>,
    #[serde(rename = "type")]
    pub template_type: Option<String>,
    pub category_id: Option<Uuid>,
    pub module: Option<String>,
    pub description: Option<String>,
    pub content: Option<String>,
    pub variables: Option<Vec<TemplateVariableInput>>,
    pub is_active: Option<bool>,
    pub is_public: Option<bool>,
    pub ai_enabled: Option<bool>,
}

#[derive(Debug, serde::Serialize)]
pub struct ListTemplatesResponse {
    pub items: Vec<TemplateResponse>,
    pub total: u64,
    pub page: u32,
    pub page_size: u32,
}

pub async fn list_templates(
    State(state): State<AppState>,
    Query(query): Query<ListTemplatesQuery>,
) -> Json<crate::ApiResponse<ListTemplatesResponse>> {
    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(20);
    let limit = page_size as i64;
    let offset = ((page - 1) * page_size) as i64;

    let (templates, total) = state.template_repo
        .list(
            query.search.as_deref(),
            query.template_type.as_deref(),
            query.category.as_deref(),
            query.module.as_deref(),
            query.is_active,
            query.is_public,
            limit,
            offset,
        )
        .await
        .unwrap_or_else(|e| {
            tracing::error!("获取模板列表失败: {}", e);
            (vec![], 0)
        });

    // Enrich templates with category names
    let mut items = Vec::new();
    for template in templates {
        let category_name = if let Some(cat_id) = template.category_id {
            state.template_category_repo
                .find_by_id(cat_id)
                .await
                .ok()
                .flatten()
                .map(|c| c.name)
        } else {
            None
        };

        let variables: Vec<TemplateVariable> = template.variables
            .and_then(|v| serde_json::from_value(v).ok())
            .unwrap_or_default();

        items.push(TemplateResponse {
            id: template.id,
            name: template.name,
            code: template.code,
            template_type: template.template_type,
            category_id: template.category_id,
            category_name,
            module: template.module,
            description: template.description,
            content: template.content,
            variables,
            is_active: template.is_active.unwrap_or(true),
            is_system: template.is_system.unwrap_or(false),
            is_public: template.is_public.unwrap_or(false),
            ai_enabled: template.ai_enabled.unwrap_or(false),
            version: template.version.unwrap_or(1),
            view_count: template.view_count.unwrap_or(0),
            use_count: template.use_count.unwrap_or(0),
            created_at: template.created_at,
            updated_at: template.updated_at,
            created_by: template.created_by,
        });
    }

    Json(crate::ApiResponse::success(
        ListTemplatesResponse { items, total, page, page_size },
        "获取模板列表成功",
    ))
}

pub async fn get_template(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<crate::ApiResponse<TemplateResponse>> {
    if let Some(template) = state.template_repo.find_by_id(id).await.unwrap_or(None) {
        // Increment view count
        let _ = state.template_repo.increment_view_count(id).await;

        let category_name = if let Some(cat_id) = template.category_id {
            state.template_category_repo
                .find_by_id(cat_id)
                .await
                .ok()
                .flatten()
                .map(|c| c.name)
        } else {
            None
        };

        let variables: Vec<TemplateVariable> = template.variables
            .and_then(|v| serde_json::from_value(v).ok())
            .unwrap_or_default();

        let response = TemplateResponse {
            id: template.id,
            name: template.name,
            code: template.code,
            template_type: template.template_type,
            category_id: template.category_id,
            category_name,
            module: template.module,
            description: template.description,
            content: template.content,
            variables,
            is_active: template.is_active.unwrap_or(true),
            is_system: template.is_system.unwrap_or(false),
            is_public: template.is_public.unwrap_or(false),
            ai_enabled: template.ai_enabled.unwrap_or(false),
            version: template.version.unwrap_or(1),
            view_count: template.view_count.unwrap_or(0),
            use_count: template.use_count.unwrap_or(0),
            created_at: template.created_at,
            updated_at: template.updated_at,
            created_by: template.created_by,
        };

        Json(crate::ApiResponse::success(response, "获取模板成功"))
    } else {
        Json(crate::ApiResponse::error(404, "模板不存在"))
    }
}

pub async fn create_template(
    State(state): State<AppState>,
    Json(req): Json<CreateTemplateRequest>,
) -> Json<crate::ApiResponse<TemplateResponse>> {
    let id = Uuid::new_v4();
    let now = chrono::Utc::now();
    let variables_json = if let Some(vars) = req.variables {
        serde_json::to_value(vars).ok()
    } else {
        None
    };

    let template = Template {
        id,
        name: req.name,
        code: req.code,
        template_type: req.template_type,
        category_id: req.category_id,
        module: req.module,
        description: req.description,
        content: req.content,
        variables: variables_json,
        is_active: req.is_active.or(Some(true)),
        is_system: Some(false),
        is_public: req.is_public.or(Some(false)),
        ai_enabled: req.ai_enabled.or(Some(false)),
        version: Some(1),
        view_count: Some(0),
        use_count: Some(0),
        created_at: now,
        updated_at: now,
        created_by: None,
        updated_by: None,
    };

    match state.template_repo.create(&template).await {
        Ok(saved) => {
            let category_name = if let Some(cat_id) = saved.category_id {
                state.template_category_repo
                    .find_by_id(cat_id)
                    .await
                    .ok()
                    .flatten()
                    .map(|c| c.name)
            } else {
                None
            };

            let variables: Vec<TemplateVariable> = saved.variables
                .and_then(|v| serde_json::from_value(v).ok())
                .unwrap_or_default();

            let response = TemplateResponse {
                id: saved.id,
                name: saved.name,
                code: saved.code,
                template_type: saved.template_type,
                category_id: saved.category_id,
                category_name,
                module: saved.module,
                description: saved.description,
                content: saved.content,
                variables,
                is_active: saved.is_active.unwrap_or(true),
                is_system: saved.is_system.unwrap_or(false),
                is_public: saved.is_public.unwrap_or(false),
                ai_enabled: saved.ai_enabled.unwrap_or(false),
                version: saved.version.unwrap_or(1),
                view_count: saved.view_count.unwrap_or(0),
                use_count: saved.use_count.unwrap_or(0),
                created_at: saved.created_at,
                updated_at: saved.updated_at,
                created_by: saved.created_by,
            };

            Json(crate::ApiResponse::success(response, "模板创建成功"))
        }
        Err(e) => {
            tracing::error!("创建模板失败: {}", e);
            Json(crate::ApiResponse::error(500, "创建模板失败"))
        }
    }
}

pub async fn update_template(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateTemplateRequest>,
) -> Json<crate::ApiResponse<TemplateResponse>> {
    if let Some(existing) = state.template_repo.find_by_id(id).await.unwrap_or(None) {
        let updated = Template {
            id: existing.id,
            name: req.name.unwrap_or(existing.name),
            code: req.code.unwrap_or(existing.code),
            template_type: req.template_type.unwrap_or(existing.template_type),
            category_id: req.category_id.or(existing.category_id),
            module: req.module.or(existing.module),
            description: req.description.or(existing.description),
            content: req.content.unwrap_or(existing.content),
            variables: req.variables
                .map(|v| serde_json::to_value(v).ok())
                .unwrap_or(existing.variables),
            is_active: req.is_active.or(existing.is_active),
            is_system: existing.is_system,
            is_public: req.is_public.or(existing.is_public),
            ai_enabled: req.ai_enabled.or(existing.ai_enabled),
            version: existing.version,
            view_count: existing.view_count,
            use_count: existing.use_count,
            created_at: existing.created_at,
            updated_at: chrono::Utc::now(),
            created_by: existing.created_by,
            updated_by: None,
        };

        match state.template_repo.update(id, &updated).await {
            Ok(Some(saved)) => {
                let category_name = if let Some(cat_id) = saved.category_id {
                    state.template_category_repo
                        .find_by_id(cat_id)
                        .await
                        .ok()
                        .flatten()
                        .map(|c| c.name)
                } else {
                    None
                };

                let variables: Vec<TemplateVariable> = saved.variables
                    .and_then(|v| serde_json::from_value(v).ok())
                    .unwrap_or_default();

                let response = TemplateResponse {
                    id: saved.id,
                    name: saved.name,
                    code: saved.code,
                    template_type: saved.template_type,
                    category_id: saved.category_id,
                    category_name,
                    module: saved.module,
                    description: saved.description,
                    content: saved.content,
                    variables,
                    is_active: saved.is_active.unwrap_or(true),
                    is_system: saved.is_system.unwrap_or(false),
                    is_public: saved.is_public.unwrap_or(false),
                    ai_enabled: saved.ai_enabled.unwrap_or(false),
                    version: saved.version.unwrap_or(1),
                    view_count: saved.view_count.unwrap_or(0),
                    use_count: saved.use_count.unwrap_or(0),
                    created_at: saved.created_at,
                    updated_at: saved.updated_at,
                    created_by: saved.created_by,
                };

                Json(crate::ApiResponse::success(response, "模板更新成功"))
            }
            Ok(None) => Json(crate::ApiResponse::error(404, "模板不存在")),
            Err(e) => {
                tracing::error!("更新模板失败: {}", e);
                Json(crate::ApiResponse::error(500, "更新模板失败"))
            }
        }
    } else {
        Json(crate::ApiResponse::error(404, "模板不存在"))
    }
}

pub async fn delete_template(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<crate::ApiResponse<String>> {
    match state.template_repo.delete(id).await {
        Ok(true) => Json(crate::ApiResponse::success(id.to_string(), "模板删除成功")),
        Ok(false) => Json(crate::ApiResponse::error(404, "模板不存在")),
        Err(e) => {
            tracing::error!("删除模板失败: {}", e);
            Json(crate::ApiResponse::error(500, "删除模板失败"))
        }
    }
}

pub async fn duplicate_template(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<crate::ApiResponse<TemplateResponse>> {
    if let Some(original) = state.template_repo.find_by_id(id).await.unwrap_or(None) {
        let new_id = Uuid::new_v4();
        let now = chrono::Utc::now();
        let new_code = format!("{}_copy", original.code);

        let new_template = Template {
            id: new_id,
            name: format!("{} (副本)", original.name),
            code: new_code,
            template_type: original.template_type,
            category_id: original.category_id,
            module: original.module,
            description: original.description,
            content: original.content,
            variables: original.variables,
            is_active: original.is_active,
            is_system: Some(false),
            is_public: original.is_public,
            ai_enabled: original.ai_enabled,
            version: Some(1),
            view_count: Some(0),
            use_count: Some(0),
            created_at: now,
            updated_at: now,
            created_by: None,
            updated_by: None,
        };

        match state.template_repo.create(&new_template).await {
            Ok(saved) => {
                let category_name = if let Some(cat_id) = saved.category_id {
                    state.template_category_repo
                        .find_by_id(cat_id)
                        .await
                        .ok()
                        .flatten()
                        .map(|c| c.name)
                } else {
                    None
                };

                let variables: Vec<TemplateVariable> = saved.variables
                    .and_then(|v| serde_json::from_value(v).ok())
                    .unwrap_or_default();

                let response = TemplateResponse {
                    id: saved.id,
                    name: saved.name,
                    code: saved.code,
                    template_type: saved.template_type,
                    category_id: saved.category_id,
                    category_name,
                    module: saved.module,
                    description: saved.description,
                    content: saved.content,
                    variables,
                    is_active: saved.is_active.unwrap_or(true),
                    is_system: saved.is_system.unwrap_or(false),
                    is_public: saved.is_public.unwrap_or(false),
                    ai_enabled: saved.ai_enabled.unwrap_or(false),
                    version: saved.version.unwrap_or(1),
                    view_count: saved.view_count.unwrap_or(0),
                    use_count: saved.use_count.unwrap_or(0),
                    created_at: saved.created_at,
                    updated_at: saved.updated_at,
                    created_by: saved.created_by,
                };

                Json(crate::ApiResponse::success(response, "模板复制成功"))
            }
            Err(e) => {
                tracing::error!("复制模板失败: {}", e);
                Json(crate::ApiResponse::error(500, "复制模板失败"))
            }
        }
    } else {
        Json(crate::ApiResponse::error(404, "模板不存在"))
    }
}

pub async fn toggle_template_status(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<crate::ApiResponse<TemplateResponse>> {
    if let Some(mut template) = state.template_repo.find_by_id(id).await.unwrap_or(None) {
        let new_status = !template.is_active.unwrap_or(true);
        template.is_active = Some(new_status);
        template.updated_at = chrono::Utc::now();

        match state.template_repo.update(id, &template).await {
            Ok(Some(saved)) => {
                let category_name = if let Some(cat_id) = saved.category_id {
                    state.template_category_repo
                        .find_by_id(cat_id)
                        .await
                        .ok()
                        .flatten()
                        .map(|c| c.name)
                } else {
                    None
                };

                let variables: Vec<TemplateVariable> = saved.variables
                    .and_then(|v| serde_json::from_value(v).ok())
                    .unwrap_or_default();

                let response = TemplateResponse {
                    id: saved.id,
                    name: saved.name,
                    code: saved.code,
                    template_type: saved.template_type,
                    category_id: saved.category_id,
                    category_name,
                    module: saved.module,
                    description: saved.description,
                    content: saved.content,
                    variables,
                    is_active: saved.is_active.unwrap_or(true),
                    is_system: saved.is_system.unwrap_or(false),
                    is_public: saved.is_public.unwrap_or(false),
                    ai_enabled: saved.ai_enabled.unwrap_or(false),
                    version: saved.version.unwrap_or(1),
                    view_count: saved.view_count.unwrap_or(0),
                    use_count: saved.use_count.unwrap_or(0),
                    created_at: saved.created_at,
                    updated_at: saved.updated_at,
                    created_by: saved.created_by,
                };

                Json(crate::ApiResponse::success(response, "状态更新成功"))
            }
            Ok(None) => Json(crate::ApiResponse::error(404, "模板不存在")),
            Err(e) => {
                tracing::error!("更新模板状态失败: {}", e);
                Json(crate::ApiResponse::error(500, "更新模板状态失败"))
            }
        }
    } else {
        Json(crate::ApiResponse::error(404, "模板不存在"))
    }
}

// Category handlers
pub async fn list_categories(
    State(state): State<AppState>,
) -> Json<crate::ApiResponse<Vec<TemplateCategory>>> {
    match state.template_category_repo.list().await {
        Ok(categories) => Json(crate::ApiResponse::success(categories, "获取分类列表成功")),
        Err(e) => {
            tracing::error!("获取分类列表失败: {}", e);
            Json(crate::ApiResponse::error(500, "获取分类列表失败"))
        }
    }
}
```

- [ ] **Step 2: 更新 handlers/mod.rs**

Modify: `svc/doc/src/api/handlers/mod.rs`

```rust
pub mod template;

pub use template::*;
```

- [ ] **Step 3: 在 main.rs 中注册路由并更新 AppState**

Modify: `svc/doc/src/main.rs`

```rust
// 在 AppState 中添加
#[derive(Clone)]
pub struct AppState {
    pub file_repo: FileRepository,
    pub folder_repo: FolderRepository,
    pub file_version_repo: FileVersionRepository,
    pub template_repo: TemplateRepository,
    pub template_category_repo: TemplateCategoryRepository,
    // ... existing fields
}

// 在路由中注册新端点
async fn create_app_state() -> AppState {
    let pool = connect_db().await;
    AppState {
        file_repo: FileRepository::new(pool.clone()),
        folder_repo: FolderRepository::new(pool.clone()),
        file_version_repo: FileVersionRepository::new(pool.clone()),
        template_repo: TemplateRepository::new(pool.clone()),
        template_category_repo: TemplateCategoryRepository::new(pool.clone()),
        // ... existing fields
    }
}

// 在 Router 配置中添加
let app = Router::new()
    // ... existing routes
    .route("/api/v1/templates", get(list_templates).post(create_template))
    .route("/api/v1/templates/:id", get(get_template).put(update_template).delete(delete_template))
    .route("/api/v1/templates/:id/duplicate", post(duplicate_template))
    .route("/api/v1/templates/:id/toggle-status", put(toggle_template_status))
    .route("/api/v1/template-categories", get(list_categories))
    // ... rest of routes
```

- [ ] **Step 4: 测试 API**

Run: `curl http://localhost:8024/api/v1/templates`
Expected: 返回模板列表（初始为空数组）

Run: `curl http://localhost:8024/api/v1/template-categories`
Expected: 返回分类列表

- [ ] **Step 5: 提交代码**

```bash
git add svc/doc/src/api/handlers/template.rs svc/doc/src/api/handlers/mod.rs svc/doc/src/main.rs
git commit -m "feat(doc): 添加模板管理 API 接口
- list_templates: 获取模板列表
- get_template: 获取单个模板
- create_template: 创建模板
- update_template: 更新模板
- delete_template: 删除模板
- duplicate_template: 复制模板
- toggle_template_status: 切换状态
- list_categories: 获取分类列表"
```

---

### 2.3 创建模板渲染服务

**Files:**
- Create: `svc/doc/src/services/template_render_service.rs`

- [ ] **Step 1: 创建渲染服务**

Create: `svc/doc/src/services/template_render_service.rs`

```rust
use std::collections::HashMap;
use crate::models::TemplateVariable;

pub struct TemplateRenderService;

impl TemplateRenderService {
    /// 渲染模板内容
    pub fn render(content: &str, variables: &HashMap<String, serde_json::Value>) -> String {
        let mut result = content.to_string();
        
        // 处理基础变量替换 {{variable_name}}
        for (key, value) in variables {
            let pattern = format!("{{{{{}}}}}", key);
            let value_str = Self::value_to_string(value);
            result = result.replace(&pattern, &value_str);
            
            // 处理带默认值的变量 {{variable_name || 'default'}}
            let pattern_with_default = format!("{{{{ {} || 'default' }}}}", key);
            if result.contains(&pattern_with_default) {
                let default_pattern = format!("{{{{ {} || 'default' }}}}", key);
                result = result.replace(&default_pattern, &value_str);
            }
        }
        
        // 处理动态变量
        result = Self::process_dynamic_variables(&result);
        
        // 处理条件判断 {{#if condition}}...{{/if}}
        result = Self::process_conditionals(&result, variables);
        
        result
    }
    
    fn value_to_string(value: &serde_json::Value) -> String {
        match value {
            serde_json::Value::String(s) => s.clone(),
            serde_json::Value::Number(n) => n.to_string(),
            serde_json::Value::Bool(b) => b.to_string(),
            serde_json::Value::Null => String::new(),
            _ => value.to_string(),
        }
    }
    
    fn process_dynamic_variables(content: &str) -> String {
        let mut result = content.to_string();
        let now = chrono::Utc::now();
        
        // 替换 {{now}} 为当前时间
        result = result.replace("{{now}}", &now.to_rfc3339());
        result = result.replace("{{today}}", &now.format("%Y-%m-%d").to_string());
        result = result.replace("{{now_date}}", &now.format("%Y-%m-%d").to_string());
        result = result.replace("{{now_time}}", &now.format("%H:%M:%S").to_string());
        
        result
    }
    
    fn process_conditionals(content: &str, variables: &HashMap<String, serde_json::Value>) -> String {
        let mut result = content.to_string();
        
        // 简单的条件处理 {{#if variable}}...{{/if}}
        let re = regex::Regex::new(r"\{\{#if\s+(\w+)\}\}(.*?)\{\{/if\}\}").unwrap();
        
        for cap in re.captures_iter(content) {
            let var_name = &cap[1];
            let if_content = &cap[2];
            
            if let Some(value) = variables.get(var_name) {
                if Self::is_truthy(value) {
                    result = result.replace(&cap[0], if_content);
                } else {
                    result = result.replace(&cap[0], "");
                }
            } else {
                result = result.replace(&cap[0], "");
            }
        }
        
        result
    }
    
    fn is_truthy(value: &serde_json::Value) -> bool {
        match value {
            serde_json::Value::Bool(b) => *b,
            serde_json::Value::String(s) => !s.is_empty(),
            serde_json::Value::Number(n) => n.as_f64().unwrap_or(0.0) != 0.0,
            serde_json::Value::Array(arr) => !arr.is_empty(),
            serde_json::Value::Object(obj) => !obj.is_empty(),
            _ => false,
        }
    }
    
    /// 提取模板中的变量引用
    pub fn extract_variables(content: &str) -> Vec<String> {
        let mut variables = Vec::new();
        let re = regex::Regex::new(r"\{\{(\w+)\}\}").unwrap();
        
        for cap in re.captures_iter(content) {
            let var_name = &cap[1];
            // 排除动态变量
            if !["now", "today", "now_date", "now_time", "user"].contains(&var_name) {
                if !variables.contains(&var_name.to_string()) {
                    variables.push(var_name.to_string());
                }
            }
        }
        
        variables
    }
    
    /// 验证变量值
    pub fn validate_variables(
        variables: &[TemplateVariable],
        values: &HashMap<String, serde_json::Value>,
    ) -> Result<(), String> {
        for var in variables {
            if var.required.unwrap_or(false) {
                if let Some(value) = values.get(&var.key) {
                    if Self::is_empty(value) {
                        return Err(format!("变量 '{}' 是必填项", var.label));
                    }
                } else {
                    return Err(format!("变量 '{}' 是必填项", var.label));
                }
            }
        }
        Ok(())
    }
    
    fn is_empty(value: &serde_json::Value) -> bool {
        match value {
            serde_json::Value::Null => true,
            serde_json::Value::String(s) => s.is_empty(),
            _ => false,
        }
    }
}
```

- [ ] **Step 2: 添加渲染 API 接口**

Modify: `svc/doc/src/api/handlers/template.rs`

```rust
#[derive(Debug, serde::Deserialize)]
pub struct RenderTemplateRequest {
    pub variables: HashMap<String, serde_json::Value>,
    pub format: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct RenderTemplateResponse {
    pub rendered_content: String,
    pub used_variables: Vec<String>,
}

pub async fn render_template(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<RenderTemplateRequest>,
) -> Json<crate::ApiResponse<RenderTemplateResponse>> {
    if let Some(template) = state.template_repo.find_by_id(id).await.unwrap_or(None) {
        // Increment use count
        let _ = state.template_repo.increment_use_count(id).await;
        
        // Extract defined variables from template
        let defined_vars: Vec<TemplateVariable> = template.variables
            .and_then(|v| serde_json::from_value(v).ok())
            .unwrap_or_default();
        
        // Validate required variables
        if let Err(e) = TemplateRenderService::validate_variables(&defined_vars, &req.variables) {
            return Json(crate::ApiResponse::error(400, &e));
        }
        
        // Render template
        let rendered_content = TemplateRenderService::render(&template.content, &req.variables);
        let used_variables = TemplateRenderService::extract_variables(&template.content);
        
        Json(crate::ApiResponse::success(
            RenderTemplateResponse {
                rendered_content,
                used_variables,
            },
            "模板渲染成功",
        ))
    } else {
        Json(crate::ApiResponse::error(404, "模板不存在"))
    }
}
```

- [ ] **Step 3: 在 main.rs 中注册渲染路由**

Modify: `svc/doc/src/main.rs`

```rust
.route("/api/v1/templates/:id/render", post(render_template))
```

- [ ] **Step 4: 提交代码**

```bash
git add svc/doc/src/services/template_render_service.rs svc/doc/src/api/handlers/template.rs svc/doc/src/main.rs
git commit -m "feat(doc): 添加模板渲染服务
- TemplateRenderService 模板渲染引擎
- 支持变量替换、条件判断、动态变量
- validate_variables 变量校验
- extract_variables 提取变量引用
- render_template API 接口"
```

---

## 第三阶段：前端层

### 3.1 更新类型定义

**Files:**
- Modify: `apps/web/src/api/template.ts`

- [ ] **Step 1: 更新模板类型定义**

Modify: `apps/web/src/api/template.ts`

```typescript
// 扩展现有的模板类型定义

export type TemplateType = 'workflow' | 'document' | 'form' | 'report' | 'notification';

export type VariableType = 
  | 'string' 
  | 'number' 
  | 'date' 
  | 'datetime'
  | 'boolean' 
  | 'select' 
  | 'multiselect' 
  | 'text' 
  | 'user' 
  | 'now' 
  | 'context' 
  | 'lookup';

export interface TemplateVariable {
  id?: string;
  template_id?: string;
  key: string;
  label: string;
  type: VariableType;
  required?: boolean;
  default_value?: any;
  options?: SelectOption[];
  data_source?: string;
  validation_rules?: ValidationRule[];
  sort_order?: number;
  created_at?: string;
}

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface ValidationRule {
  type: 'required' | 'min' | 'max' | 'pattern' | 'custom';
  value?: any;
  message?: string;
}

export interface Template {
  id: string;
  name: string;
  code: string;
  type: TemplateType;
  category_id?: string;
  category_name?: string;
  module?: string;
  description?: string;
  content: string;
  variables: TemplateVariable[];
  is_active: boolean;
  is_system: boolean;
  is_public: boolean;
  ai_enabled: boolean;
  version: number;
  view_count: number;
  use_count: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface TemplateCategory {
  id: string;
  name: string;
  code: string;
  type: TemplateType;
  icon?: string;
  description?: string;
  sort_order: number;
  template_count?: number;
}

export interface CreateTemplateRequest {
  name: string;
  code: string;
  type: TemplateType;
  category_id?: string;
  module?: string;
  description?: string;
  content: string;
  variables?: TemplateVariable[];
  is_active?: boolean;
  is_public?: boolean;
  ai_enabled?: boolean;
}

export interface UpdateTemplateRequest extends Partial<CreateTemplateRequest> {}

export interface ListTemplatesParams {
  page?: number;
  page_size?: number;
  search?: string;
  type?: TemplateType;
  category?: string;
  module?: string;
  is_active?: boolean;
  is_public?: boolean;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface RenderTemplateRequest {
  variables: Record<string, any>;
  format?: 'html' | 'text' | 'json';
}

export interface RenderTemplateResponse {
  rendered_content: string;
  used_variables: string[];
}

// 模板类型配置
export const TEMPLATE_TYPE_CONFIG: Record<TemplateType, { label: string; icon: string; color: string }> = {
  workflow: { label: '工作流模板', icon: 'git-branch', color: '#3b82f6' },
  document: { label: '文档模板', icon: 'file-text', color: '#10b981' },
  form: { label: '表单模板', icon: 'layout', color: '#f59e0b' },
  report: { label: '报表模板', icon: 'bar-chart', color: '#ef4444' },
  notification: { label: '通知模板', icon: 'bell', color: '#8b5cf6' },
};

// 变量类型配置
export const VARIABLE_TYPE_CONFIG: Record<VariableType, { label: string; component: string }> = {
  string: { label: '单行文本', component: 'Input' },
  number: { label: '数字', component: 'InputNumber' },
  date: { label: '日期', component: 'DatePicker' },
  datetime: { label: '日期时间', component: 'DatePicker' },
  boolean: { label: '开关', component: 'Switch' },
  text: { label: '多行文本', component: 'TextArea' },
  select: { label: '下拉选择', component: 'Select' },
  multiselect: { label: '多选', component: 'Select' },
  user: { label: '当前用户', component: 'UserPicker' },
  now: { label: '当前时间', component: 'DatePicker' },
  context: { label: '上下文', component: 'Input' },
  lookup: { label: '关联查询', component: 'Lookup' },
};

// 更新 API 方法
export const templateApi = {
  // ... existing methods
  
  async render(
    id: string,
    request: RenderTemplateRequest
  ): Promise<ApiResponse<RenderTemplateResponse>> {
    return await apiClient.doc.post(`/api/v1/templates/${id}/render`, request);
  },
};
```

- [ ] **Step 2: 提交代码**

```bash
git add apps/web/src/api/template.ts
git commit -m "feat(web): 扩展模板类型定义
- 添加 TemplateType, VariableType 类型
- 扩展 Template, TemplateVariable 接口
- 添加 RenderTemplateRequest/Response
- 添加 TEMPLATE_TYPE_CONFIG, VARIABLE_TYPE_CONFIG 配置
- 添加 render API 方法"
```

---

### 3.2 创建模板编辑器组件

**Files:**
- Create: `apps/web/src/components/template/TemplateEditor.tsx`
- Create: `apps/web/src/components/template/VariableForm.tsx`

- [ ] **Step 1: 创建变量表单组件**

Create: `apps/web/src/components/template/VariableForm.tsx`

```typescript
import React, { useState } from 'react';
import { Input, InputNumber, DatePicker, Switch, Select, Button } from 'antd';
import { Plus, Trash2 } from 'lucide-react';
import type { TemplateVariable, VariableType, SelectOption } from '@/api/template';
import { VARIABLE_TYPE_CONFIG } from '@/api/template';

interface VariableFormProps {
  variables: TemplateVariable[];
  onChange: (variables: TemplateVariable[]) => void;
  readOnly?: boolean;
}

const VariableForm: React.FC<VariableFormProps> = ({
  variables,
  onChange,
  readOnly = false,
}) => {
  const handleAdd = () => {
    const newVar: TemplateVariable = {
      key: `var_${Date.now()}`,
      label: '',
      type: 'string',
      required: false,
    };
    onChange([...variables, newVar]);
  };

  const handleUpdate = (index: number, updates: Partial<TemplateVariable>) => {
    const updated = [...variables];
    updated[index] = { ...updated[index], ...updates };
    onChange(updated);
  };

  const handleRemove = (index: number) => {
    onChange(variables.filter((_, i) => i !== index));
  };

  const renderField = (variable: TemplateVariable, index: number) => {
    const config = VARIABLE_TYPE_CONFIG[variable.type];
    
    switch (variable.type) {
      case 'string':
      case 'text':
        return (
          <Input
            placeholder={variable.placeholder || '请输入'}
            value={variable.default_value as string || ''}
            onChange={(e) => handleUpdate(index, { default_value: e.target.value })}
          />
        );
      case 'number':
        return (
          <InputNumber
            style={{ width: '100%' }}
            value={variable.default_value as number || 0}
            onChange={(value) => handleUpdate(index, { default_value: value })}
          />
        );
      case 'date':
        return (
          <DatePicker
            style={{ width: '100%' }}
            value={variable.default_value ? undefined : undefined}
            onChange={(date) => handleUpdate(index, { default_value: date?.toISOString() })}
          />
        );
      case 'boolean':
        return (
          <Switch
            checked={variable.default_value as boolean || false}
            onChange={(checked) => handleUpdate(index, { default_value: checked })}
          />
        );
      case 'select':
      case 'multiselect':
        return (
          <Select
            mode={variable.type === 'multiselect' ? 'multiple' : undefined}
            style={{ width: '100%' }}
            options={variable.options || []}
            value={variable.default_value}
            onChange={(value) => handleUpdate(index, { default_value: value })}
            placeholder="请选择选项"
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-gray-700">变量定义</label>
        {!readOnly && (
          <Button type="dashed" size="small" onClick={handleAdd} icon={<Plus className="w-4 h-4" />}>
            添加变量
          </Button>
        )}
      </div>
      
      {variables.length === 0 ? (
        <div className="text-center py-4 text-gray-500 text-sm">
          暂无变量定义，点击上方按钮添加
        </div>
      ) : (
        <div className="space-y-3">
          {variables.map((variable, index) => (
            <div key={index} className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
              <div className="flex-1 grid grid-cols-4 gap-2">
                <div>
                  <Input
                    size="small"
                    placeholder="变量标识"
                    value={variable.key}
                    onChange={(e) => handleUpdate(index, { key: e.target.value })}
                    disabled={readOnly}
                  />
                </div>
                <div>
                  <Input
                    size="small"
                    placeholder="显示名称"
                    value={variable.label}
                    onChange={(e) => handleUpdate(index, { label: e.target.value })}
                    disabled={readOnly}
                  />
                </div>
                <div>
                  <Select
                    size="small"
                    style={{ width: '100%' }}
                    value={variable.type}
                    onChange={(type) => handleUpdate(index, { type })}
                    disabled={readOnly}
                    options={Object.entries(VARIABLE_TYPE_CONFIG).map(([value, config]) => ({
                      value,
                      label: config.label,
                    }))}
                  />
                </div>
                <div>
                  {renderField(variable, index)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  size="small"
                  checked={variable.required}
                  onChange={(checked) => handleUpdate(index, { required: checked })}
                  disabled={readOnly}
                  checkedChildren="必填"
                  unCheckedChildren="选填"
                />
                {!readOnly && (
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<Trash2 className="w-4 h-4" />}
                    onClick={() => handleRemove(index)}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VariableForm;
```

- [ ] **Step 2: 创建模板编辑器组件**

Create: `apps/web/src/components/template/TemplateEditor.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { Input, Select, Tabs, Button, message } from 'antd';
import { Eye, Code, Settings } from 'lucide-react';
import VariableForm from './VariableForm';
import type { Template, TemplateVariable, TemplateType } from '@/api/template';
import { TEMPLATE_TYPE_CONFIG } from '@/api/template';

const { TextArea } = Input;

interface TemplateEditorProps {
  template?: Partial<Template>;
  content: string;
  variables: TemplateVariable[];
  onChange: (content: string, variables: TemplateVariable[]) => void;
  readOnly?: boolean;
}

const TemplateEditor: React.FC<TemplateEditorProps> = ({
  template,
  content,
  variables,
  onChange,
  readOnly = false,
}) => {
  const [localContent, setLocalContent] = useState(content);
  const [localVariables, setLocalVariables] = useState<TemplateVariable[]>(variables);
  const [previewMode, setPreviewMode] = useState(false);
  const [previewValues, setPreviewValues] = useState<Record<string, any>>({});

  useEffect(() => {
    setLocalContent(content);
  }, [content]);

  useEffect(() => {
    setLocalVariables(variables);
  }, [variables]);

  const handleContentChange = (value: string) => {
    setLocalContent(value);
    onChange(value, localVariables);
  };

  const handleVariablesChange = (newVariables: TemplateVariable[]) => {
    setLocalVariables(newVariables);
    onChange(localContent, newVariables);
  };

  const handlePreviewValueChange = (key: string, value: any) => {
    setPreviewValues({ ...previewValues, [key]: value });
  };

  const renderPreview = () => {
    let result = localContent;
    
    // 替换变量
    for (const variable of localVariables) {
      const value = previewValues[variable.key] ?? variable.default_value ?? '';
      const regex = new RegExp(`\\{\\{\\s*${variable.key}\\s*\\}\\}`, 'g');
      result = result.replace(regex, String(value));
    }
    
    // 替换动态变量
    result = result.replace(/\{\{\s*now\s*\}\}/g, new Date().toLocaleString());
    result = result.replace(/\{\{\s*today\s*\}\}/g, new Date().toISOString().split('T')[0]);
    
    return result;
  };

  const insertVariable = (variableKey: string) => {
    const newContent = localContent + `{{${variableKey}}}`;
    handleContentChange(newContent);
  };

  const tabItems = [
    {
      key: 'edit',
      label: (
        <span className="flex items-center gap-2">
          <Code className="w-4 h-4" />
          编辑内容
        </span>
      ),
      children: (
        <div className="space-y-4">
          <TextArea
            value={localContent}
            onChange={(e) => handleContentChange(e.target.value)}
            rows={20}
            className="font-mono text-sm"
            placeholder="输入模板内容，使用 {{variable_name}} 格式定义变量"
            disabled={readOnly}
          />
          <div className="text-sm text-gray-500">
            提示：使用 <code className="bg-gray-100 px-1 rounded">{'{{variable_name}}'}</code> 插入变量
          </div>
        </div>
      ),
    },
    {
      key: 'variables',
      label: (
        <span className="flex items-center gap-2">
          <Settings className="w-4 h-4" />
          变量配置
        </span>
      ),
      children: (
        <VariableForm
          variables={localVariables}
          onChange={handleVariablesChange}
          readOnly={readOnly}
        />
      ),
    },
    {
      key: 'preview',
      label: (
        <span className="flex items-center gap-2">
          <Eye className="w-4 h-4" />
          预览
        </span>
      ),
      children: (
        <div className="space-y-4">
          <div className="p-4 bg-gray-100 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-2">填充变量值</h4>
            <div className="grid grid-cols-2 gap-3">
              {localVariables.map((variable) => (
                <div key={variable.key}>
                  <label className="text-xs text-gray-500">{variable.label || variable.key}</label>
                  <Input
                    size="small"
                    value={previewValues[variable.key] || ''}
                    onChange={(e) => handlePreviewValueChange(variable.key, e.target.value)}
                    placeholder={`输入 ${variable.label || variable.key}`}
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="p-4 bg-white border rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-2">预览效果</h4>
            <pre className="whitespace-pre-wrap text-sm">{renderPreview()}</pre>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="template-editor">
      <Tabs items={tabItems} defaultActiveKey="edit" />
    </div>
  );
};

export default TemplateEditor;
```

- [ ] **Step 3: 提交代码**

```bash
git add apps/web/src/components/template/VariableForm.tsx apps/web/src/components/template/TemplateEditor.tsx
git commit -m "feat(web): 添加模板编辑器组件
- VariableForm: 变量配置表单组件
- TemplateEditor: 模板编辑器组件（编辑/变量配置/预览）
- 支持 Mustache 语法高亮
- 实时预览功能"
```

---

### 3.3 创建模板选择器组件

**Files:**
- Create: `apps/web/src/components/template/TemplateSelector.tsx`

- [ ] **Step 1: 创建模板选择器组件**

Create: `apps/web/src/components/template/TemplateSelector.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { Input, Select, Spin, Empty, Button } from 'antd';
import { Search, Eye, FileText, GitBranch, Layout, BarChart, Bell } from 'lucide-react';
import { templateApi } from '@/api/template';
import type { Template, TemplateType, TemplateCategory } from '@/api/template';
import { TEMPLATE_TYPE_CONFIG } from '@/api/template';

const { Search: AntSearch } = Input;

interface TemplateSelectorProps {
  type?: TemplateType;
  category?: string;
  onSelect: (template: Template) => void;
  onCancel: () => void;
  showPreview?: boolean;
}

const iconMap: Record<string, React.ReactNode> = {
  'git-branch': <GitBranch className="w-5 h-5" />,
  'file-text': <FileText className="w-5 h-5" />,
  'layout': <Layout className="w-5 h-5" />,
  'bar-chart': <BarChart className="w-5 h-5" />,
  'bell': <Bell className="w-5 h-5" />,
};

const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  type,
  category,
  onSelect,
  onCancel,
  showPreview = true,
}) => {
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [categories, setCategories] = useState<TemplateCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>(category || '');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  useEffect(() => {
    loadData();
  }, [type, selectedCategory]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [templatesRes, categoriesRes] = await Promise.all([
        templateApi.list({
          type,
          category: selectedCategory || undefined,
          search: searchKeyword || undefined,
          is_active: true,
        }),
        templateApi.listCategories(),
      ]);

      if (templatesRes.success && templatesRes.data) {
        setTemplates(templatesRes.data.items);
      }
      if (categoriesRes.success && categoriesRes.data) {
        setCategories(categoriesRes.data);
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTemplates = templates.filter((t) =>
    t.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
    t.code.toLowerCase().includes(searchKeyword.toLowerCase()) ||
    t.description?.toLowerCase().includes(searchKeyword.toLowerCase())
  );

  const typeCategories = categories.filter((c) => !type || c.type === type);

  return (
    <div className="template-selector h-[600px] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <h3 className="text-lg font-semibold mb-4">选择模板</h3>
        <div className="flex gap-3">
          <AntSearch
            placeholder="搜索模板名称或编码..."
            allowClear
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="flex-1"
          />
          <Select
            placeholder="选择分类"
            allowClear
            style={{ width: 150 }}
            value={selectedCategory || undefined}
            onChange={setSelectedCategory}
            options={typeCategories.map((c) => ({
              value: c.id,
              label: c.name,
            }))}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Spin size="large" />
          </div>
        ) : filteredTemplates.length === 0 ? (
          <Empty description="暂无模板" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {filteredTemplates.map((template) => {
              const config = TEMPLATE_TYPE_CONFIG[template.type];
              const category = categories.find((c) => c.id === template.category_id);
              
              return (
                <div
                  key={template.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    selectedTemplate?.id === template.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedTemplate(template)}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${config.color}20`, color: config.color }}
                    >
                      {iconMap[config.icon] || <FileText className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 truncate">{template.name}</h4>
                      <p className="text-xs text-gray-500 mt-1">
                        {template.code} · {category?.name || config.label}
                      </p>
                      {template.description && (
                        <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                          {template.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                        <span>使用 {template.use_count} 次</span>
                        <span>·</span>
                        <span>浏览 {template.view_count} 次</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Preview */}
      {showPreview && selectedTemplate && (
        <div className="border-t p-4 bg-gray-50">
          <h4 className="text-sm font-medium text-gray-700 mb-2">模板预览</h4>
          <pre className="text-xs bg-white p-3 rounded border max-h-32 overflow-y-auto whitespace-pre-wrap">
            {selectedTemplate.content}
          </pre>
        </div>
      )}

      {/* Footer */}
      <div className="p-4 border-t flex justify-end gap-3">
        <Button onClick={onCancel}>取消</Button>
        <Button
          type="primary"
          disabled={!selectedTemplate}
          onClick={() => selectedTemplate && onSelect(selectedTemplate)}
        >
          选择此模板
        </Button>
      </div>
    </div>
  );
};

export default TemplateSelector;
```

- [ ] **Step 2: 提交代码**

```bash
git add apps/web/src/components/template/TemplateSelector.tsx
git commit -m "feat(web): 添加模板选择器组件
- TemplateSelector: 模板选择弹窗组件
- 支持分类筛选和关键字搜索
- 模板卡片展示（使用次数、浏览次数）
- 模板预览功能"
```

---

### 3.4 更新模板管理页面

**Files:**
- Modify: `apps/web/src/pages/TemplateManagementPage.tsx`

- [ ] **Step 1: 更新模板管理页面，添加类型筛选和新功能**

Modify: `apps/web/src/pages/TemplateManagementPage.tsx`

```typescript
// 在现有的基础上添加以下功能：

// 1. 添加类型筛选状态
const [selectedType, setSelectedType] = useState<string>("");

// 2. 更新筛选器，添加类型选择
<div className="flex items-center space-x-4">
  {/* 类型筛选 */}
  <select
    value={selectedType}
    onChange={(e) => setSelectedType(e.target.value)}
    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
  >
    <option value="">全部类型</option>
    {Object.entries(TEMPLATE_TYPE_CONFIG).map(([key, config]) => (
      <option key={key} value={key}>
        {config.label}
      </option>
    ))}
  </select>
  
  {/* 现有搜索框 */}
  <div className="flex-1 relative">
    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
    <input
      type="text"
      placeholder="搜索模板名称、编码..."
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    />
  </div>
  
  {/* 分类筛选 */}
  <select
    value={selectedCategory}
    onChange={(e) => setSelectedCategory(e.target.value)}
    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
  >
    <option value="">全部分类</option>
    {categories.map((cat) => (
      <option key={cat.id} value={cat.id}>
        {cat.name}
      </option>
    ))}
  </select>
</div>

// 3. 更新 loadData，传递类型参数
const loadData = async () => {
  setLoading(true);
  try {
    const [templatesRes, categoriesRes] = await Promise.all([
      templateApi.list({
        search: searchQuery,
        type: selectedType || undefined,
        category: selectedCategory || undefined,
      }),
      templateApi.listCategories(),
    ]);
    // ...
  }
};

// 4. 在模板卡片中显示类型标签
<div className="space-y-1 text-sm text-gray-500 mb-4">
  <div className="flex items-center gap-2">
    <span
      className="px-2 py-0.5 rounded text-xs"
      style={{
        backgroundColor: `${TEMPLATE_TYPE_CONFIG[template.type]?.color}20`,
        color: TEMPLATE_TYPE_CONFIG[template.type]?.color,
      }}
    >
      {TEMPLATE_TYPE_CONFIG[template.type]?.label}
    </span>
    <span>分类：{categories.find((c) => c.id === template.category_id)?.name || template.category}</span>
  </div>
  <div>模块：{template.module}</div>
  <div>变量数：{template.variables?.length || 0}</div>
</div>
```

- [ ] **Step 2: 提交代码**

```bash
git add apps/web/src/pages/TemplateManagementPage.tsx
git commit -m "feat(web): 增强模板管理页面
- 添加模板类型筛选
- 显示模板类型标签（带颜色）
- 优化分类筛选逻辑"
```

---

## 第四阶段：AI 集成

### 4.1 创建 AI 辅助服务

**Files:**
- Create: `svc/doc/src/services/ai_template_service.rs`
- Modify: `svc/doc/src/api/handlers/template.rs`

- [ ] **Step 1: 创建 AI 辅助服务**

Create: `svc/doc/src/services/ai_template_service.rs`

```rust
use serde::{Deserialize, Serialize};

pub struct AiTemplateService;

#[derive(Debug, Serialize, Deserialize)]
pub struct AiGenerateRequest {
    pub template_type: String,
    pub description: String,
    pub context: Option<serde_json::Value>,
    pub suggest_variables: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AiGenerateResponse {
    pub content: String,
    pub suggested_variables: Vec<serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AiSuggestVariablesRequest {
    pub content: String,
    pub template_type: Option<String>,
}

impl AiTemplateService {
    /// 生成模板内容（模拟实现，后续接入真实 AI）
    pub async fn generate_template(
        request: AiGenerateRequest,
    ) -> Result<AiGenerateResponse, String> {
        // 这里是模拟实现，实际应该调用 AI API
        let content = Self::generate_mock_content(&request.template_type, &request.description);
        let suggested_variables = Self::extract_variables_from_content(&content);
        
        Ok(AiGenerateResponse {
            content,
            suggested_variables,
        })
    }
    
    /// 建议变量（模拟实现）
    pub async fn suggest_variables(
        request: AiSuggestVariablesRequest,
    ) -> Result<Vec<serde_json::Value>, String> {
        let variables = Self::extract_variables_from_content(&request.content);
        Ok(variables)
    }
    
    fn generate_mock_content(template_type: &str, description: &str) -> String {
        match template_type {
            "workflow" => format!(
                r#"{{{{
  "name": "{}",
  "steps": [
    {{
      "id": "step_1",
      "name": "申请提交",
      "type": "start",
      "assignee": "{{{{applicant}}}}"
    }},
    {{
      "id": "step_2",
      "name": "审批",
      "type": "approval",
      "assignee": "{{{{approver}}}}",
      "condition": "{{{{approval_condition}}}}"
    }},
    {{
      "id": "step_3",
      "name": "完成",
      "type": "end"
    }}
  ]
}}}}"#,
                description
            ),
            "document" => format!(
                r#"<!DOCTYPE html>
<html>
<head>
    <title>{{{{title}}}}</title>
</head>
<body>
    <h1>{{{{title}}}}</h1>
    <p>日期：{{{{date}}}}</p>
    <p>编制人：{{{{author}}}}</p>
    <hr/>
    <div class="content">
        {{{{content}}}}
    </div>
</body>
</html>"#,
            ),
            "notification" => format!(
                r#"<div>
    <h2>{{{{title}}}}</h2>
    <p>您好，{{{{recipient_name}}}}：</p>
    <p>{{{{message}}}}</p>
    <p>时间：{{{{time}}}}</p>
</div>"#,
            ),
            _ => format!(
                r#"<!-- {} -->

{{{{content}}}}

<!-- End of template -->"#,
                description
            ),
        }
    }
    
    fn extract_variables_from_content(content: &str) -> Vec<serde_json::Value> {
        let mut variables = Vec::new();
        let re = regex::Regex::new(r"\{\{\{(\w+)\}\}\}").unwrap();
        let mut seen = std::collections::HashSet::new();
        
        for cap in re.captures_iter(content) {
            let var_name = &cap[1];
            if !seen.contains(var_name) && !Self::is_reserved_word(var_name) {
                seen.insert(var_name.to_string());
                variables.push(serde_json::json!({
                    "key": var_name,
                    "label": var_name,
                    "type": "string",
                    "required": false
                }));
            }
        }
        
        variables
    }
    
    fn is_reserved_word(word: &str) -> bool {
        matches!(word, "now" | "today" | "user" | "context" | "this")
    }
}
```

- [ ] **Step 2: 添加 AI API 接口**

Modify: `svc/doc/src/api/handlers/template.rs`

```rust
use crate::services::ai_template_service::{AiTemplateService, AiGenerateRequest, AiSuggestVariablesRequest};

#[derive(Debug, serde::Deserialize)]
pub struct AiGenerateTemplateRequest {
    #[serde(rename = "type")]
    pub template_type: String,
    pub description: String,
    pub context: Option<serde_json::Value>,
    pub suggest_variables: Option<bool>,
}

pub async fn ai_generate_template(
    State(_state): State<AppState>,
    Json(req): Json<AiGenerateTemplateRequest>,
) -> Json<crate::ApiResponse<AiGenerateResponse>> {
    let request = AiGenerateRequest {
        template_type: req.template_type,
        description: req.description,
        context: req.context,
        suggest_variables: req.suggest_variables,
    };
    
    match AiTemplateService::generate_template(request).await {
        Ok(response) => Json(crate::ApiResponse::success(response, "AI 生成成功")),
        Err(e) => Json(crate::ApiResponse::error(500, &e)),
    }
}

pub async fn ai_suggest_variables(
    State(_state): State<AppState>,
    Json(req): Json<AiSuggestVariablesRequest>,
) -> Json<crate::ApiResponse<Vec<serde_json::Value>>> {
    match AiTemplateService::suggest_variables(req).await {
        Ok(variables) => Json(crate::ApiResponse::success(variables, "变量建议成功")),
        Err(e) => Json(crate::ApiResponse::error(500, &e)),
    }
}
```

- [ ] **Step 3: 在 main.rs 中注册 AI 路由**

Modify: `svc/doc/src/main.rs`

```rust
use api::handlers::template::{ai_generate_template, ai_suggest_variables};

// 在 Router 中添加
.route("/api/v1/templates/ai/generate", post(ai_generate_template))
.route("/api/v1/templates/ai/suggest-variables", post(ai_suggest_variables))
```

- [ ] **Step 4: 提交代码**

```bash
git add svc/doc/src/services/ai_template_service.rs svc/doc/src/api/handlers/template.rs svc/doc/src/main.rs
git commit -m "feat(doc): 添加 AI 辅助模板服务
- AiTemplateService 模板生成服务
- ai_generate_template AI 生成模板接口
- ai_suggest_variables AI 建议变量接口
- 支持多种模板类型的模拟生成"
```

---

### 4.2 创建前端 AI 助手组件

**Files:**
- Create: `apps/web/src/components/ai/AiAssistant.tsx`

- [ ] **Step 1: 创建 AI 助手组件**

Create: `apps/web/src/components/ai/AiAssistant.tsx`

```typescript
import React, { useState } from 'react';
import { Input, Button, Spin, Select, message } from 'antd';
import { Sparkles } from 'lucide-react';
import { templateApi } from '@/api/template';
import type { TemplateType, TemplateVariable } from '@/api/template';
import { TEMPLATE_TYPE_CONFIG } from '@/api/template';

const { TextArea } = Input;

interface AiAssistantProps {
  onGenerated: (content: string, variables: TemplateVariable[]) => void;
  disabled?: boolean;
}

const AiAssistant: React.FC<AiAssistantProps> = ({
  onGenerated,
  disabled = false,
}) => {
  const [loading, setLoading] = useState(false);
  const [description, setDescription] = useState('');
  const [templateType, setTemplateType] = useState<TemplateType>('document');

  const handleGenerate = async () => {
    if (!description.trim()) {
      message.warning('请输入模板描述');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/v1/templates/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          type: templateType,
          description,
          suggest_variables: true,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        const variables: TemplateVariable[] = (result.data.suggested_variables || []).map(
          (v: any) => ({
            key: v.key,
            label: v.label || v.key,
            type: v.type || 'string',
            required: v.required || false,
          })
        );
        
        onGenerated(result.data.content, variables);
        message.success('AI 生成成功');
        setDescription('');
      } else {
        message.error(result.message || '生成失败');
      }
    } catch (error) {
      console.error('AI generation failed:', error);
      message.error('AI 生成失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ai-assistant p-4 border rounded-lg bg-gradient-to-r from-purple-50 to-blue-50">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-5 h-5 text-purple-600" />
        <span className="font-medium text-gray-800">AI 智能生成</span>
      </div>
      
      <div className="space-y-3">
        <Select
          value={templateType}
          onChange={setTemplateType}
          style={{ width: '100%' }}
          options={Object.entries(TEMPLATE_TYPE_CONFIG).map(([key, config]) => ({
            value: key,
            label: config.label,
          }))}
          disabled={disabled || loading}
        />
        
        <TextArea
          placeholder="描述你想要创建的模板，例如：创建一个采购审批流程模板，包含申请人、审批金额、审批理由等字段"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={disabled || loading}
        />
        
        <Button
          type="primary"
          icon={<Sparkles className="w-4 h-4" />}
          onClick={handleGenerate}
          loading={loading}
          disabled={disabled || !description.trim()}
          block
        >
          {loading ? 'AI 正在生成...' : '生成模板'}
        </Button>
      </div>
      
      <p className="text-xs text-gray-500 mt-2">
        提示：描述越详细，AI 生成的效果越好
      </p>
    </div>
  );
};

export default AiAssistant;
```

- [ ] **Step 2: 提交代码**

```bash
git add apps/web/src/components/ai/AiAssistant.tsx
git commit -m "feat(web): 添加 AI 助手组件
- AiAssistant: AI 智能生成模板组件
- 支持选择模板类型
- 支持自然语言描述生成模板
- 自动提取建议的变量"
```

---

## 实施总结

### 阶段完成状态

- [ ] 阶段一：数据库层 ✅
- [ ] 阶段二：后端 API 层 ✅
- [ ] 阶段三：前端层 ✅
- [ ] 阶段四：AI 集成 ✅

### 新增文件清单

| 路径 | 描述 |
|------|------|
| `svc/doc/src/db/migrations/20260613000001_extend_templates.sql` | 数据库迁移脚本 |
| `svc/doc/src/models/template.rs` | Rust 模型定义 |
| `svc/doc/src/db/repository/template_repository.rs` | Repository 层 |
| `svc/doc/src/api/handlers/template.rs` | API Handlers |
| `svc/doc/src/services/template_render_service.rs` | 模板渲染服务 |
| `svc/doc/src/services/ai_template_service.rs` | AI 辅助服务 |
| `apps/web/src/components/template/VariableForm.tsx` | 变量表单组件 |
| `apps/web/src/components/template/TemplateEditor.tsx` | 模板编辑器组件 |
| `apps/web/src/components/template/TemplateSelector.tsx` | 模板选择器组件 |
| `apps/web/src/components/ai/AiAssistant.tsx` | AI 助手组件 |

### 修改文件清单

| 路径 | 描述 |
|------|------|
| `svc/doc/src/models/mod.rs` | 导出模板模型 |
| `svc/doc/src/db/repository/mod.rs` | 导出 Repository |
| `svc/doc/src/api/handlers/mod.rs` | 导出 Handlers |
| `svc/doc/src/main.rs` | 注册路由和状态 |
| `apps/web/src/api/template.ts` | 扩展类型定义 |
| `apps/web/src/pages/TemplateManagementPage.tsx` | 增强管理页面 |

---

**计划完成时间估算**：4-6 周（按每天 4-6 小时开发时间）

**依赖项**：
- PostgreSQL 数据库
- Rust 工具链（用于后端）
- Node.js + pnpm（用于前端）
- OpenAI API 密钥（用于 AI 功能，可选）

---

## 执行选项

**请选择执行方式：**

1. **Subagent-Driven (推荐)** - 我将按任务逐步执行，每个任务完成后进行审查
2. **Inline Execution** - 在当前会话中批量执行任务

您希望采用哪种方式？
