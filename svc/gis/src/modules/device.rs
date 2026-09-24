#![allow(clippy::needless_borrows_for_generic_args)]
#![allow(dead_code)]

use crate::models::{Device, DeviceLocationRecord};
use crate::modules::websocket::{SharedWebSocketManager, WebSocketMessage};
use crate::shared::permission::{check_permission, GisPermission};
use axum::{
    extract::{Extension, Path, Query, State},
    Json,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use topems_shared_auth::auth::Claims;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::{response::ApiResponse, TopemsError};
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

/// 注册设备
pub async fn register_device(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<RegisterDevice>,
) -> Json<ApiResponse<Device>> {
    if let Err(e) = check_permission(&pool, &claims, &GisPermission::DeviceLocationWrite).await {
        return e;
    }

    let tenant_id = topems_shared_auth::get_tenant_id_from_claims(&claims);
    match sqlx::query_as::<_, Device>(
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
    .fetch_one(&pool)
    .await
    {
        Ok(device) => Json(ApiResponse::success(device, "注册设备成功")),
        Err(e) => Json(ApiResponse::from(TopemsError::internal("注册设备失败", e))),
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
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    match sqlx::query_as::<_, Device>(only_own_schema_query!("gis", "SELECT id, tenant_id, device_code, device_name, device_type, description, properties, status, registered_by, created_at, updated_at FROM gis.devices WHERE ($1::uuid IS NULL OR tenant_id = $1) ORDER BY created_at DESC"))
        .bind(tenant_opt)
        .fetch_all(&pool)
        .await
    {
        Ok(devices) => Json(ApiResponse::success(
            serde_json::json!({
                "devices": devices,
                "total": devices.len()
            }),
            "获取设备列表成功",
        )),
        Err(e) => Json(ApiResponse::from(TopemsError::internal("查询失败", e))),
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
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Device>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    match sqlx::query_as::<_, Device>(
        only_own_schema_query!("gis", "SELECT id, tenant_id, device_code, device_name, device_type, description, properties, status, registered_by, created_at, updated_at FROM gis.devices WHERE deleted_at IS NULL AND id = $1 AND ($2::uuid IS NULL OR tenant_id = $2)"),
    )
    .bind(id)
    .bind(tenant_opt)
    .fetch_one(&pool)
    .await
    {
        Ok(device) => Json(ApiResponse::success(device, "获取设备成功")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(404, "设备未找到")),
        Err(e) => Json(ApiResponse::from(TopemsError::internal("查询失败", e))),
    }
}

/// 更新设备信息
pub async fn update_device(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateDevice>,
) -> Json<ApiResponse<Device>> {
    if let Err(e) = check_permission(&pool, &claims, &GisPermission::DeviceLocationWrite).await {
        return e;
    }

    match sqlx::query_as::<_, Device>(only_own_schema_query!(
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
    .fetch_one(&pool)
    .await
    {
        Ok(device) => Json(ApiResponse::success(device, "更新设备成功")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(404, "设备未找到")),
        Err(e) => Json(ApiResponse::from(TopemsError::internal("更新失败", e))),
    }
}

/// 删除设备
pub async fn delete_device(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<bool>> {
    if let Err(e) = check_permission(&pool, &claims, &GisPermission::DeviceLocationWrite).await {
        return e;
    }
    let tenant_id = topems_shared_auth::get_tenant_id_from_claims(&claims);

    match sqlx::query(only_own_schema_query!(
        "gis",
        "UPDATE gis.devices SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2"
    ))
    .bind(id)
    .bind(tenant_id)
    .execute(&pool)
    .await
    {
        Ok(result) => {
            if result.rows_affected() > 0 {
                Json(ApiResponse::success(true, "删除设备成功"))
            } else {
                Json(ApiResponse::error(404, "设备未找到"))
            }
        }
        Err(e) => Json(ApiResponse::from(TopemsError::internal("删除失败", e))),
    }
}

/// 更新设备位置
pub async fn update_device_location(
    State(pool): State<PgPool>,
    State(ws_manager): State<SharedWebSocketManager>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateDeviceLocation>,
) -> Json<ApiResponse<DeviceLocationRecord>> {
    if let Err(e) = check_permission(&pool, &claims, &GisPermission::DeviceLocationWrite).await {
        return e;
    }

    match sqlx::query_as::<_, Device>(only_own_schema_query!("gis", "SELECT id, tenant_id, device_code, device_name, device_type, description, properties, status, registered_by, created_at, updated_at FROM gis.devices WHERE deleted_at IS NULL AND id = $1"))
        .bind(id)
        .fetch_one(&pool)
        .await
    {
        Ok(device) => {
            match sqlx::query_as::<_, DeviceLocationRecord>(
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
            .fetch_one(&pool)
            .await
            {
                Ok(record) => {
                    let ws_msg = WebSocketMessage::LocationUpdate {
                        device_code: device.device_code.clone(),
                        device_name: device.device_name.clone(),
                        position: payload.position.clone(),
                        timestamp: record.recorded_at.to_rfc3339(),
                        status: device.status.clone(),
                    };
                    ws_manager.broadcast_location_update(ws_msg).await;
                    Json(ApiResponse::success(record, "更新设备位置成功"))
                }
                Err(e) => Json(ApiResponse::from(TopemsError::internal("更新位置失败", e))),
            }
        }
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(404, "设备未找到")),
        Err(e) => Json(ApiResponse::from(TopemsError::internal("查询设备失败", e))),
    }
}

/// 获取设备轨迹
pub async fn get_device_tracking(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    Query(query): Query<TrackingQuery>,
) -> Json<ApiResponse<serde_json::Value>> {
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

    match if query.start_time.is_some() && query.end_time.is_some() {
        sqlx::query_as::<_, DeviceLocationRecord>(sql)
            .bind(id)
            .bind(&query.start_time)
            .bind(&query.end_time)
            .bind(limit)
            .fetch_all(&pool)
            .await
    } else if query.start_time.is_some() {
        sqlx::query_as::<_, DeviceLocationRecord>(sql)
            .bind(id)
            .bind(&query.start_time)
            .bind(limit)
            .fetch_all(&pool)
            .await
    } else if query.end_time.is_some() {
        sqlx::query_as::<_, DeviceLocationRecord>(sql)
            .bind(id)
            .bind(&query.end_time)
            .bind(limit)
            .fetch_all(&pool)
            .await
    } else {
        sqlx::query_as::<_, DeviceLocationRecord>(sql)
            .bind(id)
            .bind(limit)
            .fetch_all(&pool)
            .await
    } {
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

            Json(ApiResponse::success(
                serde_json::json!({
                    "trajectory": trajectory,
                    "records": records,
                    "total": records.len()
                }),
                "获取设备轨迹成功",
            ))
        }
        Err(e) => Json(ApiResponse::from(TopemsError::internal("查询轨迹失败", e))),
    }
}

/// 获取设备历史位置
pub async fn get_device_history(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    Query(query): Query<TrackingQuery>,
) -> Json<ApiResponse<serde_json::Value>> {
    // Similar to tracking but returns all location records
    let limit = query.limit.unwrap_or(50);

    let sql = if query.start_time.is_some() && query.end_time.is_some() {
        "id, tenant_id, device_id, position, accuracy, speed, direction, altitude, battery_level, signal_strength, recorded_at, created_at FROM gis.device_location_records WHERE device_id = $1 AND recorded_at >= $2 AND recorded_at <= $3 ORDER BY recorded_at DESC LIMIT $4"
    } else {
        "id, tenant_id, device_id, position, accuracy, speed, direction, altitude, battery_level, signal_strength, recorded_at, created_at FROM gis.device_location_records WHERE device_id = $1 ORDER BY recorded_at DESC LIMIT $2"
    };

    match if query.start_time.is_some() && query.end_time.is_some() {
        sqlx::query_as::<_, DeviceLocationRecord>(sql)
            .bind(id)
            .bind(&query.start_time)
            .bind(&query.end_time)
            .bind(limit)
            .fetch_all(&pool)
            .await
    } else {
        sqlx::query_as::<_, DeviceLocationRecord>(sql)
            .bind(id)
            .bind(limit)
            .fetch_all(&pool)
            .await
    } {
        Ok(records) => {
            // Calculate statistics
            let total_records = records.len();
            let avg_speed =
                records.iter().filter_map(|r| r.speed).sum::<f64>() / total_records as f64;

            let avg_battery =
                records.iter().filter_map(|r| r.battery_level).sum::<i32>() / total_records as i32;

            Json(ApiResponse::success(
                serde_json::json!({
                    "records": records,
                    "total": total_records,
                    "statistics": {
                        "avg_speed": avg_speed,
                        "avg_battery": avg_battery
                    }
                }),
                "获取设备历史位置成功",
            ))
        }
        Err(e) => Json(ApiResponse::from(TopemsError::internal(
            "查询历史位置失败",
            e,
        ))),
    }
}

/// 通过 device_code 上报设备位置（设备端调用，无需用户认证）
pub async fn report_device_location(
    State(pool): State<PgPool>,
    State(ws_manager): State<SharedWebSocketManager>,
    Path(device_code): Path<String>,
    Json(payload): Json<UpdateDeviceLocation>,
) -> Json<ApiResponse<DeviceLocationRecord>> {
    match sqlx::query_as::<_, Device>(
        only_own_schema_query!("gis", "SELECT id, tenant_id, device_code, device_name, device_type, description, properties, status, registered_by, created_at, updated_at FROM gis.devices WHERE deleted_at IS NULL AND device_code = $1"),
    )
    .bind(&device_code)
    .fetch_one(&pool)
    .await
    {
        Ok(device) => {
            match sqlx::query_as::<_, DeviceLocationRecord>(
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
            .fetch_one(&pool)
            .await
            {
                Ok(record) => {
                    let ws_msg = WebSocketMessage::LocationUpdate {
                        device_code: device.device_code.clone(),
                        device_name: device.device_name.clone(),
                        position: payload.position.clone(),
                        timestamp: record.recorded_at.to_rfc3339(),
                        status: device.status.clone(),
                    };
                    ws_manager.broadcast_location_update(ws_msg).await;
                    Json(ApiResponse::success(record, "上报位置成功"))
                }
                Err(e) => Json(ApiResponse::from(TopemsError::internal("上报位置失败", e))),
            }
        }
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(404, "设备未找到")),
        Err(e) => Json(ApiResponse::from(TopemsError::internal("查询设备失败", e))),
    }
}
