//! SCM 路由注册

use axum::routing::get;
use axum::Router;

use crate::modules::scm::handlers::*;
use crate::AppState;

/// 创建 SCM 业务路由
pub fn scm_routes() -> Router<AppState> {
    Router::new()
        // SCM 概览
        .route("/api/scm/overview", get(get_scm_overview))
        // MRP 计划
        .route("/api/scm/mrp-plans", get(list_mrp_plans))
        // 价格对比
        .route("/api/scm/price-comparisons", get(list_price_comparisons))
}
