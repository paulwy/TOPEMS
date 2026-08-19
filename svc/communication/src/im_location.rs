use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, PgPool, Row};
use uuid::Uuid;

use topems_shared_core::response::ApiResponse;

/// 使用 Haversine 公式计算两点间球面距离（公里）
pub fn haversine_distance(lat1: f64, lon1: f64, lat2: f64, lon2: f64) -> f64 {
    const EARTH_RADIUS_KM: f64 = 6371.0;
    let to_rad = |deg: f64| deg * std::f64::consts::PI / 180.0;
    let dlat = to_rad(lat2 - lat1);
    let dlon = to_rad(lon2 - lon1);
    let a = (dlat / 2.0).sin().powi(2)
        + to_rad(lat1).cos() * to_rad(lat2).cos() * (dlon / 2.0).sin().powi(2);
    let c = 2.0 * a.sqrt().asin();
    EARTH_RADIUS_KM * c
}

/// 判断点是否在以 center 为圆心、radius_km 为半径的圆形地理围栏内
pub fn is_within_geofence(
    lat: f64,
    lon: f64,
    center_lat: f64,
    center_lon: f64,
    radius_km: f64,
) -> bool {
    if radius_km < 0.0 {
        return false;
    }
    haversine_distance(lat, lon, center_lat, center_lon) <= radius_km
}

/// 从 JSON 坐标对象解析 (lat, lon)，支持 lat/lng、lat/lon 及全名键
pub fn parse_coordinates(coords: &serde_json::Value) -> Option<(f64, f64)> {
    let obj = coords.as_object()?;
    let lat = obj
        .get("lat")
        .or_else(|| obj.get("latitude"))
        .and_then(|v| v.as_f64())?;
    let lon = obj
        .get("lng")
        .or_else(|| obj.get("lon"))
        .or_else(|| obj.get("longitude"))
        .and_then(|v| v.as_f64())?;
    Some((lat, lon))
}

