use axum::extract::FromRef;
use sqlx::PgPool;
use topems_shared::AuthState;

use crate::workflow::WorkflowClient;

#[derive(Clone)]
pub struct AppState {
    pub auth_state: AuthState,
    pub pool: PgPool,
    pub workflow_client: WorkflowClient,
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

impl FromRef<AppState> for WorkflowClient {
    fn from_ref(state: &AppState) -> Self {
        state.workflow_client.clone()
    }
}
