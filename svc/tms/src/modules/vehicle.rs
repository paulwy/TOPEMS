//! Vehicle handlers - 车辆管理

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

use crate::shared::fsm::{vehicle_can_transition, vehicle_requires_approval};
use crate::shared::AppState;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::tenant::get_tenant_id;
use topems_shared_core::cache::{record_cache_hit, record_cache_miss, record_cache_set};
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
        .route("/vehicles/{id}/submit-inspection", post(submit_inspection))
        .route("/vehicles/{id}/approve", post(approve_vehicle))
        .route("/vehicles/{id}/reject", post(reject_vehicle))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["tms:vehicle:read"])),
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
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();
    let tenant_id = get_tenant_id(&claims, &headers);

    // 构建缓存 Key（遵循统一命名规范：{service}:{entity}:list:{tenant_id}:page:{page}:pagesize:{pagesize}:{params}）
    let cache_key = format!(
        "tms:vehicle:list:{}:page:{}:pagesize:{}:search:{}:status:{}",
        tenant_id,
        page,
        page_size,
        params.search.clone().unwrap_or_else(|| "none".to_string()),
        params.status.clone().unwrap_or_else(|| "all".to_string())
    );

    // 检查缓存（在获取事务锁之前，避免不必要的锁等待）
    if let Some(cached) = state.dict_cache.get(&cache_key) {
        record_cache_hit("tms", "vehicle", "list");
        tracing::debug!(
            event_type = "cache_hit",
            service = "tms",
            entity = "vehicle",
            operation = "list",
            tenant_id = %tenant_id,
            cache_key = %cache_key,
            "车辆列表缓存命中"
        );
        return Json(ApiResponse::success(cached, "获取车辆列表成功"));
    }

    // 缓存未命中，记录指标
    record_cache_miss("tms", "vehicle", "list");

    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");

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
    .fetch_all(&mut **txn)
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
            .fetch_one(&mut **txn)
            .await;

            let total = count_result.unwrap_or(0);
            let response_data = serde_json::json!({
                "vehicles": vehicles,
                "total": total,
                "page": page,
                "page_size": page_size
            });

            // 写入缓存
            state.dict_cache.set(cache_key.clone(), response_data.clone());
            record_cache_set("tms", "vehicle", "list");
            tracing::debug!(
                event_type = "cache_set",
                service = "tms",
                entity = "vehicle",
                operation = "list",
                tenant_id = %tenant_id,
                cache_key = %cache_key,
                "车辆列表缓存写入"
            );

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
    security(("BearerAuth" = ["tms:vehicle:read"])),
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
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<CreateVehicleRequest>,
) -> Json<ApiResponse<Vehicle>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
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
    .bind(req.carrier_id)
    .bind(&req.notes)
    .bind(tenant_id)
    .bind(now)
    .bind(now)
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(vehicle) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("rls commit failed: {}", e);
                    return Json(ApiResponse::error(500, "提交事务失败"));
                }
            }

            // 失效列表缓存（创建后列表数据可能变化）
            state.dict_cache.clear();

            // 发布缓存失效事件，通知其他服务失效相关缓存
            if let Some(ref publisher) = state.event_publisher {
                let publisher = publisher.clone();
                tokio::spawn(async move {
                    if let Err(e) = publisher
                        .publish_cache_invalidated("tms:vehicle:*", "pattern", Some("vehicle_created"))
                        .await
                    {
                        tracing::warn!("发布缓存失效事件失败: {}", e);
                    }
                });
            }

            Json(ApiResponse::success(vehicle, "车辆创建成功"))
        }
        Err(e) => {
            tracing::error!("创建车辆失败: {}", e);
            Json(api_error(500, "车辆创建失败"))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["tms:vehicle:read"])),
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
    State(_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<Vehicle>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query_as::<_, Vehicle>(
        r#"
        SELECT id, vehicle_no, plate_number, vehicle_type, capacity, status, carrier_id, notes, tenant_id, created_at, updated_at
        FROM tms.tms_vehicles WHERE id = $1 AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&mut **txn)
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
    security(("BearerAuth" = ["tms:vehicle:read"])),
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
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<UpdateVehicleRequest>,
) -> Json<ApiResponse<Vehicle>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
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
    .bind(req.carrier_id)
    .bind(&req.notes)
    .bind(now)
    .bind(tenant_id)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(vehicle)) => {
            // 失效列表缓存（更新后列表数据可能变化）
            state.dict_cache.clear();

            // 发布缓存失效事件，通知其他服务失效相关缓存
            if let Some(ref publisher) = state.event_publisher {
                let publisher = publisher.clone();
                tokio::spawn(async move {
                    if let Err(e) = publisher
                        .publish_cache_invalidated("tms:vehicle:*", "pattern", Some("vehicle_updated"))
                        .await
                    {
                        tracing::warn!("发布缓存失效事件失败: {}", e);
                    }
                });
            }

            Json(ApiResponse::success(vehicle, "车辆更新成功"))
        }
        Ok(None) => Json(api_error(404, "车辆不存在")),
        Err(e) => {
            tracing::error!("更新车辆失败: {}", e);
            Json(api_error(500, "更新车辆失败"))
        }
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["tms:vehicle:read"])),
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
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<String>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query("DELETE FROM tms.tms_vehicles WHERE id = $1 AND tenant_id = $2")
        .bind(id)
        .bind(tenant_id)
        .execute(&mut **txn)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => {
            // 失效列表缓存（删除后列表数据可能变化）
            state.dict_cache.clear();

            // 发布缓存失效事件，通知其他服务失效相关缓存
            if let Some(ref publisher) = state.event_publisher {
                let publisher = publisher.clone();
                tokio::spawn(async move {
                    if let Err(e) = publisher
                        .publish_cache_invalidated("tms:vehicle:*", "pattern", Some("vehicle_deleted"))
                        .await
                    {
                        tracing::warn!("发布缓存失效事件失败: {}", e);
                    }
                });
            }

            Json(ApiResponse::success("".to_string(), "车辆删除成功"))
        }
        Ok(_) => Json(api_error(404, "车辆不存在")),
        Err(e) => {
            tracing::error!("删除车辆失败: {}", e);
            Json(api_error(500, "车辆删除失败"))
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

/// Submit vehicle for maintenance inspection (active → maintenance)
#[utoipa::path(
    post,
    security(("BearerAuth" = ["tms:write"])),
    path = "/api/tms/vehicles/{id}/submit-inspection",
    request_body = ApprovalRequest,
    params(
        ("id" = Uuid, Path, description = "车辆 ID")
    ),
    responses(
        (status = 200, description = "submit_inspection OK")
    ),
    tag = "TMS - Vehicle"
)]
pub async fn submit_inspection(
    State(_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<ApprovalRequest>,
) -> Json<ApiResponse<Vehicle>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let tenant_id = get_tenant_id(&claims, &headers);
    let now = Utc::now();

    let current = sqlx::query_scalar::<_, String>(
        "SELECT status FROM tms.tms_vehicles WHERE id = $1 AND tenant_id = $2",
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&mut **txn)
    .await;

    match current {
        Ok(Some(status)) => {
            if vehicle_can_transition(&status, "maintenance").is_err() {
                return Json(api_error(
                    400,
                    &format!("当前状态 {} 不允许提交检修", status),
                ));
            }
            let result = sqlx::query_as::<_, Vehicle>(
                r#"
                UPDATE tms.tms_vehicles SET status = 'maintenance', updated_at = $2
                WHERE id = $1 AND tenant_id = $3
                RETURNING id, vehicle_no, plate_number, vehicle_type, capacity, status, carrier_id, notes, tenant_id, created_at, updated_at
                "#,
            )
            .bind(id)
            .bind(now)
            .bind(tenant_id)
            .fetch_optional(&mut **txn)
            .await;

            match result {
                Ok(Some(vehicle)) => {
                    tracing::info!(
                        "vehicle {} submit_inspection: {} -> maintenance, operator={}",
                        id,
                        status,
                        req.operator
                    );
                    Json(ApiResponse::success(vehicle, "车辆已提交检修"))
                }
                Ok(None) => Json(api_error(404, "车辆不存在")),
                Err(e) => {
                    tracing::error!("提交检修失败: {}", e);
                    Json(api_error(500, "提交检修失败"))
                }
            }
        }
        Ok(None) => Json(api_error(404, "车辆不存在")),
        Err(e) => {
            tracing::error!("查询车辆状态失败: {}", e);
            Json(api_error(500, "查询车辆状态失败"))
        }
    }
}

