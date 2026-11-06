use axum::extract::FromRef;
use sqlx::postgres::PgPool;
use std::sync::Arc;
use std::time::Instant;
use topems_shared_auth::auth::AuthState;
use topems_shared_core::health::SystemMetrics;

#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    /// 字典等租户隔离表专用：复用请求级 RLS 事务并叠加 `search_path`。
    /// `db` 仍保留给尚未完成连接治理的模块。
    pub rls_db: topems_shared_db::Db,
    pub auth_state: AuthState,
    pub metrics: Arc<SystemMetrics>,
    pub start_time: Instant,
}

impl FromRef<AppState> for AuthState {
    fn from_ref(state: &AppState) -> Self {
        state.auth_state.clone()
    }
}

impl FromRef<AppState> for PgPool {
    fn from_ref(state: &AppState) -> Self {
        state.db.clone()
    }
}
