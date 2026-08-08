use axum::extract::FromRef;
use sqlx::PgPool;
use std::sync::Arc;
use topems_shared_auth::auth::AuthState;
use topems_shared_core::health::SimpleHealthConfig;
use topems_shared_event::event::EventPublisher;
pub mod cache;
use crate::modules::test_method::TestMethod;
pub use cache::InMemoryCache;

#[derive(Clone)]
pub struct AppState {
    pub auth_state: AuthState,
    pub pool: PgPool,
    pub health_config: SimpleHealthConfig,
    pub event_publisher: Option<Arc<EventPublisher>>,
    pub test_method_cache: Arc<InMemoryCache<TestMethod>>,
    pub instrument_cache: Arc<InMemoryCache<serde_json::Value>>,
}

impl FromRef<AppState> for AuthState {
    fn from_ref(state: &AppState) -> Self {
        state.auth_state.clone()
    }
}

impl FromRef<AppState> for PgPool {
    fn from_ref(state: &AppState) -> Self {
        state.pool.clone()
    }
}
