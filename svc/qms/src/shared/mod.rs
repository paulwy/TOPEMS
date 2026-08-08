//! Shared module for quality-assurance service
//! Contains unified types and utilities

pub mod permission;

use axum::extract::FromRef;
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use std::sync::Arc;
use topems_shared::AuthState;
use topems_shared_core::health::SimpleHealthConfig;
use topems_shared_event::event::EventPublisher;
use topems_shared_service_client::service_client::WorkflowServiceClient;

#[derive(Clone)]
pub struct AppState {
    pub auth_state: AuthState,
    pub pool: PgPool,
    pub health_config: SimpleHealthConfig,
    pub event_publisher: Option<Arc<EventPublisher>>,
    pub workflow_client: WorkflowServiceClient,
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

impl FromRef<AppState> for WorkflowServiceClient {
    fn from_ref(state: &AppState) -> Self {
        state.workflow_client.clone()
    }
}

/// Shared quality standards
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QualityStandard {
    pub id: String,
    pub tenant_id: String,
    pub code: String,
    pub name: String,
    pub category: String,
    pub level: String,
    pub description: Option<String>,
}

impl Default for QualityStandard {
    fn default() -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            tenant_id: uuid::Uuid::new_v4().to_string(),
            code: String::new(),
            name: String::new(),
            category: "quality".to_string(),
            level: "national".to_string(),
            description: None,
        }
    }
}
