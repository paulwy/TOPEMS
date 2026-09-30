//! TMS 运输管理系统模块 API 处理器

use axum::{
    extract::{Query, State},
    Json,
};
use serde::Deserialize;
use sqlx::Row;

use crate::AppState;

#[derive(Debug, Deserialize)]
pub struct ListParams {
    #[serde(default)]
    pub page: Option<u32>,
    #[serde(default)]
    pub page_size: Option<u32>,
}

/// 获取承运人列表（真实数据库查询）
pub async fn list_carriers(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    // 从数据库查询承运人列表
    let carriers = sqlx::query(
        r#"
        SELECT id, name, contact_person, contact_phone, status, created_at
        FROM tms.tms_carriers
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
        "#,
    )
    .bind(page_size as i64)
    .bind(offset as i64)
    .fetch_all(&state.pool)
    .await;

    // 查询总数
    let total_row = sqlx::query(
        r#"
        SELECT COUNT(*) as count
        FROM tms.tms_carriers
        "#,
    )
    .fetch_one(&state.pool)
    .await;

    match (carriers, total_row) {
        (Ok(rows), Ok(total_row)) => {
            let total: i64 = total_row.get("count");
            let data: Vec<serde_json::Value> = rows
                .iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.get::<uuid::Uuid, _>("id").to_string(),
                        "name": r.get::<String, _>("name"),
                        "contactPerson": r.get::<Option<String>, _>("contact_person"),
                        "phone": r.get::<Option<String>, _>("contact_phone"),
                        "status": r.get::<Option<String>, _>("status"),
                        "createdAt": r.get::<Option<chrono::DateTime<chrono::Utc>>, _>("created_at").map(|d| d.to_rfc3339()),
                    })
                })
                .collect();

            Json(serde_json::json!({
                "code": 200,
                "message": "成功",
                "data": {
                    "list": data,
                    "total": total,
                    "page": page,
                    "pageSize": page_size
                }
            }))
        }
        (Err(e), _) | (_, Err(e)) => {
            tracing::error!("Failed to query tms carriers: {}", e);
            Json(serde_json::json!({
                "code": 500,
                "message": format!("获取承运人列表失败: {}", e),
                "data": null
            }))
        }
    }
}

/// 获取司机列表（真实数据库查询）
pub async fn list_drivers(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    // 从数据库查询司机列表
    let drivers = sqlx::query(
        r#"
        SELECT id, name, license_no, phone, status, created_at
        FROM tms.tms_drivers
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
        "#,
    )
    .bind(page_size as i64)
    .bind(offset as i64)
    .fetch_all(&state.pool)
    .await;

    // 查询总数
    let total_row = sqlx::query(
        r#"
        SELECT COUNT(*) as count
        FROM tms.tms_drivers
        "#,
    )
    .fetch_one(&state.pool)
    .await;

    match (drivers, total_row) {
        (Ok(rows), Ok(total_row)) => {
            let total: i64 = total_row.get("count");
            let data: Vec<serde_json::Value> = rows
                .iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.get::<uuid::Uuid, _>("id").to_string(),
                        "name": r.get::<String, _>("name"),
                        "licenseNumber": r.get::<Option<String>, _>("license_no"),
                        "phone": r.get::<Option<String>, _>("phone"),
                        "status": r.get::<Option<String>, _>("status"),
                        "createdAt": r.get::<Option<chrono::DateTime<chrono::Utc>>, _>("created_at").map(|d| d.to_rfc3339()),
                    })
                })
                .collect();

            Json(serde_json::json!({
                "code": 200,
                "message": "成功",
                "data": {
                    "list": data,
                    "total": total,
                    "page": page,
                    "pageSize": page_size
                }
            }))
        }
        (Err(e), _) | (_, Err(e)) => {
            tracing::error!("Failed to query tms drivers: {}", e);
            Json(serde_json::json!({
                "code": 500,
                "message": format!("获取司机列表失败: {}", e),
                "data": null
            }))
        }
    }
}

