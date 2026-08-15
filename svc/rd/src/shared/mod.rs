pub mod permission;
pub mod util;

use axum::extract::FromRef;
use sqlx::PgPool;
use std::sync::Arc;
use topems_shared::AuthState;
use topems_shared_event::event::EventPublisher;

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
