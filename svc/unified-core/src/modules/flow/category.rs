//! Category submodule - Workflow category management handlers
//!
//! 契约对齐：apps/web/src/api/workflow/category.ts
//!   GET    /categories              list（分页 + keyword/status 过滤）
//!   GET    /categories/{id}         get
//!   POST   /categories              create
//!   PUT    /categories/{id}         update
//!   DELETE /categories/{id}         delete（软删）
//!   GET    /categories/active       list_active
//!   GET    /categories/{id}/workflows 分类下流程（预留，待 core_workflows 加 category_id 后启用）
//!   GET    /categories/tree         树形
//!   POST   /categories/sort         排序

use crate::AppState;
use axum::{
    extract::{Extension, Path, Query, State},
    Json,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use topems_shared_auth::auth::Claims;
use topems_shared_core::TopemsError;
use utoipa::ToSchema;
use uuid::Uuid;

use topems_shared_core::response::{ApiResponse, PaginatedResponse};

#[derive(Debug, FromRow)]
pub struct CategoryRow {
    pub id: Uuid,
    pub name: String,
    pub code: String,
    pub parent_id: Option<Uuid>,
    pub sort_order: i32,
    pub status: String,
    pub description: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub tenant_id: Option<Uuid>,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct WorkflowCategory {
    pub id: Uuid,
    pub name: String,
    pub code: String,
    pub parent_id: Option<Uuid>,
    pub sort_order: i32,
    pub status: String,
    pub description: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub children: Vec<WorkflowCategory>,
}

impl From<CategoryRow> for WorkflowCategory {
    fn from(r: CategoryRow) -> Self {
        WorkflowCategory {
            id: r.id,
            name: r.name,
            code: r.code,
            parent_id: r.parent_id,
            sort_order: r.sort_order,
            status: r.status,
            description: r.description,
            created_at: r.created_at,
            updated_at: r.updated_at,
            children: Vec::new(),
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct CategoryListQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub keyword: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateCategoryRequest {
    pub name: String,
    pub code: Option<String>,
    pub parent_id: Option<Uuid>,
    pub sort_order: Option<i32>,
    pub status: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateCategoryRequest {
    pub name: Option<String>,
    pub code: Option<String>,
    pub parent_id: Option<Uuid>,
    pub sort_order: Option<i32>,
    pub status: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct SortCategoriesRequest {
    pub ids: Vec<Uuid>,
}

pub async fn list_categories(
    State(state): State<AppState>,
    Query(query): Query<CategoryListQuery>,
) -> ApiResponse<PaginatedResponse<WorkflowCategory>> {
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(10).min(100);
    let offset = (page - 1) * page_size;
    let keyword = query.keyword.clone().filter(|s| !s.is_empty());
    let status = query.status.clone().filter(|s| !s.is_empty());

    let total: i64 = match sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM core_flow_categories
           WHERE deleted_at IS NULL
             AND ($1::text IS NULL OR status = $1)
             AND ($2::text IS NULL OR name ILIKE '%' || $2 || '%' OR code ILIKE '%' || $2 || '%')"#,
    )
    .bind(status.clone())
    .bind(keyword.clone())
    .fetch_one(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询流程分类总数失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("查询流程分类总数失败".to_string()));
        }
    };

    let rows: Vec<CategoryRow> = match sqlx::query_as(
        r#"SELECT id, name, code, parent_id, sort_order, status, description, created_at, updated_at, tenant_id
           FROM core_flow_categories
           WHERE deleted_at IS NULL
             AND ($1::text IS NULL OR status = $1)
             AND ($2::text IS NULL OR name ILIKE '%' || $2 || '%' OR code ILIKE '%' || $2 || '%')
           ORDER BY sort_order ASC, created_at DESC
           LIMIT $3 OFFSET $4"#,
    )
    .bind(status.clone())
    .bind(keyword.clone())
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询流程分类列表失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("查询流程分类列表失败".to_string()));
        }
    };

    let items: Vec<WorkflowCategory> = rows.into_iter().map(WorkflowCategory::from).collect();
    ApiResponse::success(
        PaginatedResponse {
            items,
            total,
            page,
            page_size,
            total_pages: (total + page_size - 1) / page_size,
        },
        "查询成功",
    )
}

pub async fn get_category(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> ApiResponse<WorkflowCategory> {
    let row: Option<CategoryRow> = match sqlx::query_as(
        r#"SELECT id, name, code, parent_id, sort_order, status, description, created_at, updated_at, tenant_id
           FROM core_flow_categories WHERE id = $1 AND deleted_at IS NULL"#,
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询流程分类失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("查询流程分类失败".to_string()));
        }
    };

    match row {
        Some(r) => ApiResponse::success(WorkflowCategory::from(r), "查询成功"),
        None => ApiResponse::from(TopemsError::ResourceNotFound("流程分类不存在".to_string())),
    }
}

