pub mod fsm;
pub mod permission;
pub mod util;

#[cfg(test)]
mod fsm_test;

use axum::extract::FromRef;
use std::sync::Arc;
use std::time::Instant;
use topems_shared_auth::auth::AuthState;
use topems_shared_core::health::SystemMetrics;
use topems_shared_core::l2_cache::AsyncL2Cache;
use topems_shared_db::scope::Db;
use topems_shared_event::event::EventPublisher;

#[derive(Clone)]
pub struct AppState {
    /// 连接治理 B：模块不再持有连接池，所有查询经 `Db` 作用域
    /// （事务级 `SET LOCAL search_path = "tms, public"`）。
    pub db: Db,
    pub auth_state: AuthState,
    pub metrics: Arc<SystemMetrics>,
    pub start_time: Instant,
    pub event_publisher: Option<Arc<EventPublisher>>,
    pub dict_cache: Arc<AsyncL2Cache<serde_json::Value>>,
}

impl FromRef<AppState> for AuthState {
    fn from_ref(state: &AppState) -> Self {
        state.auth_state.clone()
    }
}
