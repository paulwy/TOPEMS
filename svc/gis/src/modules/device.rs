#![allow(clippy::needless_borrows_for_generic_args)]
#![allow(dead_code)]

use crate::models::{Device, DeviceLocationRecord};
use crate::modules::websocket::{SharedWebSocketManager, WebSocketMessage};
use crate::services::track_stats::{TrackPoint, TrackStatisticsCalculator};
use crate::shared::permission::{check_permission, GisPermission};
use axum::{
    extract::{Extension, Path, Query, State},
    http::HeaderMap,
    Json,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use topems_shared_auth::auth::{verify_jwt_token, AuthState, Claims};
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::{response::ApiResponse, TopemsError};
use topems_shared_db::scope::Db;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegisterDevice {
    pub device_code: String,
    pub device_name: String,
    pub device_type: String,
    pub description: Option<String>,
    pub properties: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateDevice {
    pub device_name: String,
    pub device_type: String,
    pub description: Option<String>,
    pub properties: Option<serde_json::Value>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateDeviceLocation {
    pub map_id: Option<Uuid>,
    pub device_name: String,
    pub device_code: String,
    pub device_type: String,
    pub position: serde_json::Value,
    pub status: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateDeviceLocation {
    pub position: serde_json::Value,
    pub accuracy: Option<f64>,
    pub speed: Option<f64>,
    pub direction: Option<f64>,
    pub altitude: Option<f64>,
    pub battery_level: Option<i32>,
    pub signal_strength: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrackingQuery {
    pub start_time: Option<DateTime<Utc>>,
    pub end_time: Option<DateTime<Utc>>,
    pub limit: Option<i32>,
}

/// GET /device-locations —— `/devices` 的只读别名挂载点（前端 deviceApi.listDevicePoints 使用）
#[utoipa::path(
    get,
    security(("BearerAuth" = ["gis:device:read"])),
    path = "/device-locations",
    tag = "device",
    responses(
        (status = 200, description = "获取设备列表成功", body = serde_json::Value),
        (status = 500, description = "查询失败")
    )
)]
pub async fn list_device_locations(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Extension(claims): Extension<Claims>,
) -> ApiResponse<serde_json::Value> {
    list_devices(Extension(txn_arc), State(db), Extension(claims)).await
}

/// GET /device-locations/{id} —— `/devices/{id}` 的只读别名挂载点
#[utoipa::path(
    get,
    security(("BearerAuth" = ["gis:device:read"])),
    path = "/device-locations/{id}",
    tag = "device",
    params(
        ("id" = Uuid, Path, description = "设备ID")
    ),
    responses(
        (status = 200, description = "获取设备详情成功", body = serde_json::Value),
        (status = 404, description = "设备未找到"),
        (status = 500, description = "查询失败")
    )
)]
pub async fn get_device_location(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<Device> {
    get_device(Extension(txn_arc), State(db), Extension(claims), Path(id)).await
}

/// 注册设备
#[utoipa::path(
    post,
    security(("BearerAuth" = ["gis:device:write"])),
    path = "/devices",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "device"
)]
pub async fn register_device(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<RegisterDevice>,
) -> ApiResponse<Device> {
    if let Err(e) = check_permission(&db, &claims, &GisPermission::DeviceLocationWrite).await {
        return e.0;
    }
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return ApiResponse::from(TopemsError::internal("数据库连接失败", e)),
    };

    let tenant_id = topems_shared_auth::get_tenant_id_from_claims(&claims);
    let result = sqlx::query_as::<_, Device>(
        only_own_schema_query!("gis", r#"
        INSERT INTO gis.devices (device_code, device_name, device_type, description, properties, registered_by, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
        "#),
    )
    .bind(&payload.device_code)
    .bind(&payload.device_name)
    .bind(&payload.device_type)
    .bind(&payload.description)
    .bind(&payload.properties)
    .bind(claims.sub.parse::<Uuid>().ok())
    .bind(tenant_id)
    .fetch_one(&mut scope)
    .await;
    let commit_res = match &result {
        Ok(_) => scope.commit().await,
        Err(_) => Ok(()),
    };
    if let Err(e) = commit_res {
        return ApiResponse::from(TopemsError::internal("事务提交失败", e));
    }
    match result {
        Ok(device) => ApiResponse::success(device, "注册设备成功"),
        Err(e) => ApiResponse::from(TopemsError::internal("注册设备失败", e)),
    }
}

/// 获取设备列表
#[utoipa::path(
    get,
    security(("BearerAuth" = ["gis:device:read"])),
    path = "/devices",
    tag = "device",
    responses(
        (status = 200, description = "获取设备列表成功", body = serde_json::Value),
        (status = 500, description = "查询失败")
    )
)]
pub async fn list_devices(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Extension(_claims): Extension<Claims>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return ApiResponse::from(TopemsError::internal("数据库连接失败", e)),
    };
    let result = sqlx::query_as::<_, Device>(only_own_schema_query!("gis", "SELECT id, tenant_id, device_code, device_name, device_type, description, properties, status, registered_by, created_at, updated_at FROM gis.devices ORDER BY created_at DESC"))
        .fetch_all(&mut scope)
        .await;
    let commit_res = match &result {
        Ok(_) => scope.commit().await,
        Err(_) => Ok(()),
    };
    if let Err(e) = commit_res {
        return ApiResponse::from(TopemsError::internal("事务提交失败", e));
    }
    match result {
        Ok(devices) => ApiResponse::success(
            serde_json::json!({
                "items": devices,
                "total": devices.len()
            }),
            "获取设备列表成功",
        ),
        Err(e) => ApiResponse::from(TopemsError::internal("查询失败", e)),
    }
}

