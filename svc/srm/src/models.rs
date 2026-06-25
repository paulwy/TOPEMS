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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CategoryCount {
    pub category: String,
    pub count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StatusCount {
    pub status: String,
    pub count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScoreDistribution {
    pub range: String,
    pub count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MonthlyOrderTrend {
    pub month: String,
    pub order_count: i64,
    pub total_amount: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SrmDetailedStatistics {
    pub basic: SrmStatistics,
    pub supplier_by_category: Vec<CategoryCount>,
    pub supplier_by_status: Vec<StatusCount>,
    pub order_by_status: Vec<StatusCount>,
    pub evaluation_score_distribution: Vec<ScoreDistribution>,
    pub monthly_order_trend: Vec<MonthlyOrderTrend>,
    pub contract_by_status: Vec<StatusCount>,
}

// ==================== Supplier Category Models ====================

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct SupplierCategory {
    pub id: Uuid,
    pub category_no: String,
    pub name: String,
    pub description: Option<String>,
    pub parent_id: Option<Uuid>,
    pub level: i32,
    pub is_active: bool,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateSupplierCategoryRequest {
    pub category_no: String,
    pub name: String,
    pub description: Option<String>,
    pub parent_id: Option<String>,
    pub level: i32,
    pub is_active: bool,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateSupplierCategoryRequest {
    pub category_no: Option<String>,
    pub name: Option<String>,
    pub description: Option<String>,
    pub parent_id: Option<String>,
    pub level: Option<i32>,
    pub is_active: Option<bool>,
}

// ==================== Supplier Product Models ====================

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct SupplierProduct {
    pub id: Uuid,
    pub product_no: String,
    pub supplier_id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub category: Option<String>,
    pub unit: Option<String>,
    pub unit_price: Option<f64>,
    pub currency: String,
    pub min_order_qty: Option<i32>,
    pub lead_time_days: Option<i32>,
    pub status: String,
    pub specifications: Option<String>,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateSupplierProductRequest {
    pub product_no: String,
    pub supplier_id: String,
    pub name: String,
    pub description: Option<String>,
    pub category: Option<String>,
    pub unit: Option<String>,
    pub unit_price: Option<f64>,
    pub currency: String,
    pub min_order_qty: Option<i32>,
    pub lead_time_days: Option<i32>,
    pub status: String,
    pub specifications: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateSupplierProductRequest {
    pub product_no: Option<String>,
    pub supplier_id: Option<String>,
    pub name: Option<String>,
    pub description: Option<String>,
    pub category: Option<String>,
    pub unit: Option<String>,
    pub unit_price: Option<f64>,
    pub currency: Option<String>,
    pub min_order_qty: Option<i32>,
    pub lead_time_days: Option<i32>,
    pub status: Option<String>,
    pub specifications: Option<String>,
}

// ==================== Audit Log Models ====================

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct AuditLog {
    pub id: Uuid,
    pub table_name: String,
    pub record_id: Uuid,
    pub action: String,
    pub old_values: Option<serde_json::Value>,
    pub new_values: Option<serde_json::Value>,
    pub changed_by: Option<Uuid>,
    pub changed_at: DateTime<Utc>,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
    pub organization_id: Option<Uuid>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateAuditLogRequest {
    pub table_name: String,
    pub record_id: String,
    pub action: String,
    pub old_values: Option<serde_json::Value>,
    pub new_values: Option<serde_json::Value>,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
    pub organization_id: Option<String>,
}

// ==================== Supplier Performance Models ====================

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct SupplierPerformance {
    pub supplier_id: Uuid,
    pub supplier_name: String,
    pub total_orders: i64,
    pub total_amount: f64,
    pub avg_quality_score: Option<f64>,
    pub avg_delivery_score: Option<f64>,
    pub avg_service_score: Option<f64>,
    pub avg_price_score: Option<f64>,
    pub avg_overall_score: Option<f64>,
    pub on_time_delivery_rate: Option<f64>,
    pub defect_rate: Option<f64>,
    pub last_evaluation_date: Option<DateTime<Utc>>,
    pub evaluation_count: i64,
}

// ==================== Scoring Dimension Models ====================

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct ScoringDimension {
    pub id: Uuid,
    pub name: String,
    pub code: String,
    pub weight: f64,
    pub min_score: f64,
    pub max_score: f64,
    pub description: Option<String>,
    pub is_active: bool,
    pub sort_order: i32,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateScoringDimensionRequest {
    pub name: String,
    pub code: String,
    pub weight: f64,
    pub min_score: f64,
    pub max_score: f64,
    pub description: Option<String>,
    pub is_active: bool,
    pub sort_order: i32,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateScoringDimensionRequest {
    pub name: Option<String>,
    pub code: Option<String>,
    pub weight: Option<f64>,
    pub min_score: Option<f64>,
    pub max_score: Option<f64>,
    pub description: Option<String>,
    pub is_active: Option<bool>,
    pub sort_order: Option<i32>,
}

// ==================== Scoring Result Models ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScoringResult {
    pub supplier_id: Uuid,
    pub supplier_name: String,
    pub overall_score: f64,
    pub level: String,
    pub level_description: String,
    pub dimension_scores: Vec<DimensionScore>,
    pub evaluation_count: i64,
    pub last_evaluation_date: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DimensionScore {
    pub dimension_code: String,
    pub dimension_name: String,
    pub score: f64,
    pub weight: f64,
    pub weighted_score: f64,
}

// ==================== Evaluation Summary Models ====================

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct EvaluationSummaryRow {
    pub total_evaluations: Option<i64>,
    pub avg_overall_score: Option<f64>,
    pub avg_quality_score: Option<f64>,
    pub avg_delivery_score: Option<f64>,
    pub avg_service_score: Option<f64>,
    pub avg_price_score: Option<f64>,
    pub max_overall_score: Option<f64>,
    pub min_overall_score: Option<f64>,
    pub latest_evaluation_date: Option<DateTime<Utc>>,
    pub earliest_evaluation_date: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct EvaluationScoreTrendRow {
    pub evaluation_date: DateTime<Utc>,
    pub overall_score: Option<f64>,
    pub quality_score: Option<f64>,
    pub delivery_score: Option<f64>,
    pub service_score: Option<f64>,
    pub price_score: Option<f64>,
    pub evaluation_no: String,
}

// ==================== Contract Terms Models ====================

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct ContractTerm {
    pub id: Uuid,
    pub contract_id: Uuid,
    pub term_type: String,
    pub title: String,
    pub content: Option<String>,
    pub sort_order: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateContractTermRequest {
    pub contract_id: String,
    pub term_type: String,
    pub title: String,
    pub content: Option<String>,
    pub sort_order: i32,
}
