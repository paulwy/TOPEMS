use axum::{extract::FromRef, Router};
use sqlx::postgres::PgPool;
use std::sync::Arc;
use topems_shared_auth::auth::AuthState;
use topems_shared_core::l2_cache::AsyncL2Cache;
use topems_shared_event::event::EventPublisher;
use topems_shared_event::redis::RedisCacheService;

pub mod analytics;
pub mod audit;
pub mod data_sync;
pub mod evaluation_logic;
pub mod incoming_inspection;
pub mod inventory_turnover;
pub mod mrp;
pub mod openapi;
pub mod price_comparison;
pub mod purchase_contract;
pub mod purchase_item;
pub mod purchase_order;
pub mod purchase_requisition;
pub mod scm_plugin;
pub mod settings;
pub mod supplier;
pub mod supplier_admission;
pub mod supplier_delivery_appointment;
pub mod supplier_evaluation;
pub mod supply_chain_dashboard;
pub mod sync_records;

#[derive(Clone)]
pub struct ApiState {
    pub db: PgPool,
    pub auth_state: AuthState,
    pub cache: Option<Arc<RedisCacheService>>,
    pub event_publisher: Option<Arc<EventPublisher>>,
    pub supplier_cache: Arc<AsyncL2Cache<serde_json::Value>>,
    pub purchase_cache: Arc<AsyncL2Cache<serde_json::Value>>,
    pub dict_cache: Arc<AsyncL2Cache<serde_json::Value>>,
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
        .merge(supplier_admission::create_routes())
        .merge(purchase_contract::create_routes())
        .merge(purchase_order::create_routes())
        .merge(purchase_item::create_routes())
        .merge(purchase_requisition::create_routes())
        .merge(supplier_evaluation::create_routes())
        .merge(supplier_delivery_appointment::create_routes())
        .merge(price_comparison::create_routes())
        .merge(mrp::create_routes())
        .merge(incoming_inspection::create_routes())
        .merge(inventory_turnover::create_routes())
        .merge(supply_chain_dashboard::create_routes())
        .merge(analytics::create_routes())
        .merge(audit::create_routes())
        .merge(data_sync::create_routes())
        .merge(sync_records::create_routes())
        .merge(settings::create_routes())
}