/// 获取设备详情
#[utoipa::path(
    get,
    security(("BearerAuth" = ["gis:device:read"])),
    path = "/devices/{id}",
    tag = "device",
    params(
        ("id" = Uuid, Path, description = "设备ID")
    ),
    responses(
        (status = 200, description = "获取设备成功", body = serde_json::Value),
        (status = 404, description = "设备未找到"),
        (status = 500, description = "查询失败")
    )
)]
pub async fn get_device(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Extension(_claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<Device> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return ApiResponse::from(TopemsError::internal("数据库连接失败", e)),
    };
    let result = sqlx::query_as::<_, Device>(
        only_own_schema_query!("gis", "SELECT id, tenant_id, device_code, device_name, device_type, description, properties, status, registered_by, created_at, updated_at FROM gis.devices WHERE deleted_at IS NULL AND id = $1"),
    )
    .bind(id)
    .fetch_one(&mut scope)
    .await;
    let commit_res = match &result {
        Ok(_) => scope.commit().await,
        Err(_) => Ok(()),
    };
    if let Err(e) = commit_res {
        return ApiResponse::from(TopemsError::internal("事务提交失败", e));
    }
    match result {
        Ok(device) => ApiResponse::success(device, "获取设备成功"),
        Err(sqlx::Error::RowNotFound) => ApiResponse::not_found("设备未找到"),
        Err(e) => ApiResponse::from(TopemsError::internal("查询失败", e)),
    }
}

/// 更新设备信息
#[utoipa::path(
    put,
    security(("BearerAuth" = ["gis:device:write"])),
    path = "/devices/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "device"
)]
pub async fn update_device(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateDevice>,
) -> ApiResponse<Device> {
    if let Err(e) = check_permission(&db, &claims, &GisPermission::DeviceLocationWrite).await {
        return e.0;
    }
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return ApiResponse::from(TopemsError::internal("数据库连接失败", e)),
    };

    let result = sqlx::query_as::<_, Device>(only_own_schema_query!(
        "gis",
        r#"
        UPDATE gis.devices 
        SET device_name = $1, device_type = $2, description = $3, 
            properties = $4, status = COALESCE($5, status), updated_at = NOW()
        WHERE id = $6
        RETURNING *
        "#
    ))
    .bind(&payload.device_name)
    .bind(&payload.device_type)
    .bind(&payload.description)
    .bind(&payload.properties)
    .bind(&payload.status)
    .bind(id)
    .fetch_one(&mut scope)
    .await;
    let commit_res = match &result {
        Ok(_) => scope.commit().await,
        Err(_) => Ok(()),
    };
    if let Err(e) = commit_res {
        return ApiResponse::from(TopemsError::internal("事务提交失败", e));
    }
    match result {
        Ok(device) => ApiResponse::success(device, "更新设备成功"),
        Err(sqlx::Error::RowNotFound) => ApiResponse::not_found("设备未找到"),
        Err(e) => ApiResponse::from(TopemsError::internal("更新失败", e)),
    }
}

