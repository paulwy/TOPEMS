//! Corrective Action DTOs

use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ActionQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
    pub priority: Option<String>,
    pub issue_id: Option<String>,
    pub search: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ListActionsResponse {
    pub actions: Vec<CorrectiveAction>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct CorrectiveAction {
    pub id: String,
    pub tenant_id: String,
    pub action_no: String,
    pub issue_id: Option<String>,
    pub title: String,
    pub description: Option<String>,
    pub root_cause: Option<String>,
    pub action_type: Option<String>,
    pub status: Option<String>,
    pub priority: Option<String>,
    pub assignee: Option<String>,
    pub target_date: Option<String>,
    pub completed_at: Option<String>,
    pub created_by: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct ActionItem {
    pub id: String,
    pub tenant_id: String,
    pub action_id: String,
    pub item_name: String,
    pub responsible: Option<String>,
    pub due_date: Option<String>,
    pub status: Option<String>,
    pub completed_at: Option<String>,
    pub remark: Option<String>,
    pub created_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateActionRequest {
    pub issue_id: Option<String>,
    pub title: String,
    pub description: Option<String>,
    pub root_cause: Option<String>,
    pub action_type: Option<String>,
    pub priority: Option<String>,
    pub assignee: Option<String>,
    pub target_date: Option<String>,
    pub created_by: Option<String>,
    pub items: Option<Vec<CreateActionItemRequest>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateActionItemRequest {
    pub item_name: String,
    pub responsible: Option<String>,
    pub due_date: Option<String>,
    pub remark: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UpdateActionRequest {
    pub title: Option<String>,
    pub description: Option<String>,
    pub root_cause: Option<String>,
    pub action_type: Option<String>,
    pub status: Option<String>,
    pub priority: Option<String>,
    pub assignee: Option<String>,
    pub target_date: Option<String>,
}
