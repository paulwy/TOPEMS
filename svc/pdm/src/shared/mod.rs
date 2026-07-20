use axum::extract::FromRef;
use sqlx::PgPool;
use std::sync::Arc;
use topems_shared::{event::EventPublisher, AuthState, SimpleHealthConfig};

#[derive(Clone)]
pub struct AppState {
    pub auth_state: AuthState,
    pub pool: PgPool,
    pub health_config: SimpleHealthConfig,
    pub event_publisher: Option<Arc<EventPublisher>>,
}

impl FromRef<AppState> for AuthState {
    fn from_ref(state: &AppState) -> Self {
        state.auth_state.clone()
    }
}
