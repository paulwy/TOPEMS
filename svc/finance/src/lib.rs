pub mod api;
pub mod models;
pub mod services;

use sqlx::PgPool;
use topems_shared::AuthState;

#[derive(Clone)]
pub struct AppState {
    pub auth_state: AuthState,
    pub pool: PgPool,
}

impl axum::extract::FromRef<AppState> for AuthState {
    fn from_ref(state: &AppState) -> Self {
        state.auth_state.clone()
    }
}

pub use models::*;
pub use services::FinanceService;
