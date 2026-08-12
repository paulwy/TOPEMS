//! Shipment handlers - 运单管理

use axum::{
    extract::{FromRef, Path, Query, State},
    http::HeaderMap,
    routing::{get, post},
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
pub struct Shipment {
    pub id: Uuid,
    pub shipment_no: String,
    pub order_id: Option<Uuid>,
    pub carrier_id: Option<Uuid>,
    pub vehicle_id: Option<Uuid>,
    pub driver_id: Option<Uuid>,
    pub route_id: Option<Uuid>,
    pub origin: Option<String>,
    pub destination: Option<String>,
    pub status: String,
    pub freight_amount: Option<bigdecimal::BigDecimal>,
    pub planned_departure: Option<DateTime<Utc>>,
    pub planned_arrival: Option<DateTime<Utc>>,
    pub actual_departure: Option<DateTime<Utc>>,
    pub actual_arrival: Option<DateTime<Utc>>,
    pub notes: Option<String>,
    pub tenant_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateShipmentRequest {
    pub shipment_no: String,
    pub order_id: Option<Uuid>,
    pub carrier_id: Option<Uuid>,
    pub vehicle_id: Option<Uuid>,
    pub driver_id: Option<Uuid>,
    pub route_id: Option<Uuid>,
    pub origin: Option<String>,
    pub destination: Option<String>,
    pub freight_amount: Option<bigdecimal::BigDecimal>,
    pub planned_departure: Option<DateTime<Utc>>,
    pub planned_arrival: Option<DateTime<Utc>>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UpdateShipmentRequest {
    pub carrier_id: Option<Uuid>,
    pub vehicle_id: Option<Uuid>,
    pub driver_id: Option<Uuid>,
    pub route_id: Option<Uuid>,
    pub origin: Option<String>,
    pub destination: Option<String>,
    pub freight_amount: Option<bigdecimal::BigDecimal>,
    pub planned_departure: Option<DateTime<Utc>>,
    pub planned_arrival: Option<DateTime<Utc>>,
    pub notes: Option<String>,
}

/// 运单状态机：pending → in_transit → delivered / cancelled
///
/// 合法转换：
/// - pending → in_transit (dispatch)
/// - in_transit → delivered (arrive)
/// - pending → cancelled (cancel)
/// - in_transit → cancelled (cancel)
pub fn shipment_can_transition(from: &str, to: &str) -> bool {
    matches!(
        (from, to),
        ("pending", "in_transit")
            | ("in_transit", "delivered")
            | ("pending", "cancelled")
            | ("in_transit", "cancelled")
    )
}

pub fn create_routes<S>() -> Router<S>
where
    S: Clone + Send + Sync + 'static,
    AppState: FromRef<S>,
{
    Router::new()
        .route("/shipments", get(list_shipments).post(create_shipment))
        .route(
            "/shipments/{id}",
            get(get_shipment)
                .put(update_shipment)
                .delete(delete_shipment),
        )
        .route("/shipments/{id}/dispatch", post(dispatch_shipment))
        .route("/shipments/{id}/arrive", post(arrive_shipment))
        .route("/shipments/{id}/cancel", post(cancel_shipment))
}

#[utoipa::path(
    get,
    path = "/api/tms/shipments",
    responses(
        (status = 200, description = "list_shipments OK")
    ),
    tag = "TMS - Shipment"
)]
pub async fn list_shipments(
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

    let result = sqlx::query_as::<_, Shipment>(
        r#"
        SELECT id, shipment_no, order_id, carrier_id, vehicle_id, driver_id, route_id, origin, destination,
               status, freight_amount, planned_departure, planned_arrival, actual_departure, actual_arrival,
               notes, tenant_id, created_at, updated_at
        FROM tms.tms_shipments
        WHERE tenant_id = $1
          AND ($2::text IS NULL OR shipment_no ILIKE $2 OR origin ILIKE $2 OR destination ILIKE $2)
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
        Ok(shipments) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM tms.tms_shipments
                WHERE tenant_id = $1
                  AND ($2::text IS NULL OR shipment_no ILIKE $2 OR origin ILIKE $2 OR destination ILIKE $2)
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
                "shipments": shipments,
                "total": total,
                "page": page,
                "page_size": page_size
            });
            Json(ApiResponse::success(response_data, "获取运单列表成功"))
        }
        Err(e) => {
            tracing::error!("获取运单列表失败: {}", e);
            Json(api_error(500, "获取运单列表失败"))
        }
    }
}

