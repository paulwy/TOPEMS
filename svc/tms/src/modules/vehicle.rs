//! Vehicle handlers - 车辆管理

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
pub struct Vehicle {
    pub id: Uuid,
    pub vehicle_no: String,
    pub plate_number: Option<String>,
    pub vehicle_type: Option<String>,
    pub capacity: Option<bigdecimal::BigDecimal>,
    pub status: String,
    pub carrier_id: Option<Uuid>,
    pub notes: Option<String>,
    pub tenant_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateVehicleRequest {
    pub vehicle_no: String,
    pub plate_number: Option<String>,
    pub vehicle_type: Option<String>,
    pub capacity: Option<bigdecimal::BigDecimal>,
    pub carrier_id: Option<Uuid>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UpdateVehicleRequest {
    pub plate_number: Option<String>,
    pub vehicle_type: Option<String>,
    pub capacity: Option<bigdecimal::BigDecimal>,
    pub status: Option<String>,
    pub carrier_id: Option<Uuid>,
    pub notes: Option<String>,
}

pub fn create_routes<S>() -> Router<S>
where
    S: Clone + Send + Sync + 'static,
    AppState: FromRef<S>,
{
    Router::new()
        .route("/vehicles", get(list_vehicles).post(create_vehicle))
        .route(
            "/vehicles/{id}",
            get(get_vehicle).put(update_vehicle).delete(delete_vehicle),
        )
}

#[utoipa::path(
    get,
    path = "/api/tms/vehicles",
    responses(
        (status = 200, description = "list_vehicles OK")
    ),
    tag = "TMS - Vehicle"
)]
pub async fn list_vehicles(
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

    let result = sqlx::query_as::<_, Vehicle>(
        r#"
        SELECT id, vehicle_no, plate_number, vehicle_type, capacity, status, carrier_id, notes, tenant_id, created_at, updated_at
        FROM tms.tms_vehicles
        WHERE tenant_id = $1
          AND ($2::text IS NULL OR vehicle_no ILIKE $2 OR plate_number ILIKE $2)
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
        Ok(vehicles) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM tms.tms_vehicles
                WHERE tenant_id = $1
                  AND ($2::text IS NULL OR vehicle_no ILIKE $2 OR plate_number ILIKE $2)
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
                "vehicles": vehicles,
                "total": total,
                "page": page,
                "page_size": page_size
            });
            Json(ApiResponse::success(response_data, "获取车辆列表成功"))
        }
        Err(e) => {
            tracing::error!("获取车辆列表失败: {}", e);
            Json(api_error(500, "获取车辆列表失败"))
        }
    }
}

#[utoipa::path(
    post,
    path = "/api/tms/vehicles",
    request_body = CreateVehicleRequest,
    responses(
        (status = 200, description = "create_vehicle OK")
    ),
    tag = "TMS - Vehicle"
)]
pub async fn create_vehicle(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<CreateVehicleRequest>,
) -> Json<ApiResponse<Vehicle>> {
    let id = Uuid::new_v4();
    let now = Utc::now();
    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query_as::<_, Vehicle>(
        r#"
        INSERT INTO tms.tms_vehicles (id, vehicle_no, plate_number, vehicle_type, capacity, status, carrier_id, notes, tenant_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, 'active', $6, $7, $8, $9, $10)
        RETURNING id, vehicle_no, plate_number, vehicle_type, capacity, status, carrier_id, notes, tenant_id, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.vehicle_no)
    .bind(&req.plate_number)
    .bind(&req.vehicle_type)
    .bind(&req.capacity)
    .bind(&req.carrier_id)
    .bind(&req.notes)
    .bind(tenant_id)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(vehicle) => Json(ApiResponse::success(vehicle, "车辆创建成功")),
        Err(e) => {
            tracing::error!("创建车辆失败: {}", e);
            Json(api_error(500, "车辆创建失败"))
        }
    }
}

#[utoipa::path(
    get,
    path = "/api/tms/vehicles/{id}",
    params(
        ("id" = Uuid, Path, description = "车辆 ID")
    ),
    responses(
        (status = 200, description = "get_vehicle OK")
    ),
    tag = "TMS - Vehicle"
)]
pub async fn get_vehicle(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<Vehicle>> {
    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query_as::<_, Vehicle>(
        r#"
        SELECT id, vehicle_no, plate_number, vehicle_type, capacity, status, carrier_id, notes, tenant_id, created_at, updated_at
        FROM tms.tms_vehicles WHERE id = $1 AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(vehicle)) => Json(ApiResponse::success(vehicle, "获取车辆成功")),
        Ok(None) => Json(api_error(404, "车辆不存在")),
        Err(e) => {
            tracing::error!("获取车辆失败: {}", e);
            Json(api_error(500, "获取车辆失败"))
        }
    }
}

#[utoipa::path(
    put,
    path = "/api/tms/vehicles/{id}",
    request_body = UpdateVehicleRequest,
    params(
        ("id" = Uuid, Path, description = "车辆 ID")
    ),
    responses(
        (status = 200, description = "update_vehicle OK")
    ),
    tag = "TMS - Vehicle"
)]
pub async fn update_vehicle(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<UpdateVehicleRequest>,
) -> Json<ApiResponse<Vehicle>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let now = Utc::now();

    let result = sqlx::query_as::<_, Vehicle>(
        r#"
        UPDATE tms.tms_vehicles SET
            plate_number = COALESCE($2, plate_number),
            vehicle_type = COALESCE($3, vehicle_type),
            capacity = COALESCE($4, capacity),
            status = COALESCE($5, status),
            carrier_id = COALESCE($6, carrier_id),
            notes = COALESCE($7, notes),
            updated_at = $8
        WHERE id = $1 AND tenant_id = $9
        RETURNING id, vehicle_no, plate_number, vehicle_type, capacity, status, carrier_id, notes, tenant_id, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.plate_number)
    .bind(&req.vehicle_type)
    .bind(&req.capacity)
    .bind(&req.status)
    .bind(&req.carrier_id)
    .bind(&req.notes)
    .bind(now)
    .bind(tenant_id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(vehicle)) => Json(ApiResponse::success(vehicle, "车辆更新成功")),
        Ok(None) => Json(api_error(404, "车辆不存在")),
        Err(e) => {
            tracing::error!("更新车辆失败: {}", e);
            Json(api_error(500, "更新车辆失败"))
        }
    }
}

#[utoipa::path(
    delete,
    path = "/api/tms/vehicles/{id}",
    params(
        ("id" = Uuid, Path, description = "车辆 ID")
    ),
    responses(
        (status = 200, description = "delete_vehicle OK")
    ),
    tag = "TMS - Vehicle"
)]
pub async fn delete_vehicle(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query("DELETE FROM tms.tms_vehicles WHERE id = $1 AND tenant_id = $2")
        .bind(id)
        .bind(tenant_id)
        .execute(&state.db)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => {
            Json(ApiResponse::success("".to_string(), "车辆删除成功"))
        }
        Ok(_) => Json(api_error(404, "车辆不存在")),
        Err(e) => {
            tracing::error!("删除车辆失败: {}", e);
            Json(api_error(500, "车辆删除失败"))
        }
    }
}
