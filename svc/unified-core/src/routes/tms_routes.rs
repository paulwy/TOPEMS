//! TMS 运输管理系统模块路由

use axum::{
    routing::get,
    Router,
};

use crate::modules::tms::handlers;
use crate::AppState;

/// TMS 模块路由
pub fn tms_router() -> Router<AppState> {
    Router::new()
        // 承运人列表（真实数据库查询）
        .route("/api/tms/carriers", get(handlers::list_carriers))
        // 司机列表（真实数据库查询）
        .route("/api/tms/drivers", get(handlers::list_drivers))
        // 路线列表（真实数据库查询）
        .route("/api/tms/routes", get(handlers::list_routes))
        // 货运列表（真实数据库查询）
        .route("/api/tms/shipments", get(handlers::list_shipments))
        // 车辆列表（真实数据库查询）
        .route("/api/tms/vehicles", get(handlers::list_vehicles))
}
