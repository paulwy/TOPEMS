use axum::extract::FromRef;
use sqlx::PgPool;
use std::sync::Arc;
use topems_shared::AuthState;
use topems_shared_event::event::EventPublisher;
use topems_shared_service_client::service_client::{TypedServiceClient, WorkflowApi};

#[derive(Clone)]
pub struct AppState {
    pub auth_state: AuthState,
    pub pool: PgPool,
    pub workflow_client: TypedServiceClient<WorkflowApi>,
    pub event_publisher: Option<Arc<EventPublisher>>,
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

impl FromRef<AppState> for TypedServiceClient<WorkflowApi> {
    fn from_ref(state: &AppState) -> Self {
        state.workflow_client.clone()
    }
}