#[utoipa::path(
    post,
    path = "/api/tms/shipments",
    request_body = CreateShipmentRequest,
    responses(
        (status = 200, description = "create_shipment OK")
    ),
    tag = "TMS - Shipment"
)]
pub async fn create_shipment(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<CreateShipmentRequest>,
) -> Json<ApiResponse<Shipment>> {
    let id = Uuid::new_v4();
    let now = Utc::now();
    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query_as::<_, Shipment>(
        r#"
        INSERT INTO tms.tms_shipments (id, shipment_no, order_id, carrier_id, vehicle_id, driver_id, route_id,
            origin, destination, status, freight_amount, planned_departure, planned_arrival, notes, tenant_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', $10, $11, $12, $13, $14, $15, $16)
        RETURNING id, shipment_no, order_id, carrier_id, vehicle_id, driver_id, route_id, origin, destination,
               status, freight_amount, planned_departure, planned_arrival, actual_departure, actual_arrival,
               notes, tenant_id, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.shipment_no)
    .bind(&req.order_id)
    .bind(&req.carrier_id)
    .bind(&req.vehicle_id)
    .bind(&req.driver_id)
    .bind(&req.route_id)
    .bind(&req.origin)
    .bind(&req.destination)
    .bind(&req.freight_amount)
    .bind(&req.planned_departure)
    .bind(&req.planned_arrival)
    .bind(&req.notes)
    .bind(tenant_id)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(shipment) => Json(ApiResponse::success(shipment, "运单创建成功")),
        Err(e) => {
            tracing::error!("创建运单失败: {}", e);
            Json(api_error(500, "创建运单失败"))
        }
    }
}

#[utoipa::path(
    get,
    path = "/api/tms/shipments/{id}",
    params(
        ("id" = Uuid, Path, description = "运单 ID")
    ),
    responses(
        (status = 200, description = "get_shipment OK")
    ),
    tag = "TMS - Shipment"
)]
pub async fn get_shipment(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<Shipment>> {
    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query_as::<_, Shipment>(
        r#"
        SELECT id, shipment_no, order_id, carrier_id, vehicle_id, driver_id, route_id, origin, destination,
               status, freight_amount, planned_departure, planned_arrival, actual_departure, actual_arrival,
               notes, tenant_id, created_at, updated_at
        FROM tms.tms_shipments WHERE id = $1 AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(shipment)) => Json(ApiResponse::success(shipment, "获取运单成功")),
        Ok(None) => Json(api_error(404, "运单不存在")),
        Err(e) => {
            tracing::error!("获取运单失败: {}", e);
            Json(api_error(500, "获取运单失败"))
        }
    }
}

#[utoipa::path(
    put,
    path = "/api/tms/shipments/{id}",
    request_body = UpdateShipmentRequest,
    params(
        ("id" = Uuid, Path, description = "运单 ID")
    ),
    responses(
        (status = 200, description = "update_shipment OK")
    ),
    tag = "TMS - Shipment"
)]
pub async fn update_shipment(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<UpdateShipmentRequest>,
) -> Json<ApiResponse<Shipment>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let now = Utc::now();

    let result = sqlx::query_as::<_, Shipment>(
        r#"
        UPDATE tms.tms_shipments SET
            carrier_id = COALESCE($2, carrier_id),
            vehicle_id = COALESCE($3, vehicle_id),
            driver_id = COALESCE($4, driver_id),
            route_id = COALESCE($5, route_id),
            origin = COALESCE($6, origin),
            destination = COALESCE($7, destination),
            freight_amount = COALESCE($8, freight_amount),
            planned_departure = COALESCE($9, planned_departure),
            planned_arrival = COALESCE($10, planned_arrival),
            notes = COALESCE($11, notes),
            updated_at = $12
        WHERE id = $1 AND tenant_id = $13
        RETURNING id, shipment_no, order_id, carrier_id, vehicle_id, driver_id, route_id, origin, destination,
               status, freight_amount, planned_departure, planned_arrival, actual_departure, actual_arrival,
               notes, tenant_id, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.carrier_id)
    .bind(&req.vehicle_id)
    .bind(&req.driver_id)
    .bind(&req.route_id)
    .bind(&req.origin)
    .bind(&req.destination)
    .bind(&req.freight_amount)
    .bind(&req.planned_departure)
    .bind(&req.planned_arrival)
    .bind(&req.notes)
    .bind(now)
    .bind(tenant_id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(shipment)) => Json(ApiResponse::success(shipment, "运单更新成功")),
        Ok(None) => Json(api_error(404, "运单不存在")),
        Err(e) => {
            tracing::error!("更新运单失败: {}", e);
            Json(api_error(500, "更新运单失败"))
        }
    }
}

