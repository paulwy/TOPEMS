use axum::extract::FromRef;
use sqlx::postgres::PgPool;
use topems_shared_auth::auth::AuthState;

#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    pub auth_state: AuthState,
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn app_state_struct_size() {
        use std::mem::size_of;
        assert!(size_of::<AppState>() > 0);
    }

    #[test]
    fn app_state_clone_trait_implemented() {
        fn assert_clone<T: Clone>() {}
        assert_clone::<AppState>();
    }
}
