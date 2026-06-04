use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct Contract {
    pub id: Uuid,
    pub employee_id: Uuid,
    pub contract_no: Option<String>,
    pub contract_type: String,
    pub party_a_name: Option<String>,
    pub party_a_contact: Option<String>,
    pub party_b_name: Option<String>,
    pub party_b_contact: Option<String>,
    pub start_date: DateTime<Utc>,
    pub end_date: Option<DateTime<Utc>>,
    pub salary: Option<f64>,
    pub probation_period_days: Option<i32>,
    pub contract_file_path: Option<String>,
    pub reminder_days: Option<i32>,
    pub status: String,
    pub notes: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CreateContractRequest {
    pub employee_id: Uuid,
    pub contract_no: Option<String>,
    pub contract_type: String,
    pub party_a_name: Option<String>,
    pub party_a_contact: Option<String>,
    pub party_b_name: Option<String>,
    pub party_b_contact: Option<String>,
    pub start_date: DateTime<Utc>,
    pub end_date: Option<DateTime<Utc>>,
    pub salary: Option<f64>,
    pub probation_period_days: Option<i32>,
    pub contract_file_path: Option<String>,
    pub reminder_days: Option<i32>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UpdateContractRequest {
    pub contract_no: Option<String>,
    pub contract_type: Option<String>,
    pub party_a_name: Option<String>,
    pub party_a_contact: Option<String>,
    pub party_b_name: Option<String>,
    pub party_b_contact: Option<String>,
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
    pub salary: Option<f64>,
    pub probation_period_days: Option<i32>,
    pub contract_file_path: Option<String>,
    pub reminder_days: Option<i32>,
    pub status: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct ContractRenewal {
    pub id: Uuid,
    pub contract_id: Uuid,
    pub previous_contract_id: Option<Uuid>,
    pub renewal_type: String,
    pub renewal_reason: Option<String>,
    pub new_start_date: DateTime<Utc>,
    pub new_end_date: Option<DateTime<Utc>>,
    pub new_salary: Option<f64>,
    pub status: String,
    pub approver_id: Option<Uuid>,
    pub approved_at: Option<DateTime<Utc>>,
    pub rejection_reason: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateRenewalRequest {
    #[allow(dead_code)]
    pub contract_id: Uuid,
    pub renewal_type: String,
    pub renewal_reason: Option<String>,
    pub new_start_date: DateTime<Utc>,
    pub new_end_date: Option<DateTime<Utc>>,
    pub new_salary: Option<f64>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ContractPaginationParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub employee_id: Option<Uuid>,
    pub status: Option<String>,
    pub contract_type: Option<String>,
    #[allow(dead_code)]
    pub expiring_soon: Option<bool>,
}
