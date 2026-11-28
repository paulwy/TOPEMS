//! GIS 嵌入式路由组装
//!
//! 独立部署 main.rs 与 server 统一入口（feature `module-gis`）共用同一套
//! 业务路由组装逻辑，避免嵌入时遗漏路由或产生两份分叉实现。

use axum::extract::{Extension, FromRef, Path, State};
use axum::routing::get;
use axum::{Json, Router};
use std::sync::Arc;

use topems_shared_auth::auth::{AuthState, Claims};
use topems_shared_auth::middleware::{require_module_access, require_module_write};
use topems_shared_auth::security::{rate_limit_middleware, RateLimitConfig, RateLimitMiddleware};
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::{response::ApiResponse, TopemsError};
use topems_shared_db::scope::Db;

use crate::models::DeviceLocation;
use crate::modules;
use crate::modules::websocket::WebSocketManager;
use crate::shared;
use topems_shared_auth::middleware::tenant::RlsTxnCell;

/// GIS 业务路由状态（独立部署与嵌入式共用）
#[derive(Clone)]
pub struct AppState {
    /// 连接治理 B：模块不再持有连接池，所有查询经 `Db` 的作用域（事务内 SET LOCAL search_path=gis, public）。
    pub pool: Db,
    pub auth_state: AuthState,
    pub ws_manager: Arc<WebSocketManager>,
}

impl FromRef<AppState> for AuthState {
    fn from_ref(state: &AppState) -> Self {
        state.auth_state.clone()
    }
}

impl FromRef<AppState> for Db {
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
/// - 公开路由：查询类 GET + WebSocket 握手（HTTP 层无鉴权）
///   - WS：握手 public，鉴权与订阅租户过滤在 WS 消息层完成（P1-21）
///   - POST /devices/{device_code}/report：路由 public，handler 内部强制
///     JWT 认证 + 设备归属租户校验（P1-22）
/// - 受保护路由：写操作，tenant 中间件 + auth 中间件 + `gis:admin` 权限 + 限流
pub fn build_business_router(state: &AppState, rls_pool: sqlx::PgPool) -> Router<AppState> {
    // 认证查询路由（需登录，无需 gis:admin；按 claims 租户过滤）
    let authed_query_routes = Router::new()
        .route("/health", get(modules::gis_plugin::plugin_health_check))
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
            "/business-locations",
            axum::routing::get(modules::business::list_business_locations)
                .post(modules::business::create_business_location),
        )
        .route(
            "/business-locations/{id}",
            axum::routing::get(modules::business::get_business_location)
                .put(modules::business::update_business_location)
                .delete(modules::business::delete_business_location),
        )
        .route(
            "/business-locations/type/{business_type}",
            axum::routing::get(modules::business::list_business_locations_by_type),
        )
        .route(
            "/device-tracks",
            axum::routing::get(modules::device::list_device_tracks),
        )
        .route(
            "/device-tracks/devices",
            axum::routing::get(modules::device::list_devices_with_tracks),
        )
        .route(
            "/device-tracks/{device_id}/statistics",
            axum::routing::get(modules::device::get_device_track_statistics),
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
            axum::routing::get(modules::device::list_devices)
                .post(modules::device::register_device),
        )
        .route(
            "/devices/{id}",
            axum::routing::get(modules::device::get_device),
        )
        .layer(axum::middleware::from_fn_with_state(
            rls_pool.clone(),
            topems_shared_auth::tenant_middleware(),
        ))
        .layer(axum::middleware::from_fn_with_state(
            state.auth_state.clone(),
            topems_shared_auth::auth::auth_middleware,
        ));

