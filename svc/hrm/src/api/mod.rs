use axum::{
    extract::FromRef,
    Router,
};
use sqlx::postgres::PgPool;
use std::sync::Arc;
use std::time::Instant;
use topems_shared::{AuthState, SystemMetrics, CacheService};

pub mod employee;
pub mod department;
pub mod contract;
pub mod attendance;
pub mod audit;
pub mod position;
pub mod leave;
pub mod recruitment;
pub mod payroll;
pub mod performance;
pub mod training;
pub mod reports;
pub mod salary_adjustment;
pub mod company;
pub mod health;
pub mod setup;
pub mod openapi;

#[derive(Clone)]
pub struct ApiState {
    pub db: PgPool,
    pub auth_state: AuthState,
    pub metrics: Arc<SystemMetrics>,
    pub start_time: Instant,
    pub cache: Arc<dyn CacheService + Send + Sync>,
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

impl FromRef<ApiState> for Arc<dyn CacheService + Send + Sync> {
    fn from_ref(state: &ApiState) -> Self {
        state.cache.clone()
    }
}

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .merge(health::create_routes())
        .merge(employee::create_routes())
        .merge(department::create_routes())
        .merge(contract::create_routes())
        .merge(attendance::create_routes())
        .merge(audit::create_routes())
        .merge(position::create_routes())
        .merge(leave::create_routes())
        .merge(recruitment::create_routes())
        .merge(payroll::create_routes())
        .merge(performance::create_routes())
        .merge(training::create_routes())
        .merge(reports::create_routes())
        .merge(salary_adjustment::create_routes())
        .merge(company::create_routes())
        .merge(setup::create_routes())
}
