#![allow(dead_code)]
//! # 搜索模块（已废弃）
//!
//! **DEPRECATED**: 此模块已废弃，请使用独立的 `topems-search` 服务
//!
//! - 独立服务路径: `svc/search/`
//! - API 前缀: `/api/search`
//! - 端口: 8083 (SEARCH_PORT)
//!
//! 迁移说明：
//! - 原 `/api/core/search` 路径将逐步下线
//! - 新代码请使用独立 search 服务
//! - Portal BFF 搜索聚合已迁移到 `svc/portal/src/modules/search.rs`

pub mod handlers;
pub mod models;
pub mod service;

pub use handlers::*;
pub use models::*;
pub use service::*;

use axum::{routing::get, Router};
use sqlx::PgPool;

use crate::middleware::permission::require_permission;
use crate::AppState;

pub async fn init_database(_pool: &PgPool) -> Result<(), sqlx::Error> {
    Ok(())
}

#[deprecated(note = "Use search service (/api/search) instead")]
pub fn create_routes(state: AppState) -> Router<AppState> {
    Router::new()
        .route("/search", get(handlers::search))
        .with_state(state.clone())
        .layer(axum::middleware::from_fn_with_state(
            state,
            require_permission("system:search"),
        ))
}
