//! LIMS 健康检查 —— 复用 shared-core 统一类型
//! 模块挂载模式下 create_api_routes() 不含 main.rs 独立服务的 /health，
//! 这里补挂 /api/lims/health（前端 limsApi.health 契约）

use axum::{extract::State, Router};
use topems_shared_core::health::{simple_health_check, ServiceHealth};

use crate::shared::AppState;

#[utoipa::path(

    get,

    security(("BearerAuth" = [])),

    path = "/api/lims/health",

    responses(

        (status = 200, description = "OK", body = serde_json::Value),

        (status = 500, description = "Internal server error")

    ),

    tag = "LIMS"

)]

pub async fn health_check(State(state): State<AppState>) -> ServiceHealth {
    simple_health_check(&state.health_config).await
}

pub fn create_routes() -> Router<AppState> {
    Router::new().route("/health", axum::routing::get(health_check))
}
