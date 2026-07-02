use chrono::DateTime;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
pub struct SyncTask {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub sync_type: String,
    pub source_module: String,
    pub target_module: String,
    pub source_entity: String,
    pub source_id: Option<Uuid>,
    pub source_code: Option<String>,
    pub status: String,
    pub retry_count: i32,
    pub max_retries: i32,
    pub error_message: Option<String>,
    pub next_retry_at: Option<DateTime<chrono::Utc>>,
    pub executed_at: Option<DateTime<chrono::Utc>>,
    pub created_at: DateTime<chrono::Utc>,
    pub updated_at: DateTime<chrono::Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateSyncTaskRequest {
    pub sync_type: String,
    pub source_module: String,
    pub target_module: String,
    pub source_entity: String,
    pub source_id: Option<String>,
    pub source_code: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SyncStatusRequest {
    pub task_id: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SyncBatchRequest {
    pub sync_type: String,
    pub source_module: String,
    pub target_module: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RetryFailedRequest {
    pub sync_type: Option<String>,
    pub source_module: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SyncStatistics {
    pub total_tasks: i64,
    pub pending_tasks: i64,
    pub success_tasks: i64,
    pub failed_tasks: i64,
    pub in_progress_tasks: i64,
}
