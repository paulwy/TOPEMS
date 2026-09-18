//! GIS 嵌入式路由组装
//!
//! 独立部署 main.rs 与 server 统一入口（feature `module-gis`）共用同一套
//! 业务路由组装逻辑，避免嵌入时遗漏路由或产生两份分叉实现。

use axum::extract::{Extension, FromRef, Path, State};
use axum::routing::get;
use axum::{Json, Router};
use std::sync::Arc;

use sqlx::PgPool;
use topems_shared_auth::auth::{AuthState, Claims};
use topems_shared_auth::middleware::require_permission;
use topems_shared_auth::security::{rate_limit_middleware, RateLimitConfig, RateLimitMiddleware};
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::{response::ApiResponse, TopemsError};

use crate::models::DeviceLocation;
use crate::modules;
use crate::modules::websocket::WebSocketManager;
use crate::shared;

/// GIS 业务路由状态（独立部署与嵌入式共用）
#[derive(Clone)]
pub struct AppState {
    pub pool: PgPool,
    pub auth_state: AuthState,
    pub ws_manager: Arc<WebSocketManager>,
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

impl FromRef<AppState> for Arc<WebSocketManager> {
    fn from_ref(state: &AppState) -> Self {
        state.ws_manager.clone()
    }
}

/// 业务路由（公开 + 受保护）。
///
/// 返回未注入 state 的 `Router<AppState>`，由调用方决定注入方式：
/// - 独立部署 main.rs：与 system_routes 合并后统一 `.with_state(..)`
/// - server 嵌入（feature `module-gis`）：nest 后 `.with_state(state)`
///
/// - 公开路由：查询类 GET + WebSocket（无鉴权，与独立部署一致）
/// - 受保护路由：写操作，tenant 中间件 + auth 中间件 + `gis:admin` 权限 + 限流
pub fn build_business_router(state: &AppState) -> Router<AppState> {
    // Public business routes (no auth)
    let public_business_routes = Router::new()
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
        // WebSocket public endpoints
        .route("/ws/gis/map", get(modules::websocket::websocket_handler))
        .route(
            "/ws/gis/device/{device_code}",
            get(modules::websocket::websocket_device_handler),
        )
        .route("/ws/gis", get(modules::websocket::websocket_handler))
        // Geofence public endpoints
        .route(
            "/fences",
            axum::routing::get(modules::geofence::list_geofences),
        )
        .route(
            "/fences/{id}",
            axum::routing::get(modules::geofence::get_geofence),
        );

    // Protected API (auth + rate limit)
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
        // Geofence protected write endpoints
        .route(
            "/fences",
            axum::routing::post(modules::geofence::create_geofence),
        )
        .route(
            "/fences/{id}",
            axum::routing::put(modules::geofence::update_geofence),
        )
        .route(
            "/fences/{id}",
            axum::routing::delete(modules::geofence::delete_geofence),
        )
        .layer(axum::middleware::from_fn(require_permission("gis:admin")))
        .layer(axum::middleware::from_fn_with_state(
            state.pool.clone(),
            topems_shared_auth::tenant_middleware(),
        ))
        .layer(axum::middleware::from_fn_with_state(
            state.auth_state.clone(),
            topems_shared_auth::auth::auth_middleware,
        ));

    let rate_limit_config = RateLimitConfig::new(200, 60)
        .with_by_user_id(false)
        .with_by_ip(true);
    let rate_limiter = Arc::new(RateLimitMiddleware::new(rate_limit_config));
    let protected_api = protected_api.layer(axum::middleware::from_fn({
        let mw = rate_limiter.clone();
        move |req, next| {
            let mw = mw.clone();
            async move { rate_limit_middleware(mw, req, next).await }
        }
    }));

    public_business_routes.merge(protected_api)
}

async fn list_device_locations_by_map(
    State(pool): State<sqlx::PgPool>,
    Path(map_id): Path<uuid::Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    match sqlx::query_as::<_, DeviceLocation>(
        only_own_schema_query!("gis", "SELECT id, tenant_id, map_id, device_name, device_code, device_type, position, status, description, last_inspected, created_at, updated_at FROM gis.device_locations WHERE map_id = $1 ORDER BY created_at DESC"),
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
        Err(e) => Json(ApiResponse::from(TopemsError::internal("数据库查询失败", e))),
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
    let tenant_id = topems_shared_auth::get_tenant_id_from_claims(&claims);
    match sqlx::query_as::<_, DeviceLocation>(
        only_own_schema_query!("gis", r#"
        INSERT INTO gis.device_locations (map_id, device_name, device_code, device_type, position, status, description, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
        "#),
    )
    .bind(payload.map_id)
    .bind(&payload.device_name)
    .bind(&payload.device_code)
    .bind(&payload.device_type)
    .bind(payload.position)
    .bind(&payload.status)
    .bind(&payload.description)
    .bind(tenant_id)
    .fetch_one(&pool)
    .await
    {
        Ok(location) => Json(ApiResponse::success(location, "创建设备位置成功")),
        Err(e) => Json(ApiResponse::from(TopemsError::internal("数据库插入失败", e))),
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
        only_own_schema_query!("gis", r#"
        UPDATE gis.device_locations
        SET map_id = $1, device_name = $2, device_code = $3, device_type = $4, position = $5, status = $6, description = $7, updated_at = NOW()
        WHERE id = $8
        RETURNING *
        "#),
    )
    .bind(payload.map_id)
    .bind(&payload.device_name)
    .bind(&payload.device_code)
    .bind(&payload.device_type)
    .bind(payload.position)
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
        Err(e) => Json(ApiResponse::from(TopemsError::internal("数据库更新失败", e))),
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
    match sqlx::query(only_own_schema_query!(
        "gis",
        "DELETE FROM gis.device_locations WHERE id = $1"
    ))
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
        Err(e) => Json(ApiResponse::from(TopemsError::internal("数据库删除失败", e))),
    }
}