    // Public business routes (no auth)
    let public_business_routes = Router::new()
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
        .route("/ws/gis", get(modules::websocket::websocket_handler));

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
            "/map-markers",
            axum::routing::post(modules::marker::create_map_marker),
        )
        .route(
            "/map-markers/{id}",
            axum::routing::get(modules::marker::get_map_marker),
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
        // 离线同步：位置/证据批量上报与离线数据下载（sync.rs 原零挂载）
        .route(
            "/sync/positions/batch",
            axum::routing::post(modules::sync::batch_upload_positions),
        )
        .route(
            "/sync/evidence/batch",
            axum::routing::post(modules::sync::batch_upload_evidence),
        )
        .route(
            "/sync/offline-data",
            axum::routing::post(modules::sync::download_offline_data),
        )
        // Geofence endpoints：读接口依赖 Claims 扩展（租户过滤），必须与写接口一样走鉴权链，
        // 否则 axum 报 "Missing request extension: Claims" → 500
        .route(
            "/fences",
            axum::routing::get(modules::geofence::list_geofences)
                .post(modules::geofence::create_geofence),
        )
        .route(
            "/fences/{id}",
            axum::routing::get(modules::geofence::get_geofence)
                .put(modules::geofence::update_geofence)
                .delete(modules::geofence::delete_geofence),
        )
        // 模块门只负责「能进 gis + 读」；围栏新增/修改/删除等写仍要求 gis:admin。
        .layer(axum::middleware::from_fn(require_module_write("gis")))
        .layer(axum::middleware::from_fn(require_module_access("gis")))
        .layer(axum::middleware::from_fn_with_state(
            rls_pool,
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
        let mw = rate_limiter;
        move |req, next| {
            let mw = mw.clone();
            async move { rate_limit_middleware(mw, req, next).await }
        }
    }));

    authed_query_routes
        .merge(public_business_routes)
        .merge(protected_api)
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["gis:device:read"])),
    path = "/device-locations/map/{map_id}",
    params(
        ("map_id" = String, Path, description = "map_id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "device"
)]
pub(crate) async fn list_device_locations_by_map(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Extension(_claims): Extension<Claims>,
    Path(map_id): Path<uuid::Uuid>,
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
    let result = sqlx::query_as::<_, DeviceLocation>(
        only_own_schema_query!("gis", "SELECT id, tenant_id, map_id, device_name, device_code, device_type, position, status, description, last_inspected, created_at, updated_at FROM gis.device_locations WHERE map_id = $1 ORDER BY created_at DESC"),
    )
    .bind(map_id)
    .fetch_all(&mut scope)
    .await;
    if let Err(e) = scope.commit().await {
        return ApiResponse::from(TopemsError::internal("数据库查询失败", e));
    }
    match result {
        Ok(locations) => ApiResponse::success(
            serde_json::json!({
                "device_locations": locations,
                "total": locations.len()
            }),
            "获取设备位置列表成功",
        ),
        Err(e) => ApiResponse::from(TopemsError::internal("数据库查询失败", e)),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["gis:device:write"])),
    path = "/device-locations",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "device"
)]
pub(crate) async fn create_device_location(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<modules::device::CreateDeviceLocation>,
) -> ApiResponse<DeviceLocation> {
    if let Err(e) = shared::permission::check_permission(
        &db,
        &claims,
        &shared::permission::GisPermission::DeviceLocationWrite,
    )
    .await
    {
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
    let result = sqlx::query_as::<_, DeviceLocation>(
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
    .fetch_one(&mut scope)
    .await;
    match result {
        Ok(location) => match scope.commit().await {
            Ok(()) => ApiResponse::success(location, "创建设备位置成功"),
            Err(e) => ApiResponse::from(TopemsError::internal("提交事务失败", e)),
        },
        Err(e) => ApiResponse::from(TopemsError::internal("数据库插入失败", e)),
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["gis:device:write"])),
    path = "/device-locations/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "device"
)]
pub(crate) async fn update_device_location(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<uuid::Uuid>,
    Json(payload): Json<modules::device::CreateDeviceLocation>,
) -> ApiResponse<DeviceLocation> {
    if let Err(e) = shared::permission::check_permission(
        &db,
        &claims,
        &shared::permission::GisPermission::DeviceLocationWrite,
    )
    .await
    {
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
    let result = sqlx::query_as::<_, DeviceLocation>(
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
    .fetch_one(&mut scope)
    .await;
    match result {
        Ok(location) => match scope.commit().await {
            Ok(()) => ApiResponse::success(location, "更新设备位置成功"),
            Err(e) => ApiResponse::from(TopemsError::internal("提交事务失败", e)),
        },
        Err(sqlx::Error::RowNotFound) => ApiResponse::not_found("设备位置未找到"),
        Err(e) => ApiResponse::from(TopemsError::internal("数据库更新失败", e)),
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["gis:device:write"])),
    path = "/device-locations/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "device"
)]
pub(crate) async fn delete_device_location(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<uuid::Uuid>,
) -> ApiResponse<bool> {
    if let Err(e) = shared::permission::check_permission(
        &db,
        &claims,
        &shared::permission::GisPermission::DeviceLocationWrite,
    )
    .await
    {
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
    let result = sqlx::query(only_own_schema_query!(
        "gis",
        "DELETE FROM gis.device_locations WHERE id = $1"
    ))
    .bind(id)
    .execute(&mut scope)
    .await;
    match result {
        Ok(result) => match scope.commit().await {
            Ok(()) => {
                if result.rows_affected() > 0 {
                    ApiResponse::success(true, "删除设备位置成功")
                } else {
                    ApiResponse::not_found("设备位置未找到")
                }
            }
            Err(e) => ApiResponse::from(TopemsError::internal("提交事务失败", e)),
        },
        Err(e) => ApiResponse::from(TopemsError::internal("数据库删除失败", e)),
    }
}
