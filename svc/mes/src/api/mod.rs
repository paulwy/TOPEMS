use axum::{extract::FromRef, Router};
use sqlx::postgres::PgPool;
use std::sync::Arc;
use std::time::Instant;
use topems_shared::AuthState;
use topems_shared::SystemMetrics;

pub mod audit;
pub mod equipment;
pub mod openapi;
pub mod production_order;
pub mod production_process;
pub mod production_record;
pub mod work_station;

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

pub async fn create_routes(app_state: ApiState) -> Router<ApiState> {
    Router::new()
        .merge(production_order::create_routes().await.unwrap())
        .merge(production_process::create_routes().await.unwrap())
        .merge(work_station::create_routes().await.unwrap())
        .merge(production_record::create_routes().await.unwrap())
        .merge(audit::create_routes().await.unwrap())
        .merge(equipment::create_routes().await.unwrap())
        .with_state(app_state)
}
