pub mod permission;
pub mod util;

use axum::extract::FromRef;
use sqlx::PgPool;
use topems_shared_auth::auth::AuthState;

#[derive(Clone)]
pub struct AppState {
    pub auth_state: AuthState,
    pub pool: PgPool,
}

impl FromRef<AppState> for AuthState {
    fn from_ref(state: &AppState) -> Self {
        state.auth_state.clone()
    }
}
