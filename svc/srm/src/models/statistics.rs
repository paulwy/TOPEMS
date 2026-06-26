use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use super::supplier::Supplier;

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
