use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ApprovalType {
    Single,
    Counter,
    Or,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Condition {
    pub field: String,
    pub operator: String,
    pub value: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApprovalNode {
    pub node_id: String,
    pub name: String,
    pub approvers: Vec<String>,
    pub approval_type: ApprovalType,
    pub conditions: Option<Vec<Condition>>,
    pub timeout_hours: Option<i32>,
    pub auto_action: Option<String>,
    pub notification_users: Option<Vec<String>>,
    pub next_nodes: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowDefinition {
    pub version: String,
    pub nodes: Vec<ApprovalNode>,
    pub start_node: String,
    pub end_nodes: Vec<String>,
    pub timeout_action: Option<String>,
}

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
    pub current_node: Option<String>,
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
    pub node_id: Option<String>,
    pub task_name: String,
    pub assignee_id: Option<Uuid>,
    pub status: String,
    pub approval_type: Option<String>,
    pub comment: Option<String>,
    pub approved_by: Option<Uuid>,
    pub approved_at: Option<DateTime<Utc>>,
    pub timeout_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateApprovalRequest {
    pub workflow_instance_id: Uuid,
    pub node_id: Option<String>,
    pub task_name: String,
    pub assignee_id: Option<Uuid>,
    pub approval_type: Option<String>,
    pub timeout_hours: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessApprovalRequest {
    pub action: String,
    pub comment: Option<String>,
    pub actor_id: Uuid,
    pub actor_name: Option<String>,
    pub delegate_to: Option<Uuid>,
    pub delegate_to_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ApprovalRecord {
    pub id: Uuid,
    pub approval_id: Uuid,
    pub action: String,
    pub actor_id: Uuid,
    pub actor_name: Option<String>,
    pub comment: Option<String>,
    pub previous_status: String,
    pub new_status: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateApprovalRecordRequest {
    pub approval_id: Uuid,
    pub action: String,
    pub actor_id: Uuid,
    pub actor_name: Option<String>,
    pub comment: Option<String>,
    pub previous_status: String,
    pub new_status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Notification {
    pub id: Uuid,
    pub user_id: Option<Uuid>,
    pub title: String,
    pub content: String,
    pub notification_type: String,
    pub workflow_instance_id: Option<Uuid>,
    pub approval_id: Option<Uuid>,
    pub is_read: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateNotificationRequest {
    pub user_id: Option<Uuid>,
    pub title: String,
    pub content: String,
    pub notification_type: String,
    pub workflow_instance_id: Option<Uuid>,
    pub approval_id: Option<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum NotificationType {
    #[serde(rename = "approval_created")]
    ApprovalCreated,
    #[serde(rename = "approval_completed")]
    ApprovalCompleted,
    #[serde(rename = "workflow_started")]
    WorkflowStarted,
    #[serde(rename = "workflow_completed")]
    WorkflowCompleted,
    #[serde(rename = "workflow_rejected")]
    WorkflowRejected,
}

impl ToString for NotificationType {
    fn to_string(&self) -> String {
        match self {
            NotificationType::ApprovalCreated => "approval_created".to_string(),
            NotificationType::ApprovalCompleted => "approval_completed".to_string(),
            NotificationType::WorkflowStarted => "workflow_started".to_string(),
            NotificationType::WorkflowCompleted => "workflow_completed".to_string(),
            NotificationType::WorkflowRejected => "workflow_rejected".to_string(),
        }
    }
}
