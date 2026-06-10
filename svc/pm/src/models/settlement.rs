use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Settlement {
    pub id: Uuid,
    pub project_id: Uuid,
    pub settlement_code: Option<String>,
    pub settlement_name: String,
    pub settlement_type: String,
    pub status: String,
    pub budget_amount: Option<f64>,
    pub actual_amount: Option<f64>,
    pub variance_amount: Option<f64>,
    pub variance_percent: Option<f64>,
    pub settlement_period_start: Option<DateTime<Utc>>,
    pub settlement_period_end: Option<DateTime<Utc>>,
    pub description: Option<String>,
    pub created_by: Option<String>,
    pub approved_by: Option<String>,
    pub approved_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateSettlementRequest {
    pub settlement_code: Option<String>,
    pub settlement_name: String,
    pub settlement_type: String,
    pub settlement_period_start: Option<String>,
    pub settlement_period_end: Option<String>,
    pub description: Option<String>,
    pub created_by: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateSettlementRequest {
    pub settlement_name: Option<String>,
    pub status: Option<String>,
    pub actual_amount: Option<f64>,
    pub description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct SettlementItem {
    pub id: Uuid,
    pub settlement_id: Uuid,
    pub item_code: Option<String>,
    pub item_name: String,
    pub category: Option<String>,
    pub budget_amount: f64,
    pub actual_amount: f64,
    pub variance_amount: f64,
    pub variance_percent: Option<f64>,
    pub description: Option<String>,
    pub expense_ref_id: Option<String>,
    pub contract_ref_id: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateSettlementItemRequest {
    pub item_code: Option<String>,
    pub item_name: String,
    pub category: Option<String>,
    pub budget_amount: f64,
    pub actual_amount: f64,
    pub description: Option<String>,
    pub expense_ref_id: Option<String>,
    pub contract_ref_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateSettlementItemRequest {
    pub item_name: Option<String>,
    pub category: Option<String>,
    pub actual_amount: Option<f64>,
    pub description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct SettlementAdjustment {
    pub id: Uuid,
    pub settlement_id: Uuid,
    pub adjustment_type: String,
    pub adjustment_code: Option<String>,
    pub description: Option<String>,
    pub amount: f64,
    pub reason: Option<String>,
    pub supporting_documents: Option<serde_json::Value>,
    pub created_by: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateSettlementAdjustmentRequest {
    pub adjustment_type: String,
    pub adjustment_code: Option<String>,
    pub description: Option<String>,
    pub amount: f64,
    pub reason: Option<String>,
    pub supporting_documents: Option<serde_json::Value>,
    pub created_by: Option<String>,
}