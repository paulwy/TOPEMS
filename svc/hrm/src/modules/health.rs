//! HRM 健康检查 —— 复用 shared-core 统一类型
//! 原实现：自定义 HealthResponse、内联 check_database、手写状态判断（48行）
//! 新实现：调用 shared_core::health::simple_health_check（30行，无类型重复）

use axum::{extract::State, Router};
use topems_shared_core::health::{simple_health_check, ServiceHealth, SimpleHealthConfig};

use crate::modules::ApiState;

pub async fn health_check(State(state): State<ApiState>) -> ServiceHealth {
    let cfg = SimpleHealthConfig::new("topems-hrm").with_db(state.db);
    simple_health_check(&cfg).await
}

pub fn create_routes() -> Router<ApiState> {
    Router::new().route("/health", axum::routing::get(health_check))
}
