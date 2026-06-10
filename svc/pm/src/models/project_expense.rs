use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct ProjectExpense {
    pub id: Uuid,
    pub project_id: Uuid,
    pub phase_id: Option<Uuid>,
    pub expense_type: String,
    pub category: Option<String>,
    pub subcategory: Option<String>,
    pub description: Option<String>,
    pub amount: f64,
    pub currency: Option<String>,
    pub incurred_date: NaiveDate,
    pub reported_date: Option<NaiveDate>,
    pub paid_date: Option<NaiveDate>,
    pub budget_item_id: Option<Uuid>,
    pub resource_id: Option<Uuid>,
    pub expense_ref_id: Option<String>,
    pub status: Option<String>,
    pub approval_workflow_id: Option<Uuid>,
    pub attachment_ids: Option<Vec<Uuid>>,
    pub created_by: Option<String>,
    pub approved_by: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateExpenseRequest {
    pub phase_id: Option<Uuid>,
    pub expense_type: String,
    pub category: Option<String>,
    pub subcategory: Option<String>,
    pub description: Option<String>,
    pub amount: f64,
    pub currency: Option<String>,
    pub incurred_date: NaiveDate,
    pub budget_item_id: Option<Uuid>,
    pub resource_id: Option<Uuid>,
    pub expense_ref_id: Option<String>,
    pub approval_workflow_id: Option<Uuid>,
    pub attachment_ids: Option<Vec<Uuid>>,
    pub created_by: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UpdateExpenseRequest {
    pub expense_type: Option<String>,
    pub category: Option<String>,
    pub subcategory: Option<String>,
    pub description: Option<String>,
    pub amount: Option<f64>,
    pub paid_date: Option<NaiveDate>,
    pub status: Option<String>,
    pub approved_by: Option<String>,
}
