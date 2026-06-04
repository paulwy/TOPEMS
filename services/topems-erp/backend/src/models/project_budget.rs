use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;
use utoipa::ToSchema;

#[allow(dead_code)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum BudgetType {
    Capital,
    Operating,
    Expense,
}

impl Default for BudgetType {
    fn default() -> Self {
        BudgetType::Expense
    }
}

impl std::fmt::Display for BudgetType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            BudgetType::Capital => write!(f, "CAPITAL"),
            BudgetType::Operating => write!(f, "OPERATING"),
            BudgetType::Expense => write!(f, "EXPENSE"),
        }
    }
}

#[allow(dead_code)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum BudgetStatus {
    Draft,
    Approved,
    Executing,
    Closed,
}

impl Default for BudgetStatus {
    fn default() -> Self {
        BudgetStatus::Draft
    }
}

impl std::fmt::Display for BudgetStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            BudgetStatus::Draft => write!(f, "DRAFT"),
            BudgetStatus::Approved => write!(f, "APPROVED"),
            BudgetStatus::Executing => write!(f, "EXECUTING"),
            BudgetStatus::Closed => write!(f, "CLOSED"),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct ProjectBudget {
    pub id: Uuid,
    pub project_id: Uuid,
    pub budget_type: String,
    pub fiscal_year: String,
    pub total_budget: f64,
    pub allocated_amount: f64,
    pub used_amount: f64,
    pub remaining_amount: f64,
    pub status: String,
    pub created_by: String,
    pub approved_by: Option<String>,
    pub approved_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateBudgetRequest {
    pub project_id: Uuid,
    pub budget_type: String,
    pub fiscal_year: String,
    pub total_budget: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UpdateBudgetRequest {
    pub budget_type: Option<String>,
    pub fiscal_year: Option<String>,
    pub total_budget: Option<f64>,
    pub allocated_amount: Option<f64>,
    pub used_amount: Option<f64>,
    pub status: Option<String>,
    pub approved_by: Option<String>,
    pub approved_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct ProjectBudgetItem {
    pub id: Uuid,
    pub budget_id: Uuid,
    pub category: String,
    pub subcategory: Option<String>,
    pub budget_amount: f64,
    pub used_amount: f64,
    pub remarks: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateBudgetItemRequest {
    pub budget_id: Uuid,
    pub category: String,
    pub subcategory: Option<String>,
    pub budget_amount: f64,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UpdateBudgetItemRequest {
    pub category: Option<String>,
    pub subcategory: Option<String>,
    pub budget_amount: Option<f64>,
    pub used_amount: Option<f64>,
    pub remarks: Option<String>,
}