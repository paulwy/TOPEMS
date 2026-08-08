pub mod permission;

use axum::extract::FromRef;
use sqlx::PgPool;
use std::sync::Arc;
use topems_shared_event::event::EventPublisher;
use topems_shared_auth::auth::AuthState;

#[derive(Clone)]
pub struct AppState {
    pub auth_state: AuthState,
    pub pool: PgPool,
    pub event_publisher: Option<Arc<EventPublisher>>,
}

impl FromRef<AppState> for AuthState {
    fn from_ref(state: &AppState) -> Self {
        state.auth_state.clone()
    }
}