/// 获取路线列表（真实数据库查询）
pub async fn list_routes(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    // 从数据库查询路线列表
    let routes = sqlx::query(
        r#"
        SELECT id, name, origin, destination, distance_km, created_at
        FROM tms.tms_routes
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
        "#,
    )
    .bind(page_size as i64)
    .bind(offset as i64)
    .fetch_all(&state.pool)
    .await;

    // 查询总数
    let total_row = sqlx::query(
        r#"
        SELECT COUNT(*) as count
        FROM tms.tms_routes
        "#,
    )
    .fetch_one(&state.pool)
    .await;

    match (routes, total_row) {
        (Ok(rows), Ok(total_row)) => {
            let total: i64 = total_row.get("count");
            let data: Vec<serde_json::Value> = rows
                .iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.get::<uuid::Uuid, _>("id").to_string(),
                        "name": r.get::<Option<String>, _>("name"),
                        "origin": r.get::<String, _>("origin"),
                        "destination": r.get::<String, _>("destination"),
                        "distance": r.get::<Option<rust_decimal::Decimal>, _>("distance_km").map(|d| d.to_string()),
                        "createdAt": r.get::<Option<chrono::DateTime<chrono::Utc>>, _>("created_at").map(|d| d.to_rfc3339()),
                    })
                })
                .collect();

            Json(serde_json::json!({
                "code": 200,
                "message": "成功",
                "data": {
                    "list": data,
                    "total": total,
                    "page": page,
                    "pageSize": page_size
                }
            }))
        }
        (Err(e), _) | (_, Err(e)) => {
            tracing::error!("Failed to query tms routes: {}", e);
            Json(serde_json::json!({
                "code": 500,
                "message": format!("获取路线列表失败: {}", e),
                "data": null
            }))
        }
    }
}

/// 获取货运列表（真实数据库查询）
pub async fn list_shipments(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    // 从数据库查询货运列表
    let shipments = sqlx::query(
        r#"
        SELECT id, shipment_no, carrier_id, driver_id, vehicle_id, status, created_at
        FROM tms.tms_shipments
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
        "#,
    )
    .bind(page_size as i64)
    .bind(offset as i64)
    .fetch_all(&state.pool)
    .await;

    // 查询总数
    let total_row = sqlx::query(
        r#"
        SELECT COUNT(*) as count
        FROM tms.tms_shipments
        "#,
    )
    .fetch_one(&state.pool)
    .await;

    match (shipments, total_row) {
        (Ok(rows), Ok(total_row)) => {
            let total: i64 = total_row.get("count");
            let data: Vec<serde_json::Value> = rows
                .iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.get::<uuid::Uuid, _>("id").to_string(),
                        "shipmentNo": r.get::<String, _>("shipment_no"),
                        "carrierId": r.get::<uuid::Uuid, _>("carrier_id").to_string(),
                        "driverId": r.get::<uuid::Uuid, _>("driver_id").to_string(),
                        "vehicleId": r.get::<uuid::Uuid, _>("vehicle_id").to_string(),
                        "status": r.get::<Option<String>, _>("status"),
                        "createdAt": r.get::<Option<chrono::DateTime<chrono::Utc>>, _>("created_at").map(|d| d.to_rfc3339()),
                    })
                })
                .collect();

            Json(serde_json::json!({
                "code": 200,
                "message": "成功",
                "data": {
                    "list": data,
                    "total": total,
                    "page": page,
                    "pageSize": page_size
                }
            }))
        }
        (Err(e), _) | (_, Err(e)) => {
            tracing::error!("Failed to query tms shipments: {}", e);
            Json(serde_json::json!({
                "code": 500,
                "message": format!("获取货运列表失败: {}", e),
                "data": null
            }))
        }
    }
}

/// 获取车辆列表（真实数据库查询）
pub async fn list_vehicles(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    // 从数据库查询车辆列表
    let vehicles = sqlx::query(
        r#"
        SELECT id, plate_number, vehicle_type, status, created_at
        FROM tms.tms_vehicles
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
        "#,
    )
    .bind(page_size as i64)
    .bind(offset as i64)
    .fetch_all(&state.pool)
    .await;

    // 查询总数
    let total_row = sqlx::query(
        r#"
        SELECT COUNT(*) as count
        FROM tms.tms_vehicles
        "#,
    )
    .fetch_one(&state.pool)
    .await;

    match (vehicles, total_row) {
        (Ok(rows), Ok(total_row)) => {
            let total: i64 = total_row.get("count");
            let data: Vec<serde_json::Value> = rows
                .iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.get::<uuid::Uuid, _>("id").to_string(),
                        "plateNumber": r.get::<Option<String>, _>("plate_number"),
                        "model": r.get::<Option<String>, _>("vehicle_type"),
                        "status": r.get::<Option<String>, _>("status"),
                        "createdAt": r.get::<Option<chrono::DateTime<chrono::Utc>>, _>("created_at").map(|d| d.to_rfc3339()),
                    })
                })
                .collect();

            Json(serde_json::json!({
                "code": 200,
                "message": "成功",
                "data": {
                    "list": data,
                    "total": total,
                    "page": page,
                    "pageSize": page_size
                }
            }))
        }
        (Err(e), _) | (_, Err(e)) => {
            tracing::error!("Failed to query tms vehicles: {}", e);
            Json(serde_json::json!({
                "code": 500,
                "message": format!("获取车辆列表失败: {}", e),
                "data": null
            }))
        }
    }
}