/// Approve vehicle (maintenance→active or inactive→retired based on current status)
#[utoipa::path(
    post,
    security(("BearerAuth" = ["tms:vehicle:read"])),
    path = "/api/tms/vehicles/{id}/approve",
    request_body = ApprovalRequest,
    params(
        ("id" = Uuid, Path, description = "车辆 ID")
    ),
    responses(
        (status = 200, description = "approve_vehicle OK")
    ),
    tag = "TMS - Vehicle"
)]
pub async fn approve_vehicle(
    State(_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<ApprovalRequest>,
) -> Json<ApiResponse<Vehicle>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let tenant_id = get_tenant_id(&claims, &headers);
    let now = Utc::now();

    let current = sqlx::query_scalar::<_, String>(
        "SELECT status FROM tms.tms_vehicles WHERE id = $1 AND tenant_id = $2",
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&mut **txn)
    .await;

    match current {
        Ok(Some(status)) => {
            let target = if status == "maintenance" {
                "active"
            } else if status == "inactive" {
                "retired"
            } else {
                return Json(api_error(400, &format!("当前状态 {} 不允许审批", status)));
            };

            if vehicle_can_transition(&status, target).is_err() {
                return Json(api_error(
                    400,
                    &format!("当前状态 {} 不允许审批为 {}", status, target),
                ));
            }
            let requires_approval = vehicle_requires_approval(&status, target);

            let result = sqlx::query_as::<_, Vehicle>(
                r#"
                UPDATE tms.tms_vehicles SET status = $2, updated_at = $3
                WHERE id = $1 AND tenant_id = $4
                RETURNING id, vehicle_no, plate_number, vehicle_type, capacity, status, carrier_id, notes, tenant_id, created_at, updated_at
                "#,
            )
            .bind(id)
            .bind(target)
            .bind(now)
            .bind(tenant_id)
            .fetch_optional(&mut **txn)
            .await;

            match result {
                Ok(Some(vehicle)) => {
                    tracing::info!(
                        "vehicle {} approved: {} -> {}, operator={}, requires_approval={}",
                        id,
                        status,
                        target,
                        req.operator,
                        requires_approval
                    );
                    Json(ApiResponse::success(vehicle, "车辆审批通过"))
                }
                Ok(None) => Json(api_error(404, "车辆不存在")),
                Err(e) => {
                    tracing::error!("审批失败: {}", e);
                    Json(api_error(500, "审批失败"))
                }
            }
        }
        Ok(None) => Json(api_error(404, "车辆不存在")),
        Err(e) => {
            tracing::error!("查询车辆状态失败: {}", e);
            Json(api_error(500, "查询车辆状态失败"))
        }
    }
}

