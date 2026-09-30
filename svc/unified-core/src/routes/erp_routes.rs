//! ERP 企业资源计划模块路由

use axum::{
    routing::get,
    Router,
};

use crate::modules::erp::handlers;
use crate::AppState;

/// ERP 模块路由
pub fn erp_router() -> Router<AppState> {
    Router::new()
        // 采购订单列表（真实数据库查询）
        .route("/api/erp/purchase-orders", get(handlers::list_purchase_orders))
        // 销售订单列表（真实数据库查询）
        .route("/api/erp/sales-orders", get(handlers::list_sales_orders))
        // 生产订单列表（真实数据库查询）
        .route("/api/erp/production-orders", get(handlers::list_production_orders))
}
