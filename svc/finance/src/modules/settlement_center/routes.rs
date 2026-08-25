//! Settlement Center - 路由定义
//!
//! 所有对账和结算接口在 `/api/core/settlement-center/` 路径下提供统一入口。
//! 按权限级别分为三组：
//! - read：查看类接口（settlement:read）
//! - write：写入类接口（settlement:write）
//! - approve：审批类接口（settlement:approve）

use axum::routing::{get, post};
use axum::Router;

use crate::modules::settlement_center::handlers;
use crate::shared::AppState;
use topems_shared_auth::middleware::require_permission;

pub fn create_routes() -> Router<AppState> {
    // ===== 读取类路由（需要 settlement:read 权限）=====
    let read_routes = Router::new()
        .route(
            "/api/core/settlement-center/reconciliations",
            get(handlers::list_reconciliations),
        )
        .route(
            "/api/core/settlement-center/reconciliations/{id}",
            get(handlers::get_reconciliation),
        )
        .route(
            "/api/core/settlement-center/settlements",
            get(handlers::list_settlements),
        )
        .route(
            "/api/core/settlement-center/settlements/{id}",
            get(handlers::get_settlement),
        )
        .route(
            "/api/core/settlement-center/links",
            get(handlers::list_links),
        )
        .route(
            "/api/core/settlement-center/differences",
            get(handlers::list_differences),
        )
        .route(
            "/api/core/settlement-center/dashboard",
            get(handlers::get_dashboard),
        )
        .route(
            "/api/core/settlement-center/statistics",
            get(handlers::get_statistics),
        )
        .layer(axum::middleware::from_fn(require_permission(
            "finance:settlement:read",
        )));

    // ===== 写入类路由（需要 finance:settlement:write 权限）=====
    let write_routes = Router::new()
        .route(
            "/api/core/settlement-center/reconciliations",
            post(handlers::create_reconciliation),
        )
        .route(
            "/api/core/settlement-center/reconciliations/{id}/reconcile",
            post(handlers::reconcile),
        )
        .route(
            "/api/core/settlement-center/auto-reconcile",
            post(handlers::auto_reconcile),
        )
        .route(
            "/api/core/settlement-center/settlements",
            post(handlers::create_settlement),
        )
        .route(
            "/api/core/settlement-center/links",
            post(handlers::create_link),
        )
        .route(
            "/api/core/settlement-center/links/{id}",
            axum::routing::delete(handlers::delete_link),
        )
        .route(
            "/api/core/settlement-center/differences",
            post(handlers::create_difference),
        )
        .layer(axum::middleware::from_fn(require_permission(
            "finance:settlement:write",
        )));

    // ===== 审批类路由（需要 finance:settlement:approve 权限）=====
    let approve_routes = Router::new()
        .route(
            "/api/core/settlement-center/reconciliations/{id}/approve",
            post(handlers::approve_reconciliation),
        )
        .route(
            "/api/core/settlement-center/settlements/{id}/approve",
            post(handlers::approve_settlement),
        )
        .route(
            "/api/core/settlement-center/differences/{id}/approve",
            post(handlers::approve_difference),
        )
        .route(
            "/api/core/settlement-center/differences/{id}/reject",
            post(handlers::reject_difference),
        )
        .layer(axum::middleware::from_fn(require_permission(
            "finance:settlement:approve",
        )));

    Router::new()
        .merge(read_routes)
        .merge(write_routes)
        .merge(approve_routes)
}