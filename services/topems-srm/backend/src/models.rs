use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct Supplier {
    pub id: Uuid,
    pub supplier_no: String,
    pub name: String,
    pub legal_name: Option<String>,
    pub category: String,
    pub status: String,
    pub tax_id: Option<String>,
    pub address: Option<String>,
    pub contact_person: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub website: Option<String>,
    pub credit_rating: Option<String>,
    pub risk_level: String,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateSupplierRequest {
    pub supplier_no: String,
    pub name: String,
    pub legal_name: Option<String>,
    pub category: String,
    pub status: String,
    pub tax_id: Option<String>,
    pub address: Option<String>,
    pub contact_person: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub website: Option<String>,
    pub credit_rating: Option<String>,
    pub risk_level: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateSupplierRequest {
    pub supplier_no: Option<String>,
    pub name: Option<String>,
    pub legal_name: Option<String>,
    pub category: Option<String>,
    pub status: Option<String>,
    pub tax_id: Option<String>,
    pub address: Option<String>,
    pub contact_person: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub website: Option<String>,
    pub credit_rating: Option<String>,
    pub risk_level: Option<String>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct SupplierEvaluation {
    pub id: Uuid,
    pub supplier_id: Uuid,
    pub evaluation_no: String,
    pub evaluation_date: DateTime<Utc>,
    pub evaluator: Option<String>,
    pub overall_score: Option<f64>,
    pub quality_score: Option<f64>,
    pub delivery_score: Option<f64>,
    pub service_score: Option<f64>,
    pub price_score: Option<f64>,
    pub comments: Option<String>,
    pub status: String,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateSupplierEvaluationRequest {
    pub supplier_id: String,
    pub evaluation_no: String,
    pub evaluator: Option<String>,
    pub overall_score: Option<f64>,
    pub quality_score: Option<f64>,
    pub delivery_score: Option<f64>,
    pub service_score: Option<f64>,
    pub price_score: Option<f64>,
    pub comments: Option<String>,
    pub status: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateSupplierEvaluationRequest {
    pub supplier_id: Option<String>,
    pub evaluation_no: Option<String>,
    pub evaluator: Option<String>,
    pub overall_score: Option<f64>,
    pub quality_score: Option<f64>,
    pub delivery_score: Option<f64>,
    pub service_score: Option<f64>,
    pub price_score: Option<f64>,
    pub comments: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct PurchaseOrder {
    pub id: Uuid,
    pub po_no: String,
    pub supplier_id: Uuid,
    pub order_date: DateTime<Utc>,
    pub expected_date: Option<DateTime<Utc>>,
    pub actual_date: Option<DateTime<Utc>>,
    pub total_amount: Option<f64>,
    pub currency: String,
    pub status: String,
    pub remarks: Option<String>,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreatePurchaseOrderRequest {
    pub po_no: String,
    pub supplier_id: String,
    pub expected_date: Option<String>,
    pub total_amount: Option<f64>,
    pub currency: String,
    pub status: String,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdatePurchaseOrderRequest {
    pub po_no: Option<String>,
    pub supplier_id: Option<String>,
    pub expected_date: Option<DateTime<Utc>>,
    pub actual_date: Option<DateTime<Utc>>,
    pub total_amount: Option<f64>,
    pub currency: Option<String>,
    pub status: Option<String>,
    pub remarks: Option<String>,
}

// Supplier Contract models
#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct SupplierContract {
    pub id: Uuid,
    pub contract_no: String,
    pub supplier_id: Uuid,
    pub supplier_name: Option<String>,
    pub title: String,
    pub contract_type: String,
    pub total_amount: Option<f64>,
    pub currency: String,
    pub sign_date: Option<DateTime<Utc>>,
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
    pub status: String,
    pub remarks: Option<String>,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateSupplierContractRequest {
    pub contract_no: String,
    pub supplier_id: String,
    pub supplier_name: Option<String>,
    pub title: String,
    pub contract_type: String,
    pub total_amount: Option<f64>,
    pub currency: String,
    pub sign_date: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub status: String,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateSupplierContractRequest {
    pub contract_no: Option<String>,
    pub supplier_id: Option<String>,
    pub supplier_name: Option<String>,
    pub title: Option<String>,
    pub contract_type: Option<String>,
    pub total_amount: Option<f64>,
    pub currency: Option<String>,
    pub sign_date: Option<DateTime<Utc>>,
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
    pub status: Option<String>,
    pub remarks: Option<String>,
}

// Statistics models
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SrmStatistics {
    pub total_suppliers: i64,
    pub active_suppliers: i64,
    pub total_evaluations: i64,
    pub avg_score: f64,
    pub total_orders: i64,
    pub total_order_amount: f64,
    pub pending_orders: i64,
    pub completed_orders: i64,
    pub total_contracts: i64,
    pub active_contracts: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SupplierWithStats {
    pub supplier: Supplier,
    pub total_orders: i64,
    pub total_amount: f64,
    pub avg_evaluation_score: Option<f64>,
    pub last_order_date: Option<DateTime<Utc>>,
}
