use anyhow::Result;
use axum::{
    extract::FromRef,
    Router,
};
use sqlx::postgres::PgPool;
use std::sync::Arc;
use topems_shared::{AuthState, Config};

pub mod auth;
pub mod experiment;
pub mod formula;
pub mod project;
pub mod ai_integration;
pub mod audit;
pub mod doc_integration;
pub mod material;
pub mod project_member;
pub mod project_milestone;
pub mod project_phase;
pub mod project_report;
pub mod openapi;

#[derive(Clone)]
pub struct ApiState {
    pub db: PgPool,
    pub auth_state: AuthState,
    pub config: Config,
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
    config: Config,
) -> Result<Router> {
    let state = Arc::new(ApiState {
        db,
        auth_state,
        config,
    });

    let app = Router::new()
        .merge(project::create_routes().await?)
        .merge(formula::create_routes().await?)
        .merge(experiment::create_routes().await?)
        .merge(material::create_routes().await?)
        .merge(doc_integration::create_routes().await?)
        .merge(ai_integration::create_routes().await?)
        .merge(audit::create_routes().await?)
        .merge(project_phase::create_routes().await?)
        .merge(project_milestone::create_routes().await?)
        .merge(project_member::create_routes().await?)
        .merge(project_report::create_routes().await?)
        .with_state(state);

    Ok(app)
}