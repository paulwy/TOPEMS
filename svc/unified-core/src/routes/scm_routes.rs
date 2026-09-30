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
        // 供应商列表（真实数据库查询）
        .route("/api/scm/suppliers", get(list_suppliers))
        // 采购申请列表（真实数据库查询）
        .route(
            "/api/scm/purchase-requisitions",
            get(list_purchase_requisitions),
        )
        // 采购合同列表（真实数据库查询）
        .route("/api/scm/purchase-contracts", get(list_purchase_contracts))
        // 物料列表（真实数据库查询）
        .route("/api/scm/materials", get(list_materials))
}
