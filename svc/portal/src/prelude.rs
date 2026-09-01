//! Portal crate prelude：通用依赖重导出（V79+ 物理拆分示范）
//!
//! 仅用于减少 main.rs 的重复 use 样板。如果后续 SECTION 1 中各子模块
//! （config/state/middleware/routes/bootstrap/handlers）真正拆分出去，
//! 各自从本 prelude 公共导入即可。
//!
//! 设计上保持最小化：只放 100% 通用且无歧义的导入，避免 glob 重导出污染子模块作用域。
//!
//! V79-1 更新：同步 pub use V79 新增三模块标准入口（bootstrap_services / build_app_state / build_graphql_schema / build_routes）。

pub use axum::{
    response::IntoResponse,
    routing::{delete, get, post, put},
    Json, Router,
};
pub use std::sync::Arc;
pub use std::time::Instant;

pub use axum_prometheus::PrometheusMetricLayer;
pub use prometheus::{default_registry, Gauge};
pub use tower_cookies::CookieManagerLayer;
pub use utoipa::OpenApi;

pub use topems_shared_auth::auth_middleware;
pub use topems_shared::ApiResponse;
pub use topems_shared::{
    create_api_info_router, create_cors_layer, register_routes_with_legacy_alias,
};
pub use topems_shared_auth::security::{
    rate_limit_middleware, RateLimitConfig, RateLimitMiddleware,
};
pub use topems_shared_bootstrap::{bootstrap_service, ServiceConfig};
pub use topems_shared_core::health::{build_health_response, ServiceHealth};
pub use topems_shared_core::logging::request_context_middleware;
pub use topems_shared_db::rls::rls_middleware;
pub use topems_shared_observability::telemetry::telemetry_middleware;

// V79-1: 三模块标准入口 pub use（供外部 `use crate::prelude::*;` 统一导入）
pub use crate::bootstrap::{bootstrap_services, BootstrapOutcome};
pub use crate::router_config::{build_router, build_routes};
pub use crate::state::{build_app_state, build_graphql_schema};
