use axum::{
    extract::{Path, State},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use chrono::{DateTime, Utc};
use uuid::Uuid;
use anyhow::Result;
use axum::extract::FromRef;
use std::env;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use topems_shared::{ApiResponse, AuthState, auth_middleware, create_cors_layer};

mod models;
use models::{FactoryMap, DeviceLocation, Pipeline, WarehouseLocation, LocationPhoto};

#[derive(Debug, Clone, Serialize, Deserialize)]
struct CreateFactoryMap {
    pub name: String,
    pub code: String,
    pub map_type: String,
    pub file_url: Option<String>,
    pub bounds: serde_json::Value,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct CreateDeviceLocation {
    pub map_id: Uuid,
    pub device_name: String,
    pub device_code: String,
    pub device_type: String,
    pub position: serde_json::Value,
    pub status: String,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct CreatePipeline {
    pub map_id: Uuid,
    pub name: String,
    pub code: String,
    pub pipeline_type: String,
    pub path: serde_json::Value,
    pub properties: serde_json::Value,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct CreateWarehouseLocation {
    pub map_id: Uuid,
    pub warehouse_name: String,
    pub zone: String,
    pub position: serde_json::Value,
    pub capacity: Option<i32>,
    pub usage_rate: Option<i32>,
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

#[derive(Clone)]
struct AppState {
    factory_maps: Arc<Mutex<Vec<FactoryMap>>>,
    device_locations: Arc<Mutex<Vec<DeviceLocation>>>,
    pipelines: Arc<Mutex<Vec<Pipeline>>>,
    warehouse_locations: Arc<Mutex<Vec<WarehouseLocation>>>,
    location_photos: Arc<Mutex<Vec<LocationPhoto>>>,
    auth_state: AuthState,
}

impl FromRef<AppState> for AuthState {
    fn from_ref(state: &AppState) -> Self {
        state.auth_state.clone()
    }
}

impl AppState {
    fn new(auth_state: AuthState) -> Self {
        AppState {
            factory_maps: Arc::new(Mutex::new(Vec::new())),
            device_locations: Arc::new(Mutex::new(Vec::new())),
            pipelines: Arc::new(Mutex::new(Vec::new())),
            warehouse_locations: Arc::new(Mutex::new(Vec::new())),
            location_photos: Arc::new(Mutex::new(Vec::new())),
            auth_state,
        }
    }
}

async fn health_check() -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(serde_json::json!({
        "service": "topems-gis",
        "status": "healthy"
    }), "健康检查成功"))
}

async fn list_factory_maps(State(state): State<AppState>) -> Json<ApiResponse<serde_json::Value>> {
    let maps = state.factory_maps.lock().unwrap();
    Json(ApiResponse::success(serde_json::json!({
        "factory_maps": maps.clone(),
        "total": maps.len()
    }), "获取厂区地图列表成功"))
}

async fn create_factory_map(
    State(state): State<AppState>,
    Json(payload): Json<CreateFactoryMap>,
) -> Json<ApiResponse<FactoryMap>> {
    let mut maps = state.factory_maps.lock().unwrap();
    
    let map = FactoryMap {
        id: Uuid::new_v4(),
        name: payload.name,
        code: payload.code,
        map_type: payload.map_type,
        file_url: payload.file_url,
        bounds: payload.bounds,
        description: payload.description,
        created_at: Utc::now(),
        updated_at: Utc::now(),
    };
    
    maps.push(map.clone());
    Json(ApiResponse::success(map, "创建厂区地图成功"))
}

async fn get_factory_map(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<FactoryMap>> {
    let maps = state.factory_maps.lock().unwrap();
    if let Some(map) = maps.iter().find(|m| m.id == id) {
        Json(ApiResponse::success(map.clone(), "获取厂区地图成功"))
    } else {
        Json(ApiResponse::<FactoryMap>::error(404, "厂区地图未找到"))
    }
}

async fn list_device_locations(State(state): State<AppState>) -> Json<ApiResponse<serde_json::Value>> {
    let locations = state.device_locations.lock().unwrap();
    Json(ApiResponse::success(serde_json::json!({
        "device_locations": locations.clone(),
        "total": locations.len()
    }), "获取设备位置列表成功"))
}

async fn create_device_location(
    State(state): State<AppState>,
    Json(payload): Json<CreateDeviceLocation>,
) -> Json<ApiResponse<DeviceLocation>> {
    let mut locations = state.device_locations.lock().unwrap();
    
    let location = DeviceLocation {
        id: Uuid::new_v4(),
        map_id: payload.map_id,
        device_name: payload.device_name,
        device_code: payload.device_code,
        device_type: payload.device_type,
        position: payload.position,
        status: payload.status,
        description: payload.description,
        created_at: Utc::now(),
        updated_at: Utc::now(),
    };
    
    locations.push(location.clone());
    Json(ApiResponse::success(location, "创建设备位置成功"))
}

async fn list_pipelines(State(state): State<AppState>) -> Json<ApiResponse<serde_json::Value>> {
    let pipelines = state.pipelines.lock().unwrap();
    Json(ApiResponse::success(serde_json::json!({
        "pipelines": pipelines.clone(),
        "total": pipelines.len()
    }), "获取管道列表成功"))
}

async fn create_pipeline(
    State(state): State<AppState>,
    Json(payload): Json<CreatePipeline>,
) -> Json<ApiResponse<Pipeline>> {
    let mut pipelines = state.pipelines.lock().unwrap();
    
    let pipeline = Pipeline {
        id: Uuid::new_v4(),
        map_id: payload.map_id,
        name: payload.name,
        code: payload.code,
        pipeline_type: payload.pipeline_type,
        path: payload.path,
        properties: payload.properties,
        status: payload.status,
        created_at: Utc::now(),
        updated_at: Utc::now(),
    };
    
    pipelines.push(pipeline.clone());
    Json(ApiResponse::success(pipeline, "创建管道成功"))
}

async fn list_warehouse_locations(State(state): State<AppState>) -> Json<ApiResponse<serde_json::Value>> {
    let locations = state.warehouse_locations.lock().unwrap();
    Json(ApiResponse::success(serde_json::json!({
        "warehouse_locations": locations.clone(),
        "total": locations.len()
    }), "获取仓库位置列表成功"))
}

async fn create_warehouse_location(
    State(state): State<AppState>,
    Json(payload): Json<CreateWarehouseLocation>,
) -> Json<ApiResponse<WarehouseLocation>> {
    let mut locations = state.warehouse_locations.lock().unwrap();
    
    let location = WarehouseLocation {
        id: Uuid::new_v4(),
        map_id: payload.map_id,
        warehouse_name: payload.warehouse_name,
        zone: payload.zone,
        position: payload.position,
        capacity: payload.capacity,
        usage_rate: payload.usage_rate,
        status: payload.status,
        created_at: Utc::now(),
        updated_at: Utc::now(),
    };
    
    locations.push(location.clone());
    Json(ApiResponse::success(location, "创建仓库位置成功"))
}

async fn list_location_photos(State(state): State<AppState>) -> Json<ApiResponse<serde_json::Value>> {
    let photos = state.location_photos.lock().unwrap();
    Json(ApiResponse::success(serde_json::json!({
        "location_photos": photos.clone(),
        "total": photos.len()
    }), "获取位置照片列表成功"))
}

async fn create_location_photo(
    State(state): State<AppState>,
    Json(payload): Json<CreateLocationPhoto>,
) -> Json<ApiResponse<LocationPhoto>> {
    let mut photos = state.location_photos.lock().unwrap();
    
    let photo = LocationPhoto {
        id: Uuid::new_v4(),
        map_id: payload.map_id,
        position: payload.position,
        photo_url: payload.photo_url,
        description: payload.description,
        taken_by: payload.taken_by,
        taken_at: payload.taken_at.unwrap_or_else(Utc::now),
        created_at: Utc::now(),
    };
    
    photos.push(photo.clone());
    Json(ApiResponse::success(photo, "创建位置照片成功"))
}

#[tokio::main]
async fn main() -> Result<()> {
    dotenv::dotenv().ok();

    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            env::var("RUST_LOG").unwrap_or_else(|_| "info".into()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let jwt_secret = env::var("JWT_SECRET")
        .unwrap_or_else(|_| {
            tracing::warn!("JWT_SECRET not set, using default (not recommended for production)");
            "topems-default-jwt-secret-change-me-in-production".to_string()
        });

    let auth_state = AuthState::from_env();
    let state = AppState::new(auth_state.clone());

    let cors = create_cors_layer();

    let app = Router::new()
        .route("/health", axum::routing::get(health_check))
        .route("/api/v1/factory-maps", axum::routing::get(list_factory_maps).post(create_factory_map))
        .route("/api/v1/factory-maps/{id}", axum::routing::get(get_factory_map))
        .route("/api/v1/device-locations", axum::routing::get(list_device_locations).post(create_device_location))
        .route("/api/v1/pipelines", axum::routing::get(list_pipelines).post(create_pipeline))
        .route("/api/v1/warehouse-locations", axum::routing::get(list_warehouse_locations).post(create_warehouse_location))
        .route("/api/v1/location-photos", axum::routing::get(list_location_photos).post(create_location_photo))
        .layer(axum::middleware::from_fn_with_state(
            auth_state,
            auth_middleware,
        ))
        .with_state(state)
        .layer(cors);

    let port = env::var("PORT").unwrap_or_else(|_| "8011".to_string());
    let addr = format!("0.0.0.0:{}", port);

    tracing::info!("🚀 TOPEMS-GIS 厂区空间数字化系统启动中...");
    tracing::info!("📦 端口: {}", port);
    tracing::info!("🔒 认证保护已启用");

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