/// 删除设备
#[utoipa::path(
    delete,
    security(("BearerAuth" = ["gis:device:write"])),
    path = "/devices/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "device"
)]
pub async fn delete_device(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<bool> {
    if let Err(e) = check_permission(&db, &claims, &GisPermission::DeviceLocationWrite).await {
        return e.0;
    }
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return ApiResponse::from(TopemsError::internal("数据库连接失败", e)),
    };
    let tenant_id = topems_shared_auth::get_tenant_id_from_claims(&claims);

    let result = sqlx::query(only_own_schema_query!(
        "gis",
        "UPDATE gis.devices SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2"
    ))
    .bind(id)
    .bind(tenant_id)
    .execute(&mut scope)
    .await;
    let commit_res = match &result {
        Ok(_) => scope.commit().await,
        Err(_) => Ok(()),
    };
    if let Err(e) = commit_res {
        return ApiResponse::from(TopemsError::internal("事务提交失败", e));
    }
    match result {
        Ok(result) => {
            if result.rows_affected() > 0 {
                ApiResponse::success(true, "删除设备成功")
            } else {
                ApiResponse::not_found("设备未找到")
            }
        }
        Err(e) => ApiResponse::from(TopemsError::internal("删除失败", e)),
    }
}

/// 更新设备位置
pub async fn update_device_location(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    State(ws_manager): State<SharedWebSocketManager>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateDeviceLocation>,
) -> ApiResponse<DeviceLocationRecord> {
    if let Err(e) = check_permission(&db, &claims, &GisPermission::DeviceLocationWrite).await {
        return e.0;
    }
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return ApiResponse::from(TopemsError::internal("数据库连接失败", e)),
    };

    let result = sqlx::query_as::<_, Device>(only_own_schema_query!("gis", "SELECT id, tenant_id, device_code, device_name, device_type, description, properties, status, registered_by, created_at, updated_at FROM gis.devices WHERE deleted_at IS NULL AND id = $1"))
        .bind(id)
        .fetch_one(&mut scope)
        .await;
    match result {
        Ok(device) => {
            let record_result = sqlx::query_as::<_, DeviceLocationRecord>(
                only_own_schema_query!("gis", r#"
                INSERT INTO gis.device_location_records 
                (device_id, tenant_id, position, accuracy, speed, direction, altitude, battery_level, signal_strength)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING *
                "#),
            )
            .bind(id)
            .bind(device.tenant_id)
            .bind(&payload.position)
            .bind(&payload.accuracy)
            .bind(&payload.speed)
            .bind(&payload.direction)
            .bind(&payload.altitude)
            .bind(&payload.battery_level)
            .bind(&payload.signal_strength)
            .fetch_one(&mut scope)
            .await;
            match record_result {
                Ok(record) => {
                    if let Err(e) = scope.commit().await {
                        return ApiResponse::from(TopemsError::internal("事务提交失败", e));
                    }
                    let ws_msg = WebSocketMessage::LocationUpdate {
                        device_code: device.device_code.clone(),
                        device_name: device.device_name.clone(),
                        position: payload.position.clone(),
                        timestamp: record.recorded_at.to_rfc3339(),
                        status: device.status.clone(),
                    };
                    ws_manager.broadcast_location_update(ws_msg).await;
                    ApiResponse::success(record, "更新设备位置成功")
                }
                Err(e) => ApiResponse::from(TopemsError::internal("更新位置失败", e)),
            }
        }
        Err(sqlx::Error::RowNotFound) => ApiResponse::not_found("设备未找到"),
        Err(e) => ApiResponse::from(TopemsError::internal("查询设备失败", e)),
    }
}

