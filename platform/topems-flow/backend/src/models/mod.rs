use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Workflow {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub definition: serde_json::Value,
    pub is_active: bool,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateWorkflowRequest {
    pub name: String,
    pub description: Option<String>,
    pub definition: serde_json::Value,
    pub created_by: Option<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateWorkflowRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub definition: Option<serde_json::Value>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct WorkflowInstance {
    pub id: Uuid,
    pub workflow_id: Option<Uuid>,
    pub status: String,
    pub initiator_id: Option<Uuid>,
    pub data: Option<serde_json::Value>,
    pub started_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateWorkflowInstanceRequest {
    pub workflow_id: Uuid,
    pub initiator_id: Option<Uuid>,
    pub data: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateInstanceStatusRequest {
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Approval {
    pub id: Uuid,
    pub workflow_instance_id: Option<Uuid>,
    pub task_name: String,
    pub assignee_id: Option<Uuid>,
    pub status: String,
    pub comment: Option<String>,
    pub approved_by: Option<Uuid>,
    pub approved_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateApprovalRequest {
    pub workflow_instance_id: Uuid,
    pub task_name: String,
    pub assignee_id: Option<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessApprovalRequest {
    pub action: String,
    pub comment: Option<String>,
    pub actor_id: Uuid,
    pub delegate_to: Option<Uuid>,
}
