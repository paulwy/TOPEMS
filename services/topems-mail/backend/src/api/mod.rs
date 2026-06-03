use anyhow::Result;
use axum::{
    extract::FromRef,
    Router,
};
use sqlx::postgres::PgPool;
use std::sync::Arc;
use std::time::Instant;
use topems_shared::{AuthState, SystemMetrics};

pub mod email;
pub mod template;

#[derive(Clone)]
pub struct ApiState {
    pub db: PgPool,
    pub auth_state: AuthState,
    pub metrics: Arc<SystemMetrics>,
    pub start_time: Instant,
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

pub async fn create_routes(
    db: PgPool,
    auth_state: AuthState,
    metrics: Arc<SystemMetrics>,
    start_time: Instant,
) -> Result<Router> {
    let state = ApiState {
        db,
        auth_state,
        metrics,
        start_time,
    };

    let app = Router::new()
        .merge(email::create_routes().await?)
        .merge(template::create_routes().await?)
        .with_state(state);

    Ok(app)
}