/// 获取设备轨迹
pub async fn get_device_tracking(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Path(id): Path<Uuid>,
    Query(query): Query<TrackingQuery>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return ApiResponse::from(TopemsError::internal("数据库连接失败", e)),
    };
    // Build query based on time range
    let sql = if query.start_time.is_some() && query.end_time.is_some() {
        "id, tenant_id, device_id, position, accuracy, speed, direction, altitude, battery_level, signal_strength, recorded_at, created_at FROM gis.device_location_records WHERE device_id = $1 AND recorded_at >= $2 AND recorded_at <= $3 ORDER BY recorded_at DESC LIMIT $4"
    } else if query.start_time.is_some() {
        "id, tenant_id, device_id, position, accuracy, speed, direction, altitude, battery_level, signal_strength, recorded_at, created_at FROM gis.device_location_records WHERE device_id = $1 AND recorded_at >= $2 ORDER BY recorded_at DESC LIMIT $3"
    } else if query.end_time.is_some() {
        "id, tenant_id, device_id, position, accuracy, speed, direction, altitude, battery_level, signal_strength, recorded_at, created_at FROM gis.device_location_records WHERE device_id = $1 AND recorded_at <= $2 ORDER BY recorded_at DESC LIMIT $3"
    } else {
        "id, tenant_id, device_id, position, accuracy, speed, direction, altitude, battery_level, signal_strength, recorded_at, created_at FROM gis.device_location_records WHERE device_id = $1 ORDER BY recorded_at DESC LIMIT $2"
    };

    let limit = query.limit.unwrap_or(100);

    let result = if query.start_time.is_some() && query.end_time.is_some() {
        sqlx::query_as::<_, DeviceLocationRecord>(sqlx::AssertSqlSafe(sql))
            .bind(id)
            .bind(&query.start_time)
            .bind(&query.end_time)
            .bind(limit)
            .fetch_all(&mut scope)
            .await
    } else if query.start_time.is_some() {
        sqlx::query_as::<_, DeviceLocationRecord>(sqlx::AssertSqlSafe(sql))
            .bind(id)
            .bind(&query.start_time)
            .bind(limit)
            .fetch_all(&mut scope)
            .await
    } else if query.end_time.is_some() {
        sqlx::query_as::<_, DeviceLocationRecord>(sqlx::AssertSqlSafe(sql))
            .bind(id)
            .bind(&query.end_time)
            .bind(limit)
            .fetch_all(&mut scope)
            .await
    } else {
        sqlx::query_as::<_, DeviceLocationRecord>(sqlx::AssertSqlSafe(sql))
            .bind(id)
            .bind(limit)
            .fetch_all(&mut scope)
            .await
    };
    if let Err(e) = scope.commit().await {
        return ApiResponse::from(TopemsError::internal("事务提交失败", e));
    }
    match result {
        Ok(records) => {
            // Build trajectory LineString
            let coordinates: Vec<Vec<f64>> = records
                .iter()
                .rev() // Reverse to get chronological order
                .filter_map(|r| {
                    if let Some(obj) = r.position.as_object() {
                        let lat = obj.get("lat").and_then(|v| v.as_f64()).unwrap_or(0.0);
                        let lng = obj.get("lng").and_then(|v| v.as_f64()).unwrap_or(0.0);
                        Some(vec![lng, lat])
                    } else if let Some(arr) = r.position.as_array() {
                        if arr.len() >= 2 {
                            Some(vec![
                                arr[0].as_f64().unwrap_or(0.0),
                                arr[1].as_f64().unwrap_or(0.0),
                            ])
                        } else {
                            None
                        }
                    } else {
                        None
                    }
                })
                .collect();

            let trajectory = if coordinates.len() > 1 {
                serde_json::json!({
                    "type": "LineString",
                    "coordinates": coordinates
                })
            } else {
                serde_json::json!({})
            };

            ApiResponse::success(
                serde_json::json!({
                    "trajectory": trajectory,
                    "records": records,
                    "total": records.len()
                }),
                "获取设备轨迹成功",
            )
        }
        Err(e) => ApiResponse::from(TopemsError::internal("查询轨迹失败", e)),
    }
}

