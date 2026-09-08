use axum::{
    extract::{Extension, Path, Query, State},
    http::HeaderMap,
    Json,
};
use uuid::Uuid;

use crate::models::consolidation::*;
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared::auth::Claims;
use topems_shared::ApiResponse;
use topems_shared_core::response::{api_error, PaginatedResponse};

use super::common::{log_audit, ConsolidationListParams};
use super::ApiState;

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/consolidation/scopes",
    tag = "Consolidation",
    responses((status = 200, description = "获取合并范围列表成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn list_scopes(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ConsolidationListParams>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<PaginatedResponse<ConsolidationScope>>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceRead).await {
        return e;
    }

    let page = params.base.page_or_default();
    let page_size = params.base.page_size_or_default();
    let offset = params.base.offset();

    let result = sqlx::query_as::<_, ConsolidationScope>(
        r#"
        SELECT * FROM erp.consolidation_scopes
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
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(scopes) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM erp.consolidation_scopes
                WHERE deleted_at IS NULL AND ($1::text IS NULL OR name ILIKE $1 OR code ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                "#,
            )
            .bind(params.keyword.as_ref().map(|s| format!("%{}%", s)))
            .bind(&params.status)
            .fetch_one(&mut **txn)
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

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/consolidation/scopes/{scopeId}",
    tag = "Consolidation",
    params(("scopeId" = String, Path, description = "合并范围ID")),
    responses((status = 200, description = "获取合并范围详情成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn get_scope(
    State(state): State<ApiState>,
    Path(scope_id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<ConsolidationScope>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match sqlx::query_as::<_, ConsolidationScope>(
        "SELECT * FROM erp.consolidation_scopes WHERE deleted_at IS NULL AND id = $1",
    )
    .bind(scope_id)
    .fetch_optional(&mut **txn)
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

#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:master-data:write"])),
    path = "/erp/consolidation/scopes",
    tag = "Consolidation",
    responses((status = 200, description = "创建合并范围成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn create_scope(
    State(state): State<ApiState>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<CreateConsolidationScopeRequest>,
) -> Json<ApiResponse<ConsolidationScope>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let id = Uuid::new_v4();
    let result = sqlx::query_as::<_, ConsolidationScope>(
        r#"
        INSERT INTO erp.consolidation_scopes (id, code, name, description, consolidation_method)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
        "#,
    )
    .bind(id)
    .bind(&req.code)
    .bind(&req.name)
    .bind(&req.description)
    .bind(req.consolidation_method.as_deref().unwrap_or("full"))
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(scope) => {
            log_audit(
                &state.db,
                "create",
                "consolidation_scope",
                Some(id),
                &headers,
            )
            .await;
            Json(ApiResponse::success(scope, "创建合并范围成功"))
        }
        Err(e) => {
            tracing::error!("创建合并范围失败: {}", e);
            Json(api_error(500, "创建合并范围失败"))
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["erp:update"])),
    path = "/erp/consolidation/scopes/{scopeId}",
    tag = "Consolidation",
    params(("scopeId" = String, Path, description = "合并范围ID")),
    responses((status = 200, description = "更新合并范围成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn update_scope(
    State(state): State<ApiState>,
    Path(scope_id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<UpdateConsolidationScopeRequest>,
) -> Json<ApiResponse<ConsolidationScope>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let result = sqlx::query_as::<_, ConsolidationScope>(
        r#"
        UPDATE erp.consolidation_scopes
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
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(scope) => {
            log_audit(
                &state.db,
                "update",
                "consolidation_scope",
                Some(scope_id),
                &headers,
            )
            .await;
            Json(ApiResponse::success(scope, "更新合并范围成功"))
        }
        Err(e) => {
            tracing::error!("更新合并范围失败: {}", e);
            Json(api_error(500, "更新合并范围失败"))
        }
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["erp:delete"])),
    path = "/erp/consolidation/scopes/{scopeId}",
    tag = "Consolidation",
    params(("scopeId" = String, Path, description = "合并范围ID")),
    responses((status = 200, description = "删除合并范围成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn delete_scope(
    State(state): State<ApiState>,
    Path(scope_id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<()>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match sqlx::query("UPDATE erp.consolidation_scopes SET deleted_at = NOW() WHERE id = $1")
        .bind(scope_id)
        .execute(&mut **txn)
        .await
    {
        Ok(result) => {
            if result.rows_affected() == 0 {
                Json(api_error(404, "合并范围不存在"))
            } else {
                log_audit(
                    &state.db,
                    "delete",
                    "consolidation_scope",
                    Some(scope_id),
                    &headers,
                )
                .await;
                if let Some(t) = guard.take() {
                    if let Err(e) = t.commit().await {
                        tracing::error!("事务提交失败: {}", e);
                        return Json(ApiResponse::error(500, "事务提交失败"));
                    }
                }
                Json(ApiResponse::success((), "删除合并范围成功"))
            }
        }
        Err(e) => {
            tracing::error!("删除合并范围失败: {}", e);
            Json(api_error(500, "删除合并范围失败"))
        }
    }
}
