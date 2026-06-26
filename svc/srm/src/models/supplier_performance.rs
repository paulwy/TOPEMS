use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceReportDetail {
    pub id: String,
    pub supplier_id: String,
    pub supplier_name: String,
    pub report_period: String,
    pub overall_score: f64,
    pub quality_score: Option<f64>,
    pub delivery_score: Option<f64>,
    pub service_score: Option<f64>,
    pub price_score: Option<f64>,
    pub on_time_delivery_rate: Option<f64>,
    pub defect_rate: Option<f64>,
    pub total_orders: i64,
    pub total_amount: f64,
    pub evaluation_count: i64,
    pub strengths: Option<Vec<String>>,
    pub weaknesses: Option<Vec<String>>,
    pub recommendations: Option<Vec<String>>,
    pub generated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceTrendItem {
    pub period: String,
    pub avg_overall_score: f64,
    pub avg_quality_score: Option<f64>,
    pub avg_delivery_score: Option<f64>,
    pub avg_service_score: Option<f64>,
    pub avg_price_score: Option<f64>,
    pub order_count: i64,
    pub total_amount: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceTrendResponse {
    pub supplier_id: Option<String>,
    pub supplier_name: Option<String>,
    pub period: String,
    pub trends: Vec<PerformanceTrendItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SupplierComparison {
    pub supplier_id: String,
    pub supplier_name: String,
    pub overall_score: f64,
    pub quality_score: Option<f64>,
    pub delivery_score: Option<f64>,
    pub service_score: Option<f64>,
    pub price_score: Option<f64>,
    pub on_time_delivery_rate: Option<f64>,
    pub defect_rate: Option<f64>,
    pub total_orders: i64,
    pub total_amount: f64,
    pub evaluation_count: i64,
    pub rank: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SupplierComparisonResponse {
    pub suppliers: Vec<SupplierComparison>,
    pub comparison_date: String,
    pub best_supplier: Option<String>,
    pub worst_supplier: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceSummary {
    pub total_suppliers: i64,
    pub evaluated_suppliers: i64,
    pub evaluation_rate: f64,
    pub avg_overall_score: f64,
    pub top_supplier: Option<TopSupplierInfo>,
    pub bottom_supplier: Option<TopSupplierInfo>,
    pub category_scores: Vec<CategoryScore>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TopSupplierInfo {
    pub name: String,
    pub avg_score: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CategoryScore {
    pub category: String,
    pub avg_score: f64,
    pub supplier_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScoreLevelDistribution {
    pub level: String,
    pub label: String,
    pub count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScoreLevelDefinitions {
    pub level: String,
    pub range: String,
    pub description: String,
}
