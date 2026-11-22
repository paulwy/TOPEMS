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
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_core::TopemsError;
use utoipa::ToSchema;
use uuid::Uuid;

use crate::modules::shipment_status::ShipmentStatus;
use crate::shared::fsm::{shipment_can_transition, shipment_requires_approval};
use crate::shared::AppState;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::tenant::get_tenant_id;
use topems_shared_core::response::{ApiResponse, PaginationParams};

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
    security(("BearerAuth" = ["tms:shipment:read"])),
    path = "/api/tms/shipments",
    responses(
        (status = 200, description = "list_shipments OK")
    ),
    tag = "TMS - Shipment"
)]
pub async fn list_shipments(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Query(params): Query<PaginationParams>,
    _headers: HeaderMap,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::from(TopemsError::Internal("数据库事务不可用".to_string()));
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("数据库事务不可用".to_string()));
        }
    };
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));
    let status_filter = match params.status.as_deref() {
        None => None,
        Some(raw) => match ShipmentStatus::from_db_str(raw) {
            Some(status) => Some(status.as_db_str().to_string()),
            None => {
                return ApiResponse::bad_request(
                    "status 仅支持 draft/pending/in_transit/delivered/cancelled",
                )
            }
        },
    };

    let result = sqlx::query_as::<_, Shipment>(
        r#"
        SELECT id, shipment_no, order_id, carrier_id, vehicle_id, driver_id, route_id, origin, destination,
               status, freight_amount, planned_departure, planned_arrival, actual_departure, actual_arrival,
               notes, tenant_id, created_at, updated_at
        FROM tms.tms_shipments
        WHERE ($1::text IS NULL OR shipment_no ILIKE $1 OR origin ILIKE $1 OR destination ILIKE $1)
          AND ($2::text IS NULL OR status = $2)
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
        "#,
    )
    .bind(&search_pattern)
    .bind(&status_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut scope)
    .await;

    match result {
        Ok(shipments) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM tms.tms_shipments
                WHERE ($1::text IS NULL OR shipment_no ILIKE $1 OR origin ILIKE $1 OR destination ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                "#,
            )
            .bind(&search_pattern)
            .bind(&status_filter)
            .fetch_one(&mut scope)
            .await;

            let total = count_result.unwrap_or(0);
            let response_data = serde_json::json!({
                "shipments": shipments,
                "total": total,
                "page": page,
                "page_size": page_size
            });
            ApiResponse::success(response_data, "获取运单列表成功")
        }
        Err(e) => {
            tracing::error!("获取运单列表失败: {}", e);
            ApiResponse::from(TopemsError::Internal("获取运单列表失败".to_string()))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["tms:shipment:write"])),
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
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<CreateShipmentRequest>,
) -> ApiResponse<Shipment> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::from(TopemsError::Internal("数据库事务不可用".to_string()));
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("数据库事务不可用".to_string()));
        }
    };
    let id = Uuid::new_v4();
    let now = Utc::now();
    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query_as::<_, Shipment>(
        r#"
        INSERT INTO tms.tms_shipments (id, shipment_no, order_id, carrier_id, vehicle_id, driver_id, route_id,
            origin, destination, status, freight_amount, planned_departure, planned_arrival, notes, tenant_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING id, shipment_no, order_id, carrier_id, vehicle_id, driver_id, route_id, origin, destination,
               status, freight_amount, planned_departure, planned_arrival, actual_departure, actual_arrival,
               notes, tenant_id, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.shipment_no)
    .bind(req.order_id)
    .bind(req.carrier_id)
    .bind(req.vehicle_id)
    .bind(req.driver_id)
    .bind(req.route_id)
    .bind(&req.origin)
    .bind(&req.destination)
    .bind(ShipmentStatus::DEFAULT.as_db_str())
    .bind(&req.freight_amount)
    .bind(req.planned_departure)
    .bind(req.planned_arrival)
    .bind(&req.notes)
    .bind(tenant_id)
    .bind(now)
    .bind(now)
    .fetch_one(&mut scope)
    .await;

    match result {
        Ok(shipment) => ApiResponse::success(shipment, "运单创建成功"),
        Err(e) => {
            tracing::error!("创建运单失败: {}", e);
            ApiResponse::from(TopemsError::Internal("创建运单失败".to_string()))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["tms:shipment:read"])),
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
    Extension(_claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    _headers: HeaderMap,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<Shipment> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::from(TopemsError::Internal("数据库事务不可用".to_string()));
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("数据库事务不可用".to_string()));
        }
    };

    let result = sqlx::query_as::<_, Shipment>(
        r#"
        SELECT id, shipment_no, order_id, carrier_id, vehicle_id, driver_id, route_id, origin, destination,
               status, freight_amount, planned_departure, planned_arrival, actual_departure, actual_arrival,
               notes, tenant_id, created_at, updated_at
        FROM tms.tms_shipments WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&mut scope)
    .await;

    match result {
        Ok(Some(shipment)) => ApiResponse::success(shipment, "获取运单成功"),
        Ok(None) => ApiResponse::from(TopemsError::ResourceNotFound("运单不存在".to_string())),
        Err(e) => {
            tracing::error!("获取运单失败: {}", e);
            ApiResponse::from(TopemsError::Internal("获取运单失败".to_string()))
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["tms:shipment:write"])),
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
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<UpdateShipmentRequest>,
) -> ApiResponse<Shipment> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::from(TopemsError::Internal("数据库事务不可用".to_string()));
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("数据库事务不可用".to_string()));
        }
    };
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
    .bind(req.carrier_id)
    .bind(req.vehicle_id)
    .bind(req.driver_id)
    .bind(req.route_id)
    .bind(&req.origin)
    .bind(&req.destination)
    .bind(&req.freight_amount)
    .bind(req.planned_departure)
    .bind(req.planned_arrival)
    .bind(&req.notes)
    .bind(now)
    .bind(tenant_id)
    .fetch_optional(&mut scope)
    .await;

    match result {
        Ok(Some(shipment)) => ApiResponse::success(shipment, "运单更新成功"),
        Ok(None) => ApiResponse::from(TopemsError::ResourceNotFound("运单不存在".to_string())),
        Err(e) => {
            tracing::error!("更新运单失败: {}", e);
            ApiResponse::from(TopemsError::Internal("更新运单失败".to_string()))
        }
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["tms:shipment:write"])),
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
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<String> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::from(TopemsError::Internal("数据库事务不可用".to_string()));
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("数据库事务不可用".to_string()));
        }
    };
    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query("DELETE FROM tms.tms_shipments WHERE id = $1 AND tenant_id = $2")
        .bind(id)
        .bind(tenant_id)
        .execute(&mut scope)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => ApiResponse::success("".to_string(), "运单删除成功"),
        Ok(_) => ApiResponse::from(TopemsError::ResourceNotFound("运单不存在".to_string())),
        Err(e) => {
            tracing::error!("删除运单失败: {}", e);
            ApiResponse::from(TopemsError::Internal("删除运单失败".to_string()))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["tms:shipment:write"])),
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
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<Shipment> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::from(TopemsError::Internal("数据库事务不可用".to_string()));
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("数据库事务不可用".to_string()));
        }
    };
    let tenant_id = get_tenant_id(&claims, &headers);
    let now = Utc::now();

    let current = sqlx::query_scalar::<_, String>(
        "SELECT status FROM tms.tms_shipments WHERE id = $1 AND tenant_id = $2",
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&mut scope)
    .await;

    match current {
        Ok(Some(status)) => {
            let Some(current_status) = ShipmentStatus::from_db_str(&status) else {
                return ApiResponse::conflict("运单状态数据异常");
            };
            if shipment_can_transition(
                current_status.as_db_str(),
                ShipmentStatus::InTransit.as_db_str(),
            )
            .is_err()
            {
                return ApiResponse::conflict("当前状态不允许发车");
            }
            let result = sqlx::query_as::<_, Shipment>(
                r#"
                UPDATE tms.tms_shipments SET
                    status = $5,
                    actual_departure = $2,
                    updated_at = $3
                WHERE id = $1 AND tenant_id = $4 AND status = $6
                RETURNING id, shipment_no, order_id, carrier_id, vehicle_id, driver_id, route_id, origin, destination,
                       status, freight_amount, planned_departure, planned_arrival, actual_departure, actual_arrival,
                       notes, tenant_id, created_at, updated_at
                "#,
            )
            .bind(id)
            .bind(now)
            .bind(now)
            .bind(tenant_id)
            .bind(ShipmentStatus::InTransit.as_db_str())
            .bind(ShipmentStatus::Pending.as_db_str())
            .fetch_optional(&mut scope)
            .await;

            match result {
                Ok(Some(shipment)) => ApiResponse::success(shipment, "运单已发车"),
                Ok(None) => ApiResponse::conflict("运单状态已变化，请刷新后重试"),
                Err(e) => {
                    tracing::error!("发车失败: {}", e);
                    ApiResponse::from(TopemsError::Internal("发车失败".to_string()))
                }
            }
        }
        Ok(None) => ApiResponse::from(TopemsError::ResourceNotFound("运单不存在".to_string())),
        Err(e) => {
            tracing::error!("查询运单状态失败: {}", e);
            ApiResponse::from(TopemsError::Internal("查询运单状态失败".to_string()))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["tms:shipment:write"])),
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
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<Shipment> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::from(TopemsError::Internal("数据库事务不可用".to_string()));
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("数据库事务不可用".to_string()));
        }
    };
    let tenant_id = get_tenant_id(&claims, &headers);
    let now = Utc::now();

    let current = sqlx::query_scalar::<_, String>(
        "SELECT status FROM tms.tms_shipments WHERE id = $1 AND tenant_id = $2",
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&mut scope)
    .await;

    match current {
        Ok(Some(status)) => {
            let Some(current_status) = ShipmentStatus::from_db_str(&status) else {
                return ApiResponse::conflict("运单状态数据异常");
            };
            if shipment_can_transition(
                current_status.as_db_str(),
                ShipmentStatus::Delivered.as_db_str(),
            )
            .is_err()
            {
                return ApiResponse::conflict("当前状态不允许到达");
            }
            let result = sqlx::query_as::<_, Shipment>(
                r#"
                UPDATE tms.tms_shipments SET
                    status = $5,
                    actual_arrival = $2,
                    updated_at = $3
                WHERE id = $1 AND tenant_id = $4 AND status = $6
                RETURNING id, shipment_no, order_id, carrier_id, vehicle_id, driver_id, route_id, origin, destination,
                       status, freight_amount, planned_departure, planned_arrival, actual_departure, actual_arrival,
                       notes, tenant_id, created_at, updated_at
                "#,
            )
            .bind(id)
            .bind(now)
            .bind(now)
            .bind(tenant_id)
            .bind(ShipmentStatus::Delivered.as_db_str())
            .bind(ShipmentStatus::InTransit.as_db_str())
            .fetch_optional(&mut scope)
            .await;

            match result {
                Ok(Some(shipment)) => ApiResponse::success(shipment, "运单已到达"),
                Ok(None) => ApiResponse::conflict("运单状态已变化，请刷新后重试"),
                Err(e) => {
                    tracing::error!("到达确认失败: {}", e);
                    ApiResponse::from(TopemsError::Internal("到达确认失败".to_string()))
                }
            }
        }
        Ok(None) => ApiResponse::from(TopemsError::ResourceNotFound("运单不存在".to_string())),
        Err(e) => {
            tracing::error!("查询运单状态失败: {}", e);
            ApiResponse::from(TopemsError::Internal("查询运单状态失败".to_string()))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["tms:shipment:write"])),
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
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<Shipment> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::from(TopemsError::Internal("数据库事务不可用".to_string()));
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("数据库事务不可用".to_string()));
        }
    };
    let tenant_id = get_tenant_id(&claims, &headers);
    let now = Utc::now();

    let current = sqlx::query_scalar::<_, String>(
        "SELECT status FROM tms.tms_shipments WHERE id = $1 AND tenant_id = $2",
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&mut scope)
    .await;

    match current {
        Ok(Some(status)) => {
            let Some(current_status) = ShipmentStatus::from_db_str(&status) else {
                return ApiResponse::conflict("运单状态数据异常");
            };
            if shipment_can_transition(
                current_status.as_db_str(),
                ShipmentStatus::Cancelled.as_db_str(),
            )
            .is_err()
            {
                return ApiResponse::conflict("当前状态不允许取消");
            }
            let result = sqlx::query_as::<_, Shipment>(
                r#"
                UPDATE tms.tms_shipments SET
                    status = $4,
                    updated_at = $2
                WHERE id = $1 AND tenant_id = $3 AND status NOT IN ($5, $6)
                RETURNING id, shipment_no, order_id, carrier_id, vehicle_id, driver_id, route_id, origin, destination,
                       status, freight_amount, planned_departure, planned_arrival, actual_departure, actual_arrival,
                       notes, tenant_id, created_at, updated_at
                "#,
            )
            .bind(id)
            .bind(now)
            .bind(tenant_id)
            .bind(ShipmentStatus::Cancelled.as_db_str())
            .bind(ShipmentStatus::Delivered.as_db_str())
            .bind(ShipmentStatus::Cancelled.as_db_str())
            .fetch_optional(&mut scope)
            .await;

            match result {
                Ok(Some(shipment)) => ApiResponse::success(shipment, "运单已取消"),
                Ok(None) => ApiResponse::conflict("运单状态已变化，请刷新后重试"),
                Err(e) => {
                    tracing::error!("取消运单失败: {}", e);
                    ApiResponse::from(TopemsError::Internal("取消运单失败".to_string()))
                }
            }
        }
        Ok(None) => ApiResponse::from(TopemsError::ResourceNotFound("运单不存在".to_string())),
        Err(e) => {
            tracing::error!("查询运单状态失败: {}", e);
            ApiResponse::from(TopemsError::Internal("查询运单状态失败".to_string()))
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
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<ApprovalRequest>,
) -> ApiResponse<Shipment> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::from(TopemsError::Internal("数据库事务不可用".to_string()));
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("数据库事务不可用".to_string()));
        }
    };
    let tenant_id = get_tenant_id(&claims, &headers);
    let now = Utc::now();

    let current = sqlx::query_scalar::<_, String>(
        "SELECT status FROM tms.tms_shipments WHERE id = $1 AND tenant_id = $2",
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&mut scope)
    .await;

    match current {
        Ok(Some(status)) => {
            let Some(current_status) = ShipmentStatus::from_db_str(&status) else {
                return ApiResponse::conflict("运单状态数据异常");
            };
            if shipment_can_transition(
                current_status.as_db_str(),
                ShipmentStatus::Pending.as_db_str(),
            )
            .is_err()
            {
                return ApiResponse::conflict("当前状态不允许提交审批");
            }
            let result = sqlx::query_as::<_, Shipment>(sqlx::AssertSqlSafe(format!(
                r#"UPDATE tms.tms_shipments SET status = $4, updated_at = $2
                    WHERE id = $1 AND tenant_id = $3 AND status = $5 RETURNING {}"#,
                SHIPMENT_RETURN
            )))
            .bind(id)
            .bind(now)
            .bind(tenant_id)
            .bind(ShipmentStatus::Pending.as_db_str())
            .bind(ShipmentStatus::Draft.as_db_str())
            .fetch_optional(&mut scope)
            .await;

            match result {
                Ok(Some(shipment)) => {
                    tracing::info!(
                        "shipment {} submit_approval: {} -> pending, operator={}",
                        id,
                        status,
                        req.operator
                    );
                    ApiResponse::success(shipment, "运单已提交调度审批")
                }
                Ok(None) => ApiResponse::conflict("运单状态已变化，请刷新后重试"),
                Err(e) => {
                    tracing::error!("提交审批失败: {}", e);
                    ApiResponse::from(TopemsError::Internal("提交审批失败".to_string()))
                }
            }
        }
        Ok(None) => ApiResponse::from(TopemsError::ResourceNotFound("运单不存在".to_string())),
        Err(e) => {
            tracing::error!("查询运单状态失败: {}", e);
            ApiResponse::from(TopemsError::Internal("查询运单状态失败".to_string()))
        }
    }
}

