use axum::{extract::FromRef, Router};
use sqlx::postgres::PgPool;
use std::sync::Arc;
use topems_shared::{redis::RedisCacheService, AuthState};

pub mod audit;
pub mod data_sync;
pub mod incoming_inspection;
pub mod inventory_turnover;
pub mod mrp;
pub mod openapi;
pub mod plugin;
pub mod price_comparison;
pub mod purchase_item;
pub mod purchase_order;
pub mod supplier;
pub mod supplier_delivery_appointment;
pub mod supplier_evaluation;
pub mod supply_chain_dashboard;

#[derive(Clone)]
pub struct ApiState {
    pub db: PgPool,
    pub auth_state: AuthState,
    pub cache: Option<Arc<RedisCacheService>>,
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

impl FromRef<ApiState> for Option<Arc<RedisCacheService>> {
    fn from_ref(state: &ApiState) -> Self {
        state.cache.clone()
    }
}

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .merge(supplier::create_routes())
        .merge(purchase_order::create_routes())
        .merge(purchase_item::create_routes())
        .merge(supplier_evaluation::create_routes())
        .merge(supplier_delivery_appointment::create_routes())
        .merge(price_comparison::create_routes())
        .merge(mrp::create_routes())
        .merge(incoming_inspection::create_routes())
        .merge(inventory_turnover::create_routes())
        .merge(supply_chain_dashboard::create_routes())
        .merge(audit::create_routes())
        .merge(data_sync::create_routes())
}
