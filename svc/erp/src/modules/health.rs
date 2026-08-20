//! ERP 健康检查 —— 复用 shared-core 统一类型
//! 原实现：自定义 HealthResponse、内联 check_database/check_database_health 工具、
//!         手写状态/响应拼装（65行）
//! 新实现：调用 shared_core::health::simple_health_check，保留 utoipa 端点文档（42行）

use axum::{extract::State, Router};
use topems_shared_core::health::{simple_health_check, ServiceHealth, SimpleHealthConfig};

use crate::modules::ApiState;

/// 数据库健康检查（utoipa 文档端点占位，实际 DB 健康统一在 /health 端点返回）
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/health/check-database",
    tag = "Health",
    operation_id = "check_database",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn check_database(_state: State<ApiState>) -> &'static str {
    "Database health check is aggregated in GET /health endpoint"
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/health",
    tag = "Health",
    responses((status = 200, description = "ERP 服务健康检查成功"))
)]
pub async fn health_check(State(state): State<ApiState>) -> ServiceHealth {
    let cfg = SimpleHealthConfig::new("topems-erp").with_db(state.db);
    simple_health_check(&cfg).await
}

pub fn create_routes() -> Router<ApiState> {
    Router::new().route("/health", axum::routing::get(health_check))
}
