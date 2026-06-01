use axum::{
    extract::{Path, State},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use uuid::Uuid;
use anyhow::Result;
use axum::extract::FromRef;
use std::env;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use sqlx::PgPool;

use topems_shared::{ApiResponse, AuthState, auth_middleware, create_cors_layer};

mod db;
mod models;
use db::schema::init_tables;
use models::{FactoryMap, DeviceLocation, Pipeline, WarehouseLocation, LocationPhoto};

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

async fn health_check() -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(
        serde_json::json!({
            "service": "topems-gis",
            "status": "healthy"
        }),
        "健康检查成功",
    ))
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
    Json(payload): Json<CreateFactoryMap>,
) -> Json<ApiResponse<FactoryMap>> {
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

async fn create_device_location(
    State(state): State<AppState>,
    Json(payload): Json<CreateDeviceLocation>,
) -> Json<ApiResponse<DeviceLocation>> {
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

async fn create_pipeline(
    State(state): State<AppState>,
    Json(payload): Json<CreatePipeline>,
) -> Json<ApiResponse<Pipeline>> {
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

async fn create_warehouse_location(
    State(state): State<AppState>,
    Json(payload): Json<CreateWarehouseLocation>,
) -> Json<ApiResponse<WarehouseLocation>> {
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

async fn create_location_photo(
    State(state): State<AppState>,
    Json(payload): Json<CreateLocationPhoto>,
) -> Json<ApiResponse<LocationPhoto>> {
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

#[tokio::main]
async fn main() -> Result<()> {
    dotenv::dotenv().ok();

    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            env::var("RUST_LOG").unwrap_or_else(|_| "info".into()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

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
        .route("/health", axum::routing::get(health_check))
        .route("/api/v1/factory-maps", axum::routing::get(list_factory_maps))
        .route("/api/v1/factory-maps/{id}", axum::routing::get(get_factory_map))
        .route("/api/v1/device-locations", axum::routing::get(list_device_locations))
        .route("/api/v1/pipelines", axum::routing::get(list_pipelines))
        .route("/api/v1/warehouse-locations", axum::routing::get(list_warehouse_locations))
        .route("/api/v1/location-photos", axum::routing::get(list_location_photos));

    let protected_api = Router::new()
        .route("/api/v1/factory-maps", axum::routing::post(create_factory_map))
        .route("/api/v1/device-locations", axum::routing::post(create_device_location))
        .route("/api/v1/pipelines", axum::routing::post(create_pipeline))
        .route("/api/v1/warehouse-locations", axum::routing::post(create_warehouse_location))
        .route("/api/v1/location-photos", axum::routing::post(create_location_photo))
        .layer(axum::middleware::from_fn_with_state(
            auth_state,
            auth_middleware,
        ));

    let app = public_routes
        .merge(protected_api)
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
