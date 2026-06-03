use anyhow::Result;
use axum::{
    extract::FromRef,
    Router,
};
use sqlx::postgres::PgPool;
use topems_shared::AuthState;

pub mod notification;

#[derive(Clone)]
pub struct ApiState {
    pub db: PgPool,
    pub auth_state: AuthState,
}

impl FromRef<ApiState> for AuthState {
    fn from_ref(state: &ApiState) -> Self {
        state.auth_state.clone()
    }
}

impl FromRef<ApiState> for PgPool {
    fn from_ref(state: &ApiState) -> Self {
        state.db.clone()
    }
}

pub async fn create_routes(db: PgPool, auth_state: AuthState) -> Result<Router> {
    let state = ApiState { db, auth_state };

    let app = Router::new()
        .merge(notification::create_routes().await?)
        .with_state(state);

    Ok(app)
}