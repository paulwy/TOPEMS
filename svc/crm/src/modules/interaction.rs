use axum::{
    extract::{Extension, Path, Query, State},
    http::HeaderMap,
    routing::get,
    Json, Router,
};
use serde::Deserialize;
use uuid::Uuid;

use super::ApiState;
use crate::middleware::tenant::get_tenant_id;
use crate::models::{Interaction, UpdateInteractionRequest};
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared::auth::Claims;
use topems_shared::{ApiResponse, ListResponse};
use topems_shared_core::response::api_error;

#[derive(Debug, Deserialize)]
pub struct InteractionPaginationParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
    pub customer_id: Option<Uuid>,
    pub contact_id: Option<Uuid>,
}

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route("/interactions", get(list_interactions))
        .route("/interactions/{id}", get(get_interaction))
}

async fn list_interactions(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<InteractionPaginationParams>,
    headers: HeaderMap,
) -> Json<ApiResponse<ListResponse<Interaction>>> {
    match check_permission(&state.db, &claims, &ModulePermission::InteractionRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let page = params.page.unwrap_or(1).max(1).min(1000);
    let page_size = params.page_size.unwrap_or(20).min(200);
    let offset = (page - 1) * page_size;

    let search = params
        .search
        .as_ref()
        .map(|s| s.trim()[..s.len().min(100)].to_string());
    let search_pattern = search.as_deref().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();
    let customer_filter = params.customer_id;
    let contact_filter = params.contact_id;
    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query_as::<_, Interaction>(
        r#"
        SELECT id, tenant_id, customer_id, contact_id, type as type_, subject, content, scheduled_at, completed_at, status, notes, created_at, updated_at, deleted_at
        FROM crm.interactions
        WHERE tenant_id = $1 AND deleted_at IS NULL
          AND ($2::text IS NULL OR subject ILIKE $2 OR content ILIKE $2)
          AND ($3::text IS NULL OR status = $3)
          AND ($4::uuid IS NULL OR customer_id = $4)
          AND ($5::uuid IS NULL OR contact_id = $5)
        ORDER BY created_at DESC
        LIMIT $6 OFFSET $7
        "#,
    )
    .bind(tenant_id)
    .bind(&search_pattern)
    .bind(&status_filter)
    .bind(&customer_filter)
    .bind(&contact_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(interactions) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM crm.interactions
                WHERE deleted_at IS NULL AND tenant_id = $1
                  AND ($2::text IS NULL OR subject ILIKE $2 OR content ILIKE $2)
                  AND ($3::text IS NULL OR status = $3)
                  AND ($4::uuid IS NULL OR customer_id = $4)
                  AND ($5::uuid IS NULL OR contact_id = $5)
                "#,
            )
            .bind(tenant_id)
            .bind(&search_pattern)
            .bind(&status_filter)
            .bind(&customer_filter)
            .bind(&contact_filter)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                ListResponse::with_pagination(interactions, total, page, page_size),
                "获取交互记录列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取交互记录列表失败: {}", e);
            Json(api_error(500, "获取交互记录列表失败"))
        }
    }
}

async fn get_interaction(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<Interaction>> {
    match check_permission(&state.db, &claims, &ModulePermission::InteractionRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query_as::<_, Interaction>(
        r#"
        SELECT id, tenant_id, customer_id, contact_id, type as type_, subject, content, scheduled_at, completed_at, status, notes, created_at, updated_at, deleted_at
        FROM crm.interactions WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(interaction)) => Json(ApiResponse::success(interaction, "获取交互记录成功")),
        Ok(None) => Json(api_error(404, "交互记录不存在")),
        Err(e) => {
            tracing::error!("获取交互记录失败: {}", e);
            Json(api_error(500, "获取交互记录失败"))
        }
    }
}

#[allow(dead_code)]
struct _Unused(UpdateInteractionRequest);