/// Approve shipment (pending → in_transit, approve and dispatch)
#[utoipa::path(
    post,
    security(("BearerAuth" = ["tms:shipment:write"])),
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
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<ApprovalRequest>,
) -> ApiResponse<Shipment> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::from(TopemsError::Internal("数据库事务不可用".to_string()));
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("数据库事务不可用".to_string()));
        }
    };
    let tenant_id = get_tenant_id(&claims, &headers);
    let now = Utc::now();

    let current = sqlx::query_scalar::<_, String>(
        "SELECT status FROM tms.tms_shipments WHERE id = $1 AND tenant_id = $2",
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&mut scope)
    .await;

    match current {
        Ok(Some(status)) => {
            let Some(current_status) = ShipmentStatus::from_db_str(&status) else {
                return ApiResponse::conflict("运单状态数据异常");
            };
            if shipment_can_transition(
                current_status.as_db_str(),
                ShipmentStatus::InTransit.as_db_str(),
            )
            .is_err()
            {
                return ApiResponse::conflict("当前状态不允许审批发车");
            }
            let requires_approval = shipment_requires_approval(&status, "in_transit");
            let result = sqlx::query_as::<_, Shipment>(sqlx::AssertSqlSafe(format!(
                r#"UPDATE tms.tms_shipments SET status = $5, actual_departure = $2, updated_at = $3
                    WHERE id = $1 AND tenant_id = $4 AND status = $6 RETURNING {}"#,
                SHIPMENT_RETURN
            )))
            .bind(id)
            .bind(now)
            .bind(now)
            .bind(tenant_id)
            .bind(ShipmentStatus::InTransit.as_db_str())
            .bind(ShipmentStatus::Pending.as_db_str())
            .fetch_optional(&mut scope)
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
                    ApiResponse::success(shipment, "运单审批通过，已发车")
                }
                Ok(None) => ApiResponse::conflict("运单状态已变化，请刷新后重试"),
                Err(e) => {
                    tracing::error!("审批失败: {}", e);
                    ApiResponse::from(TopemsError::Internal("审批失败".to_string()))
                }
            }
        }
        Ok(None) => ApiResponse::from(TopemsError::ResourceNotFound("运单不存在".to_string())),
        Err(e) => {
            tracing::error!("查询运单状态失败: {}", e);
            ApiResponse::from(TopemsError::Internal("查询运单状态失败".to_string()))
        }
    }
}

