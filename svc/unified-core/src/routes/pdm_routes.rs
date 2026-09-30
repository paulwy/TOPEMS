//! PDM 产品数据管理模块路由

use axum::{routing::get, Router};

use crate::modules::pdm::handlers;
use crate::AppState;

/// PDM 模块路由
pub fn pdm_router() -> Router<AppState> {
    Router::new()
        // 物料列表（真实数据库查询）
        .route("/api/pdm/materials", get(handlers::list_materials))
        // BOM列表（真实数据库查询）
        .route("/api/pdm/boms", get(handlers::list_boms))
        // 文档列表（真实数据库查询）
        .route("/api/pdm/documents", get(handlers::list_documents))
}
