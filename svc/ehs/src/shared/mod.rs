pub mod cache;
pub mod permission;

use axum::extract::FromRef;
use sqlx::PgPool;
use std::sync::Arc;
use topems_shared::event::EventPublisher;
use topems_shared::{AuthState, SimpleHealthConfig};

use crate::shared::cache::InMemoryCache;
use crate::workflow::WorkflowClient;

#[derive(Clone)]
pub struct AppState {
    pub auth_state: AuthState,
    pub pool: PgPool,
    pub health_config: SimpleHealthConfig,
    pub event_publisher: Option<Arc<EventPublisher>>,
    pub workflow_client: WorkflowClient,
    pub hazard_cache: Arc<InMemoryCache<serde_json::Value>>,
    pub training_cache: Arc<InMemoryCache<serde_json::Value>>,
    pub dict_cache: Arc<InMemoryCache<String>>,
}

impl FromRef<AppState> for AuthState {
    fn from_ref(state: &AppState) -> Self {
        state.auth_state.clone()
    }
}

impl FromRef<AppState> for WorkflowClient {
    fn from_ref(state: &AppState) -> Self {
        state.workflow_client.clone()
    }
}
