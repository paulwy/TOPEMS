use anyhow::Result;
use axum::{
    extract::FromRef,
    Router,
};
use sqlx::postgres::PgPool;
use std::sync::Arc;
use std::time::Instant;
use topems_shared::{AuthState, SystemMetrics};

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

pub async fn create_routes(db: PgPool, auth_state: AuthState, metrics: Arc<SystemMetrics>) -> Result<Router> {
    let state = ApiState {
        db,
        auth_state,
        metrics,
        start_time: Instant::now(),
    };
    
    let app = Router::new()
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
        .with_state(state);

    Ok(app)
}
