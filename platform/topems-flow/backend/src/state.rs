use crate::db::WorkflowRepository;
use crate::services::WorkflowEngine;
use serde::Serialize;

#[derive(Clone)]
pub struct AppState {
    pub repo: WorkflowRepository,
    pub engine: WorkflowEngine,
}

#[derive(Debug, Serialize)]
pub struct HealthResponse {
    pub status: String,
    pub timestamp: String,
}
