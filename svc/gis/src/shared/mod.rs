pub mod permission;
pub mod util;

use axum::extract::FromRef;
use topems_shared_auth::auth::AuthState;
use topems_shared_db::scope::Db;

#[derive(Clone)]
pub struct AppState {
    pub auth_state: AuthState,
    pub pool: Db,
}

impl FromRef<AppState> for AuthState {
    fn from_ref(state: &AppState) -> Self {
        state.auth_state.clone()
    }
}
