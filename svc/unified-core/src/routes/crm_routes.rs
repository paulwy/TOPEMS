//! CRM 客户关系管理模块路由

use axum::{routing::get, Router};

use crate::modules::crm::handlers;
use crate::AppState;

/// CRM 模块路由
pub fn crm_router() -> Router<AppState> {
    Router::new()
        // 客户列表（真实数据库查询）
        .route("/api/crm/customers", get(handlers::list_customers))
        // 联系人列表（真实数据库查询）
        .route("/api/crm/contacts", get(handlers::list_contacts))
        // 商机列表（真实数据库查询）
        .route("/api/crm/opportunities", get(handlers::list_opportunities))
        // 合同列表（真实数据库查询）
        .route("/api/crm/contracts", get(handlers::list_contracts))
        // 互动记录列表（真实数据库查询）
        .route("/api/crm/interactions", get(handlers::list_interactions))
}