#[utoipa::path(
    delete,
    path = "/api/tms/shipments/{id}",
    params(
        ("id" = Uuid, Path, description = "运单 ID")
    ),
    responses(
        (status = 200, description = "delete_shipment OK")
    ),
    tag = "TMS - Shipment"
)]
pub async fn delete_shipment(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query("DELETE FROM tms.tms_shipments WHERE id = $1 AND tenant_id = $2")
        .bind(id)
        .bind(tenant_id)
        .execute(&state.db)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => {
            Json(ApiResponse::success("".to_string(), "运单删除成功"))
        }
        Ok(_) => Json(api_error(404, "运单不存在")),
        Err(e) => {
            tracing::error!("删除运单失败: {}", e);
            Json(api_error(500, "删除运单失败"))
        }
    }
}

#[utoipa::path(
    post,
    path = "/api/tms/shipments/{id}/dispatch",
    params(
        ("id" = Uuid, Path, description = "运单 ID")
    ),
    responses(
        (status = 200, description = "dispatch_shipment OK")
    ),
    tag = "TMS - Shipment"
)]
pub async fn dispatch_shipment(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<Shipment>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let now = Utc::now();

    let current = sqlx::query_scalar::<_, String>(
        "SELECT status FROM tms.tms_shipments WHERE id = $1 AND tenant_id = $2",
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.db)
    .await;

    match current {
        Ok(Some(status)) => {
            if !shipment_can_transition(&status, "in_transit") {
                return Json(api_error(400, &format!("当前状态 {} 不允许发车", status)));
            }
            let result = sqlx::query_as::<_, Shipment>(
                r#"
                UPDATE tms.tms_shipments SET
                    status = 'in_transit',
                    actual_departure = $2,
                    updated_at = $3
                WHERE id = $1 AND tenant_id = $4
                RETURNING id, shipment_no, order_id, carrier_id, vehicle_id, driver_id, route_id, origin, destination,
                       status, freight_amount, planned_departure, planned_arrival, actual_departure, actual_arrival,
                       notes, tenant_id, created_at, updated_at
                "#,
            )
            .bind(id)
            .bind(now)
            .bind(now)
            .bind(tenant_id)
            .fetch_optional(&state.db)
            .await;

            match result {
                Ok(Some(shipment)) => Json(ApiResponse::success(shipment, "运单已发车")),
                Ok(None) => Json(api_error(404, "运单不存在")),
                Err(e) => {
                    tracing::error!("发车失败: {}", e);
                    Json(api_error(500, "发车失败"))
                }
            }
        }
        Ok(None) => Json(api_error(404, "运单不存在")),
        Err(e) => {
            tracing::error!("查询运单状态失败: {}", e);
            Json(api_error(500, "查询运单状态失败"))
        }
    }
}

