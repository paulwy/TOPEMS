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

use crate::shared::fsm::{shipment_can_transition, shipment_requires_approval};
use crate::shared::AppState;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::tenant::get_tenant_id;
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

/// 运单状态机使用 crate::shared::fsm 中的 shipment_can_transition
/// draft → pending → in_transit → delivered / cancelled

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
        .route("/shipments/{id}/submit-approval", post(submit_approval))
        .route("/shipments/{id}/approve", post(approve_shipment))
        .route("/shipments/{id}/reject", post(reject_shipment))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["tms:read"])),
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
    security(("BearerAuth" = ["tms:write"])),
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
    security(("BearerAuth" = ["tms:read"])),
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
    security(("BearerAuth" = ["tms:update"])),
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
    security(("BearerAuth" = ["tms:delete"])),
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
    security(("BearerAuth" = ["tms:write"])),
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
            if shipment_can_transition(&status, "in_transit").is_err() {
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
    security(("BearerAuth" = ["tms:write"])),
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
            if shipment_can_transition(&status, "delivered").is_err() {
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
    security(("BearerAuth" = ["tms:write"])),
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
            if shipment_can_transition(&status, "cancelled").is_err() {
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

// ==================== Approval Endpoints ====================

/// 审批请求体
#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct ApprovalRequest {
    pub operator: String,
    pub comment: Option<String>,
}

const SHIPMENT_RETURN: &str = r#"id, shipment_no, order_id, carrier_id, vehicle_id, driver_id, route_id, origin, destination, status, freight_amount, planned_departure, planned_arrival, actual_departure, actual_arrival, notes, tenant_id, created_at, updated_at"#;

/// Submit shipment for dispatch approval (draft → pending)
#[utoipa::path(
    post,
    security(("BearerAuth" = ["tms:write"])),
    path = "/api/tms/shipments/{id}/submit-approval",
    request_body = ApprovalRequest,
    params(
        ("id" = Uuid, Path, description = "运单 ID")
    ),
    responses(
        (status = 200, description = "submit_approval OK")
    ),
    tag = "TMS - Shipment"
)]
pub async fn submit_approval(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<ApprovalRequest>,
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
            if shipment_can_transition(&status, "pending").is_err() {
                return Json(api_error(
                    400,
                    &format!("当前状态 {} 不允许提交审批", status),
                ));
            }
            let result = sqlx::query_as::<_, Shipment>(&format!(
                r#"UPDATE tms.tms_shipments SET status = 'pending', updated_at = $2
                    WHERE id = $1 AND tenant_id = $3 RETURNING {}"#,
                SHIPMENT_RETURN
            ))
            .bind(id)
            .bind(now)
            .bind(tenant_id)
            .fetch_optional(&state.db)
            .await;

            match result {
                Ok(Some(shipment)) => {
                    tracing::info!(
                        "shipment {} submit_approval: {} -> pending, operator={}",
                        id,
                        status,
                        req.operator
                    );
                    Json(ApiResponse::success(shipment, "运单已提交调度审批"))
                }
                Ok(None) => Json(api_error(404, "运单不存在")),
                Err(e) => {
                    tracing::error!("提交审批失败: {}", e);
                    Json(api_error(500, "提交审批失败"))
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

/// Approve shipment (pending → in_transit, approve and dispatch)
#[utoipa::path(
    post,
    security(("BearerAuth" = ["tms:write"])),
    path = "/api/tms/shipments/{id}/approve",
    request_body = ApprovalRequest,
    params(
        ("id" = Uuid, Path, description = "运单 ID")
    ),
    responses(
        (status = 200, description = "approve_shipment OK")
    ),
    tag = "TMS - Shipment"
)]
pub async fn approve_shipment(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<ApprovalRequest>,
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
            if shipment_can_transition(&status, "in_transit").is_err() {
                return Json(api_error(
                    400,
                    &format!("当前状态 {} 不允许审批发车", status),
                ));
            }
            let requires_approval = shipment_requires_approval(&status, "in_transit");
            let result = sqlx::query_as::<_, Shipment>(
                &format!(
                    r#"UPDATE tms.tms_shipments SET status = 'in_transit', actual_departure = $2, updated_at = $3
                    WHERE id = $1 AND tenant_id = $4 RETURNING {}"#,
                    SHIPMENT_RETURN
                ),
            )
            .bind(id)
            .bind(now)
            .bind(now)
            .bind(tenant_id)
            .fetch_optional(&state.db)
            .await;

            match result {
                Ok(Some(shipment)) => {
                    tracing::info!(
                        "shipment {} approved: {} -> in_transit, operator={}, requires_approval={}",
                        id,
                        status,
                        req.operator,
                        requires_approval
                    );
                    Json(ApiResponse::success(shipment, "运单审批通过，已发车"))
                }
                Ok(None) => Json(api_error(404, "运单不存在")),
                Err(e) => {
                    tracing::error!("审批失败: {}", e);
                    Json(api_error(500, "审批失败"))
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

/// Reject shipment (pending → cancelled, reject dispatch)
#[utoipa::path(
    post,
    security(("BearerAuth" = ["tms:write"])),
    path = "/api/tms/shipments/{id}/reject",
    request_body = ApprovalRequest,
    params(
        ("id" = Uuid, Path, description = "运单 ID")
    ),
    responses(
        (status = 200, description = "reject_shipment OK")
    ),
    tag = "TMS - Shipment"
)]
pub async fn reject_shipment(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<ApprovalRequest>,
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
            if shipment_can_transition(&status, "cancelled").is_err() {
                return Json(api_error(400, &format!("当前状态 {} 不允许驳回", status)));
            }
            let result = sqlx::query_as::<_, Shipment>(&format!(
                r#"UPDATE tms.tms_shipments SET status = 'cancelled', updated_at = $2
                    WHERE id = $1 AND tenant_id = $3 RETURNING {}"#,
                SHIPMENT_RETURN
            ))
            .bind(id)
            .bind(now)
            .bind(tenant_id)
            .fetch_optional(&state.db)
            .await;

            match result {
                Ok(Some(shipment)) => {
                    tracing::info!(
                        "shipment {} rejected: {} -> cancelled, operator={}",
                        id,
                        status,
                        req.operator
                    );
                    Json(ApiResponse::success(shipment, "运单已驳回"))
                }
                Ok(None) => Json(api_error(404, "运单不存在")),
                Err(e) => {
                    tracing::error!("驳回失败: {}", e);
                    Json(api_error(500, "驳回失败"))
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
        assert!(shipment_can_transition("draft", "pending").is_ok());
        assert!(shipment_can_transition("pending", "in_transit").is_ok());
        assert!(shipment_can_transition("in_transit", "delivered").is_ok());
        assert!(shipment_can_transition("draft", "cancelled").is_ok());
        assert!(shipment_can_transition("pending", "cancelled").is_ok());
        assert!(shipment_can_transition("in_transit", "cancelled").is_ok());

        // 非法转换
        assert!(shipment_can_transition("pending", "delivered").is_err());
        assert!(shipment_can_transition("delivered", "in_transit").is_err());
        assert!(shipment_can_transition("cancelled", "pending").is_err());

        // 审批标记
        assert!(shipment_requires_approval("pending", "in_transit"));
        assert!(!shipment_requires_approval("draft", "pending"));
    }
}

#[cfg(test)]
mod serde_tests {
    use super::*;
    use serde::Serialize;
    use serde_json::Value;

    fn roundtrip<T: Serialize + for<'de> Deserialize<'de>>(item: &T) {
        let json = serde_json::to_string(item).unwrap();
        let v1: Value = serde_json::from_str(&json).unwrap();
        let back: T = serde_json::from_str(&json).unwrap();
        let json2 = serde_json::to_string(&back).unwrap();
        let v2: Value = serde_json::from_str(&json2).unwrap();
        assert_eq!(v1, v2);
    }

    #[test]
    fn create_shipment_request_roundtrip_full() {
        roundtrip(&CreateShipmentRequest {
            shipment_no: "SHP-2024-001".into(),
            order_id: Some(Uuid::new_v4()),
            carrier_id: Some(Uuid::new_v4()),
            vehicle_id: Some(Uuid::new_v4()),
            driver_id: Some(Uuid::new_v4()),
            route_id: Some(Uuid::new_v4()),
            origin: Some("北京".into()),
            destination: Some("上海".into()),
            freight_amount: Some(bigdecimal::BigDecimal::from(5000i64)),
            planned_departure: Some(Utc::now()),
            planned_arrival: Some(Utc::now()),
            notes: Some("Fragile goods".into()),
        });
    }

    #[test]
    fn update_shipment_request_roundtrip_full() {
        roundtrip(&UpdateShipmentRequest {
            carrier_id: Some(Uuid::new_v4()),
            vehicle_id: Some(Uuid::new_v4()),
            driver_id: Some(Uuid::new_v4()),
            route_id: Some(Uuid::new_v4()),
            origin: Some("上海".into()),
            destination: Some("广州".into()),
            freight_amount: Some(bigdecimal::BigDecimal::from(6000i64)),
            planned_departure: Some(Utc::now()),
            planned_arrival: Some(Utc::now()),
            notes: Some("Updated notes".into()),
        });
    }
}
