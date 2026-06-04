use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Contract {
    pub id: Uuid,
    pub project_id: Option<Uuid>,
    pub contract_code: String,
    pub contract_name: String,
    pub contract_type: String,
    pub contract_category: Option<String>,
    pub party_a_name: Option<String>,
    pub party_a_id: Option<String>,
    pub party_b_name: Option<String>,
    pub party_b_id: Option<String>,
    pub amount: f64,
    pub currency: String,
    pub tax_rate: f64,
    pub signing_date: Option<DateTime<Utc>>,
    pub effective_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
    pub status: String,
    pub template_id: Option<Uuid>,
    pub workflow_instance_id: Option<Uuid>,
    pub description: Option<String>,
    pub attachment_ids: Option<Vec<Uuid>>,
    pub created_by: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateContractRequest {
    pub project_id: Option<Uuid>,
    pub contract_code: String,
    pub contract_name: String,
    pub contract_type: String,
    pub contract_category: Option<String>,
    pub party_a_name: Option<String>,
    pub party_a_id: Option<String>,
    pub party_b_name: Option<String>,
    pub party_b_id: Option<String>,
    pub amount: f64,
    pub currency: Option<String>,
    pub tax_rate: Option<f64>,
    pub signing_date: Option<String>,
    pub effective_date: Option<String>,
    pub end_date: Option<String>,
    pub template_id: Option<Uuid>,
    pub description: Option<String>,
    pub created_by: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateContractRequest {
    pub contract_name: Option<String>,
    pub contract_category: Option<String>,
    pub party_a_name: Option<String>,
    pub party_a_id: Option<String>,
    pub party_b_name: Option<String>,
    pub party_b_id: Option<String>,
    pub amount: Option<f64>,
    pub currency: Option<String>,
    pub tax_rate: Option<f64>,
    pub signing_date: Option<String>,
    pub effective_date: Option<String>,
    pub end_date: Option<String>,
    pub status: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct ContractMilestone {
    pub id: Uuid,
    pub contract_id: Uuid,
    pub project_milestone_id: Option<Uuid>,
    pub name: String,
    pub description: Option<String>,
    pub target_date: DateTime<Utc>,
    pub payment_amount: f64,
    pub payment_percent: Option<f64>,
    pub status: String,
    pub actual_date: Option<DateTime<Utc>>,
    pub payment_status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateContractMilestoneRequest {
    pub name: String,
    pub description: Option<String>,
    pub target_date: String,
    pub payment_amount: Option<f64>,
    pub payment_percent: Option<f64>,
    pub project_milestone_id: Option<Uuid>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct ContractPaymentSchedule {
    pub id: Uuid,
    pub contract_id: Uuid,
    pub payment_number: i32,
    pub payment_name: Option<String>,
    pub payment_percent: Option<f64>,
    pub payment_amount: f64,
    pub due_date: DateTime<Utc>,
    pub actual_payment_date: Option<DateTime<Utc>>,
    pub actual_payment_amount: Option<f64>,
    pub status: String,
    pub invoice_number: Option<String>,
    pub expense_ref_id: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreatePaymentScheduleRequest {
    pub payment_number: i32,
    pub payment_name: Option<String>,
    pub payment_percent: Option<f64>,
    pub payment_amount: f64,
    pub due_date: String,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct ContractTemplate {
    pub id: Uuid,
    pub name: String,
    pub contract_type: String,
    pub description: Option<String>,
    pub content: serde_json::Value,
    pub is_active: bool,
    pub created_by: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateContractTemplateRequest {
    pub name: String,
    pub contract_type: String,
    pub description: Option<String>,
    pub content: serde_json::Value,
    pub created_by: Option<String>,
}