#[allow(
    clippy::as_conversions,
    clippy::cast_possible_truncation,
    clippy::cast_possible_wrap,
    clippy::cast_precision_loss
)]
/// 获取设备历史位置
pub async fn get_device_history(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Path(id): Path<Uuid>,
    Query(query): Query<TrackingQuery>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return ApiResponse::from(TopemsError::internal("数据库连接失败", e)),
    };
    // Similar to tracking but returns all location records
    let limit = query.limit.unwrap_or(50);

    let sql = if query.start_time.is_some() && query.end_time.is_some() {
        "id, tenant_id, device_id, position, accuracy, speed, direction, altitude, battery_level, signal_strength, recorded_at, created_at FROM gis.device_location_records WHERE device_id = $1 AND recorded_at >= $2 AND recorded_at <= $3 ORDER BY recorded_at DESC LIMIT $4"
    } else {
        "id, tenant_id, device_id, position, accuracy, speed, direction, altitude, battery_level, signal_strength, recorded_at, created_at FROM gis.device_location_records WHERE device_id = $1 ORDER BY recorded_at DESC LIMIT $2"
    };

    let result = if query.start_time.is_some() && query.end_time.is_some() {
        sqlx::query_as::<_, DeviceLocationRecord>(sqlx::AssertSqlSafe(sql))
            .bind(id)
            .bind(&query.start_time)
            .bind(&query.end_time)
            .bind(limit)
            .fetch_all(&mut scope)
            .await
    } else {
        sqlx::query_as::<_, DeviceLocationRecord>(sqlx::AssertSqlSafe(sql))
            .bind(id)
            .bind(limit)
            .fetch_all(&mut scope)
            .await
    };
    if let Err(e) = scope.commit().await {
        return ApiResponse::from(TopemsError::internal("事务提交失败", e));
    }
    match result {
        Ok(records) => {
            // Calculate statistics
            let total_records = records.len();
            let avg_speed =
                records.iter().filter_map(|r| r.speed).sum::<f64>() / total_records as f64;

            let avg_battery =
                records.iter().filter_map(|r| r.battery_level).sum::<i32>() / total_records as i32;

            ApiResponse::success(
                serde_json::json!({
                    "records": records,
                    "total": total_records,
                    "statistics": {
                        "avg_speed": avg_speed,
                        "avg_battery": avg_battery
                    }
                }),
                "获取设备历史位置成功",
            )
        }
        Err(e) => ApiResponse::from(TopemsError::internal("查询历史位置失败", e)),
    }
}

/// GET /device-tracks?device_id=&start_time=&end_time=&page=&page_size=
/// 前端 trackApi.getDeviceTrack(params) → 按设备与时间窗分页返回轨迹点位。
/// 与 `/device-tracks/{device_id}/statistics` 共用 `gis.device_location_records` 数据源。
#[derive(Debug, Deserialize)]
pub struct DeviceTrackParams {
    pub device_id: Uuid,
    pub start_time: Option<DateTime<Utc>>,
    pub end_time: Option<DateTime<Utc>>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["gis:device:read"])),
    path = "/device-tracks",
    tag = "device",
    params(
        ("device_id" = Uuid, Query, description = "设备ID"),
        ("start_time" = Option<String>, Query, description = "起始时间（RFC3339）"),
        ("end_time" = Option<String>, Query, description = "结束时间（RFC3339）"),
        ("page" = Option<i64>, Query, description = "页码，默认 1"),
        ("page_size" = Option<i64>, Query, description = "每页条数，默认 20")
    ),
    responses(
        (status = 200, description = "获取设备轨迹成功", body = serde_json::Value),
        (status = 500, description = "查询失败")
    )
)]
pub async fn list_device_tracks(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Extension(_claims): Extension<Claims>,
    Query(params): Query<DeviceTrackParams>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return ApiResponse::from(TopemsError::internal("数据库连接失败", e)),
    };

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).clamp(1, 200);
    let offset = (page - 1) * page_size;

    let total: i64 = match sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM gis.device_location_records WHERE device_id = $1 \
         AND ($2::timestamptz IS NULL OR recorded_at >= $2) \
         AND ($3::timestamptz IS NULL OR recorded_at <= $3)",
    )
    .bind(params.device_id)
    .bind(params.start_time)
    .bind(params.end_time)
    .fetch_one(&mut scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            return ApiResponse::from(TopemsError::internal("查询轨迹总数失败", e));
        }
    };

    let result = sqlx::query_as::<_, DeviceLocationRecord>(
        "SELECT id, tenant_id, device_id, position, accuracy, speed, direction, altitude, \
         battery_level, signal_strength, recorded_at, created_at \
         FROM gis.device_location_records WHERE device_id = $1 \
         AND ($2::timestamptz IS NULL OR recorded_at >= $2) \
         AND ($3::timestamptz IS NULL OR recorded_at <= $3) \
         ORDER BY recorded_at DESC LIMIT $4 OFFSET $5",
    )
    .bind(params.device_id)
    .bind(params.start_time)
    .bind(params.end_time)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut scope)
    .await;

    let commit_res = match &result {
        Ok(_) => scope.commit().await,
        Err(_) => Ok(()),
    };
    if let Err(e) = commit_res {
        return ApiResponse::from(TopemsError::internal("事务提交失败", e));
    }
    match result {
        Ok(records) => ApiResponse::success(
            serde_json::json!({
                "items": records,
                "records": records,
                "total": total,
                "page": page,
                "page_size": page_size
            }),
            "获取设备轨迹成功",
        ),
        Err(e) => ApiResponse::from(TopemsError::internal("查询轨迹失败", e)),
    }
}

