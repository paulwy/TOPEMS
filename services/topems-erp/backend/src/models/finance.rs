use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;
use utoipa::ToSchema;

use super::uuid_helpers::option_uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ExpenseStatus {
    Pending,
    Approved,
    Reimbursed,
    Rejected,
}

impl Default for ExpenseStatus {
    fn default() -> Self {
        ExpenseStatus::Pending
    }
}

impl std::fmt::Display for ExpenseStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ExpenseStatus::Pending => write!(f, "PENDING"),
            ExpenseStatus::Approved => write!(f, "APPROVED"),
            ExpenseStatus::Reimbursed => write!(f, "REIMBURSED"),
            ExpenseStatus::Rejected => write!(f, "REJECTED"),
        }
    }
}

impl From<String> for ExpenseStatus {
    fn from(s: String) -> Self {
        match s.to_uppercase().as_str() {
            "PENDING" => ExpenseStatus::Pending,
            "APPROVED" => ExpenseStatus::Approved,
            "REIMBURSED" => ExpenseStatus::Reimbursed,
            "REJECTED" => ExpenseStatus::Rejected,
            _ => ExpenseStatus::Pending,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ReceivableStatus {
    Pending,
    Partial,
    Paid,
    Overdue,
}

impl Default for ReceivableStatus {
    fn default() -> Self {
        ReceivableStatus::Pending
    }
}

impl std::fmt::Display for ReceivableStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ReceivableStatus::Pending => write!(f, "PENDING"),
            ReceivableStatus::Partial => write!(f, "PARTIAL"),
            ReceivableStatus::Paid => write!(f, "PAID"),
            ReceivableStatus::Overdue => write!(f, "OVERDUE"),
        }
    }
}

impl From<String> for ReceivableStatus {
    fn from(s: String) -> Self {
        match s.to_uppercase().as_str() {
            "PENDING" => ReceivableStatus::Pending,
            "PARTIAL" => ReceivableStatus::Partial,
            "PAID" => ReceivableStatus::Paid,
            "OVERDUE" => ReceivableStatus::Overdue,
            _ => ReceivableStatus::Pending,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum PayableStatus {
    Pending,
    Partial,
    Paid,
    Overdue,
}

impl Default for PayableStatus {
    fn default() -> Self {
        PayableStatus::Pending
    }
}

impl std::fmt::Display for PayableStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            PayableStatus::Pending => write!(f, "PENDING"),
            PayableStatus::Partial => write!(f, "PARTIAL"),
            PayableStatus::Paid => write!(f, "PAID"),
            PayableStatus::Overdue => write!(f, "OVERDUE"),
        }
    }
}

