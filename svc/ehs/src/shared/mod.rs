pub mod cache;
pub mod permission;
pub mod util;

use axum::extract::FromRef;
use sqlx::PgPool;
use std::sync::Arc;
use topems_shared::AuthState;
use topems_shared_core::health::SimpleHealthConfig;
use topems_shared_event::event::EventPublisher;
use topems_shared_service_client::service_client::{TypedServiceClient, WorkflowApi};

use crate::shared::cache::InMemoryCache;

#[derive(Clone)]
pub struct AppState {
    pub auth_state: AuthState,
    pub pool: PgPool,
    pub health_config: SimpleHealthConfig,
    pub event_publisher: Option<Arc<EventPublisher>>,
    pub workflow_client: TypedServiceClient<WorkflowApi>,
    pub hazard_cache: Arc<InMemoryCache<serde_json::Value>>,
    pub training_cache: Arc<InMemoryCache<serde_json::Value>>,
    pub dict_cache: Arc<InMemoryCache<String>>,
}

impl FromRef<AppState> for AuthState {
    fn from_ref(state: &AppState) -> Self {
        state.auth_state.clone()
    }
}

impl FromRef<AppState> for TypedServiceClient<WorkflowApi> {
    fn from_ref(state: &AppState) -> Self {
        state.workflow_client.clone()
    }
}