/// Reject shipment (pending → cancelled, reject dispatch)
#[utoipa::path(
    post,
    security(("BearerAuth" = ["tms:shipment:write"])),
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
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<ApprovalRequest>,
) -> ApiResponse<Shipment> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::from(TopemsError::Internal("数据库事务不可用".to_string()));
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("数据库事务不可用".to_string()));
        }
    };
    let tenant_id = get_tenant_id(&claims, &headers);
    let now = Utc::now();

    let current = sqlx::query_scalar::<_, String>(
        "SELECT status FROM tms.tms_shipments WHERE id = $1 AND tenant_id = $2",
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&mut scope)
    .await;

    match current {
        Ok(Some(status)) => {
            let Some(current_status) = ShipmentStatus::from_db_str(&status) else {
                return ApiResponse::conflict("运单状态数据异常");
            };
            if shipment_can_transition(
                current_status.as_db_str(),
                ShipmentStatus::Cancelled.as_db_str(),
            )
            .is_err()
            {
                return ApiResponse::conflict("当前状态不允许驳回");
            }
            let result = sqlx::query_as::<_, Shipment>(sqlx::AssertSqlSafe(format!(
                r#"UPDATE tms.tms_shipments SET status = $4, updated_at = $2
                    WHERE id = $1 AND tenant_id = $3 AND status NOT IN ($5, $6) RETURNING {}"#,
                SHIPMENT_RETURN
            )))
            .bind(id)
            .bind(now)
            .bind(tenant_id)
            .bind(ShipmentStatus::Cancelled.as_db_str())
            .bind(ShipmentStatus::Delivered.as_db_str())
            .bind(ShipmentStatus::Cancelled.as_db_str())
            .fetch_optional(&mut scope)
            .await;

            match result {
                Ok(Some(shipment)) => {
                    tracing::info!(
                        "shipment {} rejected: {} -> cancelled, operator={}",
                        id,
                        status,
                        req.operator
                    );
                    ApiResponse::success(shipment, "运单已驳回")
                }
                Ok(None) => ApiResponse::conflict("运单状态已变化，请刷新后重试"),
                Err(e) => {
                    tracing::error!("驳回失败: {}", e);
                    ApiResponse::from(TopemsError::Internal("驳回失败".to_string()))
                }
            }
        }
        Ok(None) => ApiResponse::from(TopemsError::ResourceNotFound("运单不存在".to_string())),
        Err(e) => {
            tracing::error!("查询运单状态失败: {}", e);
            ApiResponse::from(TopemsError::Internal("查询运单状态失败".to_string()))
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
