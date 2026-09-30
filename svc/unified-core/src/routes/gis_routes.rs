//! GIS 地理信息系统模块路由

use axum::{
    routing::get,
    Router,
};

use crate::modules::gis::handlers;
use crate::AppState;

/// GIS 模块路由
pub fn gis_router() -> Router<AppState> {
    Router::new()
        // 设备列表（真实数据库查询）
        .route("/api/gis/devices", get(handlers::list_devices))
        // 地图列表（真实数据库查询）
        .route("/api/gis/maps", get(handlers::list_maps))
        // 电子围栏列表（真实数据库查询）
        .route("/api/gis/geofences", get(handlers::list_geofences))
        // 轨迹记录列表（真实数据库查询）
        .route("/api/gis/track-records", get(handlers::list_track_records))
        // 位置列表（真实数据库查询）
        .route("/api/gis/locations", get(handlers::list_locations))
}