/// GET /device-tracks/{device_id}/statistics
/// 前端 trackApi.getTrackStatistics(deviceId) → 返回单设备轨迹统计汇总。
/// 复用 services::track_stats::TrackStatisticsCalculator 计算距离/速度。
#[utoipa::path(
    get,
    security(("BearerAuth" = ["gis:device:read"])),
    path = "/device-tracks/{device_id}/statistics",
    params(
        ("device_id" = String, Path, description = "device_id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "device"
)]
pub async fn get_device_track_statistics(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Extension(_claims): Extension<Claims>,
    Path(device_id): Path<Uuid>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return ApiResponse::from(TopemsError::internal("数据库连接失败", e)),
    };
    let records = sqlx::query_as::<_, DeviceLocationRecord>(
        "SELECT id, tenant_id, device_id, position, accuracy, speed, direction, altitude, battery_level, signal_strength, recorded_at, created_at FROM gis.device_location_records WHERE device_id = $1 ORDER BY recorded_at ASC",
    )
    .bind(device_id)
    .fetch_all(&mut scope)
    .await;

    if let Err(e) = scope.commit().await {
        return ApiResponse::from(TopemsError::internal("事务提交失败", e));
    }
    match records {
        Ok(records) if records.is_empty() => ApiResponse::success(
            serde_json::json!({
                "total_distance": 0.0,
                "avg_speed": 0.0,
                "max_speed": 0.0,
                "track_points": 0,
                "start_time": null,
                "end_time": null,
            }),
            "暂无轨迹数据",
        ),
        Ok(records) => {
            let points: Vec<TrackPoint> = records
                .iter()
                .map(|r| TrackPoint {
                    position: r.position.clone(),
                    altitude: r.altitude,
                    speed: r.speed,
                    heading: r.direction,
                    accuracy: r.accuracy,
                    battery_level: r.battery_level,
                    timestamp: r.recorded_at,
                })
                .collect();
            let stats = TrackStatisticsCalculator::calculate(&points);
            let resp = match stats {
                Some(s) => serde_json::json!({
                    "total_distance": s.total_distance,
                    "avg_speed": s.avg_speed,
                    "max_speed": s.max_speed,
                    "track_points": s.point_count,
                    "start_time": s.start_time,
                    "end_time": s.end_time,
                }),
                None => serde_json::json!({
                    "total_distance": 0.0,
                    "avg_speed": 0.0,
                    "max_speed": 0.0,
                    "track_points": 0,
                    "start_time": null,
                    "end_time": null,
                }),
            };
            ApiResponse::success(resp, "获取轨迹统计成功")
        }
        Err(e) => ApiResponse::from(TopemsError::internal("查询轨迹统计失败", e)),
    }
}

