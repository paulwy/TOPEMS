use bigdecimal::BigDecimal;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct SalaryAdjustment {
    pub id: Uuid,
    pub employee_id: Uuid,
    pub employee_name: Option<String>,
    pub department: Option<String>,
    pub adjustment_type: String,
    pub old_salary: Option<BigDecimal>,
    pub new_salary: Option<BigDecimal>,
    pub adjustment_amount: Option<BigDecimal>,
    pub reason: Option<String>,
    pub effective_date: Option<DateTime<Utc>>,
    pub status: String,
    pub approver_id: Option<Uuid>,
    pub approved_at: Option<DateTime<Utc>>,
    pub rejection_reason: Option<String>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateSalaryAdjustmentRequest {
    pub employee_id: Uuid,
    pub adjustment_type: String,
    pub old_salary: Option<BigDecimal>,
    pub new_salary: Option<BigDecimal>,
    pub reason: Option<String>,
    pub effective_date: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateSalaryAdjustmentRequest {
    pub adjustment_type: Option<String>,
    pub old_salary: Option<BigDecimal>,
    pub new_salary: Option<BigDecimal>,
    pub reason: Option<String>,
    pub effective_date: Option<DateTime<Utc>>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApproveSalaryAdjustmentRequest {
    pub approver_id: Uuid,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RejectSalaryAdjustmentRequest {
    pub approver_id: Uuid,
    pub reason: String,
}
