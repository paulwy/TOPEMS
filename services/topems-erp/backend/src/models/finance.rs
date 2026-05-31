use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

use super::uuid_helpers::option_uuid;

// 费用报销模型
#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct Expense {
    pub id: Uuid,
    pub expense_number: String,
    pub applicant_name: Option<String>,
    pub department_id: Option<Uuid>,
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

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CreateExpenseRequest {
    pub expense_number: String,
    pub applicant_name: Option<String>,
    #[serde(default, with = "option_uuid")]
    pub department_id: Option<Uuid>,
    pub expense_type: Option<String>,
    pub amount: f64,
    pub description: Option<String>,
    pub expense_date: Option<DateTime<Utc>>,
    pub receipt_count: Option<i32>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UpdateExpenseRequest {
    pub applicant_name: Option<String>,
    #[serde(default, with = "option_uuid")]
    pub department_id: Option<Uuid>,
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

// 预算管理模型
#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
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

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CreateBudgetRequest {
    #[serde(default, with = "option_uuid")]
    pub department_id: Option<Uuid>,
    pub budget_type: Option<String>,
    pub fiscal_year: String,
    pub total_budget: f64,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UpdateBudgetRequest {
    #[serde(default, with = "option_uuid")]
    pub department_id: Option<Uuid>,
    pub budget_type: Option<String>,
    pub fiscal_year: Option<String>,
    pub total_budget: Option<f64>,
    pub used_amount: Option<f64>,
    pub status: Option<String>,
}

// 应收账款模型
#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct Receivable {
    pub id: Uuid,
    pub invoice_number: String,
    pub customer_name: Option<String>,
    pub project_name: Option<String>,
    pub amount: f64,
    pub invoice_date: Option<DateTime<Utc>>,
    pub due_date: Option<DateTime<Utc>>,
    pub status: String,
    pub received_amount: f64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CreateReceivableRequest {
    pub invoice_number: String,
    pub customer_name: Option<String>,
    pub project_name: Option<String>,
    pub amount: f64,
    pub invoice_date: Option<DateTime<Utc>>,
    pub due_date: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UpdateReceivableRequest {
    pub customer_name: Option<String>,
    pub project_name: Option<String>,
    pub amount: Option<f64>,
    pub invoice_date: Option<DateTime<Utc>>,
    pub due_date: Option<DateTime<Utc>>,
    pub status: Option<String>,
    pub received_amount: Option<f64>,
}

// 应付账款模型
#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct Payable {
    pub id: Uuid,
    pub invoice_number: String,
    pub supplier_name: Option<String>,
    pub category: Option<String>,
    pub amount: f64,
    pub invoice_date: Option<DateTime<Utc>>,
    pub due_date: Option<DateTime<Utc>>,
    pub status: String,
    pub paid_amount: f64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CreatePayableRequest {
    pub invoice_number: String,
    pub supplier_name: Option<String>,
    pub category: Option<String>,
    pub amount: f64,
    pub invoice_date: Option<DateTime<Utc>>,
    pub due_date: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UpdatePayableRequest {
    pub supplier_name: Option<String>,
    pub category: Option<String>,
    pub amount: Option<f64>,
    pub invoice_date: Option<DateTime<Utc>>,
    pub due_date: Option<DateTime<Utc>>,
    pub status: Option<String>,
    pub paid_amount: Option<f64>,
}