pub async fn create_category(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<CreateCategoryRequest>,
) -> ApiResponse<WorkflowCategory> {
    if payload.name.trim().is_empty() {
        return ApiResponse::from(TopemsError::ValidationFailed(
            "分类名称不能为空".to_string(),
        ));
    }
    let tenant_bind: Uuid = if claims.is_superuser {
        Uuid::nil()
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| Uuid::parse_str(t).ok())
            .unwrap_or(Uuid::nil())
    };
    let code = payload
        .code
        .clone()
        .unwrap_or_else(|| payload.name.trim().to_string());
    let sort_order = payload.sort_order.unwrap_or(0);
    let status = payload.status.unwrap_or_else(|| "active".to_string());

    let row: Option<CategoryRow> = match sqlx::query_as(
        r#"INSERT INTO core_flow_categories
             (name, code, parent_id, sort_order, status, description, tenant_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id, name, code, parent_id, sort_order, status, description, created_at, updated_at, tenant_id"#,
    )
    .bind(payload.name.trim())
    .bind(code)
    .bind(payload.parent_id)
    .bind(sort_order)
    .bind(status)
    .bind(payload.description)
    .bind(tenant_bind)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("创建流程分类失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("创建流程分类失败".to_string()));
        }
    };

    match row {
        Some(r) => ApiResponse::success(WorkflowCategory::from(r), "创建成功"),
        None => ApiResponse::from(TopemsError::Internal("创建流程分类失败".to_string())),
    }
}

pub async fn update_category(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateCategoryRequest>,
) -> ApiResponse<WorkflowCategory> {
    let existing: Option<CategoryRow> = match sqlx::query_as(
        r#"SELECT id, name, code, parent_id, sort_order, status, description, created_at, updated_at, tenant_id
           FROM core_flow_categories WHERE id = $1 AND deleted_at IS NULL"#,
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询流程分类失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("查询流程分类失败".to_string()));
        }
    };

    let Some(cur) = existing else {
        return ApiResponse::from(TopemsError::ResourceNotFound("流程分类不存在".to_string()));
    };

    let name = payload.name.clone().unwrap_or(cur.name);
    let code = payload.code.clone().unwrap_or(cur.code);
    let parent_id = payload.parent_id.or(cur.parent_id);
    let sort_order = payload.sort_order.unwrap_or(cur.sort_order);
    let status = payload.status.clone().unwrap_or(cur.status);
    let description = payload.description.clone().or(cur.description);

    let row: Option<CategoryRow> = match sqlx::query_as(
        r#"UPDATE core_flow_categories
           SET name = $2, code = $3, parent_id = $4, sort_order = $5, status = $6, description = $7,
               updated_at = NOW()
           WHERE id = $1 AND deleted_at IS NULL
           RETURNING id, name, code, parent_id, sort_order, status, description, created_at, updated_at, tenant_id"#,
    )
    .bind(id)
    .bind(name)
    .bind(code)
    .bind(parent_id)
    .bind(sort_order)
    .bind(status)
    .bind(description)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("更新流程分类失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("更新流程分类失败".to_string()));
        }
    };

    match row {
        Some(r) => ApiResponse::success(WorkflowCategory::from(r), "更新成功"),
        None => ApiResponse::from(TopemsError::ResourceNotFound("流程分类不存在".to_string())),
    }
}

