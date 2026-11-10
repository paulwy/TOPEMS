use axum::{
    extract::{Path, Query, State},
    routing::get,
    Extension, Json, Router,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

use crate::shared::AppState;
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;

// ==================== P2-11 剩余项：PDM 独立图纸实体 ====================

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/drawings", get(list_drawings).post(create_drawing))
        .route(
            "/drawings/{id}",
            get(get_drawing).put(update_drawing).delete(delete_drawing),
        )
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Drawing {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub drawing_no: String,
    pub name: String,
    pub name_en: Option<String>,
    pub description: Option<String>,
    pub drawing_type: Option<String>,
    pub product_id: Option<Uuid>,
    pub version: String,
    pub status: String,
    pub file_path: Option<String>,
    pub file_size: Option<i64>,
    pub created_by: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Deserialize)]
pub struct ListDrawingsQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
    pub drawing_type: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateDrawingRequest {
    pub drawing_no: String,
    pub name: String,
    pub name_en: Option<String>,
    pub description: Option<String>,
    pub drawing_type: Option<String>,
    pub product_id: Option<Uuid>,
    pub version: Option<String>,
    pub status: Option<String>,
    pub file_path: Option<String>,
    pub file_size: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateDrawingRequest {
    pub name: Option<String>,
    pub name_en: Option<String>,
    pub description: Option<String>,
    pub drawing_type: Option<String>,
    pub product_id: Option<Uuid>,
    pub version: Option<String>,
    pub status: Option<String>,
    pub file_path: Option<String>,
    pub file_size: Option<i64>,
}

fn tenant_opt_from_claims(claims: &Claims) -> Option<Uuid> {
    if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| Uuid::parse_str(t).ok())
    }
}

pub async fn list_drawings(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<ListDrawingsQuery>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::from(topems_shared_core::error::TopemsError::Internal(
            "数据库事务不可用".to_string(),
        ));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return ApiResponse::from(topems_shared_core::error::TopemsError::Internal(
                "数据库事务不可用".to_string(),
            ));
        }
    };
    let Some(tenant_id) = tenant_opt_from_claims(&claims) else {
        tracing::warn!("缺少租户上下文：拒绝降级到跨租户查询（is_superuser={}）", claims.is_superuser);
        return ApiResponse::bad_request("缺少租户上下文");
    };
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;
    let search_pattern = query.search.map(|s| format!("%{}%", s));

    let result = sqlx::query_as::<_, Drawing>(
        r#"
        SELECT id, tenant_id, drawing_no, name, name_en, description, drawing_type,
               product_id, version, status, file_path, file_size, created_by,
               created_at, updated_at
        FROM pdm.pdm_drawings
        WHERE deleted_at IS NULL
          AND tenant_id = $1
          AND ($2::text IS NULL OR drawing_no ILIKE $2 OR name ILIKE $2 OR COALESCE(name_en, '') ILIKE $2)
          AND ($3::text IS NULL OR status = $3)
          AND ($4::text IS NULL OR drawing_type = $4)
        ORDER BY created_at DESC
        LIMIT $5 OFFSET $6
        "#,
    )
    .bind(tenant_id)
    .bind(&search_pattern)
    .bind(&query.status)
    .bind(&query.drawing_type)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut scope)
    .await;

    match result {
        Ok(items) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM pdm.pdm_drawings
                WHERE deleted_at IS NULL
                  AND tenant_id = $1
                  AND ($2::text IS NULL OR drawing_no ILIKE $2 OR name ILIKE $2 OR COALESCE(name_en, '') ILIKE $2)
                  AND ($3::text IS NULL OR status = $3)
                  AND ($4::text IS NULL OR drawing_type = $4)
                "#,
            )
            .bind(tenant_id)
            .bind(&search_pattern)
            .bind(&query.status)
            .bind(&query.drawing_type)
            .fetch_one(&mut scope)
            .await;
            let total = count_result.unwrap_or(0);
            ApiResponse::success(
                serde_json::json!({ "items": items, "total": total, "page": page, "page_size": page_size }),
                "获取图纸列表成功",
            )
        }
        Err(e) => {
            tracing::error!("获取图纸列表失败: {e}");
            ApiResponse::server_error("获取图纸列表失败")
        }
    }
}

pub async fn create_drawing(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateDrawingRequest>,
) -> ApiResponse<Drawing> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::from(topems_shared_core::error::TopemsError::Internal(
            "数据库事务不可用".to_string(),
        ));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return ApiResponse::from(topems_shared_core::error::TopemsError::Internal(
                "数据库事务不可用".to_string(),
            ));
        }
    };
    if req.drawing_no.trim().is_empty() || req.name.trim().is_empty() {
        return ApiResponse::bad_request("图纸编号与名称不能为空");
    }
    let Some(tenant_id) = tenant_opt_from_claims(&claims) else {
        tracing::warn!("缺少租户上下文：拒绝降级到 nil 租户（is_superuser={}）", claims.is_superuser);
        return ApiResponse::bad_request("缺少租户上下文");
    };
    let now = Utc::now();
    let version = req.version.unwrap_or_else(|| "1.0".to_string());
    let status = req.status.unwrap_or_else(|| "active".to_string());
    let created_by = claims.sub.clone();

    let result = sqlx::query_as::<_, Drawing>(
        r#"
        INSERT INTO pdm.pdm_drawings (
            id, tenant_id, drawing_no, name, name_en, description, drawing_type,
            product_id, version, status, file_path, file_size, created_by,
            created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING id, tenant_id, drawing_no, name, name_en, description, drawing_type,
                  product_id, version, status, file_path, file_size, created_by,
                  created_at, updated_at
        "#,
    )
    .bind(Uuid::new_v4())
    .bind(tenant_id)
    .bind(&req.drawing_no)
    .bind(&req.name)
    .bind(&req.name_en)
    .bind(&req.description)
    .bind(&req.drawing_type)
    .bind(req.product_id)
    .bind(&version)
    .bind(&status)
    .bind(&req.file_path)
    .bind(req.file_size)
    .bind(&created_by)
    .bind(now)
    .bind(now)
    .fetch_one(&mut scope)
    .await;

    match result {
        Ok(row) => ApiResponse::success(row, "创建图纸成功"),
        Err(e) => {
            tracing::error!("创建图纸失败: {e}");
            ApiResponse::server_error("创建图纸失败")
        }
    }
}

