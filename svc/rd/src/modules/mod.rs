use axum::{extract::FromRef, Router};
use sqlx::postgres::PgPool;
use std::sync::Arc;
use std::time::Instant;
use topems_shared::AuthState;
use topems_shared_core::config::Config;
use topems_shared_core::health::SystemMetrics;
use topems_shared_event::event::EventPublisher;

pub mod ai_integration;
pub mod audit;
pub mod change_management;
pub mod doc_integration;
pub mod experiment;
pub mod formula;
pub mod material;
pub mod openapi;
pub mod patent;
pub mod project;
pub mod project_member;
pub mod project_milestone;
pub mod project_phase;
pub mod project_report;
pub mod research_cost;
pub mod rs_plugin;
pub mod statistics;

#[derive(Clone)]
pub struct ApiState {
    pub db: PgPool,
    pub auth_state: AuthState,
    pub config: Config,
    pub metrics: Arc<SystemMetrics>,
    pub start_time: Instant,
    pub event_publisher: Option<Arc<EventPublisher>>,
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
        .merge(project::create_routes())
        .merge(formula::create_routes())
        .merge(experiment::create_routes())
        .merge(material::create_routes())
        .merge(patent::create_routes())
        .merge(research_cost::create_routes())
        .merge(doc_integration::create_routes())
        .merge(ai_integration::create_routes())
        .merge(audit::create_routes())
        .merge(project_phase::create_routes())
        .merge(project_milestone::create_routes())
        .merge(project_member::create_routes())
        .merge(project_report::create_routes())
        .merge(statistics::create_routes())
        .merge(change_management::create_routes())
}
