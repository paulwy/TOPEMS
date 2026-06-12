use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Budget {
    pub id: Uuid,
    pub project_id: Uuid,
    pub budget_code: String,
    pub budget_name: String,
    pub budget_type: Option<String>,
    pub total_amount: f64,
    pub allocated_amount: f64,
    pub spent_amount: f64,
    pub status: String,
    pub version: i32,
    pub created_by: Option<String>,
    pub approved_by: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateBudgetRequest {
    pub project_id: Uuid,
    pub budget_code: String,
    pub budget_name: String,
    pub budget_type: Option<String>,
    pub total_amount: f64,
    pub created_by: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateBudgetRequest {
    pub budget_name: Option<String>,
    pub budget_type: Option<String>,
    pub total_amount: Option<f64>,
    pub status: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct BudgetItem {
    pub id: Uuid,
    pub budget_id: Uuid,
    pub item_code: Option<String>,
    pub item_name: String,
    pub category: Option<String>,
    pub subcategory: Option<String>,
    pub budget_amount: f64,
    pub allocated_amount: f64,
    pub spent_amount: f64,
    pub description: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateBudgetItemRequest {
    pub item_code: Option<String>,
    pub item_name: String,
    pub category: Option<String>,
    pub subcategory: Option<String>,
    pub budget_amount: f64,
    pub description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateBudgetItemRequest {
    pub item_name: Option<String>,
    pub category: Option<String>,
    pub subcategory: Option<String>,
    pub budget_amount: Option<f64>,
    pub description: Option<String>,
}