#[utoipa::path(
    post,
    path = "/api/tms/shipments/{id}/arrive",
    params(
        ("id" = Uuid, Path, description = "运单 ID")
    ),
    responses(
        (status = 200, description = "arrive_shipment OK")
    ),
    tag = "TMS - Shipment"
)]
pub async fn arrive_shipment(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<Shipment>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let now = Utc::now();

    let current = sqlx::query_scalar::<_, String>(
        "SELECT status FROM tms.tms_shipments WHERE id = $1 AND tenant_id = $2",
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.db)
    .await;

    match current {
        Ok(Some(status)) => {
            if !shipment_can_transition(&status, "delivered") {
                return Json(api_error(400, &format!("当前状态 {} 不允许到达", status)));
            }
            let result = sqlx::query_as::<_, Shipment>(
                r#"
                UPDATE tms.tms_shipments SET
                    status = 'delivered',
                    actual_arrival = $2,
                    updated_at = $3
                WHERE id = $1 AND tenant_id = $4
                RETURNING id, shipment_no, order_id, carrier_id, vehicle_id, driver_id, route_id, origin, destination,
                       status, freight_amount, planned_departure, planned_arrival, actual_departure, actual_arrival,
                       notes, tenant_id, created_at, updated_at
                "#,
            )
            .bind(id)
            .bind(now)
            .bind(now)
            .bind(tenant_id)
            .fetch_optional(&state.db)
            .await;

            match result {
                Ok(Some(shipment)) => Json(ApiResponse::success(shipment, "运单已到达")),
                Ok(None) => Json(api_error(404, "运单不存在")),
                Err(e) => {
                    tracing::error!("到达确认失败: {}", e);
                    Json(api_error(500, "到达确认失败"))
                }
            }
        }
        Ok(None) => Json(api_error(404, "运单不存在")),
        Err(e) => {
            tracing::error!("查询运单状态失败: {}", e);
            Json(api_error(500, "查询运单状态失败"))
        }
    }
}

#[utoipa::path(
    post,
    path = "/api/tms/shipments/{id}/cancel",
    params(
        ("id" = Uuid, Path, description = "运单 ID")
    ),
    responses(
        (status = 200, description = "cancel_shipment OK")
    ),
    tag = "TMS - Shipment"
)]
pub async fn cancel_shipment(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<Shipment>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let now = Utc::now();

    let current = sqlx::query_scalar::<_, String>(
        "SELECT status FROM tms.tms_shipments WHERE id = $1 AND tenant_id = $2",
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.db)
    .await;

    match current {
        Ok(Some(status)) => {
            if !shipment_can_transition(&status, "cancelled") {
                return Json(api_error(400, &format!("当前状态 {} 不允许取消", status)));
            }
            let result = sqlx::query_as::<_, Shipment>(
                r#"
                UPDATE tms.tms_shipments SET
                    status = 'cancelled',
                    updated_at = $2
                WHERE id = $1 AND tenant_id = $3
                RETURNING id, shipment_no, order_id, carrier_id, vehicle_id, driver_id, route_id, origin, destination,
                       status, freight_amount, planned_departure, planned_arrival, actual_departure, actual_arrival,
                       notes, tenant_id, created_at, updated_at
                "#,
            )
            .bind(id)
            .bind(now)
            .bind(tenant_id)
            .fetch_optional(&state.db)
            .await;

            match result {
                Ok(Some(shipment)) => Json(ApiResponse::success(shipment, "运单已取消")),
                Ok(None) => Json(api_error(404, "运单不存在")),
                Err(e) => {
                    tracing::error!("取消运单失败: {}", e);
                    Json(api_error(500, "取消运单失败"))
                }
            }
        }
        Ok(None) => Json(api_error(404, "运单不存在")),
        Err(e) => {
            tracing::error!("查询运单状态失败: {}", e);
            Json(api_error(500, "查询运单状态失败"))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_shipment_state_machine() {
        // 合法转换
        assert!(shipment_can_transition("pending", "in_transit"));
        assert!(shipment_can_transition("in_transit", "delivered"));
        assert!(shipment_can_transition("pending", "cancelled"));
        assert!(shipment_can_transition("in_transit", "cancelled"));

        // 非法转换
        assert!(!shipment_can_transition("pending", "delivered"));
        assert!(!shipment_can_transition("delivered", "in_transit"));
        assert!(!shipment_can_transition("delivered", "cancelled"));
        assert!(!shipment_can_transition("cancelled", "pending"));
        assert!(!shipment_can_transition("cancelled", "in_transit"));
        assert!(!shipment_can_transition("in_transit", "pending"));
    }
}
