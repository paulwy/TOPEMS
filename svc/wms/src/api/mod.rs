use axum::{extract::FromRef, Router};
use sqlx::postgres::PgPool;
use std::sync::Arc;
use std::time::Instant;
use topems_shared::{AuthState, SystemMetrics};

pub mod audit;
// pub mod cycle_count;
// pub mod discrepancy;
pub mod data_sync;
pub mod inbound_order;
pub mod inventory;
pub mod inventory_alert;
pub mod openapi;
pub mod outbound_order;
pub mod plugin;
pub mod stock_take;
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
        .merge(inventory_alert::create_routes())
        .merge(inbound_order::create_routes())
        .merge(outbound_order::create_routes())
        .merge(stock_take::create_routes())
        // .merge(cycle_count::create_routes())
        // .merge(discrepancy::create_routes())
        .merge(audit::create_routes())
        .merge(data_sync::create_routes())
}
