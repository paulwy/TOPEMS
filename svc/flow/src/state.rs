use crate::db::WorkflowRepository;
use crate::services::WorkflowEngine;
use axum::extract::FromRef;
use serde::Serialize;
use sqlx::PgPool;
use topems_shared::auth::AuthState;

#[derive(Clone)]
pub struct AppState {
    pub repo: WorkflowRepository,
    pub engine: WorkflowEngine,
    pub pool: PgPool,
    pub auth_state: AuthState,
}

#[derive(Debug, Serialize)]
pub struct HealthResponse {
    pub status: String,
    pub timestamp: String,
}

impl FromRef<AppState> for AuthState {
    fn from_ref(state: &AppState) -> Self {
        state.auth_state.clone()
    }
}

impl FromRef<AppState> for PgPool {
    fn from_ref(state: &AppState) -> Self {
        state.pool.clone()
    }
}
