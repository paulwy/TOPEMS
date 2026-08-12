//! Driver handlers - 司机管理

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
pub struct Driver {
    pub id: Uuid,
    pub driver_no: String,
    pub name: String,
    pub phone: Option<String>,
    pub license_no: Option<String>,
    pub license_type: Option<String>,
    pub status: String,
    pub carrier_id: Option<Uuid>,
    pub tenant_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateDriverRequest {
    pub driver_no: String,
    pub name: String,
    pub phone: Option<String>,
    pub license_no: Option<String>,
    pub license_type: Option<String>,
    pub carrier_id: Option<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UpdateDriverRequest {
    pub name: Option<String>,
    pub phone: Option<String>,
    pub license_no: Option<String>,
    pub license_type: Option<String>,
    pub status: Option<String>,
    pub carrier_id: Option<Uuid>,
}

pub fn create_routes<S>() -> Router<S>
where
    S: Clone + Send + Sync + 'static,
    AppState: FromRef<S>,
{
    Router::new()
        .route("/drivers", get(list_drivers).post(create_driver))
        .route(
            "/drivers/{id}",
            get(get_driver).put(update_driver).delete(delete_driver),
        )
}

#[utoipa::path(
    get,
    path = "/api/tms/drivers",
    responses(
        (status = 200, description = "list_drivers OK")
    ),
    tag = "TMS - Driver"
)]
pub async fn list_drivers(
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

    let result = sqlx::query_as::<_, Driver>(
        r#"
        SELECT id, driver_no, name, phone, license_no, license_type, status, carrier_id, tenant_id, created_at, updated_at
        FROM tms.tms_drivers
        WHERE tenant_id = $1
          AND ($2::text IS NULL OR driver_no ILIKE $2 OR name ILIKE $2)
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
        Ok(drivers) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM tms.tms_drivers
                WHERE tenant_id = $1
                  AND ($2::text IS NULL OR driver_no ILIKE $2 OR name ILIKE $2)
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
                "drivers": drivers,
                "total": total,
                "page": page,
                "page_size": page_size
            });
            Json(ApiResponse::success(response_data, "获取司机列表成功"))
        }
        Err(e) => {
            tracing::error!("获取司机列表失败: {}", e);
            Json(api_error(500, "获取司机列表失败"))
        }
    }
}

#[utoipa::path(
    post,
    path = "/api/tms/drivers",
    request_body = CreateDriverRequest,
    responses(
        (status = 200, description = "create_driver OK")
    ),
    tag = "TMS - Driver"
)]
pub async fn create_driver(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<CreateDriverRequest>,
) -> Json<ApiResponse<Driver>> {
    let id = Uuid::new_v4();
    let now = Utc::now();
    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query_as::<_, Driver>(
        r#"
        INSERT INTO tms.tms_drivers (id, driver_no, name, phone, license_no, license_type, status, carrier_id, tenant_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, 'active', $7, $8, $9, $10)
        RETURNING id, driver_no, name, phone, license_no, license_type, status, carrier_id, tenant_id, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.driver_no)
    .bind(&req.name)
    .bind(&req.phone)
    .bind(&req.license_no)
    .bind(&req.license_type)
    .bind(&req.carrier_id)
    .bind(tenant_id)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(driver) => Json(ApiResponse::success(driver, "司机创建成功")),
        Err(e) => {
            tracing::error!("创建司机失败: {}", e);
            Json(api_error(500, "司机创建失败"))
        }
    }
}

#[utoipa::path(
    get,
    path = "/api/tms/drivers/{id}",
    params(
        ("id" = Uuid, Path, description = "司机 ID")
    ),
    responses(
        (status = 200, description = "get_driver OK")
    ),
    tag = "TMS - Driver"
)]
pub async fn get_driver(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<Driver>> {
    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query_as::<_, Driver>(
        r#"
        SELECT id, driver_no, name, phone, license_no, license_type, status, carrier_id, tenant_id, created_at, updated_at
        FROM tms.tms_drivers WHERE id = $1 AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(driver)) => Json(ApiResponse::success(driver, "获取司机成功")),
        Ok(None) => Json(api_error(404, "司机不存在")),
        Err(e) => {
            tracing::error!("获取司机失败: {}", e);
            Json(api_error(500, "获取司机失败"))
        }
    }
}

#[utoipa::path(
    put,
    path = "/api/tms/drivers/{id}",
    request_body = UpdateDriverRequest,
    params(
        ("id" = Uuid, Path, description = "司机 ID")
    ),
    responses(
        (status = 200, description = "update_driver OK")
    ),
    tag = "TMS - Driver"
)]
pub async fn update_driver(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<UpdateDriverRequest>,
) -> Json<ApiResponse<Driver>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let now = Utc::now();

    let result = sqlx::query_as::<_, Driver>(
        r#"
        UPDATE tms.tms_drivers SET
            name = COALESCE($2, name),
            phone = COALESCE($3, phone),
            license_no = COALESCE($4, license_no),
            license_type = COALESCE($5, license_type),
            status = COALESCE($6, status),
            carrier_id = COALESCE($7, carrier_id),
            updated_at = $8
        WHERE id = $1 AND tenant_id = $9
        RETURNING id, driver_no, name, phone, license_no, license_type, status, carrier_id, tenant_id, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.name)
    .bind(&req.phone)
    .bind(&req.license_no)
    .bind(&req.license_type)
    .bind(&req.status)
    .bind(&req.carrier_id)
    .bind(now)
    .bind(tenant_id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(driver)) => Json(ApiResponse::success(driver, "司机更新成功")),
        Ok(None) => Json(api_error(404, "司机不存在")),
        Err(e) => {
            tracing::error!("更新司机失败: {}", e);
            Json(api_error(500, "更新司机失败"))
        }
    }
}

#[utoipa::path(
    delete,
    path = "/api/tms/drivers/{id}",
    params(
        ("id" = Uuid, Path, description = "司机 ID")
    ),
    responses(
        (status = 200, description = "delete_driver OK")
    ),
    tag = "TMS - Driver"
)]
pub async fn delete_driver(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query("DELETE FROM tms.tms_drivers WHERE id = $1 AND tenant_id = $2")
        .bind(id)
        .bind(tenant_id)
        .execute(&state.db)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => {
            Json(ApiResponse::success("".to_string(), "司机删除成功"))
        }
        Ok(_) => Json(api_error(404, "司机不存在")),
        Err(e) => {
            tracing::error!("删除司机失败: {}", e);
            Json(api_error(500, "司机删除失败"))
        }
    }
}
