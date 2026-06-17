use axum::{extract::FromRef, Router};
use sqlx::postgres::PgPool;
use std::sync::Arc;
use std::time::Instant;
use topems_shared::{AuthState, SystemMetrics};

pub mod audit;
pub mod inbound_order;
pub mod inventory;
pub mod openapi;
pub mod outbound_order;
pub mod plugin;
pub mod warehouse;

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

pub fn create_routes<S>() -> Router<S>
where
    S: Clone + Send + Sync + 'static,
    ApiState: FromRef<S>,
{
    Router::new()
        .merge(warehouse::create_routes())
        .merge(inventory::create_routes())
        .merge(inbound_order::create_routes())
        .merge(outbound_order::create_routes())
        .merge(audit::create_routes())
}
