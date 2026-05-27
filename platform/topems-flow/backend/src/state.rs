use crate::db::WorkflowRepository;
use crate::db::memory::MemoryWorkflowRepository;
use crate::services::WorkflowEngine;
use serde::Serialize;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum StorageMode {
    Memory,
    Database,
}

#[derive(Clone)]
pub enum RepositoryType {
    Database(WorkflowRepository),
    Memory(MemoryWorkflowRepository),
}

#[derive(Clone)]
pub struct AppState {
    pub repo: RepositoryType,
    pub engine: WorkflowEngine,
    pub storage_mode: StorageMode,
}

#[derive(Debug, Serialize)]
pub struct HealthResponse {
    pub status: String,
    pub timestamp: String,
}
