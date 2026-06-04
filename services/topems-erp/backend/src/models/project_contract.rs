use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;
use utoipa::ToSchema;

#[allow(dead_code)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ContractType {
    Sales,
    Purchase,
    Service,
    Other,
}

impl Default for ContractType {
    fn default() -> Self {
        ContractType::Other
    }
}

impl std::fmt::Display for ContractType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ContractType::Sales => write!(f, "SALES"),
            ContractType::Purchase => write!(f, "PURCHASE"),
            ContractType::Service => write!(f, "SERVICE"),
            ContractType::Other => write!(f, "OTHER"),
        }
    }
}

#[allow(dead_code)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ContractStatus {
    Draft,
    PendingApproval,
    Active,
    Expired,
    Terminated,
}

impl Default for ContractStatus {
    fn default() -> Self {
        ContractStatus::Draft
    }
}

impl std::fmt::Display for ContractStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ContractStatus::Draft => write!(f, "DRAFT"),
            ContractStatus::PendingApproval => write!(f, "PENDING_APPROVAL"),
            ContractStatus::Active => write!(f, "ACTIVE"),
            ContractStatus::Expired => write!(f, "EXPIRED"),
            ContractStatus::Terminated => write!(f, "TERMINATED"),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct ProjectContract {
    pub id: Uuid,
    pub project_id: Uuid,
    pub contract_no: String,
    pub contract_type: String,
    pub party_a: String,
    pub party_b: String,
    pub subject: String,
    pub amount: f64,
    pub tax_amount: Option<f64>,
    pub total_amount: f64,
    pub currency: String,
    pub signing_date: DateTime<Utc>,
    pub effective_date: DateTime<Utc>,
    pub expiration_date: Option<DateTime<Utc>>,
    pub status: String,
    pub payment_terms: Option<serde_json::Value>,
    pub attachment_ids: Option<serde_json::Value>,
    pub created_by: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateContractRequest {
    pub project_id: Uuid,
    pub contract_no: String,
    pub contract_type: String,
    pub party_a: String,
    pub party_b: String,
    pub subject: String,
    pub amount: f64,
    pub tax_amount: Option<f64>,
    pub currency: Option<String>,
    pub signing_date: DateTime<Utc>,
    pub effective_date: DateTime<Utc>,
    pub expiration_date: Option<DateTime<Utc>>,
    pub payment_terms: Option<serde_json::Value>,
    pub attachment_ids: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UpdateContractRequest {
    pub contract_no: Option<String>,
    pub contract_type: Option<String>,
    pub party_a: Option<String>,
    pub party_b: Option<String>,
    pub subject: Option<String>,
    pub amount: Option<f64>,
    pub tax_amount: Option<f64>,
    pub expiration_date: Option<DateTime<Utc>>,
    pub status: Option<String>,
    pub payment_terms: Option<serde_json::Value>,
    pub attachment_ids: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ContractPaginationParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub project_id: Option<Uuid>,
    pub contract_type: Option<String>,
    pub status: Option<String>,
}