pub async fn delete_category(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> ApiResponse<serde_json::Value> {
    let res = sqlx::query(
        r#"UPDATE core_flow_categories SET deleted_at = NOW(), updated_at = NOW()
           WHERE id = $1 AND deleted_at IS NULL"#,
    )
    .bind(id)
    .execute(&state.pool)
    .await;

    match res {
        Ok(r) if r.rows_affected() > 0 => {
            ApiResponse::success(serde_json::json!({"id": id}), "删除成功")
        }
        Ok(_) => ApiResponse::from(TopemsError::ResourceNotFound("流程分类不存在".to_string())),
        Err(e) => {
            tracing::error!("删除流程分类失败: {}", e);
            ApiResponse::from(TopemsError::Internal("删除流程分类失败".to_string()))
        }
    }
}

pub async fn list_active_categories(
    State(state): State<AppState>,
) -> ApiResponse<Vec<WorkflowCategory>> {
    let rows: Vec<CategoryRow> = match sqlx::query_as(
        r#"SELECT id, name, code, parent_id, sort_order, status, description, created_at, updated_at, tenant_id
           FROM core_flow_categories
           WHERE deleted_at IS NULL AND status = 'active'
           ORDER BY sort_order ASC, created_at ASC"#,
    )
    .fetch_all(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询启用流程分类失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("查询启用流程分类失败".to_string()));
        }
    };

    let items: Vec<WorkflowCategory> = rows.into_iter().map(WorkflowCategory::from).collect();
    ApiResponse::success(items, "查询成功")
}

/// 分类下的流程列表（预留：core_workflows 尚未含 category_id 列，先返回空列表；
/// 待前端流程设计器落地、workflow 表加 category_id 后启用真实关联查询）
pub async fn get_category_workflows(
    State(_state): State<AppState>,
    Path(_id): Path<Uuid>,
    Query(query): Query<CategoryListQuery>,
) -> ApiResponse<PaginatedResponse<serde_json::Value>> {
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(10).min(100);
    ApiResponse::success(
        PaginatedResponse {
            items: Vec::new(),
            total: 0,
            page,
            page_size,
            total_pages: 0,
        },
        "查询成功",
    )
}

pub async fn get_category_tree(
    State(state): State<AppState>,
) -> ApiResponse<Vec<WorkflowCategory>> {
    let rows: Vec<CategoryRow> = match sqlx::query_as(
        r#"SELECT id, name, code, parent_id, sort_order, status, description, created_at, updated_at, tenant_id
           FROM core_flow_categories
           WHERE deleted_at IS NULL
           ORDER BY sort_order ASC, created_at ASC"#,
    )
    .fetch_all(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询流程分类树失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("查询流程分类树失败".to_string()));
        }
    };

    let mut nodes: Vec<WorkflowCategory> = rows.into_iter().map(WorkflowCategory::from).collect();
    let mut map: std::collections::HashMap<Uuid, usize> = std::collections::HashMap::new();
    for (i, n) in nodes.iter().enumerate() {
        map.insert(n.id, i);
    }
    let mut roots: Vec<WorkflowCategory> = Vec::new();
    for i in 0..nodes.len() {
        let Some(node) = nodes.get(i).cloned() else {
            continue;
        };
        let parent_id = node.parent_id;
        if let Some(pid) = parent_id {
            if let Some(&pi) = map.get(&pid) {
                if let Some(parent) = nodes.get_mut(pi) {
                    parent.children.push(node.clone());
                    continue;
                }
            }
        }
        roots.push(node.clone());
    }
    ApiResponse::success(roots, "查询成功")
}

pub async fn sort_categories(
    State(state): State<AppState>,
    Json(payload): Json<SortCategoriesRequest>,
) -> ApiResponse<serde_json::Value> {
    if payload.ids.is_empty() {
        return ApiResponse::from(TopemsError::ValidationFailed(
            "分类 ID 列表不能为空".to_string(),
        ));
    }
    for (idx, id) in payload.ids.iter().enumerate() {
        let sort_order = i32::try_from(idx).unwrap_or(i32::MAX);
        let res = sqlx::query(
            "UPDATE core_flow_categories SET sort_order = $2, updated_at = NOW() WHERE id = $1",
        )
        .bind(id)
        .bind(sort_order)
        .execute(&state.pool)
        .await;
        if let Err(e) = res {
            tracing::error!("排序流程分类失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("排序流程分类失败".to_string()));
        }
    }
    ApiResponse::success(
        serde_json::json!({"updated": payload.ids.len()}),
        "排序成功",
    )
}
