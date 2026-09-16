//! WMS 路由注册

use axum::routing::get;
use axum::Router;

use crate::modules::wms::handlers::*;
use crate::AppState;

/// 创建 WMS 业务路由
pub fn wms_routes() -> Router<AppState> {
    Router::new()
        // 仪表盘统计
        .route("/api/wms/dashboard/stats", get(dashboard_stats))
        // 入库订单
        .route("/api/wms/inbound-orders", get(list_inbound_orders))
        .route("/api/wms/inbound-orders/{id}", get(get_inbound_order))
        // 出库订单
        .route("/api/wms/outbound-orders", get(list_outbound_orders))
        // 库存
        .route("/api/wms/inventory", get(list_inventory))
        // 调拨
        .route("/api/wms/transfers", get(list_transfers))
        // Analytics
        .route("/api/wms/analytics/dashboard-summary", get(analytics_dashboard_summary))
        .route("/api/wms/analytics/inventory-types", get(analytics_inventory_types))
        .route("/api/wms/analytics/inventory-distribution", get(analytics_inventory_distribution))
        .route("/api/wms/analytics/daily-trend", get(analytics_daily_trend))
}