pub async fn get_drawing(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<Drawing> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::from(topems_shared_core::error::TopemsError::Internal(
            "数据库事务不可用".to_string(),
        ));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return ApiResponse::from(topems_shared_core::error::TopemsError::Internal(
                "数据库事务不可用".to_string(),
            ));
        }
    };
    let Some(tenant_id) = tenant_opt_from_claims(&claims) else {
        tracing::warn!("缺少租户上下文：拒绝降级到跨租户查询（is_superuser={}）", claims.is_superuser);
        return ApiResponse::bad_request("缺少租户上下文");
    };
    let result = sqlx::query_as::<_, Drawing>(
        r#"
        SELECT id, tenant_id, drawing_no, name, name_en, description, drawing_type,
               product_id, version, status, file_path, file_size, created_by,
               created_at, updated_at
        FROM pdm.pdm_drawings
        WHERE id = $1 AND deleted_at IS NULL AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&mut scope)
    .await;

    match result {
        Ok(Some(row)) => ApiResponse::success(row, "获取图纸成功"),
        Ok(None) => ApiResponse::not_found("图纸不存在"),
        Err(e) => {
            tracing::error!("获取图纸失败: {e}");
            ApiResponse::server_error("获取图纸失败")
        }
    }
}

pub async fn update_drawing(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateDrawingRequest>,
) -> ApiResponse<Drawing> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::from(topems_shared_core::error::TopemsError::Internal(
            "数据库事务不可用".to_string(),
        ));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return ApiResponse::from(topems_shared_core::error::TopemsError::Internal(
                "数据库事务不可用".to_string(),
            ));
        }
    };
    let Some(tenant_id) = tenant_opt_from_claims(&claims) else {
        tracing::warn!("缺少租户上下文：拒绝降级到跨租户查询（is_superuser={}）", claims.is_superuser);
        return ApiResponse::bad_request("缺少租户上下文");
    };
    let result = sqlx::query_as::<_, Drawing>(
        r#"
        UPDATE pdm.pdm_drawings SET
            name = COALESCE($3, name),
            name_en = COALESCE($4, name_en),
            description = COALESCE($5, description),
            drawing_type = COALESCE($6, drawing_type),
            product_id = COALESCE($7, product_id),
            version = COALESCE($8, version),
            status = COALESCE($9, status),
            file_path = COALESCE($10, file_path),
            file_size = COALESCE($11, file_size),
            updated_at = now()
        WHERE id = $1 AND deleted_at IS NULL AND tenant_id = $2
        RETURNING id, tenant_id, drawing_no, name, name_en, description, drawing_type,
                  product_id, version, status, file_path, file_size, created_by,
                  created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .bind(&req.name)
    .bind(&req.name_en)
    .bind(&req.description)
    .bind(&req.drawing_type)
    .bind(req.product_id)
    .bind(&req.version)
    .bind(&req.status)
    .bind(&req.file_path)
    .bind(req.file_size)
    .fetch_optional(&mut scope)
    .await;

    match result {
        Ok(Some(row)) => ApiResponse::success(row, "更新图纸成功"),
        Ok(None) => ApiResponse::not_found("图纸不存在"),
        Err(e) => {
            tracing::error!("更新图纸失败: {e}");
            ApiResponse::server_error("更新图纸失败")
        }
    }
}

pub async fn delete_drawing(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::from(topems_shared_core::error::TopemsError::Internal(
            "数据库事务不可用".to_string(),
        ));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return ApiResponse::from(topems_shared_core::error::TopemsError::Internal(
                "数据库事务不可用".to_string(),
            ));
        }
    };
    let Some(tenant_id) = tenant_opt_from_claims(&claims) else {
        tracing::warn!("缺少租户上下文：拒绝降级到跨租户查询（is_superuser={}）", claims.is_superuser);
        return ApiResponse::bad_request("缺少租户上下文");
    };
    let result = sqlx::query(
        r#"
        UPDATE pdm.pdm_drawings SET deleted_at = now(), updated_at = now()
        WHERE id = $1 AND deleted_at IS NULL AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .execute(&mut scope)
    .await;

    match result {
        Ok(res) if res.rows_affected() > 0 => {
            ApiResponse::success(serde_json::Value::Null, "删除图纸成功")
        }
        Ok(_) => ApiResponse::not_found("图纸不存在"),
        Err(e) => {
            tracing::error!("删除图纸失败: {e}");
            ApiResponse::server_error("删除图纸失败")
        }
    }
}