/// Reject vehicle maintenance (maintenance → active, revert)
#[utoipa::path(
    post,
    security(("BearerAuth" = ["tms:vehicle:read"])),
    path = "/api/tms/vehicles/{id}/reject",
    request_body = ApprovalRequest,
    params(
        ("id" = Uuid, Path, description = "车辆 ID")
    ),
    responses(
        (status = 200, description = "reject_vehicle OK")
    ),
    tag = "TMS - Vehicle"
)]
pub async fn reject_vehicle(
    State(_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<ApprovalRequest>,
) -> Json<ApiResponse<Vehicle>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let tenant_id = get_tenant_id(&claims, &headers);
    let now = Utc::now();

    let current = sqlx::query_scalar::<_, String>(
        "SELECT status FROM tms.tms_vehicles WHERE id = $1 AND tenant_id = $2",
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&mut **txn)
    .await;

    match current {
        Ok(Some(status)) => {
            if vehicle_can_transition(&status, "active").is_err() {
                return Json(api_error(400, &format!("当前状态 {} 不允许驳回", status)));
            }
            let result = sqlx::query_as::<_, Vehicle>(
                r#"
                UPDATE tms.tms_vehicles SET status = 'active', updated_at = $2
                WHERE id = $1 AND tenant_id = $3
                RETURNING id, vehicle_no, plate_number, vehicle_type, capacity, status, carrier_id, notes, tenant_id, created_at, updated_at
                "#,
            )
            .bind(id)
            .bind(now)
            .bind(tenant_id)
            .fetch_optional(&mut **txn)
            .await;

            match result {
                Ok(Some(vehicle)) => {
                    tracing::info!(
                        "vehicle {} rejected: {} -> active, operator={}",
                        id,
                        status,
                        req.operator
                    );
                    Json(ApiResponse::success(vehicle, "车辆检修已驳回"))
                }
                Ok(None) => Json(api_error(404, "车辆不存在")),
                Err(e) => {
                    tracing::error!("驳回失败: {}", e);
                    Json(api_error(500, "驳回失败"))
                }
            }
        }
        Ok(None) => Json(api_error(404, "车辆不存在")),
        Err(e) => {
            tracing::error!("查询车辆状态失败: {}", e);
            Json(api_error(500, "查询车辆状态失败"))
        }
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
    fn create_vehicle_request_roundtrip_full() {
        roundtrip(&CreateVehicleRequest {
            vehicle_no: "V-2024-001".into(),
            plate_number: Some("京A12345".into()),
            vehicle_type: Some("truck".into()),
            capacity: Some(bigdecimal::BigDecimal::from(5000i64)),
            carrier_id: Some(Uuid::new_v4()),
            notes: Some("Test vehicle".into()),
        });
    }

    #[test]
    fn update_vehicle_request_roundtrip_full() {
        roundtrip(&UpdateVehicleRequest {
            plate_number: Some("沪B99999".into()),
            vehicle_type: Some("van".into()),
            capacity: Some(bigdecimal::BigDecimal::from(3000i64)),
            status: Some("active".into()),
            carrier_id: Some(Uuid::new_v4()),
            notes: Some("Updated note".into()),
        });
    }
}
