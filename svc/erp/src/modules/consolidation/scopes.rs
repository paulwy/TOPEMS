use axum::{
    extract::{Extension, Path, Query, State},
    http::HeaderMap,
    Json,
};
use uuid::Uuid;

use crate::models::consolidation::*;
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::api_error;
use topems_shared_core::response::ApiResponse;
use topems_shared_core::response::PaginatedResponse;

use super::common::PaginationParams;
use super::ApiState;

macro_rules! log_audit {
    ($($args:expr),*) => {};
}

pub async fn list_scopes(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<PaginationParams>,
) -> Json<ApiResponse<PaginatedResponse<ConsolidationScope>>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceRead).await {
        return e;
    }

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let result = sqlx::query_as::<_, ConsolidationScope>(
        r#"
        SELECT id, tenant_id, scope_name, scope_type, period_start, period_end, status, created_by, created_at, updated_at FROM plugin_erp.consolidation_scopes
        WHERE deleted_at IS NULL AND ($1::text IS NULL OR name ILIKE $1 OR code ILIKE $1)
          AND ($2::text IS NULL OR status = $2)
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
        "#,
    )
    .bind(params.keyword.as_ref().map(|s| format!("%{}%", s)))
    .bind(&params.status)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(scopes) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM plugin_erp.consolidation_scopes
                WHERE deleted_at IS NULL AND ($1::text IS NULL OR name ILIKE $1 OR code ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                "#,
            )
            .bind(params.keyword.as_ref().map(|s| format!("%{}%", s)))
            .bind(&params.status)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);
            Json(ApiResponse::success(
                PaginatedResponse::new(scopes, total, page, page_size),
                "获取合并范围列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取合并范围列表失败: {}", e);
            Json(api_error(500, "获取合并范围列表失败"))
        }
    }
}

pub async fn get_scope(
    State(state): State<ApiState>,
    Path(scope_id): Path<Uuid>,
) -> Json<ApiResponse<ConsolidationScope>> {
    match sqlx::query_as::<_, ConsolidationScope>(
        "SELECT id, tenant_id, scope_name, scope_type, period_start, period_end, status, created_by, created_at, updated_at FROM plugin_erp.consolidation_scopes WHERE deleted_at IS NULL AND id = $1",
    )
    .bind(scope_id)
    .fetch_optional(&state.db)
    .await
    {
        Ok(Some(scope)) => Json(ApiResponse::success(scope, "获取合并范围成功")),
        Ok(None) => Json(api_error(404, "合并范围不存在")),
        Err(e) => {
            tracing::error!("获取合并范围失败: {}", e);
            Json(api_error(500, "获取合并范围失败"))
        }
    }
}

pub async fn create_scope(
    State(state): State<ApiState>,
    _headers: HeaderMap,
    Json(req): Json<CreateConsolidationScopeRequest>,
) -> Json<ApiResponse<ConsolidationScope>> {
    let id = Uuid::new_v4();
    let result = sqlx::query_as::<_, ConsolidationScope>(
        r#"
        INSERT INTO plugin_erp.consolidation_scopes (id, code, name, description, consolidation_method)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
        "#,
    )
    .bind(id)
    .bind(&req.code)
    .bind(&req.name)
    .bind(&req.description)
    .bind(req.consolidation_method.as_deref().unwrap_or("full"))
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(scope) => {
            log_audit!(
                &state.db,
                "create",
                "consolidation_scope",
                Some(id),
                &headers
            );
            Json(ApiResponse::success(scope, "创建合并范围成功"))
        }
        Err(e) => {
            tracing::error!("创建合并范围失败: {}", e);
            Json(api_error(500, "创建合并范围失败"))
        }
    }
}

pub async fn update_scope(
    State(state): State<ApiState>,
    Path(scope_id): Path<Uuid>,
    _headers: HeaderMap,
    Json(req): Json<UpdateConsolidationScopeRequest>,
) -> Json<ApiResponse<ConsolidationScope>> {
    let result = sqlx::query_as::<_, ConsolidationScope>(
        r#"
        UPDATE plugin_erp.consolidation_scopes
        SET name = COALESCE($2, name),
            description = COALESCE($3, description),
            consolidation_method = COALESCE($4, consolidation_method),
            status = COALESCE($5, status),
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
        "#,
    )
    .bind(scope_id)
    .bind(&req.name)
    .bind(&req.description)
    .bind(&req.consolidation_method)
    .bind(&req.status)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(scope) => {
            log_audit!(
                &state.db,
                "update",
                "consolidation_scope",
                Some(scope_id),
                &headers
            );
            Json(ApiResponse::success(scope, "更新合并范围成功"))
        }
        Err(e) => {
            tracing::error!("更新合并范围失败: {}", e);
            Json(api_error(500, "更新合并范围失败"))
        }
    }
}

pub async fn delete_scope(
    State(state): State<ApiState>,
    Path(scope_id): Path<Uuid>,
    _headers: HeaderMap,
) -> Json<ApiResponse<()>> {
    match sqlx::query("UPDATE plugin_erp.consolidation_scopes SET deleted_at = NOW() WHERE id = $1")
        .bind(scope_id)
        .execute(&state.db)
        .await
    {
        Ok(result) => {
            if result.rows_affected() == 0 {
                Json(api_error(404, "合并范围不存在"))
            } else {
                log_audit!(
                    &state.db,
                    "delete",
                    "consolidation_scope",
                    Some(scope_id),
                    &headers
                );
                Json(ApiResponse::success((), "删除合并范围成功"))
            }
        }
        Err(e) => {
            tracing::error!("删除合并范围失败: {}", e);
            Json(api_error(500, "删除合并范围失败"))
        }
    }
}
