use axum::extract::FromRef;
use sqlx::postgres::PgPool;
use std::sync::Arc;
use std::time::Instant;
use topems_shared::{AuthState, SystemMetrics};

#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
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
