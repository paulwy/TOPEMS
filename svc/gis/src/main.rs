#![allow(clippy::match_like_matches_macro)]
#![allow(clippy::manual_ok_err)]
#![allow(clippy::redundant_pattern_matching)]
#![allow(clippy::useless_format)]
#![allow(clippy::useless_vec)]
#![allow(clippy::clone_on_copy)]
#![allow(clippy::identity_op)]
#![allow(clippy::needless_borrows_for_generic_args)]
#![allow(clippy::unnecessary_map_or)]
#![allow(clippy::map_flatten)]
#![allow(dead_code)]

use anyhow::Result;
use axum::extract::FromRef;
use axum::{
    extract::{Extension, Path, State},
    routing::get,
    Json, Router,
};
use axum_prometheus::PrometheusMetricLayer;
use prometheus::{default_registry, Gauge};
use std::env;
use utoipa::OpenApi;

use topems_shared::{
    auth::Claims, create_api_info_router, create_cors_layer, init_telemetry, telemetry_middleware,
    wrap_group2_router, ApiResponse, AuthState, DependencyHealth, HealthStatus, RouteCompatConfig,
    ServiceHealth,
};

mod db;
mod middleware;
mod models;
mod modules;
mod services;
mod shared;

use db::schema::init_tables;

#[derive(Clone)]
struct AppState {
    pool: sqlx::PgPool,
    auth_state: AuthState,
    ws_manager: std::sync::Arc<modules::websocket::WebSocketManager>,
}

impl FromRef<AppState> for AuthState {
    fn from_ref(state: &AppState) -> Self {
        state.auth_state.clone()
    }
}

impl FromRef<AppState> for sqlx::PgPool {
    fn from_ref(state: &AppState) -> Self {
        state.pool.clone()
    }
}

impl FromRef<AppState> for std::sync::Arc<modules::websocket::WebSocketManager> {
    fn from_ref(state: &AppState) -> Self {
        state.ws_manager.clone()
    }
}

