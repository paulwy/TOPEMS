// V67.1 P0-9: permission 模块已删除（死代码 + 安全 stub）

use axum::extract::FromRef;
use sqlx::PgPool;
use topems_shared::AuthState;
use topems_shared_core::health::SimpleHealthConfig;

#[derive(Clone)]
pub struct AppState {
    pub auth_state: AuthState,
    pub pool: PgPool,
    pub health_config: SimpleHealthConfig,
}

impl FromRef<AppState> for AuthState {
    fn from_ref(state: &AppState) -> Self {
        state.auth_state.clone()
    }
}
