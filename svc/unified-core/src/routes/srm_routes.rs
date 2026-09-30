//! SRM 供应商关系管理模块路由

use axum::{
    routing::get,
    Router,
};

use crate::modules::srm::handlers;
use crate::AppState;

/// SRM 模块路由
pub fn srm_router() -> Router<AppState> {
    Router::new()
        // 招标列表（真实数据库查询）
        .route("/api/srm/tenders", get(handlers::list_tenders))
        // 投标列表（真实数据库查询）
        .route("/api/srm/bids", get(handlers::list_bids))
        // 报价列表（真实数据库查询）
        .route("/api/srm/quotations", get(handlers::list_quotations))
        // 供应商合同列表（真实数据库查询）
        .route("/api/srm/supplier-contracts", get(handlers::list_supplier_contracts))
        // 供应商评估列表（真实数据库查询）
        .route("/api/srm/supplier-evaluations", get(handlers::list_supplier_evaluations))
}