/// GET /device-tracks/devices
/// 前端 trackApi.listDevicesWithTracks() → 返回最近有轨迹上报的设备列表（含最新位置）。
#[utoipa::path(
    get,
    security(("BearerAuth" = ["gis:device:read"])),
    path = "/device-tracks/devices",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "device"
)]
pub async fn list_devices_with_tracks(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Extension(_claims): Extension<Claims>,
) -> ApiResponse<Vec<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return ApiResponse::from(TopemsError::internal("数据库连接失败", e)),
    };
    let rows = sqlx::query(
        "SELECT DISTINCT ON (device_id) device_id, position, speed, recorded_at \
         FROM gis.device_location_records \
         ORDER BY device_id, recorded_at DESC",
    )
    .fetch_all(&mut scope)
    .await;

    if let Err(e) = scope.commit().await {
        return ApiResponse::from(TopemsError::internal("事务提交失败", e));
    }
    match rows {
        Ok(rows) => {
            let items: Vec<serde_json::Value> = rows
                .into_iter()
                .map(|r| {
                    let device_id: Uuid = r.get("device_id");
                    let position: serde_json::Value = r.get("position");
                    let speed: Option<f64> = r.get("speed");
                    let recorded_at: DateTime<Utc> = r.get("recorded_at");
                    serde_json::json!({
                        "id": device_id,
                        "device_id": device_id,
                        "position": position,
                        "speed": speed,
                        "recorded_at": recorded_at,
                    })
                })
                .collect();
            ApiResponse::success(items, "获取设备轨迹列表成功")
        }
        Err(e) => ApiResponse::from(TopemsError::internal("查询设备轨迹列表失败", e)),
    }
}

/// 计算明文凭证的 sha256 十六进制摘要（小写 hex）。
/// 存储列 `gis.devices.device_token` 仅保存该摘要，不落明文。
fn sha256_token_hex(plain: &str) -> String {
    use sha2::{Digest, Sha256};
    let mut hasher = Sha256::new();
    hasher.update(plain.as_bytes());
    hex::encode(hasher.finalize())
}

