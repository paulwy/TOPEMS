use sqlx::PgPool;
use std::sync::Arc;
use topems_shared::AuthState;

#[derive(Clone)]
#[allow(dead_code)]
pub struct AppState {
    pub pool: Arc<PgPool>,
    pub auth_state: Arc<AuthState>,
}

#[allow(dead_code)]
impl AppState {
    pub async fn new(pool: PgPool) -> Self {
        Self {
            pool: Arc::new(pool),
            auth_state: Arc::new(AuthState::from_env()),
        }
    }
}