impl From<String> for PayableStatus {
    fn from(s: String) -> Self {
        match s.to_uppercase().as_str() {
            "PENDING" => PayableStatus::Pending,
            "PARTIAL" => PayableStatus::Partial,
            "PAID" => PayableStatus::Paid,
            "OVERDUE" => PayableStatus::Overdue,
            _ => PayableStatus::Pending,
        }
    }
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize, ToSchema)]
pub struct Expense {
    pub id: Uuid,
    pub expense_number: String,
    pub applicant_name: Option<String>,
    pub department_id: Option<Uuid>,
    pub project_id: Option<Uuid>,
    pub contract_id: Option<Uuid>,
    pub budget_item_id: Option<Uuid>,
    pub expense_type: Option<String>,
    pub amount: f64,
    pub description: Option<String>,
    pub expense_date: Option<DateTime<Utc>>,
    pub receipt_count: Option<i32>,
    pub status: String,
    pub approver_id: Option<Uuid>,
    pub approved_at: Option<DateTime<Utc>>,
    pub reimbursed_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct CreateExpenseRequest {
    pub expense_number: String,
    pub applicant_name: Option<String>,
    #[serde(default, with = "option_uuid")]
    pub department_id: Option<Uuid>,
    #[serde(default, with = "option_uuid")]
    pub project_id: Option<Uuid>,
    #[serde(default, with = "option_uuid")]
    pub contract_id: Option<Uuid>,
    #[serde(default, with = "option_uuid")]
    pub budget_item_id: Option<Uuid>,
    pub expense_type: Option<String>,
    pub amount: f64,
    pub description: Option<String>,
    pub expense_date: Option<DateTime<Utc>>,
    pub receipt_count: Option<i32>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct UpdateExpenseRequest {
    pub applicant_name: Option<String>,
    #[serde(default, with = "option_uuid")]
    pub department_id: Option<Uuid>,
    #[serde(default, with = "option_uuid")]
    pub project_id: Option<Uuid>,
    #[serde(default, with = "option_uuid")]
    pub contract_id: Option<Uuid>,
    #[serde(default, with = "option_uuid")]
    pub budget_item_id: Option<Uuid>,
    pub expense_type: Option<String>,
    pub amount: Option<f64>,
    pub description: Option<String>,
    pub expense_date: Option<DateTime<Utc>>,
    pub receipt_count: Option<i32>,
    pub status: Option<String>,
    #[serde(default, with = "option_uuid")]
    pub approver_id: Option<Uuid>,
    pub approved_at: Option<DateTime<Utc>>,
    pub reimbursed_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize, ToSchema)]
pub struct Budget {
    pub id: Uuid,
    pub department_id: Option<Uuid>,
    pub budget_type: Option<String>,
    pub fiscal_year: String,
    pub total_budget: f64,
    pub used_amount: f64,
    pub remaining_amount: f64,
    pub usage_rate: f64,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct CreateBudgetRequest {
    #[serde(default, with = "option_uuid")]
    pub department_id: Option<Uuid>,
    pub budget_type: Option<String>,
    pub fiscal_year: String,
    pub total_budget: f64,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct UpdateBudgetRequest {
    #[serde(default, with = "option_uuid")]
    pub department_id: Option<Uuid>,
    pub budget_type: Option<String>,
    pub fiscal_year: Option<String>,
    pub total_budget: Option<f64>,
    pub used_amount: Option<f64>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize, ToSchema)]
pub struct Receivable {
    pub id: Uuid,
    pub invoice_number: String,
    pub customer_name: Option<String>,
    pub project_id: Option<Uuid>,
    pub contract_id: Option<Uuid>,
    pub project_name: Option<String>,
    pub amount: f64,
    pub invoice_date: Option<DateTime<Utc>>,
    pub due_date: Option<DateTime<Utc>>,
    pub status: String,
    pub received_amount: f64,
    pub payment_schedule: Option<serde_json::Value>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct CreateReceivableRequest {
    pub invoice_number: String,
    pub customer_name: Option<String>,
    #[serde(default, with = "option_uuid")]
    pub project_id: Option<Uuid>,
    #[serde(default, with = "option_uuid")]
    pub contract_id: Option<Uuid>,
    pub project_name: Option<String>,
    pub amount: f64,
    pub invoice_date: Option<DateTime<Utc>>,
    pub due_date: Option<DateTime<Utc>>,
    pub payment_schedule: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct UpdateReceivableRequest {
    pub customer_name: Option<String>,
    #[serde(default, with = "option_uuid")]
    pub project_id: Option<Uuid>,
    #[serde(default, with = "option_uuid")]
    pub contract_id: Option<Uuid>,
    pub project_name: Option<String>,
    pub amount: Option<f64>,
    pub invoice_date: Option<DateTime<Utc>>,
    pub due_date: Option<DateTime<Utc>>,
    pub status: Option<String>,
    pub received_amount: Option<f64>,
    pub payment_schedule: Option<serde_json::Value>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize, ToSchema)]
pub struct Payable {
    pub id: Uuid,
    pub invoice_number: String,
    pub supplier_name: Option<String>,
    pub project_id: Option<Uuid>,
    pub contract_id: Option<Uuid>,
    pub category: Option<String>,
    pub amount: f64,
    pub invoice_date: Option<DateTime<Utc>>,
    pub due_date: Option<DateTime<Utc>>,
    pub status: String,
    pub paid_amount: f64,
    pub payment_schedule: Option<serde_json::Value>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct CreatePayableRequest {
    pub invoice_number: String,
    pub supplier_name: Option<String>,
    #[serde(default, with = "option_uuid")]
    pub project_id: Option<Uuid>,
    #[serde(default, with = "option_uuid")]
    pub contract_id: Option<Uuid>,
    pub category: Option<String>,
    pub amount: f64,
    pub invoice_date: Option<DateTime<Utc>>,
    pub due_date: Option<DateTime<Utc>>,
    pub payment_schedule: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct UpdatePayableRequest {
    pub supplier_name: Option<String>,
    #[serde(default, with = "option_uuid")]
    pub project_id: Option<Uuid>,
    #[serde(default, with = "option_uuid")]
    pub contract_id: Option<Uuid>,
    pub category: Option<String>,
    pub amount: Option<f64>,
    pub invoice_date: Option<DateTime<Utc>>,
    pub due_date: Option<DateTime<Utc>>,
    pub status: Option<String>,
    pub paid_amount: Option<f64>,
    pub payment_schedule: Option<serde_json::Value>,
}