/// 通过 device_code 上报设备位置
///
/// 双通道认证（满足其一即可）：
/// - **设备级凭证通道**：请求头 `X-Device-Token: <明文>` → sha256(hex) 与
///   `gis.devices.device_token` 比对（列存摘要、不落明文；列由并行迁移
///   `ALTER TABLE gis.devices ADD COLUMN device_token varchar(64)` 落地）。
///   IoT 设备直连场景使用；凭证与设备行绑定，命中即视为设备本人，
///   不再校验用户租户（上报记录租户取设备归属租户）。
/// - **用户 JWT 通道**：`Authorization: Bearer <JWT>`（P1-22 原逻辑，保留），
///   并校验设备属于 claims 租户（超管除外）。
/// 两通道共同校验：设备存在、状态 `active`。
/// 两通道均缺失/无效 → 401；设备存在但凭证错误（token 通道）→ 401；
/// JWT 通道下设备不存在 → 404（与原行为一致，避免枚举设备存在性）。
pub async fn report_device_location(
    State(db): State<Db>,
    State(ws_manager): State<SharedWebSocketManager>,
    State(auth_state): State<AuthState>,
    headers: HeaderMap,
    Path(device_code): Path<String>,
    Json(payload): Json<UpdateDeviceLocation>,
) -> ApiResponse<DeviceLocationRecord> {
    // 本报文路由（/devices/{device_code}/report）是 public，没有 tenant_middleware 提供的请求级事务；
    // 设备凭证通道由本 handler 自行校验（device_code + device_token），记录租户取设备归属租户，
    // 故走系统通道（nil 租户 + app.rls_system='on'），与 unified-core 的无请求上下文入口一致。
    let mut scope = match db.scope_system().await {
        Ok(s) => s,
        Err(e) => return ApiResponse::from(TopemsError::internal("数据库连接失败", e)),
    };
    // 1) 双通道认证解析出设备行
    let device = if let Some(Ok(token)) = headers.get("X-Device-Token").map(|v| v.to_str()) {
        // 1a) 设备级凭证通道：sha256(hex) 比对存储摘要列
        let digest = sha256_token_hex(token);
        match sqlx::query_as::<_, Device>(
            only_own_schema_query!("gis", "SELECT id, tenant_id, device_code, device_name, device_type, description, properties, status, registered_by, created_at, updated_at FROM gis.devices WHERE deleted_at IS NULL AND device_code = $1 AND device_token = $2"),
        )
        .bind(&device_code)
        .bind(&digest)
        .fetch_one(&mut scope)
        .await
        {
            Ok(d) => d,
            Err(sqlx::Error::RowNotFound) => {
                return ApiResponse::unauthorized("未认证：设备凭证无效");
            }
            Err(e) => {
                return ApiResponse::from(TopemsError::internal("查询设备失败", e));
            }
        }
    } else {
        // 1b) 用户 JWT 通道（原 P1-22 逻辑）
        let jwt = headers
            .get(axum::http::header::AUTHORIZATION)
            .and_then(|v| v.to_str().ok())
            .and_then(|h| h.strip_prefix("Bearer "))
            .map(str::to_string);
        let Some(jwt) = jwt else {
            return ApiResponse::unauthorized(
                "未认证：缺少 Authorization Bearer token 或 X-Device-Token",
            );
        };
        let claims = match verify_jwt_token(&jwt, &auth_state.jwt_secret) {
            Ok(claims) => claims,
            Err(_) => return ApiResponse::unauthorized("未认证：token 无效或已过期"),
        };

        // 2) 查设备（deleted_at 过滤）
        match sqlx::query_as::<_, Device>(
            only_own_schema_query!("gis", "SELECT id, tenant_id, device_code, device_name, device_type, description, properties, status, registered_by, created_at, updated_at FROM gis.devices WHERE deleted_at IS NULL AND device_code = $1"),
        )
        .bind(&device_code)
        .fetch_one(&mut scope)
        .await
        {
            Ok(d) => {
                // 租户归属校验（超管豁免）；凭证通道不适用（设备即本人）
                if !claims.is_superuser {
                    let claim_tenant = claims
                        .tenant_id
                        .as_deref()
                        .and_then(|t| Uuid::parse_str(t).ok());
                    let owned = match claim_tenant {
                        Some(t) => t == d.tenant_id,
                        None => false,
                    };
                    if !owned {
                        return ApiResponse::forbidden("无权上报该租户的设备");
                    }
                }
                d
            }
            Err(sqlx::Error::RowNotFound) => {
                return ApiResponse::not_found("设备未找到");
            }
            Err(e) => {
                return ApiResponse::from(TopemsError::internal("查询设备失败", e));
            }
        }
    };

    // 3) 两通道共用：状态启用校验（在租户/凭证校验之后）
    if device.status != "active" {
        return ApiResponse::forbidden("设备未启用，禁止上报");
    }

    // 4) 写入上报记录并广播（租户取设备归属租户）
    let result = sqlx::query_as::<_, DeviceLocationRecord>(
        only_own_schema_query!("gis", r#"
        INSERT INTO gis.device_location_records
        (device_id, tenant_id, position, accuracy, speed, direction, altitude, battery_level, signal_strength)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
        "#),
    )
    .bind(device.id)
    .bind(device.tenant_id)
    .bind(&payload.position)
    .bind(&payload.accuracy)
    .bind(&payload.speed)
    .bind(&payload.direction)
    .bind(&payload.altitude)
    .bind(&payload.battery_level)
    .bind(&payload.signal_strength)
    .fetch_one(&mut scope)
    .await;
    let commit_res = match &result {
        Ok(_) => scope.commit().await,
        Err(_) => Ok(()),
    };
    if let Err(e) = commit_res {
        return ApiResponse::from(TopemsError::internal("事务提交失败", e));
    }
    match result {
        Ok(record) => {
            let ws_msg = WebSocketMessage::LocationUpdate {
                device_code: device.device_code.clone(),
                device_name: device.device_name.clone(),
                position: payload.position.clone(),
                timestamp: record.recorded_at.to_rfc3339(),
                status: device.status.clone(),
            };
            ws_manager.broadcast_location_update(ws_msg).await;
            ApiResponse::success(record, "上报位置成功")
        }
        Err(e) => ApiResponse::from(TopemsError::internal("上报位置失败", e)),
    }
}

#[cfg(test)]
mod device_token_tests {
    use super::sha256_token_hex;

    #[test]
    fn sha256_hex_known_vector() {
        // 已知向量：sha256("abc") = ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad
        assert_eq!(
            sha256_token_hex("abc"),
            "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
        );
        // 空串向量
        assert_eq!(
            sha256_token_hex(""),
            "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
        );
        // 稳定 + 64 hex 字符
        let h = sha256_token_hex("device-secret-token");
        assert_eq!(h.len(), 64);
        assert_eq!(h, sha256_token_hex("device-secret-token"));
        assert_ne!(h, sha256_token_hex("device-secret-token2"));
    }
}
