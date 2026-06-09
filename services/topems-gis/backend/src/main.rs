use axum::{
    extract::{Path, State, Multipart, Extension},
    Json, Router,
    routing::get,
};
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use uuid::Uuid;
use anyhow::Result;
use axum::extract::FromRef;
use std::env;
use std::io::BufReader;
use sqlx::PgPool;
use csv::ReaderBuilder;
use axum_prometheus::PrometheusMetricLayer;
use prometheus::{default_registry, Gauge};

use topems_shared::{
    ApiResponse, AuthState, auth_middleware, create_cors_layer, init_logging,
    ServiceHealth, build_health_response, create_api_info_router,
    HealthStatus, DependencyHealth, check_http_health,
};
use topems_shared::auth::Claims;

mod db;
mod models;
mod services;
mod api;
use db::schema::init_tables;
use models::{FactoryMap, DeviceLocation, Pipeline, WarehouseLocation, LocationPhoto, BusinessLocation, MapMarker};
use services::permission::{check_permission, GisPermission};

#[derive(Debug, Clone, Serialize, Deserialize)]
struct CreateFactoryMap {
    pub name: String,
    pub code: String,
    pub map_type: String,
    pub file_url: String,
    pub bounds: Option<serde_json::Value>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct CreateDeviceLocation {
    pub map_id: Uuid,
    pub device_name: String,
    pub device_code: String,
    pub device_type: Option<String>,
    pub position: serde_json::Value,
    pub status: String,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct CreatePipeline {
    pub map_id: Uuid,
    pub name: String,
    pub code: String,
    pub pipeline_type: Option<String>,
    pub path: serde_json::Value,
    pub properties: Option<serde_json::Value>,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct CreateWarehouseLocation {
    pub map_id: Uuid,
    pub warehouse_name: String,
    pub zone: Option<String>,
    pub position: serde_json::Value,
    pub capacity: Option<i32>,
    pub usage_rate: Option<f64>,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct CreateLocationPhoto {
    pub map_id: Uuid,
    pub position: serde_json::Value,
    pub photo_url: String,
    pub description: Option<String>,
    pub taken_by: String,
    pub taken_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct CreateBusinessLocation {
    pub business_type: String,
    pub business_name: String,
    pub business_code: Option<String>,
    pub category: Option<String>,
    pub position: serde_json::Value,
    pub address: Option<String>,
    pub contact_person: Option<String>,
    pub contact_phone: Option<String>,
    pub capacity: Option<i32>,
    pub current_usage: Option<i32>,
    pub status: Option<String>,
    pub properties: Option<serde_json::Value>,
    pub description: Option<String>,
    pub external_id: Option<Uuid>,
    pub external_type: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct CreateMapMarker {
    pub marker_type: String,
    pub name: String,
    pub marker_style: Option<String>,
    pub position: serde_json::Value,
    pub icon_svg: Option<String>,
    pub color: Option<String>,
    pub size: Option<i32>,
    pub popup_content: Option<String>,
    pub click_action: Option<String>,
    pub action_data: Option<serde_json::Value>,
    pub visible: Option<bool>,
    pub z_index: Option<i32>,
}

#[derive(Clone)]
struct AppState {
    pool: PgPool,
    auth_state: AuthState,
}

impl FromRef<AppState> for AuthState {
    fn from_ref(state: &AppState) -> Self {
        state.auth_state.clone()
    }
}

impl FromRef<AppState> for PgPool {
    fn from_ref(state: &AppState) -> Self {
        state.pool.clone()
    }
}

async fn health_check(
    State(state): State<AppState>,
) -> Json<ApiResponse<String>> {
    let database_health = check_database_health(&state.pool).await;
    let iam_health = check_iam_health().await;

    let overall_status = if database_health.status == HealthStatus::Healthy
        && iam_health.status == HealthStatus::Healthy
    {
        HealthStatus::Healthy
    } else if database_health.status == HealthStatus::Unhealthy
        || iam_health.status == HealthStatus::Unhealthy
    {
        HealthStatus::Unhealthy
    } else {
        HealthStatus::Degraded
    };

    let status_str = match overall_status {
        HealthStatus::Healthy => "healthy".to_string(),
        HealthStatus::Degraded => "degraded".to_string(),
        HealthStatus::Unhealthy => "unhealthy".to_string(),
    };

    Json(ApiResponse::success(status_str, "健康检查"))
}

async fn health_check_detailed(
    State(state): State<AppState>,
) -> Json<ApiResponse<ServiceHealth>> {
    let dependencies = vec![
        check_database_health(&state.pool).await,
        check_iam_health().await,
    ];

    let all_healthy = dependencies
        .iter()
        .all(|d| d.status == HealthStatus::Healthy);
    let any_unhealthy = dependencies
        .iter()
        .any(|d| d.status == HealthStatus::Unhealthy);

    let overall_status = if all_healthy {
        HealthStatus::Healthy
    } else if any_unhealthy {
        HealthStatus::Unhealthy
    } else {
        HealthStatus::Degraded
    };

    let message = match overall_status {
        HealthStatus::Healthy => "所有服务运行正常",
        HealthStatus::Degraded => "部分服务存在问题",
        HealthStatus::Unhealthy => "存在关键服务故障",
    };

    let health = ServiceHealth::healthy_with_message("topems-gis", message)
        .with_dependencies(dependencies);

    Json(ApiResponse::success(health, "详细健康检查"))
}

async fn check_database_health(pool: &PgPool) -> DependencyHealth {
    match sqlx::query("SELECT 1")
        .execute(pool)
        .await
    {
        Ok(_) => DependencyHealth {
            name: "database".to_string(),
            status: HealthStatus::Healthy,
            message: "数据库连接正常".to_string(),
        },
        Err(e) => {
            tracing::error!("数据库健康检查失败: {}", e);
            DependencyHealth {
                name: "database".to_string(),
                status: HealthStatus::Unhealthy,
                message: format!("数据库连接失败: {}", e),
            }
        }
    }
}

async fn check_iam_health() -> DependencyHealth {
    let iam_url = std::env::var("IAM_SERVICE_URL")
        .unwrap_or_else(|_| "http://localhost:8000".to_string());
    let health_url = format!("{}/health", iam_url);

    match check_http_health(&health_url).await {
        Ok(status) => {
            let message = match status {
                HealthStatus::Healthy => "IAM 服务正常",
                HealthStatus::Degraded => "IAM 服务响应异常",
                HealthStatus::Unhealthy => "IAM 服务不可用",
            };
            DependencyHealth {
                name: "iam-service".to_string(),
                status,
                message: message.to_string(),
            }
        }
        Err(e) => {
            tracing::warn!("IAM 服务健康检查失败: {}", e);
            DependencyHealth {
                name: "iam-service".to_string(),
                status: HealthStatus::Degraded,
                message: format!("IAM 服务连接异常: {}", e),
            }
        }
    }
}

async fn list_factory_maps(State(state): State<AppState>) -> Json<ApiResponse<serde_json::Value>> {
    match sqlx::query_as::<_, FactoryMap>("SELECT * FROM factory_maps ORDER BY created_at DESC")
        .fetch_all(&state.pool)
        .await
    {
        Ok(maps) => Json(ApiResponse::success(
            serde_json::json!({
                "factory_maps": maps,
                "total": maps.len()
            }),
            "获取厂区地图列表成功",
        )),
        Err(e) => Json(ApiResponse::error(
            500,
            &format!("数据库查询失败: {}", e),
        )),
    }
}

async fn create_factory_map(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<CreateFactoryMap>,
) -> Json<ApiResponse<FactoryMap>> {
    if let Err(e) = check_permission(&state.pool, &claims, &GisPermission::FactoryMapWrite).await {
        return e;
    }
    match sqlx::query_as::<_, FactoryMap>(
        r#"
        INSERT INTO factory_maps (name, code, map_type, file_url, bounds, description)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
        "#,
    )
    .bind(&payload.name)
    .bind(&payload.code)
    .bind(&payload.map_type)
    .bind(&payload.file_url)
    .bind(&payload.bounds)
    .bind(&payload.description)
    .fetch_one(&state.pool)
    .await
    {
        Ok(map) => Json(ApiResponse::success(map, "创建厂区地图成功")),
        Err(e) => Json(ApiResponse::error(
            500,
            &format!("数据库插入失败: {}", e),
        )),
    }
}

async fn get_factory_map(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<FactoryMap>> {
    match sqlx::query_as::<_, FactoryMap>("SELECT * FROM factory_maps WHERE id = $1")
        .bind(id)
        .fetch_one(&state.pool)
        .await
    {
        Ok(map) => Json(ApiResponse::success(map, "获取厂区地图成功")),
        Err(sqlx::Error::RowNotFound) => {
            Json(ApiResponse::error(404, "厂区地图未找到"))
        }
        Err(e) => Json(ApiResponse::error(
            500,
            &format!("数据库查询失败: {}", e),
        )),
    }
}

async fn update_factory_map(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(payload): Json<CreateFactoryMap>,
) -> Json<ApiResponse<FactoryMap>> {
    if let Err(e) = check_permission(&state.pool, &claims, &GisPermission::FactoryMapWrite).await {
        return e;
    }
    match sqlx::query_as::<_, FactoryMap>(
        r#"
        UPDATE factory_maps 
        SET name = $1, code = $2, map_type = $3, file_url = $4, bounds = $5, description = $6, updated_at = NOW()
        WHERE id = $7
        RETURNING *
        "#,
    )
    .bind(&payload.name)
    .bind(&payload.code)
    .bind(&payload.map_type)
    .bind(&payload.file_url)
    .bind(&payload.bounds)
    .bind(&payload.description)
    .bind(id)
    .fetch_one(&state.pool)
    .await
    {
        Ok(map) => Json(ApiResponse::success(map, "更新厂区地图成功")),
        Err(sqlx::Error::RowNotFound) => {
            Json(ApiResponse::error(404, "厂区地图未找到"))
        }
        Err(e) => Json(ApiResponse::error(
            500,
            &format!("数据库更新失败: {}", e),
        )),
    }
}

async fn delete_factory_map(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<bool>> {
    if let Err(e) = check_permission(&state.pool, &claims, &GisPermission::FactoryMapWrite).await {
        return e;
    }
    match sqlx::query("DELETE FROM factory_maps WHERE id = $1")
        .bind(id)
        .execute(&state.pool)
        .await
    {
        Ok(result) => {
            if result.rows_affected() > 0 {
                Json(ApiResponse::success(true, "删除厂区地图成功"))
            } else {
                Json(ApiResponse::error(404, "厂区地图未找到"))
            }
        }
        Err(e) => Json(ApiResponse::error(
            500,
            &format!("数据库删除失败: {}", e),
        )),
    }
}

async fn list_device_locations(State(state): State<AppState>) -> Json<ApiResponse<serde_json::Value>> {
    match sqlx::query_as::<_, DeviceLocation>("SELECT * FROM device_locations ORDER BY created_at DESC")
        .fetch_all(&state.pool)
        .await
    {
        Ok(locations) => Json(ApiResponse::success(
            serde_json::json!({
                "device_locations": locations,
                "total": locations.len()
            }),
            "获取设备位置列表成功",
        )),
        Err(e) => Json(ApiResponse::error(
            500,
            &format!("数据库查询失败: {}", e),
        )),
    }
}

async fn get_device_location(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<DeviceLocation>> {
    match sqlx::query_as::<_, DeviceLocation>("SELECT * FROM device_locations WHERE id = $1")
        .bind(id)
        .fetch_one(&state.pool)
        .await
    {
        Ok(location) => Json(ApiResponse::success(location, "获取设备位置成功")),
        Err(sqlx::Error::RowNotFound) => {
            Json(ApiResponse::error(404, "设备位置未找到"))
        }
        Err(e) => Json(ApiResponse::error(
            500,
            &format!("数据库查询失败: {}", e),
        )),
    }
}

async fn list_device_locations_by_map(
    State(state): State<AppState>,
    Path(map_id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    match sqlx::query_as::<_, DeviceLocation>("SELECT * FROM device_locations WHERE map_id = $1 ORDER BY created_at DESC")
        .bind(map_id)
        .fetch_all(&state.pool)
        .await
    {
        Ok(locations) => Json(ApiResponse::success(
            serde_json::json!({
                "device_locations": locations,
                "total": locations.len()
            }),
            "获取设备位置列表成功",
        )),
        Err(e) => Json(ApiResponse::error(
            500,
            &format!("数据库查询失败: {}", e),
        )),
    }
}

async fn create_device_location(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<CreateDeviceLocation>,
) -> Json<ApiResponse<DeviceLocation>> {
    if let Err(e) = check_permission(&state.pool, &claims, &GisPermission::DeviceLocationWrite).await {
        return e;
    }
    match sqlx::query_as::<_, DeviceLocation>(
        r#"
        INSERT INTO device_locations (map_id, device_name, device_code, device_type, position, status, description)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
        "#,
    )
    .bind(&payload.map_id)
    .bind(&payload.device_name)
    .bind(&payload.device_code)
    .bind(&payload.device_type)
    .bind(&payload.position)
    .bind(&payload.status)
    .bind(&payload.description)
    .fetch_one(&state.pool)
    .await
    {
        Ok(location) => Json(ApiResponse::success(location, "创建设备位置成功")),
        Err(e) => Json(ApiResponse::error(
            500,
            &format!("数据库插入失败: {}", e),
        )),
    }
}

async fn update_device_location(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(payload): Json<CreateDeviceLocation>,
) -> Json<ApiResponse<DeviceLocation>> {
    if let Err(e) = check_permission(&state.pool, &claims, &GisPermission::DeviceLocationWrite).await {
        return e;
    }
    match sqlx::query_as::<_, DeviceLocation>(
        r#"
        UPDATE device_locations 
        SET map_id = $1, device_name = $2, device_code = $3, device_type = $4, position = $5, status = $6, description = $7, updated_at = NOW()
        WHERE id = $8
        RETURNING *
        "#,
    )
    .bind(&payload.map_id)
    .bind(&payload.device_name)
    .bind(&payload.device_code)
    .bind(&payload.device_type)
    .bind(&payload.position)
    .bind(&payload.status)
    .bind(&payload.description)
    .bind(id)
    .fetch_one(&state.pool)
    .await
    {
        Ok(location) => Json(ApiResponse::success(location, "更新设备位置成功")),
        Err(sqlx::Error::RowNotFound) => {
            Json(ApiResponse::error(404, "设备位置未找到"))
        }
        Err(e) => Json(ApiResponse::error(
            500,
            &format!("数据库更新失败: {}", e),
        )),
    }
}

async fn delete_device_location(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<bool>> {
    if let Err(e) = check_permission(&state.pool, &claims, &GisPermission::DeviceLocationWrite).await {
        return e;
    }
    match sqlx::query("DELETE FROM device_locations WHERE id = $1")
        .bind(id)
        .execute(&state.pool)
        .await
    {
        Ok(result) => {
            if result.rows_affected() > 0 {
                Json(ApiResponse::success(true, "删除设备位置成功"))
            } else {
                Json(ApiResponse::error(404, "设备位置未找到"))
            }
        }
        Err(e) => Json(ApiResponse::error(
            500,
            &format!("数据库删除失败: {}", e),
        )),
    }
}

async fn list_pipelines(State(state): State<AppState>) -> Json<ApiResponse<serde_json::Value>> {
    match sqlx::query_as::<_, Pipeline>("SELECT * FROM pipelines ORDER BY created_at DESC")
        .fetch_all(&state.pool)
        .await
    {
        Ok(pipelines) => Json(ApiResponse::success(
            serde_json::json!({
                "pipelines": pipelines,
                "total": pipelines.len()
            }),
            "获取管道列表成功",
        )),
        Err(e) => Json(ApiResponse::error(
            500,
            &format!("数据库查询失败: {}", e),
        )),
    }
}

async fn get_pipeline(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Pipeline>> {
    match sqlx::query_as::<_, Pipeline>("SELECT * FROM pipelines WHERE id = $1")
        .bind(id)
        .fetch_one(&state.pool)
        .await
    {
        Ok(pipeline) => Json(ApiResponse::success(pipeline, "获取管道成功")),
        Err(sqlx::Error::RowNotFound) => {
            Json(ApiResponse::error(404, "管道未找到"))
        }
        Err(e) => Json(ApiResponse::error(
            500,
            &format!("数据库查询失败: {}", e),
        )),
    }
}

async fn list_pipelines_by_map(
    State(state): State<AppState>,
    Path(map_id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    match sqlx::query_as::<_, Pipeline>("SELECT * FROM pipelines WHERE map_id = $1 ORDER BY created_at DESC")
        .bind(map_id)
        .fetch_all(&state.pool)
        .await
    {
        Ok(pipelines) => Json(ApiResponse::success(
            serde_json::json!({
                "pipelines": pipelines,
                "total": pipelines.len()
            }),
            "获取管道列表成功",
        )),
        Err(e) => Json(ApiResponse::error(
            500,
            &format!("数据库查询失败: {}", e),
        )),
    }
}

async fn create_pipeline(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<CreatePipeline>,
) -> Json<ApiResponse<Pipeline>> {
    if let Err(e) = check_permission(&state.pool, &claims, &GisPermission::PipelineWrite).await {
        return e;
    }
    match sqlx::query_as::<_, Pipeline>(
        r#"
        INSERT INTO pipelines (map_id, name, code, pipeline_type, path, properties, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
        "#,
    )
    .bind(&payload.map_id)
    .bind(&payload.name)
    .bind(&payload.code)
    .bind(&payload.pipeline_type)
    .bind(&payload.path)
    .bind(&payload.properties)
    .bind(&payload.status)
    .fetch_one(&state.pool)
    .await
    {
        Ok(pipeline) => Json(ApiResponse::success(pipeline, "创建管道成功")),
        Err(e) => Json(ApiResponse::error(
            500,
            &format!("数据库插入失败: {}", e),
        )),
    }
}

async fn update_pipeline(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(payload): Json<CreatePipeline>,
) -> Json<ApiResponse<Pipeline>> {
    if let Err(e) = check_permission(&state.pool, &claims, &GisPermission::PipelineWrite).await {
        return e;
    }
    match sqlx::query_as::<_, Pipeline>(
        r#"
        UPDATE pipelines 
        SET map_id = $1, name = $2, code = $3, pipeline_type = $4, path = $5, properties = $6, status = $7, updated_at = NOW()
        WHERE id = $8
        RETURNING *
        "#,
    )
    .bind(&payload.map_id)
    .bind(&payload.name)
    .bind(&payload.code)
    .bind(&payload.pipeline_type)
    .bind(&payload.path)
    .bind(&payload.properties)
    .bind(&payload.status)
    .bind(id)
    .fetch_one(&state.pool)
    .await
    {
        Ok(pipeline) => Json(ApiResponse::success(pipeline, "更新管道成功")),
        Err(sqlx::Error::RowNotFound) => {
            Json(ApiResponse::error(404, "管道未找到"))
        }
        Err(e) => Json(ApiResponse::error(
            500,
            &format!("数据库更新失败: {}", e),
        )),
    }
}

async fn delete_pipeline(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<bool>> {
    if let Err(e) = check_permission(&state.pool, &claims, &GisPermission::PipelineWrite).await {
        return e;
    }
    match sqlx::query("DELETE FROM pipelines WHERE id = $1")
        .bind(id)
        .execute(&state.pool)
        .await
    {
        Ok(result) => {
            if result.rows_affected() > 0 {
                Json(ApiResponse::success(true, "删除管道成功"))
            } else {
                Json(ApiResponse::error(404, "管道未找到"))
            }
        }
        Err(e) => Json(ApiResponse::error(
            500,
            &format!("数据库删除失败: {}", e),
        )),
    }
}

async fn list_warehouse_locations(State(state): State<AppState>) -> Json<ApiResponse<serde_json::Value>> {
    match sqlx::query_as::<_, WarehouseLocation>("SELECT * FROM warehouse_locations ORDER BY created_at DESC")
        .fetch_all(&state.pool)
        .await
    {
        Ok(locations) => Json(ApiResponse::success(
            serde_json::json!({
                "warehouse_locations": locations,
                "total": locations.len()
            }),
            "获取仓库位置列表成功",
        )),
        Err(e) => Json(ApiResponse::error(
            500,
            &format!("数据库查询失败: {}", e),
        )),
    }
}

async fn get_warehouse_location(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<WarehouseLocation>> {
    match sqlx::query_as::<_, WarehouseLocation>("SELECT * FROM warehouse_locations WHERE id = $1")
        .bind(id)
        .fetch_one(&state.pool)
        .await
    {
        Ok(location) => Json(ApiResponse::success(location, "获取仓库位置成功")),
        Err(sqlx::Error::RowNotFound) => {
            Json(ApiResponse::error(404, "仓库位置未找到"))
        }
        Err(e) => Json(ApiResponse::error(
            500,
            &format!("数据库查询失败: {}", e),
        )),
    }
}

async fn list_warehouse_locations_by_map(
    State(state): State<AppState>,
    Path(map_id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    match sqlx::query_as::<_, WarehouseLocation>("SELECT * FROM warehouse_locations WHERE map_id = $1 ORDER BY created_at DESC")
        .bind(map_id)
        .fetch_all(&state.pool)
        .await
    {
        Ok(locations) => Json(ApiResponse::success(
            serde_json::json!({
                "warehouse_locations": locations,
                "total": locations.len()
            }),
            "获取仓库位置列表成功",
        )),
        Err(e) => Json(ApiResponse::error(
            500,
            &format!("数据库查询失败: {}", e),
        )),
    }
}

async fn create_warehouse_location(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<CreateWarehouseLocation>,
) -> Json<ApiResponse<WarehouseLocation>> {
    if let Err(e) = check_permission(&state.pool, &claims, &GisPermission::WarehouseLocationWrite).await {
        return e;
    }
    match sqlx::query_as::<_, WarehouseLocation>(
        r#"
        INSERT INTO warehouse_locations (map_id, warehouse_name, zone, position, capacity, usage_rate, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
        "#,
    )
    .bind(&payload.map_id)
    .bind(&payload.warehouse_name)
    .bind(&payload.zone)
    .bind(&payload.position)
    .bind(&payload.capacity)
    .bind(&payload.usage_rate)
    .bind(&payload.status)
    .fetch_one(&state.pool)
    .await
    {
        Ok(location) => Json(ApiResponse::success(location, "创建仓库位置成功")),
        Err(e) => Json(ApiResponse::error(
            500,
            &format!("数据库插入失败: {}", e),
        )),
    }
}

async fn update_warehouse_location(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(payload): Json<CreateWarehouseLocation>,
) -> Json<ApiResponse<WarehouseLocation>> {
    if let Err(e) = check_permission(&state.pool, &claims, &GisPermission::WarehouseLocationWrite).await {
        return e;
    }
    match sqlx::query_as::<_, WarehouseLocation>(
        r#"
        UPDATE warehouse_locations 
        SET map_id = $1, warehouse_name = $2, zone = $3, position = $4, capacity = $5, usage_rate = $6, status = $7, updated_at = NOW()
        WHERE id = $8
        RETURNING *
        "#,
    )
    .bind(&payload.map_id)
    .bind(&payload.warehouse_name)
    .bind(&payload.zone)
    .bind(&payload.position)
    .bind(&payload.capacity)
    .bind(&payload.usage_rate)
    .bind(&payload.status)
    .bind(id)
    .fetch_one(&state.pool)
    .await
    {
        Ok(location) => Json(ApiResponse::success(location, "更新仓库位置成功")),
        Err(sqlx::Error::RowNotFound) => {
            Json(ApiResponse::error(404, "仓库位置未找到"))
        }
        Err(e) => Json(ApiResponse::error(
            500,
            &format!("数据库更新失败: {}", e),
        )),
    }
}

async fn delete_warehouse_location(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<bool>> {
    if let Err(e) = check_permission(&state.pool, &claims, &GisPermission::WarehouseLocationWrite).await {
        return e;
    }
    match sqlx::query("DELETE FROM warehouse_locations WHERE id = $1")
        .bind(id)
        .execute(&state.pool)
        .await
    {
        Ok(result) => {
            if result.rows_affected() > 0 {
                Json(ApiResponse::success(true, "删除仓库位置成功"))
            } else {
                Json(ApiResponse::error(404, "仓库位置未找到"))
            }
        }
        Err(e) => Json(ApiResponse::error(
            500,
            &format!("数据库删除失败: {}", e),
        )),
    }
}

async fn list_location_photos(State(state): State<AppState>) -> Json<ApiResponse<serde_json::Value>> {
    match sqlx::query_as::<_, LocationPhoto>("SELECT * FROM location_photos ORDER BY created_at DESC")
        .fetch_all(&state.pool)
        .await
    {
        Ok(photos) => Json(ApiResponse::success(
            serde_json::json!({
                "location_photos": photos,
                "total": photos.len()
            }),
            "获取位置照片列表成功",
        )),
        Err(e) => Json(ApiResponse::error(
            500,
            &format!("数据库查询失败: {}", e),
        )),
    }
}

async fn get_location_photo(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<LocationPhoto>> {
    match sqlx::query_as::<_, LocationPhoto>("SELECT * FROM location_photos WHERE id = $1")
        .bind(id)
        .fetch_one(&state.pool)
        .await
    {
        Ok(photo) => Json(ApiResponse::success(photo, "获取位置照片成功")),
        Err(sqlx::Error::RowNotFound) => {
            Json(ApiResponse::error(404, "位置照片未找到"))
        }
        Err(e) => Json(ApiResponse::error(
            500,
            &format!("数据库查询失败: {}", e),
        )),
    }
}

async fn list_location_photos_by_map(
    State(state): State<AppState>,
    Path(map_id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    match sqlx::query_as::<_, LocationPhoto>("SELECT * FROM location_photos WHERE map_id = $1 ORDER BY created_at DESC")
        .bind(map_id)
        .fetch_all(&state.pool)
        .await
    {
        Ok(photos) => Json(ApiResponse::success(
            serde_json::json!({
                "location_photos": photos,
                "total": photos.len()
            }),
            "获取位置照片列表成功",
        )),
        Err(e) => Json(ApiResponse::error(
            500,
            &format!("数据库查询失败: {}", e),
        )),
    }
}

async fn create_location_photo(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<CreateLocationPhoto>,
) -> Json<ApiResponse<LocationPhoto>> {
    if let Err(e) = check_permission(&state.pool, &claims, &GisPermission::LocationPhotoWrite).await {
        return e;
    }
    let taken_at = payload.taken_at.unwrap_or_else(Utc::now);
    match sqlx::query_as::<_, LocationPhoto>(
        r#"
        INSERT INTO location_photos (map_id, position, photo_url, description, taken_by, taken_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
        "#,
    )
    .bind(&payload.map_id)
    .bind(&payload.position)
    .bind(&payload.photo_url)
    .bind(&payload.description)
    .bind(&payload.taken_by)
    .bind(taken_at)
    .fetch_one(&state.pool)
    .await
    {
        Ok(photo) => Json(ApiResponse::success(photo, "创建位置照片成功")),
        Err(e) => Json(ApiResponse::error(
            500,
            &format!("数据库插入失败: {}", e),
        )),
    }
}

async fn delete_location_photo(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<bool>> {
    if let Err(e) = check_permission(&state.pool, &claims, &GisPermission::LocationPhotoWrite).await {
        return e;
    }
    match sqlx::query("DELETE FROM location_photos WHERE id = $1")
        .bind(id)
        .execute(&state.pool)
        .await
    {
        Ok(result) => {
            if result.rows_affected() > 0 {
                Json(ApiResponse::success(true, "删除位置照片成功"))
            } else {
                Json(ApiResponse::error(404, "位置照片未找到"))
            }
        }
        Err(e) => Json(ApiResponse::error(
            500,
            &format!("数据库删除失败: {}", e),
        )),
    }
}

async fn import_data(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    mut multipart: Multipart,
) -> Json<ApiResponse<serde_json::Value>> {
    if let Err(e) = check_permission(&state.pool, &claims, &GisPermission::All).await {
        return e;
    }
    let mut file_data: Vec<u8> = Vec::new();
    let mut import_type: String = String::new();

    while let Some(field) = multipart.next_field().await.unwrap() {
        let name = field.name().unwrap_or("");
        if name == "file" {
            file_data = field.bytes().await.unwrap().to_vec();
        } else if name == "type" {
            import_type = field.text().await.unwrap();
        }
    }

    if file_data.is_empty() {
        return Json(ApiResponse::error(400, "请上传文件"));
    }

    if import_type.is_empty() {
        return Json(ApiResponse::error(400, "请指定导入类型"));
    }

    let mut reader = ReaderBuilder::new().from_reader(BufReader::new(file_data.as_slice()));
    let headers = match reader.headers() {
        Ok(h) => h.clone(),
        Err(e) => return Json(ApiResponse::error(400, &format!("解析文件失败: {}", e))),
    };

    let mut imported_count = 0;
    let mut errors: Vec<String> = Vec::new();

    for (i, result) in reader.records().enumerate() {
        match result {
            Ok(record) => {
                let row_num = i + 2;
                match import_type.as_str() {
                    "devicePoints" | "device_locations" => {
                        if let Err(e) = import_device_location_row(&state.pool, &record, &headers).await {
                            errors.push(format!("第{}行: {}", row_num, e));
                        } else {
                            imported_count += 1;
                        }
                    }
                    "pipelines" => {
                        if let Err(e) = import_pipeline_row(&state.pool, &record, &headers).await {
                            errors.push(format!("第{}行: {}", row_num, e));
                        } else {
                            imported_count += 1;
                        }
                    }
                    "storageLocations" | "warehouse_locations" => {
                        if let Err(e) = import_warehouse_location_row(&state.pool, &record, &headers).await {
                            errors.push(format!("第{}行: {}", row_num, e));
                        } else {
                            imported_count += 1;
                        }
                    }
                    _ => return Json(ApiResponse::error(400, "不支持的导入类型")),
                }
            }
            Err(e) => errors.push(format!("解析第{}行失败: {}", i + 2, e)),
        }
    }

    let message = format!("导入完成，成功导入{}条记录，失败{}条", imported_count, errors.len());
    Json(ApiResponse::success(
        serde_json::json!({
            "imported_count": imported_count,
            "error_count": errors.len(),
            "errors": errors
        }),
        &message,
    ))
}

async fn import_device_location_row(
    pool: &PgPool,
    record: &csv::StringRecord,
    headers: &csv::StringRecord,
) -> Result<(), String> {
    let name = get_field(record, headers, "name").ok_or("缺少name字段")?;
    let code = get_field(record, headers, "code").unwrap_or_default();
    let device_type = get_field(record, headers, "device_type");
    let lat_str = get_field(record, headers, "latitude").ok_or("缺少latitude字段")?;
    let lng_str = get_field(record, headers, "longitude").ok_or("缺少longitude字段")?;
    let status = get_field(record, headers, "status").unwrap_or("active".to_string());
    let description = get_field(record, headers, "description");

    let lat: f64 = lat_str.parse().map_err(|e| format!("latitude格式错误: {}", e))?;
    let lng: f64 = lng_str.parse().map_err(|e| format!("longitude格式错误: {}", e))?;

    let position = serde_json::json!({ "lat": lat, "lng": lng });

    let _ = sqlx::query(
        r#"
        INSERT INTO device_locations (map_id, device_name, device_code, device_type, position, status, description)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        "#,
    )
    .bind(Uuid::nil())
    .bind(name)
    .bind(code)
    .bind(device_type)
    .bind(position)
    .bind(status)
    .bind(description)
    .execute(pool)
    .await
    .map_err(|e| format!("插入失败: {}", e))?;

    Ok(())
}

async fn import_pipeline_row(
    pool: &PgPool,
    record: &csv::StringRecord,
    headers: &csv::StringRecord,
) -> Result<(), String> {
    let name = get_field(record, headers, "name").ok_or("缺少name字段")?;
    let code = get_field(record, headers, "code").unwrap_or_default();
    let pipeline_type = get_field(record, headers, "pipeline_type");
    let status = get_field(record, headers, "status").unwrap_or("active".to_string());

    let start_lat: f64 = get_field(record, headers, "start_lat")
        .ok_or("缺少start_lat字段")?
        .parse()
        .map_err(|e| format!("start_lat格式错误: {}", e))?;
    let start_lng: f64 = get_field(record, headers, "start_lng")
        .ok_or("缺少start_lng字段")?
        .parse()
        .map_err(|e| format!("start_lng格式错误: {}", e))?;
    let end_lat: f64 = get_field(record, headers, "end_lat")
        .ok_or("缺少end_lat字段")?
        .parse()
        .map_err(|e| format!("end_lat格式错误: {}", e))?;
    let end_lng: f64 = get_field(record, headers, "end_lng")
        .ok_or("缺少end_lng字段")?
        .parse()
        .map_err(|e| format!("end_lng格式错误: {}", e))?;

    let path = serde_json::json!([
        { "lat": start_lat, "lng": start_lng },
        { "lat": end_lat, "lng": end_lng }
    ]);

    let _ = sqlx::query(
        r#"
        INSERT INTO pipelines (map_id, name, code, pipeline_type, path, status)
        VALUES ($1, $2, $3, $4, $5, $6)
        "#,
    )
    .bind(Uuid::nil())
    .bind(name)
    .bind(code)
    .bind(pipeline_type)
    .bind(path)
    .bind(status)
    .execute(pool)
    .await
    .map_err(|e| format!("插入失败: {}", e))?;

    Ok(())
}

async fn import_warehouse_location_row(
    pool: &PgPool,
    record: &csv::StringRecord,
    headers: &csv::StringRecord,
) -> Result<(), String> {
    let name = get_field(record, headers, "name").ok_or("缺少name字段")?;
    let code = get_field(record, headers, "code").unwrap_or_default();
    let zone = get_field(record, headers, "zone");
    let lat_str = get_field(record, headers, "latitude").ok_or("缺少latitude字段")?;
    let lng_str = get_field(record, headers, "longitude").ok_or("缺少longitude字段")?;
    let status = get_field(record, headers, "status").unwrap_or("active".to_string());

    let lat: f64 = lat_str.parse().map_err(|e| format!("latitude格式错误: {}", e))?;
    let lng: f64 = lng_str.parse().map_err(|e| format!("longitude格式错误: {}", e))?;

    let capacity: Option<i32> = get_field(record, headers, "capacity")
        .and_then(|s| s.parse().ok());
    let usage_rate: Option<f64> = get_field(record, headers, "usage_rate")
        .and_then(|s| s.parse().ok());

    let position = serde_json::json!({ "lat": lat, "lng": lng });

    let _ = sqlx::query(
        r#"
        INSERT INTO warehouse_locations (map_id, warehouse_name, zone, position, capacity, usage_rate, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        "#,
    )
    .bind(Uuid::nil())
    .bind(name)
    .bind(zone)
    .bind(position)
    .bind(capacity)
    .bind(usage_rate)
    .bind(status)
    .execute(pool)
    .await
    .map_err(|e| format!("插入失败: {}", e))?;

    Ok(())
}

fn get_field(record: &csv::StringRecord, headers: &csv::StringRecord, name: &str) -> Option<String> {
    headers.iter().position(|h| h.eq_ignore_ascii_case(name))
        .and_then(|i| record.get(i))
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
}

// ==================== Business Locations API ====================

async fn list_business_locations(State(state): State<AppState>) -> Json<ApiResponse<serde_json::Value>> {
    match sqlx::query_as::<_, BusinessLocation>("SELECT * FROM business_locations ORDER BY created_at DESC")
        .fetch_all(&state.pool)
        .await
    {
        Ok(locations) => Json(ApiResponse::success(
            serde_json::json!({
                "business_locations": locations,
                "total": locations.len()
            }),
            "获取业务位置列表成功",
        )),
        Err(e) => Json(ApiResponse::error(500, &format!("数据库查询失败: {}", e))),
    }
}

async fn get_business_location(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<BusinessLocation>> {
    match sqlx::query_as::<_, BusinessLocation>("SELECT * FROM business_locations WHERE id = $1")
        .bind(id)
        .fetch_one(&state.pool)
        .await
    {
        Ok(location) => Json(ApiResponse::success(location, "获取业务位置成功")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(404, "业务位置未找到")),
        Err(e) => Json(ApiResponse::error(500, &format!("数据库查询失败: {}", e))),
    }
}

async fn list_business_locations_by_type(
    State(state): State<AppState>,
    Path(business_type): Path<String>,
) -> Json<ApiResponse<serde_json::Value>> {
    match sqlx::query_as::<_, BusinessLocation>("SELECT * FROM business_locations WHERE business_type = $1 ORDER BY created_at DESC")
        .bind(business_type)
        .fetch_all(&state.pool)
        .await
    {
        Ok(locations) => Json(ApiResponse::success(
            serde_json::json!({
                "business_locations": locations,
                "total": locations.len()
            }),
            "获取业务位置列表成功",
        )),
        Err(e) => Json(ApiResponse::error(500, &format!("数据库查询失败: {}", e))),
    }
}

async fn create_business_location(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<CreateBusinessLocation>,
) -> Json<ApiResponse<BusinessLocation>> {
    if let Err(e) = check_permission(&state.pool, &claims, &GisPermission::DeviceLocationWrite).await {
        return e;
    }
    match sqlx::query_as::<_, BusinessLocation>(
        r#"
        INSERT INTO business_locations (business_type, business_name, business_code, category, position, address, contact_person, contact_phone, capacity, current_usage, status, properties, description, external_id, external_type)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *
        "#,
    )
    .bind(&payload.business_type)
    .bind(&payload.business_name)
    .bind(&payload.business_code)
    .bind(&payload.category)
    .bind(&payload.position)
    .bind(&payload.address)
    .bind(&payload.contact_person)
    .bind(&payload.contact_phone)
    .bind(&payload.capacity)
    .bind(&payload.current_usage)
    .bind(&payload.status.unwrap_or_else(|| "active".to_string()))
    .bind(&payload.properties)
    .bind(&payload.description)
    .bind(&payload.external_id)
    .bind(&payload.external_type)
    .fetch_one(&state.pool)
    .await
    {
        Ok(location) => Json(ApiResponse::success(location, "创建业务位置成功")),
        Err(e) => Json(ApiResponse::error(500, &format!("数据库插入失败: {}", e))),
    }
}

async fn update_business_location(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(payload): Json<CreateBusinessLocation>,
) -> Json<ApiResponse<BusinessLocation>> {
    if let Err(e) = check_permission(&state.pool, &claims, &GisPermission::DeviceLocationWrite).await {
        return e;
    }
    match sqlx::query_as::<_, BusinessLocation>(
        r#"
        UPDATE business_locations 
        SET business_type = $1, business_name = $2, business_code = $3, category = $4, position = $5, address = $6, contact_person = $7, contact_phone = $8, capacity = $9, current_usage = $10, status = $11, properties = $12, description = $13, external_id = $14, external_type = $15, updated_at = NOW()
        WHERE id = $16
        RETURNING *
        "#,
    )
    .bind(&payload.business_type)
    .bind(&payload.business_name)
    .bind(&payload.business_code)
    .bind(&payload.category)
    .bind(&payload.position)
    .bind(&payload.address)
    .bind(&payload.contact_person)
    .bind(&payload.contact_phone)
    .bind(&payload.capacity)
    .bind(&payload.current_usage)
    .bind(&payload.status.unwrap_or_else(|| "active".to_string()))
    .bind(&payload.properties)
    .bind(&payload.description)
    .bind(&payload.external_id)
    .bind(&payload.external_type)
    .bind(id)
    .fetch_one(&state.pool)
    .await
    {
        Ok(location) => Json(ApiResponse::success(location, "更新业务位置成功")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(404, "业务位置未找到")),
        Err(e) => Json(ApiResponse::error(500, &format!("数据库更新失败: {}", e))),
    }
}

async fn delete_business_location(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<bool>> {
    if let Err(e) = check_permission(&state.pool, &claims, &GisPermission::DeviceLocationWrite).await {
        return e;
    }
    match sqlx::query("DELETE FROM business_locations WHERE id = $1")
        .bind(id)
        .execute(&state.pool)
        .await
    {
        Ok(result) => {
            if result.rows_affected() > 0 {
                Json(ApiResponse::success(true, "删除业务位置成功"))
            } else {
                Json(ApiResponse::error(404, "业务位置未找到"))
            }
        }
        Err(e) => Json(ApiResponse::error(500, &format!("数据库删除失败: {}", e))),
    }
}

// ==================== Map Markers API ====================

async fn list_map_markers(State(state): State<AppState>) -> Json<ApiResponse<serde_json::Value>> {
    match sqlx::query_as::<_, MapMarker>("SELECT * FROM map_markers ORDER BY z_index DESC, created_at DESC")
        .fetch_all(&state.pool)
        .await
    {
        Ok(markers) => Json(ApiResponse::success(
            serde_json::json!({
                "map_markers": markers,
                "total": markers.len()
            }),
            "获取地图标记列表成功",
        )),
        Err(e) => Json(ApiResponse::error(500, &format!("数据库查询失败: {}", e))),
    }
}

async fn create_map_marker(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<CreateMapMarker>,
) -> Json<ApiResponse<MapMarker>> {
    if let Err(e) = check_permission(&state.pool, &claims, &GisPermission::DeviceLocationWrite).await {
        return e;
    }
    match sqlx::query_as::<_, MapMarker>(
        r#"
        INSERT INTO map_markers (marker_type, name, marker_style, position, icon_svg, color, size, popup_content, click_action, action_data, visible, z_index)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
        "#,
    )
    .bind(&payload.marker_type)
    .bind(&payload.name)
    .bind(&payload.marker_style)
    .bind(&payload.position)
    .bind(&payload.icon_svg)
    .bind(&payload.color)
    .bind(&payload.size)
    .bind(&payload.popup_content)
    .bind(&payload.click_action)
    .bind(&payload.action_data)
    .bind(&payload.visible.unwrap_or(true))
    .bind(&payload.z_index.unwrap_or(0))
    .fetch_one(&state.pool)
    .await
    {
        Ok(marker) => Json(ApiResponse::success(marker, "创建地图标记成功")),
        Err(e) => Json(ApiResponse::error(500, &format!("数据库插入失败: {}", e))),
    }
}

async fn update_map_marker(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(payload): Json<CreateMapMarker>,
) -> Json<ApiResponse<MapMarker>> {
    if let Err(e) = check_permission(&state.pool, &claims, &GisPermission::DeviceLocationWrite).await {
        return e;
    }
    match sqlx::query_as::<_, MapMarker>(
        r#"
        UPDATE map_markers 
        SET marker_type = $1, name = $2, marker_style = $3, position = $4, icon_svg = $5, color = $6, size = $7, popup_content = $8, click_action = $9, action_data = $10, visible = $11, z_index = $12, updated_at = NOW()
        WHERE id = $13
        RETURNING *
        "#,
    )
    .bind(&payload.marker_type)
    .bind(&payload.name)
    .bind(&payload.marker_style)
    .bind(&payload.position)
    .bind(&payload.icon_svg)
    .bind(&payload.color)
    .bind(&payload.size)
    .bind(&payload.popup_content)
    .bind(&payload.click_action)
    .bind(&payload.action_data)
    .bind(&payload.visible.unwrap_or(true))
    .bind(&payload.z_index.unwrap_or(0))
    .bind(id)
    .fetch_one(&state.pool)
    .await
    {
        Ok(marker) => Json(ApiResponse::success(marker, "更新地图标记成功")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(404, "地图标记未找到")),
        Err(e) => Json(ApiResponse::error(500, &format!("数据库更新失败: {}", e))),
    }
}

async fn delete_map_marker(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<bool>> {
    if let Err(e) = check_permission(&state.pool, &claims, &GisPermission::DeviceLocationWrite).await {
        return e;
    }
    match sqlx::query("DELETE FROM map_markers WHERE id = $1")
        .bind(id)
        .execute(&state.pool)
        .await
    {
        Ok(result) => {
            if result.rows_affected() > 0 {
                Json(ApiResponse::success(true, "删除地图标记成功"))
            } else {
                Json(ApiResponse::error(404, "地图标记未找到"))
            }
        }
        Err(e) => Json(ApiResponse::error(500, &format!("数据库删除失败: {}", e))),
    }
}

// ==================== GeoJSON Export API ====================

async fn export_geojson(State(state): State<AppState>) -> Json<ApiResponse<serde_json::Value>> {
    let mut features: Vec<serde_json::Value> = Vec::new();

    // Export device locations
    if let Ok(devices) = sqlx::query_as::<_, DeviceLocation>("SELECT * FROM device_locations")
        .fetch_all(&state.pool)
        .await
    {
        for device in devices {
            if let Some(pos) = device.position.as_object() {
                if let (Some(lat), Some(lng)) = (pos.get("lat"), pos.get("lng")) {
                    features.push(serde_json::json!({
                        "type": "Feature",
                        "geometry": {
                            "type": "Point",
                            "coordinates": [lng, lat]
                        },
                        "properties": {
                            "id": device.id,
                            "name": device.device_name,
                            "code": device.device_code,
                            "type": "device",
                            "device_type": device.device_type,
                            "status": device.status
                        }
                    }));
                }
            }
        }
    }

    // Export pipelines
    if let Ok(pipelines) = sqlx::query_as::<_, Pipeline>("SELECT * FROM pipelines")
        .fetch_all(&state.pool)
        .await
    {
        for pipeline in pipelines {
            if let Some(path_array) = pipeline.path.as_array() {
                let coordinates: Vec<[f64; 2]> = path_array.iter()
                    .filter_map(|p| {
                        if let (Some(lat), Some(lng)) = (p.get("lat"), p.get("lng")) {
                            if let (Some(lat_f), Some(lng_f)) = (lat.as_f64(), lng.as_f64()) {
                                return Some([lng_f, lat_f]);
                            }
                        }
                        None
                    })
                    .collect();
                if !coordinates.is_empty() {
                    features.push(serde_json::json!({
                        "type": "Feature",
                        "geometry": {
                            "type": "LineString",
                            "coordinates": coordinates
                        },
                        "properties": {
                            "id": pipeline.id,
                            "name": pipeline.name,
                            "code": pipeline.code,
                            "type": "pipeline",
                            "pipeline_type": pipeline.pipeline_type,
                            "status": pipeline.status
                        }
                    }));
                }
            }
        }
    }

    // Export warehouse locations
    if let Ok(warehouses) = sqlx::query_as::<_, WarehouseLocation>("SELECT * FROM warehouse_locations")
        .fetch_all(&state.pool)
        .await
    {
        for warehouse in warehouses {
            if let Some(pos) = warehouse.position.as_object() {
                if let (Some(lat), Some(lng)) = (pos.get("lat"), pos.get("lng")) {
                    features.push(serde_json::json!({
                        "type": "Feature",
                        "geometry": {
                            "type": "Point",
                            "coordinates": [lng, lat]
                        },
                        "properties": {
                            "id": warehouse.id,
                            "name": warehouse.warehouse_name,
                            "type": "warehouse",
                            "zone": warehouse.zone,
                            "capacity": warehouse.capacity,
                            "status": warehouse.status
                        }
                    }));
                }
            }
        }
    }

    // Export business locations
    if let Ok(business_locations) = sqlx::query_as::<_, BusinessLocation>("SELECT * FROM business_locations")
        .fetch_all(&state.pool)
        .await
    {
        for location in business_locations {
            if let Some(pos) = location.position.as_object() {
                if let (Some(lat), Some(lng)) = (pos.get("lat"), pos.get("lng")) {
                    features.push(serde_json::json!({
                        "type": "Feature",
                        "geometry": {
                            "type": "Point",
                            "coordinates": [lng, lat]
                        },
                        "properties": {
                            "id": location.id,
                            "name": location.business_name,
                            "code": location.business_code,
                            "type": "business",
                            "business_type": location.business_type,
                            "category": location.category,
                            "status": location.status
                        }
                    }));
                }
            }
        }
    }

    let geojson = serde_json::json!({
        "type": "FeatureCollection",
        "features": features
    });

    Json(ApiResponse::success(geojson, "导出GeoJSON成功"))
}

// ==================== Search API ====================

async fn search_locations(
    State(state): State<AppState>,
    axum::extract::Query(params): axum::extract::Query<std::collections::HashMap<String, String>>,
) -> Json<ApiResponse<serde_json::Value>> {
    let query = params.get("q").cloned().unwrap_or_default();
    let location_type = params.get("type").cloned();

    let mut results: Vec<serde_json::Value> = Vec::new();
    let search_pattern = format!("%{}%", query);

    if location_type.is_none() || location_type.as_deref() == Some("device") {
        if let Ok(devices) = sqlx::query_as::<_, DeviceLocation>(
            "SELECT * FROM device_locations WHERE device_name ILIKE $1 OR device_code ILIKE $1"
        )
        .bind(&search_pattern)
        .fetch_all(&state.pool)
        .await
        {
            for device in devices {
                results.push(serde_json::json!({
                    "type": "device",
                    "id": device.id,
                    "name": device.device_name,
                    "code": device.device_code,
                    "position": device.position,
                    "status": device.status
                }));
            }
        }
    }

    if location_type.is_none() || location_type.as_deref() == Some("pipeline") {
        if let Ok(pipelines) = sqlx::query_as::<_, Pipeline>(
            "SELECT * FROM pipelines WHERE name ILIKE $1 OR code ILIKE $1"
        )
        .bind(&search_pattern)
        .fetch_all(&state.pool)
        .await
        {
            for pipeline in pipelines {
                results.push(serde_json::json!({
                    "type": "pipeline",
                    "id": pipeline.id,
                    "name": pipeline.name,
                    "code": pipeline.code,
                    "status": pipeline.status
                }));
            }
        }
    }

    if location_type.is_none() || location_type.as_deref() == Some("warehouse") {
        if let Ok(warehouses) = sqlx::query_as::<_, WarehouseLocation>(
            "SELECT * FROM warehouse_locations WHERE warehouse_name ILIKE $1"
        )
        .bind(&search_pattern)
        .fetch_all(&state.pool)
        .await
        {
            for warehouse in warehouses {
                results.push(serde_json::json!({
                    "type": "warehouse",
                    "id": warehouse.id,
                    "name": warehouse.warehouse_name,
                    "zone": warehouse.zone,
                    "position": warehouse.position,
                    "status": warehouse.status
                }));
            }
        }
    }

    if location_type.is_none() || location_type.as_deref() == Some("business") {
        if let Ok(business_locations) = sqlx::query_as::<_, BusinessLocation>(
            "SELECT * FROM business_locations WHERE business_name ILIKE $1 OR business_code ILIKE $1"
        )
        .bind(&search_pattern)
        .fetch_all(&state.pool)
        .await
        {
            for location in business_locations {
                results.push(serde_json::json!({
                    "type": "business",
                    "id": location.id,
                    "name": location.business_name,
                    "code": location.business_code,
                    "business_type": location.business_type,
                    "position": location.position,
                    "status": location.status
                }));
            }
        }
    }

    Json(ApiResponse::success(
        serde_json::json!({
            "results": results,
            "total": results.len(),
            "query": query
        }),
        "搜索完成",
    ))
}

#[tokio::main]
async fn main() -> Result<()> {
    dotenv::dotenv().ok();

    init_logging("topems-gis");

    let (prometheus_layer, metric_handle) = PrometheusMetricLayer::pair();
    let custom_gauge = Gauge::new(
        "topems_gis_custom_metric",
        "This is a custom metric for TOPEMS-GIS",
    ).unwrap();
    default_registry().register(Box::new(custom_gauge.clone())).unwrap();
    custom_gauge.set(42.0);
    tracing::info!("✅ Prometheus 监控已初始化");

    let database_url =
        env::var("DATABASE_URL").expect("DATABASE_URL must be set in environment variables");
    let pool = PgPool::connect(&database_url).await?;
    tracing::info!("✅ 连接到 PostgreSQL 数据库成功");

    // Initialize tables
    init_tables(&pool).await?;
    tracing::info!("✅ 数据库表初始化成功");

    let auth_state = AuthState::from_env();
    let state = AppState {
        pool: pool.clone(),
        auth_state: auth_state.clone(),
    };

    let cors = create_cors_layer();

    let public_routes = Router::new()
        .route("/health", get(health_check))
        .route("/api/v1/health/detailed", get(health_check_detailed))
        .route("/metrics", get(move || async move { metric_handle.render() }))
        .route("/api/v1/factory-maps", axum::routing::get(list_factory_maps))
        .route("/api/v1/factory-maps/{id}", axum::routing::get(get_factory_map))
        .route("/api/v1/device-locations", axum::routing::get(list_device_locations))
        .route("/api/v1/device-locations/{id}", axum::routing::get(get_device_location))
        .route("/api/v1/device-locations/map/{map_id}", axum::routing::get(list_device_locations_by_map))
        .route("/api/v1/pipelines", axum::routing::get(list_pipelines))
        .route("/api/v1/pipelines/{id}", axum::routing::get(get_pipeline))
        .route("/api/v1/pipelines/map/{map_id}", axum::routing::get(list_pipelines_by_map))
        .route("/api/v1/warehouse-locations", axum::routing::get(list_warehouse_locations))
        .route("/api/v1/warehouse-locations/{id}", axum::routing::get(get_warehouse_location))
        .route("/api/v1/warehouse-locations/map/{map_id}", axum::routing::get(list_warehouse_locations_by_map))
        .route("/api/v1/location-photos", axum::routing::get(list_location_photos))
        .route("/api/v1/location-photos/{id}", axum::routing::get(get_location_photo))
        .route("/api/v1/location-photos/map/{map_id}", axum::routing::get(list_location_photos_by_map))
        .route("/api/v1/business-locations", axum::routing::get(list_business_locations))
        .route("/api/v1/business-locations/{id}", axum::routing::get(get_business_location))
        .route("/api/v1/business-locations/type/{business_type}", axum::routing::get(list_business_locations_by_type))
        .route("/api/v1/map-markers", axum::routing::get(list_map_markers))
        .route("/api/v1/geojson/export", axum::routing::get(export_geojson))
        .route("/api/v1/search", axum::routing::get(search_locations))
        // 新增 GIS API 路由
        .route("/api/v1/maps", axum::routing::get(api::map::list_maps))
        .route("/api/v1/maps/{id}", axum::routing::get(api::map::get_map))
        .route("/api/v1/maps/{id}/layers", axum::routing::get(api::map::list_map_layers))
        .route("/api/v1/geodata", axum::routing::get(api::geodata::list_geodata))
        .route("/api/v1/geodata/{id}", axum::routing::get(api::geodata::get_geodata))
        .route("/api/v1/geodata/{id}/features", axum::routing::get(api::geodata::list_geofeatures))
        .route("/api/v1/locations", axum::routing::get(api::location::list_locations))
        .route("/api/v1/locations/{id}", axum::routing::get(api::location::get_location))
        .route("/api/v1/devices", axum::routing::get(api::device::list_devices))
        .route("/api/v1/devices/{id}", axum::routing::get(api::device::get_device));

    let protected_api = Router::new()
        .route("/api/v1/factory-maps", axum::routing::post(create_factory_map))
        .route("/api/v1/factory-maps/{id}", axum::routing::put(update_factory_map))
        .route("/api/v1/factory-maps/{id}", axum::routing::delete(delete_factory_map))
        .route("/api/v1/device-locations", axum::routing::post(create_device_location))
        .route("/api/v1/device-locations/{id}", axum::routing::put(update_device_location))
        .route("/api/v1/device-locations/{id}", axum::routing::delete(delete_device_location))
        .route("/api/v1/pipelines", axum::routing::post(create_pipeline))
        .route("/api/v1/pipelines/{id}", axum::routing::put(update_pipeline))
        .route("/api/v1/pipelines/{id}", axum::routing::delete(delete_pipeline))
        .route("/api/v1/warehouse-locations", axum::routing::post(create_warehouse_location))
        .route("/api/v1/warehouse-locations/{id}", axum::routing::put(update_warehouse_location))
        .route("/api/v1/warehouse-locations/{id}", axum::routing::delete(delete_warehouse_location))
        .route("/api/v1/location-photos", axum::routing::post(create_location_photo))
        .route("/api/v1/location-photos/{id}", axum::routing::delete(delete_location_photo))
        .route("/api/v1/business-locations", axum::routing::post(create_business_location))
        .route("/api/v1/business-locations/{id}", axum::routing::put(update_business_location))
        .route("/api/v1/business-locations/{id}", axum::routing::delete(delete_business_location))
        .route("/api/v1/map-markers", axum::routing::post(create_map_marker))
        .route("/api/v1/map-markers/{id}", axum::routing::put(update_map_marker))
        .route("/api/v1/map-markers/{id}", axum::routing::delete(delete_map_marker))
        .route("/api/v1/import", axum::routing::post(import_data))
        // 新增 GIS API 保护路由
        .route("/api/v1/maps/create", axum::routing::post(api::map::create_map))
        .route("/api/v1/maps/{id}", axum::routing::put(api::map::update_map))
        .route("/api/v1/maps/{id}", axum::routing::delete(api::map::delete_map))
        .route("/api/v1/maps/{id}/layers", axum::routing::post(api::map::add_map_layer))
        .route("/api/v1/maps/{id}/layers/{layer_id}", axum::routing::delete(api::map::delete_map_layer))
        .route("/api/v1/geodata/upload", axum::routing::post(api::geodata::upload_geodata))
        .route("/api/v1/geodata/{id}", axum::routing::put(api::geodata::update_geodata))
        .route("/api/v1/geodata/{id}", axum::routing::delete(api::geodata::delete_geodata))
        .route("/api/v1/geodata/{id}/convert", axum::routing::post(api::geodata::convert_geodata))
        .route("/api/v1/spatial/buffer", axum::routing::post(api::spatial::buffer_analysis))
        .route("/api/v1/spatial/intersect", axum::routing::post(api::spatial::intersect_analysis))
        .route("/api/v1/spatial/union", axum::routing::post(api::spatial::union_analysis))
        .route("/api/v1/spatial/difference", axum::routing::post(api::spatial::difference_analysis))
        .route("/api/v1/spatial/within", axum::routing::post(api::spatial::within_analysis))
        .route("/api/v1/spatial/distance", axum::routing::post(api::spatial::distance_calculation))
        .route("/api/v1/spatial/nearest", axum::routing::post(api::spatial::nearest_query))
        .route("/api/v1/spatial/cluster", axum::routing::post(api::spatial::cluster_analysis))
        .route("/api/v1/locations/create", axum::routing::post(api::location::create_location))
        .route("/api/v1/locations/{id}", axum::routing::put(api::location::update_location))
        .route("/api/v1/locations/{id}", axum::routing::delete(api::location::delete_location))
        .route("/api/v1/locations/search", axum::routing::post(api::location::search_locations))
        .route("/api/v1/locations/nearby", axum::routing::post(api::location::nearby_locations))
        .route("/api/v1/locations/route", axum::routing::post(api::location::plan_route))
        .route("/api/v1/devices/register", axum::routing::post(api::device::register_device))
        .route("/api/v1/devices/{id}", axum::routing::put(api::device::update_device))
        .route("/api/v1/devices/{id}", axum::routing::delete(api::device::delete_device))
        .route("/api/v1/devices/{id}/location", axum::routing::post(api::device::update_device_location))
        .route("/api/v1/devices/{id}/tracking", axum::routing::get(api::device::get_device_tracking))
        .route("/api/v1/devices/{id}/history", axum::routing::get(api::device::get_device_history))
        .layer(axum::middleware::from_fn_with_state(
            auth_state,
            auth_middleware,
        ));

    let app = public_routes
        .merge(protected_api)
        .merge(create_api_info_router("topems-gis"))
        .with_state(state)
        .layer(prometheus_layer)
        .layer(cors);

    let port = env::var("PORT").unwrap_or_else(|_| "8050".to_string());
    let addr = format!("0.0.0.0:{}", port);

    tracing::info!("🚀 TOPEMS-GIS 厂区空间数字化系统启动中...");
    tracing::info!("📦 端口: {}", port);
    tracing::info!("🔒 认证保护已启用");

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