#[derive(Debug, FromRow, Serialize, Deserialize)]
pub struct LocationMessage {
    pub id: Uuid,
    pub chat_id: Uuid,
    pub sender_id: Uuid,
    pub sender_name: Option<String>,
    pub location_type: String,
    pub coordinates: serde_json::Value,
    pub address: Option<String>,
    pub place_name: Option<String>,
    pub place_id: Option<String>,
    pub gis_location_id: Option<Uuid>,
    pub gis_location_code: Option<String>,
    pub gis_map_id: Option<Uuid>,
    pub gis_map_name: Option<String>,
    pub map_provider: String,
    pub static_map_url: Option<String>,
    pub map_zoom: i32,
    pub map_bearing: Option<f64>,
    pub map_tilt: Option<f64>,
    pub poi_types: Option<Vec<String>>,
    pub description: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
pub struct SendLocationRequest {
    pub chat_id: Uuid,
    pub location_type: String,
    pub coordinates: serde_json::Value,
    pub place_name: Option<String>,
    pub place_id: Option<String>,
    pub gis_location_id: Option<Uuid>,
    pub gis_map_id: Option<Uuid>,
    pub address: Option<String>,
    pub description: Option<String>,
    pub map_provider: Option<String>,
    pub static_map: Option<bool>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct ImGeofence {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub chat_id: Uuid,
    pub creator_id: Uuid,
    pub creator_name: Option<String>,
    pub shape_type: String,
    pub coordinates: serde_json::Value,
    pub radius: Option<f64>,
    pub event_types: serde_json::Value,
    pub status: String,
    pub trigger_cooldown: i32,
    pub notify_channels: serde_json::Value,
    pub notify_users: serde_json::Value,
    pub gis_fence_id: Option<Uuid>,
    pub start_at: Option<chrono::DateTime<chrono::Utc>>,
    pub end_at: Option<chrono::DateTime<chrono::Utc>>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateImGeofenceRequest {
    pub name: String,
    pub description: Option<String>,
    pub chat_id: Uuid,
    pub shape_type: String,
    pub coordinates: serde_json::Value,
    pub radius: Option<f64>,
    pub event_types: Option<Vec<String>>,
    pub trigger_cooldown: Option<i32>,
    pub notify_channels: Option<Vec<String>>,
    pub notify_users: Option<Vec<String>>,
    pub sync_to_gis: Option<bool>,
    pub start_at: Option<chrono::DateTime<chrono::Utc>>,
    pub end_at: Option<chrono::DateTime<chrono::Utc>>,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
pub struct UpdateImGeofenceRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub coordinates: Option<serde_json::Value>,
    pub radius: Option<f64>,
    pub event_types: Option<Vec<String>>,
    pub status: Option<String>,
    pub sync_to_gis: Option<bool>,
    pub start_at: Option<chrono::DateTime<chrono::Utc>>,
    pub end_at: Option<chrono::DateTime<chrono::Utc>>,
}

#[derive(Debug, Deserialize)]
pub struct GeofenceQuery {
    pub chat_id: Option<String>,
    pub status: Option<String>,
    pub shape_type: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct GeofenceSyncResult {
    pub geofence: ImGeofence,
    pub gis_sync_status: String,
    pub gis_fence_id: Option<Uuid>,
    pub gis_error: Option<String>,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
pub struct SearchPoiRequest {
    pub keyword: String,
    pub coordinates: Option<serde_json::Value>,
    pub radius: Option<f64>,
    pub include_gis: Option<bool>,
    pub gis_types: Option<Vec<String>>,
}

#[derive(Debug, Serialize)]
pub struct UnifiedPoiItem {
    pub id: String,
    pub name: String,
    pub category: String,
    pub coordinates: serde_json::Value,
    pub address: Option<String>,
    pub map_provider: String,
    pub gis_location_id: Option<Uuid>,
}

#[derive(Debug, Serialize)]
pub struct UnifiedPoiResult {
    pub items: Vec<UnifiedPoiItem>,
    pub gis_results_count: i32,
    pub third_party_results_count: i32,
    pub total: i32,
    pub providers_used: Vec<String>,
}

pub async fn send_location_message(
    State(pool): State<PgPool>,
    Json(payload): Json<SendLocationRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    // 使用 parse_coordinates 校验坐标格式（必须为 {lat,lng}/{lat,lon}/全名键对象）
    let (lat, lon) = match parse_coordinates(&payload.coordinates) {
        Some(coords) => coords,
        None => {
            return Json(ApiResponse::error(
                StatusCode::BAD_REQUEST.as_u16(),
                "坐标格式无效：需要包含 lat/lng 或 lat/lon 或 latitude/longitude 的对象",
            ));
        }
    };

    let map_provider = payload.map_provider.unwrap_or_else(|| "osm".to_string());

    let msg = match sqlx::query_as::<_, LocationMessage>(
        r#"
        INSERT INTO core_location_messages (
            chat_id, sender_id, location_type, coordinates,
            address, place_name, place_id, gis_location_id,
            gis_map_id, map_provider, description
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
        "#,
    )
    .bind(&payload.chat_id)
    .bind(Uuid::nil())
    .bind(&payload.location_type)
    .bind(&payload.coordinates)
    .bind(&payload.address)
    .bind(&payload.place_name)
    .bind(&payload.place_id)
    .bind(payload.gis_location_id)
    .bind(payload.gis_map_id)
    .bind(&map_provider)
    .bind(&payload.description)
    .fetch_one(&pool)
    .await
    {
        Ok(msg) => msg,
        Err(e) => {
            tracing::error!("Failed to send location message: {}", e);
            return Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                &format!("发送位置消息失败: {}", e),
            ));
        }
    };

    // 检查该位置是否触发当前会话的活跃地理围栏（enter 事件）
    let geofence_alerts = check_geofence_triggers(&pool, &payload.chat_id, lat, lon).await;

    Json(ApiResponse::success(
        serde_json::json!({
            "message": msg,
            "geofence_alerts": geofence_alerts,
        }),
        "发送位置消息成功",
    ))
}

/// 查询会话的活跃围栏并判断 (lat, lon) 是否落入任一围栏
async fn check_geofence_triggers(
    pool: &PgPool,
    chat_id: &Uuid,
    lat: f64,
    lon: f64,
) -> Vec<serde_json::Value> {
    let geofences = match sqlx::query_as::<_, ImGeofence>(
        "SELECT * FROM core_geofences WHERE chat_id = $1 AND status = 'active'",
    )
    .bind(chat_id)
    .fetch_all(pool)
    .await
    {
        Ok(g) => g,
        Err(e) => {
            tracing::warn!("Failed to query geofences for chat {}: {}", chat_id, e);
            return Vec::new();
        }
    };

    geofences
        .into_iter()
        .filter_map(|gf| {
            let center = parse_coordinates(&gf.coordinates)?;
            let radius = gf.radius.unwrap_or(0.0);
            if is_within_geofence(lat, lon, center.0, center.1, radius) {
                let distance = haversine_distance(lat, lon, center.0, center.1);
                Some(serde_json::json!({
                    "geofence_id": gf.id,
                    "geofence_name": gf.name,
                    "event": "enter",
                    "distance_km": (distance * 100.0).round() / 100.0,
                }))
            } else {
                None
            }
        })
        .collect()
}

pub async fn list_location_messages(
    State(pool): State<PgPool>,
    Path(chat_id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    match sqlx::query_as::<_, LocationMessage>(
        "SELECT * FROM core_location_messages WHERE chat_id = $1 ORDER BY created_at DESC LIMIT 50",
    )
    .bind(chat_id)
    .fetch_all(&pool)
    .await
    {
        Ok(messages) => Json(ApiResponse::success(
            serde_json::json!({
                "items": messages,
                "total": messages.len()
            }),
            "获取位置消息列表成功",
        )),
        Err(e) => Json(ApiResponse::error(
            StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
            &format!("数据库查询失败: {}", e),
        )),
    }
}

pub async fn create_geofence(
    State(pool): State<PgPool>,
    Json(payload): Json<CreateImGeofenceRequest>,
) -> Json<ApiResponse<GeofenceSyncResult>> {
    let event_types = serde_json::json!(payload
        .event_types
        .unwrap_or_else(|| vec!["enter".to_string()]));
    let notify_channels = serde_json::json!(payload
        .notify_channels
        .unwrap_or_else(|| vec!["notification".to_string()]));
    let notify_users = serde_json::json!(payload.notify_users.unwrap_or_default());

    let created = match sqlx::query_as::<_, ImGeofence>(
        r#"
        INSERT INTO core_geofences (
            name, description, chat_id, creator_id, shape_type,
            coordinates, radius, event_types, trigger_cooldown,
            notify_channels, notify_users, status, start_at, end_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'active', $12, $13)
        RETURNING *
        "#,
    )
    .bind(&payload.name)
    .bind(&payload.description)
    .bind(&payload.chat_id)
    .bind(Uuid::nil())
    .bind(&payload.shape_type)
    .bind(&payload.coordinates)
    .bind(payload.radius)
    .bind(&event_types)
    .bind(payload.trigger_cooldown.unwrap_or(300))
    .bind(&notify_channels)
    .bind(&notify_users)
    .bind(payload.start_at)
    .bind(payload.end_at)
    .fetch_one(&pool)
    .await
    {
        Ok(g) => g,
        Err(e) => {
            tracing::error!("Failed to create geofence: {}", e);
            return Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                &format!("创建地理围栏失败: {}", e),
            ));
        }
    };

    let sync_to_gis = payload.sync_to_gis.unwrap_or(false);
    let mut sync_result = GeofenceSyncResult {
        geofence: created.clone(),
        gis_sync_status: "not_supported".to_string(),
        gis_fence_id: None,
        gis_error: None,
    };

    if sync_to_gis {
        match sync_geofence_to_gis_internal(&created).await {
            Ok(Some(gis_id)) => {
                sync_result.gis_sync_status = "synced".to_string();
                sync_result.gis_fence_id = Some(gis_id);

                let _ = sqlx::query("UPDATE core_geofences SET gis_fence_id = $1 WHERE id = $2")
                    .bind(gis_id)
                    .bind(created.id)
                    .execute(&pool)
                    .await;

                sync_result.geofence.gis_fence_id = Some(gis_id);
            }
            Ok(None) => {
                sync_result.gis_sync_status = "pending".to_string();
                sync_result.gis_error = Some("GIS 围栏服务尚未实现，待同步".to_string());
            }
            Err(e) => {
                sync_result.gis_sync_status = "failed".to_string();
                sync_result.gis_error = Some(format!("GIS 同步失败: {}", e));
            }
        }
    }

    Json(ApiResponse::success(sync_result, "创建地理围栏成功"))
}

pub async fn get_geofence(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<ImGeofence>> {
    match sqlx::query_as::<_, ImGeofence>("SELECT * FROM core_geofences WHERE id = $1")
        .bind(id)
        .fetch_one(&pool)
        .await
    {
        Ok(g) => Json(ApiResponse::success(g, "获取地理围栏成功")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(404, "地理围栏未找到")),
        Err(e) => Json(ApiResponse::error(
            StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
            &format!("数据库查询失败: {}", e),
        )),
    }
}

pub async fn list_geofences(
    State(pool): State<PgPool>,
    Query(params): Query<GeofenceQuery>,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut sql = String::from("SELECT * FROM core_geofences WHERE 1=1");
    let mut bind_chat_id: Option<Uuid> = None;
    let mut bind_status: Option<String> = None;
    let mut bind_shape_type: Option<String> = None;
    let mut placeholder_idx = 1usize;

    if let Some(ref chat_id_str) = params.chat_id {
        if let Ok(uid) = Uuid::parse_str(chat_id_str) {
            sql.push_str(&format!(" AND chat_id = ${placeholder_idx}"));
            bind_chat_id = Some(uid);
            placeholder_idx += 1;
        }
    }

    if let Some(ref status) = params.status {
        sql.push_str(&format!(" AND status = ${placeholder_idx}"));
        bind_status = Some(status.clone());
        placeholder_idx += 1;
    }

    if let Some(ref shape_type) = params.shape_type {
        sql.push_str(&format!(" AND shape_type = ${placeholder_idx}"));
        bind_shape_type = Some(shape_type.clone());
    }

    sql.push_str(" ORDER BY created_at DESC");

    let mut query = sqlx::query_as::<_, ImGeofence>(&sql);
    if let Some(uid) = bind_chat_id {
        query = query.bind(uid);
    }
    if let Some(ref st) = bind_status {
        query = query.bind(st);
    }
    if let Some(ref shp) = bind_shape_type {
        query = query.bind(shp);
    }

    let result = query.fetch_all(&pool).await;

    match result {
        Ok(geofences) => Json(ApiResponse::success(
            serde_json::json!({
                "items": geofences,
                "total": geofences.len()
            }),
            "获取地理围栏列表成功",
        )),
        Err(e) => Json(ApiResponse::error(
            StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
            &format!("数据库查询失败: {}", e),
        )),
    }
}

pub async fn update_geofence(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateImGeofenceRequest>,
) -> Json<ApiResponse<GeofenceSyncResult>> {
    let current =
        match sqlx::query_as::<_, ImGeofence>("SELECT * FROM core_geofences WHERE id = $1")
            .bind(id)
            .fetch_one(&pool)
            .await
        {
            Ok(g) => g,
            Err(sqlx::Error::RowNotFound) => {
                return Json(ApiResponse::error(404, "地理围栏未找到"));
            }
            Err(e) => {
                return Json(ApiResponse::error(
                    StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                    &format!("数据库查询失败: {}", e),
                ));
            }
        };

    let name = payload.name.unwrap_or(current.name);
    let description = payload.description.or(current.description);
    let coordinates = payload.coordinates.unwrap_or(current.coordinates);
    let radius = payload.radius.or(current.radius);
    let event_types = payload
        .event_types
        .map(|v| serde_json::json!(v))
        .unwrap_or(current.event_types);
    let status = payload.status.unwrap_or_else(|| current.status.clone());

    let updated = match sqlx::query_as::<_, ImGeofence>(
        r#"
        UPDATE core_geofences
        SET name = $1, description = $2, coordinates = $3, radius = $4,
            event_types = $5, status = $6, updated_at = NOW()
        WHERE id = $7
        RETURNING *
        "#,
    )
    .bind(&name)
    .bind(&description)
    .bind(&coordinates)
    .bind(radius)
    .bind(&event_types)
    .bind(&status)
    .bind(id)
    .fetch_one(&pool)
    .await
    {
        Ok(g) => g,
        Err(e) => {
            tracing::error!("Failed to update geofence: {}", e);
            return Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                &format!("数据库更新失败: {}", e),
            ));
        }
    };

    let sync_to_gis = payload.sync_to_gis.unwrap_or(false);
    let mut sync_result = GeofenceSyncResult {
        geofence: updated.clone(),
        gis_sync_status: "not_supported".to_string(),
        gis_fence_id: updated.gis_fence_id,
        gis_error: None,
    };

    if sync_to_gis {
        match sync_geofence_to_gis_internal(&updated).await {
            Ok(Some(gis_id)) => {
                sync_result.gis_sync_status = "synced".to_string();
                sync_result.gis_fence_id = Some(gis_id);
            }
            Ok(None) => {
                sync_result.gis_sync_status = "pending".to_string();
                sync_result.gis_error = Some("GIS 围栏服务尚未实现".to_string());
            }
            Err(e) => {
                sync_result.gis_sync_status = "failed".to_string();
                sync_result.gis_error = Some(format!("GIS 同步失败: {}", e));
            }
        }
    }

    Json(ApiResponse::success(sync_result, "更新地理围栏成功"))
}

pub async fn delete_geofence(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<bool>> {
    match sqlx::query("DELETE FROM core_geofences WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await
    {
        Ok(result) => {
            if result.rows_affected() > 0 {
                Json(ApiResponse::success(true, "删除地理围栏成功"))
            } else {
                Json(ApiResponse::error(404, "地理围栏未找到"))
            }
        }
        Err(e) => Json(ApiResponse::error(
            StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
            &format!("数据库删除失败: {}", e),
        )),
    }
}

pub async fn unified_search_pois(
    State(pool): State<PgPool>,
    Json(payload): Json<SearchPoiRequest>,
) -> Json<ApiResponse<UnifiedPoiResult>> {
    let mut items: Vec<UnifiedPoiItem> = Vec::new();
    let mut gis_count: i32 = 0;
    let mut third_party_count: i32 = 0;
    let mut providers: Vec<String> = Vec::new();

    let include_gis = payload.include_gis.unwrap_or(true);
    let keyword = format!("%{}%", payload.keyword);

    if include_gis {
        if let Ok(gis_results) = sqlx::query(
            "SELECT id, name, business_type, position, address FROM business_locations WHERE business_name ILIKE $1 OR business_code ILIKE $1",
        )
        .bind(&keyword)
        .fetch_all(&pool)
        .await
        {
            for row in gis_results {
                let id: Uuid = row.try_get("id").unwrap_or_default();
                let name: String = row.try_get("name").unwrap_or_default();
                let business_type: Option<String> = row.try_get("business_type").ok();
                let position: serde_json::Value = row.try_get("position").unwrap_or(serde_json::json!({}));
                let address: Option<String> = row.try_get("address").ok();

                items.push(UnifiedPoiItem {
                    id: format!("gis-{}", id),
                    name,
                    category: business_type.unwrap_or_else(|| "business".to_string()),
                    coordinates: position,
                    address,
                    map_provider: "gis".to_string(),
                    gis_location_id: Some(id),
                });
                gis_count += 1;
            }
        }

        if let Ok(warehouses) = sqlx::query(
            "SELECT id, warehouse_name, position FROM warehouse_locations WHERE warehouse_name ILIKE $1",
        )
        .bind(&keyword)
        .fetch_all(&pool)
        .await
        {
            for row in warehouses {
                let id: Uuid = row.try_get("id").unwrap_or_default();
                let name: String = row.try_get("warehouse_name").unwrap_or_default();
                let position: serde_json::Value = row.try_get("position").unwrap_or(serde_json::json!({}));

                items.push(UnifiedPoiItem {
                    id: format!("gis-{}", id),
                    name,
                    category: "warehouse".to_string(),
                    coordinates: position,
                    address: None,
                    map_provider: "gis".to_string(),
                    gis_location_id: Some(id),
                });
                gis_count += 1;
            }
        }

        if !providers.contains(&"gis".to_string()) {
            providers.push("gis".to_string());
        }
    }

    if let Ok(device_results) = sqlx::query(
        "SELECT id, device_name, position FROM device_locations WHERE device_name ILIKE $1 OR device_code ILIKE $1",
    )
    .bind(&keyword)
    .fetch_all(&pool)
    .await
    {
        for row in device_results {
            let id: Uuid = row.try_get("id").unwrap_or_default();
            let name: String = row.try_get("device_name").unwrap_or_default();
            let position: serde_json::Value = row.try_get("position").unwrap_or(serde_json::json!({}));

            items.push(UnifiedPoiItem {
                id: format!("device-{}", id),
                name,
                category: "device".to_string(),
                coordinates: position,
                address: None,
                map_provider: "gis".to_string(),
                gis_location_id: None,
            });
            third_party_count += 1;
        }
    }

    if !providers.contains(&"amap".to_string()) {
        providers.push("amap".to_string());
    }

    let result = UnifiedPoiResult {
        items,
        gis_results_count: gis_count,
        third_party_results_count: third_party_count,
        total: gis_count + third_party_count,
        providers_used: providers,
    };

    Json(ApiResponse::success(result, "POI 搜索完成"))
}

async fn sync_geofence_to_gis_internal(geofence: &ImGeofence) -> Result<Option<Uuid>, String> {
    let gis_service_url =
        std::env::var("GIS_SERVICE_URL").unwrap_or_else(|_| "http://localhost:8071".to_string());

    let client = reqwest::Client::new();

    let gis_fence_data = serde_json::json!({
        "name": geofence.name,
        "description": geofence.description,
        "shape_type": geofence.shape_type,
        "coordinates": geofence.coordinates,
        "radius": geofence.radius,
        "status": geofence.status,
    });

    let endpoint = if let Some(gis_id) = geofence.gis_fence_id {
        format!("{}/api/gis/fences/{}", gis_service_url, gis_id)
    } else {
        format!("{}/api/gis/fences", gis_service_url)
    };

    let response = if geofence.gis_fence_id.is_some() {
        client.put(&endpoint).json(&gis_fence_data).send().await
    } else {
        client.post(&endpoint).json(&gis_fence_data).send().await
    };

    match response {
        Ok(resp) => {
            if resp.status().is_success() {
                let body: serde_json::Value = resp.json().await.unwrap_or_default();
                let gis_id = body["data"]["id"]
                    .as_str()
                    .and_then(|s| Uuid::parse_str(s).ok());
                Ok(gis_id)
            } else {
                Err(format!("GIS 服务返回错误状态: {}", resp.status()))
            }
        }
        Err(e) => Err(format!("请求 GIS 服务失败: {}", e)),
    }
}

#[allow(dead_code)]
pub fn create_location_routes() -> Router<PgPool> {
    Router::new()
        // Location messages
        .route(
            "/locations/message",
            axum::routing::post(send_location_message),
        )
        .route(
            "/locations/rooms/{chat_id}/messages",
            axum::routing::get(list_location_messages),
        )
        // Geofence CRUD
        .route("/locations/geofences", axum::routing::post(create_geofence))
        .route("/locations/geofences", axum::routing::get(list_geofences))
        .route(
            "/locations/geofences/{id}",
            axum::routing::get(get_geofence),
        )
        .route(
            "/locations/geofences/{id}",
            axum::routing::put(update_geofence),
        )
        .route(
            "/locations/geofences/{id}",
            axum::routing::delete(delete_geofence),
        )
        // POI unified search
        .route("/pois/search", axum::routing::post(unified_search_pois))
}

pub async fn register_geofence_tables(pool: &PgPool) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_location_messages (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            chat_id UUID NOT NULL,
            sender_id UUID NOT NULL,
            sender_name VARCHAR(255),
            location_type VARCHAR(50) NOT NULL,
            coordinates JSONB NOT NULL,
            address TEXT,
            place_name VARCHAR(255),
            place_id VARCHAR(255),
            gis_location_id UUID,
            gis_location_code VARCHAR(100),
            gis_map_id UUID,
            gis_map_name VARCHAR(255),
            map_provider VARCHAR(50) NOT NULL DEFAULT 'osm',
            static_map_url TEXT,
            map_zoom INTEGER DEFAULT 15,
            map_bearing DOUBLE PRECISION,
            map_tilt DOUBLE PRECISION,
            poi_types JSONB,
            description TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_geofences (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(255) NOT NULL,
            description TEXT,
            chat_id UUID NOT NULL,
            creator_id UUID NOT NULL,
            creator_name VARCHAR(255),
            shape_type VARCHAR(50) NOT NULL,
            coordinates JSONB NOT NULL,
            radius DOUBLE PRECISION,
            event_types JSONB DEFAULT '["enter"]',
            status VARCHAR(50) NOT NULL DEFAULT 'active',
            trigger_cooldown INTEGER DEFAULT 300,
            notify_channels JSONB DEFAULT '["notification"]',
            notify_users JSONB DEFAULT '[]',
            gis_fence_id UUID,
            start_at TIMESTAMP WITH TIME ZONE,
            end_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_core_location_messages_chat ON core_location_messages(chat_id)",
    )
    .execute(pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_core_geofences_chat ON core_geofences(chat_id)")
        .execute(pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_core_geofences_status ON core_geofences(status)")
        .execute(pool)
        .await?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_haversine_distance_zero() {
        let d = haversine_distance(30.0, 120.0, 30.0, 120.0);
        assert!(d.abs() < 1e-6);
    }

    #[test]
    fn test_haversine_distance_known_route() {
        let d = haversine_distance(39.9042, 116.4074, 31.2304, 121.4737);
        assert!((d - 1067.0).abs() < 10.0, "distance was {}", d);
    }

    #[test]
    fn test_haversine_distance_symmetric() {
        let d1 = haversine_distance(10.0, 20.0, 30.0, 40.0);
        let d2 = haversine_distance(30.0, 40.0, 10.0, 20.0);
        assert!((d1 - d2).abs() < 1e-6);
    }

    #[test]
    fn test_haversine_distance_antipode() {
        let d = haversine_distance(0.0, 0.0, 0.0, 180.0);
        assert!((d - 20015.0).abs() < 50.0, "distance was {}", d);
    }

    #[test]
    fn test_haversine_distance_positive() {
        let d = haversine_distance(0.0, 0.0, 0.0, 1.0);
        assert!(d > 0.0);
    }

    #[test]
    fn test_haversine_distance_small_delta() {
        let d = haversine_distance(0.0, 0.0, 0.001, 0.0);
        assert!((d - 0.111).abs() < 0.01, "distance was {}", d);
    }

    #[test]
    fn test_is_within_geofence_inside() {
        assert!(is_within_geofence(30.0, 120.0, 30.0, 120.0, 1.0));
    }

    #[test]
    fn test_is_within_geofence_outside() {
        assert!(!is_within_geofence(30.0, 120.0, 35.0, 125.0, 1.0));
    }

    #[test]
    fn test_is_within_geofence_negative_radius() {
        assert!(!is_within_geofence(30.0, 120.0, 30.0, 120.0, -1.0));
    }

    #[test]
    fn test_is_within_geofence_zero_radius() {
        assert!(is_within_geofence(30.0, 120.0, 30.0, 120.0, 0.0));
        assert!(!is_within_geofence(30.001, 120.0, 30.0, 120.0, 0.0));
    }

    #[test]
    fn test_is_within_geofence_boundary() {
        assert!(is_within_geofence(31.0, 121.0, 31.0, 121.0, 100.0));
    }

    #[test]
    fn test_parse_coordinates_lat_lng() {
        let coords = json!({"lat": 30.0, "lng": 120.0});
        assert_eq!(parse_coordinates(&coords), Some((30.0, 120.0)));
    }

    #[test]
    fn test_parse_coordinates_lat_lon() {
        let coords = json!({"lat": 30.0, "lon": 120.0});
        assert_eq!(parse_coordinates(&coords), Some((30.0, 120.0)));
    }

    #[test]
    fn test_parse_coordinates_full_names() {
        let coords = json!({"latitude": 1.5, "longitude": 2.5});
        assert_eq!(parse_coordinates(&coords), Some((1.5, 2.5)));
    }

    #[test]
    fn test_parse_coordinates_missing_field() {
        let coords = json!({"lat": 30.0});
        assert_eq!(parse_coordinates(&coords), None);
    }

    #[test]
    fn test_parse_coordinates_not_object() {
        assert_eq!(parse_coordinates(&json!([1, 2])), None);
        assert_eq!(parse_coordinates(&json!("string")), None);
        assert_eq!(parse_coordinates(&json!(null)), None);
    }

    #[test]
    fn test_parse_coordinates_non_numeric() {
        let coords = json!({"lat": "30", "lng": 120.0});
        assert_eq!(parse_coordinates(&coords), None);
    }

    // ===== 结构体 serde 往返 / 构造测试 =====

    fn uid() -> Uuid {
        Uuid::parse_str("550e8400-e29b-41d4-a716-446655440000").unwrap()
    }

    #[test]
    fn test_location_message_serde_roundtrip() {
        let msg = LocationMessage {
            id: uid(),
            chat_id: uid(),
            sender_id: uid(),
            sender_name: Some("alice".to_string()),
            location_type: "point".to_string(),
            coordinates: json!({"lat": 30.0, "lng": 120.0}),
            address: Some("addr".to_string()),
            place_name: None,
            place_id: None,
            gis_location_id: None,
            gis_location_code: None,
            gis_map_id: None,
            gis_map_name: None,
            map_provider: "osm".to_string(),
            static_map_url: None,
            map_zoom: 15,
            map_bearing: None,
            map_tilt: None,
            poi_types: None,
            description: None,
            created_at: chrono::Utc::now(),
        };
        let v = serde_json::to_value(&msg).unwrap();
        let back: LocationMessage = serde_json::from_value(v).unwrap();
        assert_eq!(back.location_type, "point");
        assert_eq!(back.map_zoom, 15);
        assert_eq!(back.sender_name.as_deref(), Some("alice"));
    }

    #[test]
    fn test_im_geofence_serde_roundtrip() {
        let gf = ImGeofence {
            id: uid(),
            name: "fence1".to_string(),
            description: None,
            chat_id: uid(),
            creator_id: uid(),
            creator_name: None,
            shape_type: "circle".to_string(),
            coordinates: json!({"lat": 1.0, "lng": 2.0}),
            radius: Some(5.0),
            event_types: json!(["enter"]),
            status: "active".to_string(),
            trigger_cooldown: 300,
            notify_channels: json!(["notification"]),
            notify_users: json!([]),
            gis_fence_id: None,
            start_at: None,
            end_at: None,
            created_at: chrono::Utc::now(),
            updated_at: chrono::Utc::now(),
        };
        let v = serde_json::to_value(&gf).unwrap();
        let back: ImGeofence = serde_json::from_value(v.clone()).unwrap();
        assert_eq!(back.name, "fence1");
        assert_eq!(back.radius, Some(5.0));
        assert_eq!(back.status, "active");
        // clone 独立性
        let cloned = gf.clone();
        assert_eq!(cloned.shape_type, gf.shape_type);
    }

    #[test]
    fn test_send_location_request_deserialize() {
        let json = json!({
            "chat_id": uid(),
            "location_type": "point",
            "coordinates": {"lat": 1.0, "lng": 2.0},
            "place_name": "p",
            "place_id": null,
            "gis_location_id": null,
            "gis_map_id": null,
            "address": null,
            "description": null,
            "map_provider": "amap",
            "static_map": true
        });
        let req: SendLocationRequest = serde_json::from_value(json).unwrap();
        assert_eq!(req.location_type, "point");
        assert_eq!(req.map_provider.as_deref(), Some("amap"));
        assert_eq!(req.static_map, Some(true));
    }

    #[test]
    fn test_create_im_geofence_request_deserialize_minimal() {
        let json = json!({
            "name": "n",
            "chat_id": uid(),
            "shape_type": "circle",
            "coordinates": {"lat": 1.0, "lng": 2.0}
        });
        let req: CreateImGeofenceRequest = serde_json::from_value(json).unwrap();
        assert_eq!(req.name, "n");
        assert!(req.radius.is_none());
        assert!(req.event_types.is_none());
        assert!(req.trigger_cooldown.is_none());
    }

    #[test]
    fn test_update_im_geofence_request_all_none() {
        let req: UpdateImGeofenceRequest = serde_json::from_value(json!({})).unwrap();
        assert!(req.name.is_none());
        assert!(req.coordinates.is_none());
        assert!(req.status.is_none());
    }

    #[test]
    fn test_geofence_query_deserialize_all_none() {
        let req: GeofenceQuery = serde_json::from_value(json!({})).unwrap();
        assert!(req.chat_id.is_none());
        assert!(req.status.is_none());
        assert!(req.shape_type.is_none());
    }

    #[test]
    fn test_geofence_query_deserialize_full() {
        let json = json!({
            "chat_id": "550e8400-e29b-41d4-a716-446655440000",
            "status": "active",
            "shape_type": "circle"
        });
        let req: GeofenceQuery = serde_json::from_value(json).unwrap();
        assert_eq!(req.status.as_deref(), Some("active"));
        assert_eq!(req.shape_type.as_deref(), Some("circle"));
    }

    #[test]
    fn test_unified_poi_result_serialize() {
        let item = UnifiedPoiItem {
            id: "x".to_string(),
            name: "n".to_string(),
            category: "c".to_string(),
            coordinates: json!({"lat": 1.0, "lng": 2.0}),
            address: Some("a".to_string()),
            map_provider: "gis".to_string(),
            gis_location_id: Some(uid()),
        };
        let result = UnifiedPoiResult {
            items: vec![item],
            gis_results_count: 1,
            third_party_results_count: 0,
            total: 1,
            providers_used: vec!["gis".to_string()],
        };
        let v = serde_json::to_value(&result).unwrap();
        assert_eq!(v["total"], 1);
        assert_eq!(v["items"][0]["id"], "x");
        assert_eq!(v["providers_used"][0], "gis");
    }

    #[test]
    fn test_geofence_sync_result_serialize() {
        let gf = ImGeofence {
            id: uid(),
            name: "n".to_string(),
            description: None,
            chat_id: uid(),
            creator_id: uid(),
            creator_name: None,
            shape_type: "circle".to_string(),
            coordinates: json!({}),
            radius: None,
            event_types: json!([]),
            status: "active".to_string(),
            trigger_cooldown: 0,
            notify_channels: json!([]),
            notify_users: json!([]),
            gis_fence_id: None,
            start_at: None,
            end_at: None,
            created_at: chrono::Utc::now(),
            updated_at: chrono::Utc::now(),
        };
        let r = GeofenceSyncResult {
            geofence: gf,
            gis_sync_status: "synced".to_string(),
            gis_fence_id: Some(uid()),
            gis_error: None,
        };
        let v = serde_json::to_value(&r).unwrap();
        assert_eq!(v["gis_sync_status"], "synced");
        assert!(v["gis_fence_id"].is_string());
    }

    #[test]
    fn test_search_poi_request_deserialize() {
        let json = json!({
            "keyword": "coffee",
            "coordinates": {"lat": 1.0, "lng": 2.0},
            "radius": 3.0,
            "include_gis": true,
            "gis_types": ["cafe"]
        });
        let req: SearchPoiRequest = serde_json::from_value(json).unwrap();
        assert_eq!(req.keyword, "coffee");
        assert_eq!(req.radius, Some(3.0));
        assert_eq!(req.include_gis, Some(true));
    }

    #[test]
    fn test_create_location_routes_builds() {
        // 确保 Router 能正常构建（不 panic）
        let _router = create_location_routes();
    }
}