async fn health_check(State(state): State<AppState>) -> Json<ApiResponse<String>> {
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

async fn health_check_detailed(State(state): State<AppState>) -> Json<ApiResponse<ServiceHealth>> {
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

    let health =
        ServiceHealth::healthy_with_message("topems-gis", message).with_dependencies(dependencies);

    Json(ApiResponse::success(health, "详细健康检查"))
}

async fn check_database_health(pool: &sqlx::PgPool) -> DependencyHealth {
    match sqlx::query("SELECT 1").execute(pool).await {
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
    let iam_url =
        std::env::var("IAM_SERVICE_URL").unwrap_or_else(|_| "http://localhost:8000".to_string());
    let health_url = format!("{}/health", iam_url);

    match topems_shared::check_http_health(&health_url).await {
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

async fn serve_openapi_json() -> axum::Json<utoipa::openapi::OpenApi> {
    axum::Json(modules::openapi::GisApiDoc::openapi())
}

#[tokio::main]
async fn main() -> Result<()> {
    dotenv::dotenv().ok();

    let _telemetry_guard = init_telemetry("topems-gis");

    let (prometheus_layer, metric_handle) = PrometheusMetricLayer::pair();
    let custom_gauge = Gauge::new(
        "topems_gis_custom_metric",
        "This is a custom metric for TOPEMS-GIS",
    )
    .unwrap_or_else(|e| {
        tracing::error!("Failed to create Prometheus gauge: {}", e);
        panic!("Prometheus gauge creation failed - check for duplicate metric registrations")
    });
    default_registry()
        .register(Box::new(custom_gauge.clone()))
        .unwrap_or_else(|e| {
            tracing::error!("Failed to register Prometheus gauge: {}", e);
            panic!(
                "Prometheus gauge registration failed - check for duplicate metric registrations"
            )
        });
    custom_gauge.set(42.0);
    tracing::info!("✅ Prometheus 监控已初始化");

    let database_url = env::var("DATABASE_URL").map_err(|_| {
        tracing::error!("DATABASE_URL environment variable is required");
        anyhow::anyhow!("DATABASE_URL must be set in environment variables")
    })?;
    let pool = sqlx::PgPool::connect(&database_url).await?;
    tracing::info!("✅ 连接到 PostgreSQL 数据库成功");

    init_tables(&pool).await?;
    tracing::info!("✅ 数据库表初始化成功");

    let auth_state = AuthState::from_env();
    let ws_config = modules::websocket::WebSocketConfig::from_env();
    tracing::info!(
        "🔌 WebSocket 配置: max_connections={}, idle_timeout={}s",
        ws_config.max_connections,
        ws_config.idle_timeout_secs
    );
    let state = AppState {
        pool: pool.clone(),
        auth_state: auth_state.clone(),
        ws_manager: std::sync::Arc::new(modules::websocket::WebSocketManager::new(ws_config)),
    };

    let cors = create_cors_layer();

    let public_routes = Router::new()
        .route("/health", get(health_check))
        .route("/api/plugins/info", get(modules::gis_plugin::get_info))
        .route(
            "/api/plugins/health",
            get(modules::gis_plugin::plugin_health_check),
        )
        .route("/health/detailed", get(health_check_detailed))
        .route("/api-docs/openapi.json", get(serve_openapi_json))
        .route(
            "/metrics",
            get(move || async move { metric_handle.render() }),
        )
        .route("/statistics", get(modules::stats::get_statistics))
        .route(
            "/search",
            axum::routing::get(modules::search::search_locations),
        )
        .route(
            "/geojson/export",
            axum::routing::get(modules::import_export::export_geojson),
        )
        .route(
            "/factory-maps",
            axum::routing::get(modules::factory_map::list_factory_maps),
        )
        .route(
            "/factory-maps/{id}",
            axum::routing::get(modules::factory_map::get_factory_map),
        )
        .route(
            "/device-locations",
            axum::routing::get(modules::device::list_devices),
        )
        .route(
            "/device-locations/{id}",
            axum::routing::get(modules::device::get_device),
        )
        .route(
            "/device-locations/map/{map_id}",
            axum::routing::get(list_device_locations_by_map),
        )
        .route(
            "/pipelines",
            axum::routing::get(modules::pipeline::list_pipelines),
        )
        .route(
            "/pipelines/{id}",
            axum::routing::get(modules::pipeline::get_pipeline),
        )
        .route(
            "/pipelines/map/{map_id}",
            axum::routing::get(modules::pipeline::list_pipelines_by_map),
        )
        .route(
            "/warehouse-locations",
            axum::routing::get(modules::warehouse::list_warehouse_locations),
        )
        .route(
            "/warehouse-locations/{id}",
            axum::routing::get(modules::warehouse::get_warehouse_location),
        )
        .route(
            "/warehouse-locations/map/{map_id}",
            axum::routing::get(modules::warehouse::list_warehouse_locations_by_map),
        )
        .route(
            "/location-photos",
            axum::routing::get(modules::photo::list_location_photos),
        )
        .route(
            "/location-photos/{id}",
            axum::routing::get(modules::photo::get_location_photo),
        )
        .route(
            "/location-photos/map/{map_id}",
            axum::routing::get(modules::photo::list_location_photos_by_map),
        )
        .route(
            "/business-locations",
            axum::routing::get(modules::business::list_business_locations),
        )
        .route(
            "/business-locations/{id}",
            axum::routing::get(modules::business::get_business_location),
        )
        .route(
            "/business-locations/type/{business_type}",
            axum::routing::get(modules::business::list_business_locations_by_type),
        )
        .route(
            "/map-markers",
            axum::routing::get(modules::marker::list_map_markers),
        )
        .route("/maps", axum::routing::get(modules::map::list_maps))
        .route("/maps/{id}", axum::routing::get(modules::map::get_map))
        .route(
            "/maps/{id}/layers",
            axum::routing::get(modules::map::list_map_layers),
        )
        .route(
            "/geodata",
            axum::routing::get(modules::geodata::list_geodata),
        )
        .route(
            "/geodata/{id}",
            axum::routing::get(modules::geodata::get_geodata),
        )
        .route(
            "/geodata/{id}/features",
            axum::routing::get(modules::geodata::list_geofeatures),
        )
        .route(
            "/locations",
            axum::routing::get(modules::location::list_locations),
        )
        .route(
            "/locations/{id}",
            axum::routing::get(modules::location::get_location),
        )
        .route(
            "/devices",
            axum::routing::get(modules::device::list_devices),
        )
        .route(
            "/devices/{id}",
            axum::routing::get(modules::device::get_device),
        )
        .route(
            "/devices/{device_code}/report",
            axum::routing::post(modules::device::report_device_location),
        )
        .route("/ws/gis", get(modules::websocket::websocket_handler))
        .route(
            "/ws/gis/device/{device_code}",
            get(modules::websocket::websocket_device_handler),
        );

    let protected_api = Router::new()
        .route(
            "/factory-maps",
            axum::routing::post(modules::factory_map::create_factory_map),
        )
        .route(
            "/factory-maps/{id}",
            axum::routing::put(modules::factory_map::update_factory_map),
        )
        .route(
            "/factory-maps/{id}",
            axum::routing::delete(modules::factory_map::delete_factory_map),
        )
        .route(
            "/device-locations",
            axum::routing::post(create_device_location),
        )
        .route(
            "/device-locations/{id}",
            axum::routing::put(update_device_location),
        )
        .route(
            "/device-locations/{id}",
            axum::routing::delete(delete_device_location),
        )
        .route(
            "/pipelines",
            axum::routing::post(modules::pipeline::create_pipeline),
        )
        .route(
            "/pipelines/{id}",
            axum::routing::put(modules::pipeline::update_pipeline),
        )
        .route(
            "/pipelines/{id}",
            axum::routing::delete(modules::pipeline::delete_pipeline),
        )
        .route(
            "/warehouse-locations",
            axum::routing::post(modules::warehouse::create_warehouse_location),
        )
        .route(
            "/warehouse-locations/{id}",
            axum::routing::put(modules::warehouse::update_warehouse_location),
        )
        .route(
            "/warehouse-locations/{id}",
            axum::routing::delete(modules::warehouse::delete_warehouse_location),
        )
        .route(
            "/location-photos",
            axum::routing::post(modules::photo::create_location_photo),
        )
        .route(
            "/location-photos/{id}",
            axum::routing::delete(modules::photo::delete_location_photo),
        )
        .route(
            "/business-locations",
            axum::routing::post(modules::business::create_business_location),
        )
        .route(
            "/business-locations/{id}",
            axum::routing::put(modules::business::update_business_location),
        )
        .route(
            "/business-locations/{id}",
            axum::routing::delete(modules::business::delete_business_location),
        )
        .route(
            "/map-markers",
            axum::routing::post(modules::marker::create_map_marker),
        )
        .route(
            "/map-markers/{id}",
            axum::routing::put(modules::marker::update_map_marker),
        )
        .route(
            "/map-markers/{id}",
            axum::routing::delete(modules::marker::delete_map_marker),
        )
        .route(
            "/import",
            axum::routing::post(modules::import_export::import_data),
        )
        .route(
            "/maps/create",
            axum::routing::post(modules::map::create_map),
        )
        .route("/maps/{id}", axum::routing::put(modules::map::update_map))
        .route(
            "/maps/{id}",
            axum::routing::delete(modules::map::delete_map),
        )
        .route(
            "/maps/{id}/layers",
            axum::routing::post(modules::map::add_map_layer),
        )
        .route(
            "/maps/{id}/layers/{layer_id}",
            axum::routing::delete(modules::map::delete_map_layer),
        )
        .route(
            "/geodata/upload",
            axum::routing::post(modules::geodata::upload_geodata),
        )
        .route(
            "/geodata/{id}",
            axum::routing::put(modules::geodata::update_geodata),
        )
        .route(
            "/geodata/{id}",
            axum::routing::delete(modules::geodata::delete_geodata),
        )
        .route(
            "/geodata/{id}/convert",
            axum::routing::post(modules::geodata::convert_geodata),
        )
        .route(
            "/spatial/buffer",
            axum::routing::post(modules::spatial::buffer_analysis),
        )
        .route(
            "/spatial/intersect",
            axum::routing::post(modules::spatial::intersect_analysis),
        )
        .route(
            "/spatial/union",
            axum::routing::post(modules::spatial::union_analysis),
        )
        .route(
            "/spatial/difference",
            axum::routing::post(modules::spatial::difference_analysis),
        )
        .route(
            "/spatial/within",
            axum::routing::post(modules::spatial::within_analysis),
        )
        .route(
            "/spatial/distance",
            axum::routing::post(modules::spatial::distance_calculation),
        )
        .route(
            "/spatial/nearest",
            axum::routing::post(modules::spatial::nearest_query),
        )
        .route(
            "/spatial/cluster",
            axum::routing::post(modules::spatial::cluster_analysis),
        )
        .route(
            "/locations/create",
            axum::routing::post(modules::location::create_location),
        )
        .route(
            "/locations/{id}",
            axum::routing::put(modules::location::update_location),
        )
        .route(
            "/locations/{id}",
            axum::routing::delete(modules::location::delete_location),
        )
        .route(
            "/locations/search",
            axum::routing::post(modules::location::search_locations),
        )
        .route(
            "/locations/nearby",
            axum::routing::post(modules::location::nearby_locations),
        )
        .route(
            "/locations/route",
            axum::routing::post(modules::location::plan_route),
        )
        .route(
            "/devices/register",
            axum::routing::post(modules::device::register_device),
        )
        .route(
            "/devices/{id}",
            axum::routing::put(modules::device::update_device),
        )
        .route(
            "/devices/{id}",
            axum::routing::delete(modules::device::delete_device),
        )
        .route(
            "/devices/{id}/location",
            axum::routing::post(modules::device::update_device_location),
        )
        .route(
            "/devices/{id}/tracking",
            axum::routing::get(modules::device::get_device_tracking),
        )
        .route(
            "/devices/{id}/history",
            axum::routing::get(modules::device::get_device_history),
        )
        .layer(axum::middleware::from_fn_with_state(
            auth_state,
            topems_shared::auth_middleware,
        ));

    let app = public_routes
        .merge(protected_api)
        .merge(create_api_info_router("topems-gis"))
        .with_state(state)
        .layer(axum::middleware::from_fn(telemetry_middleware))
        .layer(prometheus_layer)
        .layer(cors);

    let cfg = RouteCompatConfig::new("gis", "/api/gis", &[]);
    let app = wrap_group2_router(app, cfg);

    let port = env::var("GIS_PORT")
        .or_else(|_| env::var("SERVER_PORT"))
        .or_else(|_| env::var("PORT"))
        .unwrap_or_else(|_| "8071".to_string());
    let addr = format!("0.0.0.0:{}", port);

    tracing::info!("🚀 TOPEMS-GIS 厂区空间数字化系统启动中...");
    tracing::info!("📦 端口: {}", port);
    tracing::info!("🔒 认证保护已启用");

    let core_url = env::var("CORE_URL").ok();
    tokio::spawn(async move {
        modules::gis_plugin::auto_register_to_core(core_url.as_deref()).await;
    });

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

use crate::models::DeviceLocation;

async fn list_device_locations_by_map(
    State(pool): State<sqlx::PgPool>,
    Path(map_id): Path<uuid::Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    match sqlx::query_as::<_, DeviceLocation>(
        "SELECT * FROM device_locations WHERE map_id = $1 ORDER BY created_at DESC",
    )
    .bind(map_id)
    .fetch_all(&pool)
    .await
    {
        Ok(locations) => Json(ApiResponse::success(
            serde_json::json!({
                "device_locations": locations,
                "total": locations.len()
            }),
            "获取设备位置列表成功",
        )),
        Err(e) => Json(ApiResponse::error(500, &format!("数据库查询失败: {}", e))),
    }
}

async fn create_device_location(
    State(pool): State<sqlx::PgPool>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<modules::device::CreateDeviceLocation>,
) -> Json<ApiResponse<DeviceLocation>> {
    if let Err(e) = shared::permission::check_permission(
        &pool,
        &claims,
        &shared::permission::GisPermission::DeviceLocationWrite,
    )
    .await
    {
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
    .fetch_one(&pool)
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
    State(pool): State<sqlx::PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<uuid::Uuid>,
    Json(payload): Json<modules::device::CreateDeviceLocation>,
) -> Json<ApiResponse<DeviceLocation>> {
    if let Err(e) = shared::permission::check_permission(
        &pool,
        &claims,
        &shared::permission::GisPermission::DeviceLocationWrite,
    )
    .await
    {
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
    .fetch_one(&pool)
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
    State(pool): State<sqlx::PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<uuid::Uuid>,
) -> Json<ApiResponse<bool>> {
    if let Err(e) = shared::permission::check_permission(
        &pool,
        &claims,
        &shared::permission::GisPermission::DeviceLocationWrite,
    )
    .await
    {
        return e;
    }
    match sqlx::query("DELETE FROM device_locations WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await
    {
        Ok(result) => {
            if result.rows_affected() > 0 {
                Json(ApiResponse::success(true, "删除设备位置成功"))
            } else {
                Json(ApiResponse::error(404, "设备位置未找到"))
            }
        }
        Err(e) => Json(ApiResponse::error(500, &format!("数据库删除失败: {}", e))),
    }
}
