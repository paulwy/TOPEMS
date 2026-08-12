//! Carrier handlers - 承运商管理

use axum::{
    extract::{FromRef, Path, Query, State},
    http::HeaderMap,
    routing::get,
    Extension, Json, Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

use crate::middleware::tenant::get_tenant_id;
use crate::shared::AppState;
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::{api_error, ApiResponse, PaginationParams};

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct Carrier {
    pub id: Uuid,
    pub carrier_no: String,
    pub name: String,
    pub contact_person: Option<String>,
    pub contact_phone: Option<String>,
    pub status: String,
    pub service_area: Option<String>,
    pub tenant_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateCarrierRequest {
    pub carrier_no: String,
    pub name: String,
    pub contact_person: Option<String>,
    pub contact_phone: Option<String>,
    pub service_area: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UpdateCarrierRequest {
    pub name: Option<String>,
    pub contact_person: Option<String>,
    pub contact_phone: Option<String>,
    pub status: Option<String>,
    pub service_area: Option<String>,
}

pub fn create_routes<S>() -> Router<S>
where
    S: Clone + Send + Sync + 'static,
    AppState: FromRef<S>,
{
    Router::new()
        .route("/carriers", get(list_carriers).post(create_carrier))
        .route(
            "/carriers/{id}",
            get(get_carrier).put(update_carrier).delete(delete_carrier),
        )
}

#[utoipa::path(
    get,
    path = "/api/tms/carriers",
    responses(
        (status = 200, description = "list_carriers OK")
    ),
    tag = "TMS - Carrier"
)]
pub async fn list_carriers(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<PaginationParams>,
    headers: HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();
    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query_as::<_, Carrier>(
        r#"
        SELECT id, carrier_no, name, contact_person, contact_phone, status, service_area, tenant_id, created_at, updated_at
        FROM tms.tms_carriers
        WHERE tenant_id = $1
          AND ($2::text IS NULL OR carrier_no ILIKE $2 OR name ILIKE $2)
          AND ($3::text IS NULL OR status = $3)
        ORDER BY created_at DESC
        LIMIT $4 OFFSET $5
        "#,
    )
    .bind(tenant_id)
    .bind(&search_pattern)
    .bind(&status_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(carriers) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM tms.tms_carriers
                WHERE tenant_id = $1
                  AND ($2::text IS NULL OR carrier_no ILIKE $2 OR name ILIKE $2)
                  AND ($3::text IS NULL OR status = $3)
                "#,
            )
            .bind(tenant_id)
            .bind(&search_pattern)
            .bind(&status_filter)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);
            let response_data = serde_json::json!({
                "carriers": carriers,
                "total": total,
                "page": page,
                "page_size": page_size
            });
            Json(ApiResponse::success(response_data, "获取承运商列表成功"))
        }
        Err(e) => {
            tracing::error!("获取承运商列表失败: {}", e);
            Json(api_error(500, "获取承运商列表失败"))
        }
    }
}

#[utoipa::path(
    post,
    path = "/api/tms/carriers",
    request_body = CreateCarrierRequest,
    responses(
        (status = 200, description = "create_carrier OK")
    ),
    tag = "TMS - Carrier"
)]
pub async fn create_carrier(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<CreateCarrierRequest>,
) -> Json<ApiResponse<Carrier>> {
    let id = Uuid::new_v4();
    let now = Utc::now();
    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query_as::<_, Carrier>(
        r#"
        INSERT INTO tms.tms_carriers (id, carrier_no, name, contact_person, contact_phone, status, service_area, tenant_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, 'active', $6, $7, $8, $9)
        RETURNING id, carrier_no, name, contact_person, contact_phone, status, service_area, tenant_id, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.carrier_no)
    .bind(&req.name)
    .bind(&req.contact_person)
    .bind(&req.contact_phone)
    .bind(&req.service_area)
    .bind(tenant_id)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(carrier) => Json(ApiResponse::success(carrier, "承运商创建成功")),
        Err(e) => {
            tracing::error!("创建承运商失败: {}", e);
            Json(api_error(500, "承运商创建失败"))
        }
    }
}

#[utoipa::path(
    get,
    path = "/api/tms/carriers/{id}",
    params(
        ("id" = Uuid, Path, description = "承运商 ID")
    ),
    responses(
        (status = 200, description = "get_carrier OK")
    ),
    tag = "TMS - Carrier"
)]
pub async fn get_carrier(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<Carrier>> {
    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query_as::<_, Carrier>(
        r#"
        SELECT id, carrier_no, name, contact_person, contact_phone, status, service_area, tenant_id, created_at, updated_at
        FROM tms.tms_carriers WHERE id = $1 AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(carrier)) => Json(ApiResponse::success(carrier, "获取承运商成功")),
        Ok(None) => Json(api_error(404, "承运商不存在")),
        Err(e) => {
            tracing::error!("获取承运商失败: {}", e);
            Json(api_error(500, "获取承运商失败"))
        }
    }
}

#[utoipa::path(
    put,
    path = "/api/tms/carriers/{id}",
    request_body = UpdateCarrierRequest,
    params(
        ("id" = Uuid, Path, description = "承运商 ID")
    ),
    responses(
        (status = 200, description = "update_carrier OK")
    ),
    tag = "TMS - Carrier"
)]
pub async fn update_carrier(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<UpdateCarrierRequest>,
) -> Json<ApiResponse<Carrier>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let now = Utc::now();

    let result = sqlx::query_as::<_, Carrier>(
        r#"
        UPDATE tms.tms_carriers SET
            name = COALESCE($2, name),
            contact_person = COALESCE($3, contact_person),
            contact_phone = COALESCE($4, contact_phone),
            status = COALESCE($5, status),
            service_area = COALESCE($6, service_area),
            updated_at = $7
        WHERE id = $1 AND tenant_id = $8
        RETURNING id, carrier_no, name, contact_person, contact_phone, status, service_area, tenant_id, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.name)
    .bind(&req.contact_person)
    .bind(&req.contact_phone)
    .bind(&req.status)
    .bind(&req.service_area)
    .bind(now)
    .bind(tenant_id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(carrier)) => Json(ApiResponse::success(carrier, "承运商更新成功")),
        Ok(None) => Json(api_error(404, "承运商不存在")),
        Err(e) => {
            tracing::error!("更新承运商失败: {}", e);
            Json(api_error(500, "更新承运商失败"))
        }
    }
}

#[utoipa::path(
    delete,
    path = "/api/tms/carriers/{id}",
    params(
        ("id" = Uuid, Path, description = "承运商 ID")
    ),
    responses(
        (status = 200, description = "delete_carrier OK")
    ),
    tag = "TMS - Carrier"
)]
pub async fn delete_carrier(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query("DELETE FROM tms.tms_carriers WHERE id = $1 AND tenant_id = $2")
        .bind(id)
        .bind(tenant_id)
        .execute(&state.db)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => {
            Json(ApiResponse::success("".to_string(), "承运商删除成功"))
        }
        Ok(_) => Json(api_error(404, "承运商不存在")),
        Err(e) => {
            tracing::error!("删除承运商失败: {}", e);
            Json(api_error(500, "承运商删除失败"))
        }
    }
}
