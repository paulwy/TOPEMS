//! SCM 数据模型

use serde::{Deserialize, Serialize};

/// MRP 计划
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MrpPlan {
    pub id: String,
    pub plan_no: String,
    pub product_name: String,
    pub quantity: f64,
    pub unit: String,
    pub required_date: String,
    pub status: String,
    pub supplier: Option<String>,
}

/// 价格对比
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PriceComparison {
    pub id: String,
    pub material_name: String,
    pub supplier: String,
    pub price: f64,
    pub currency: String,
    pub delivery_days: i32,
    pub quality_score: f64,
}

/// SCM 概览统计
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScmOverview {
    pub total_suppliers: i64,
    pub total_purchase_orders: i64,
    pub pending_approvals: i64,
    pub mrp_plans: i64,
    pub price_comparisons: i64,
}
