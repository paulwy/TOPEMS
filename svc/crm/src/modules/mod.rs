use axum::{extract::FromRef, Router};
use sqlx::postgres::PgPool;
use std::sync::Arc;
use std::time::Instant;
use topems_shared::AuthState;
use topems_shared::FieldEncryptionService;
use topems_shared::SystemMetrics;

pub mod audit;
pub mod billing;
pub mod contact;
pub mod crm_plugin;
pub mod customer;
pub mod customer_profile;
pub mod customer_recommendation;
pub mod customer_scoring;
pub mod customer_segmentation;
pub mod interaction;
pub mod openapi;
pub mod opportunity;
pub mod sales_forecast;
pub mod sales_funnel;
pub mod scoring_logic;
pub mod tag;

#[derive(Clone)]
pub struct ApiState {
    pub db: PgPool,
    pub auth_state: AuthState,
    pub metrics: Arc<SystemMetrics>,
    pub start_time: Instant,
    pub encryption: Arc<FieldEncryptionService>,
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

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .merge(customer::create_routes())
        .merge(customer_profile::create_routes())
        .merge(customer_segmentation::create_routes())
        .merge(customer_recommendation::create_routes())
        .merge(contact::create_routes())
        .merge(opportunity::create_routes())
        .merge(interaction::create_routes())
        .merge(audit::create_routes())
        .merge(customer_scoring::create_routes())
        .merge(sales_forecast::create_routes())
        .merge(sales_funnel::create_routes())
        .merge(billing::create_routes())
        .merge(tag::create_routes())
}

/// 系统级路由（无需认证，挂载在 app root）
pub fn create_system_routes() -> Router<ApiState> {
    Router::new().merge(crm_plugin::create_routes())
}
