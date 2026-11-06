use axum::extract::FromRef;
use std::sync::Arc;
use std::time::Instant;
use topems_shared_auth::auth::AuthState;
use topems_shared_core::health::SystemMetrics;
use topems_shared_db::scope::Db;

#[derive(Clone)]
pub struct AppState {
    /// 连接治理 B：模块不再持有连接池，所有查询经 `Db` 的作用域（事务内 SET LOCAL search_path=public）。
    pub db: Db,
    pub auth_state: AuthState,
    pub metrics: Arc<SystemMetrics>,
    pub start_time: Instant,
    /// BFF 网关基址（真实探活目标；env MONITOR_BFF_URL 或默认 http://localhost:8099）
    pub bff_url: String,
}

impl FromRef<AppState> for AuthState {
    fn from_ref(state: &AppState) -> Self {
        state.auth_state.clone()
    }
}
