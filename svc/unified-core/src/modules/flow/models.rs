use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct Workflow {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub definition: serde_json::Value,
    pub status: String,
    pub version: i32,
    pub created_by: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub published_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateWorkflowRequest {
    pub name: String,
    pub description: Option<String>,
    pub definition: Option<serde_json::Value>,
    pub status: Option<String>,
    pub created_by: Option<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateWorkflowRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub definition: Option<serde_json::Value>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct WorkflowInstance {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub workflow_id: Uuid,
    pub title: String,
    pub initiator_id: Uuid,
    pub current_node_id: Option<String>,
    pub status: String,
    pub variables: Option<serde_json::Value>,
    pub started_at: DateTime<Utc>,
    pub completed_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateInstanceRequest {
    pub workflow_id: Uuid,
    pub title: String,
    pub initiator_id: Option<Uuid>,
    pub variables: Option<serde_json::Value>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct WorkflowTask {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub instance_id: Uuid,
    pub node_id: String,
    pub assignee_id: Uuid,
    pub status: String,
    pub comment: Option<String>,
    pub priority: Option<String>,
    pub due_time: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub completed_at: Option<DateTime<Utc>>,
    pub claimed_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskActionRequest {
    pub comment: Option<String>,
    pub variables: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskBatchRequest {
    pub task_ids: Vec<String>,
    pub comment: Option<String>,
    pub action: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskBatchResult {
    pub success_count: i32,
    pub failed_count: i32,
    pub failed_tasks: Vec<TaskFailure>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskFailure {
    pub task_id: String,
    pub error: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskStats {
    pub todo: i32,
    pub done: i32,
    pub sent: i32,
    pub cc: i32,
    pub my_pending: i32,
    pub my_completed: i32,
    pub my_involved: i32,
    pub my_created: i32,
    pub candidate: i32,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct WorkflowCategory {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub name: String,
    pub code: Option<String>,
    pub description: Option<String>,
    pub sort_order: Option<i32>,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateCategoryRequest {
    pub name: String,
    pub code: Option<String>,
    pub description: Option<String>,
    pub sort_order: Option<i32>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct WorkflowDelegate {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub delegator_id: Uuid,
    pub delegator_name: Option<String>,
    pub attorney_id: Uuid,
    pub attorney_name: Option<String>,
    pub start_time: DateTime<Utc>,
    pub end_time: Option<DateTime<Utc>>,
    pub workflow_ids: Option<serde_json::Value>,
    pub reason: Option<String>,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateDelegateRequest {
    pub attorney_id: Uuid,
    pub attorney_name: Option<String>,
    pub start_time: DateTime<Utc>,
    pub end_time: Option<DateTime<Utc>>,
    pub workflow_ids: Option<Vec<String>>,
    pub reason: Option<String>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct FormDefinition {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub category: Option<String>,
    pub fields: serde_json::Value,
    pub layout: Option<serde_json::Value>,
    pub is_active: bool,
    pub version: Option<String>,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateFormDefinitionRequest {
    pub name: String,
    pub description: Option<String>,
    pub category: Option<String>,
    pub fields: serde_json::Value,
    pub layout: Option<serde_json::Value>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct FormInstance {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub form_definition_id: Uuid,
    pub form_definition_name: Option<String>,
    pub workflow_instance_id: Option<Uuid>,
    pub data: serde_json::Value,
    pub status: String,
    pub created_by: Option<Uuid>,
    pub created_by_name: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateFormInstanceRequest {
    pub form_definition_id: Uuid,
    pub workflow_instance_id: Option<Uuid>,
    pub data: serde_json::Value,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct WorkflowHistory {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub workflow_instance_id: Uuid,
    pub workflow_id: Option<Uuid>,
    pub workflow_name: Option<String>,
    pub action: String,
    pub actor_id: Option<Uuid>,
    pub actor_name: Option<String>,
    pub node_id: Option<String>,
    pub node_name: Option<String>,
    pub status_before: Option<String>,
    pub status_after: Option<String>,
    pub comment: Option<String>,
    pub data: Option<serde_json::Value>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct WorkflowSetting {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub key: String,
    pub value: String,
    pub description: String,
    pub category: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateSettingRequest {
    pub key: String,
    pub value: String,
    pub description: String,
    pub category: String,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct WorkflowTemplate {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub template_type: Option<String>,
    pub scope: Option<String>,
    pub definition: Option<serde_json::Value>,
    pub usage_count: Option<i32>,
    pub is_active: Option<bool>,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StatisticsResponse {
    pub total_workflows: i64,
    pub active_workflows: i64,
    pub total_instances: i64,
    pub running_instances: i64,
    pub completed_instances: i64,
    pub rejected_instances: i64,
    pub total_approvals: i64,
    pub pending_approvals: i64,
    pub approved_approvals: i64,
    pub rejected_approvals: i64,
    pub avg_approval_time: f64,
    pub approval_rate: f64,
    pub rejection_rate: f64,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct ProcessLog {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub workflow_instance_id: Uuid,
    pub workflow_id: Option<Uuid>,
    pub workflow_name: Option<String>,
    pub node_id: Option<String>,
    pub node_name: Option<String>,
    pub action: String,
    pub action_type: String,
    pub actor_id: Option<Uuid>,
    pub actor_name: Option<String>,
    pub comment: Option<String>,
    pub data: Option<serde_json::Value>,
    pub duration: Option<i64>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct WorkflowRule {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub name: String,
    pub rule_type: String,
    pub workflow_id: Option<Uuid>,
    pub node_id: Option<String>,
    pub condition: Option<String>,
    pub action: Option<serde_json::Value>,
    pub is_active: bool,
    pub sort_order: Option<i32>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateRuleRequest {
    pub name: String,
    pub rule_type: String,
    pub workflow_id: Option<Uuid>,
    pub node_id: Option<String>,
    pub condition: Option<String>,
    pub action: Option<serde_json::Value>,
    pub is_active: Option<bool>,
}
