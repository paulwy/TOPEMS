use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ReplenishmentComputeRequest {
    pub warehouse_id: Option<Uuid>,
    pub include_all_warehouses: Option<bool>,
    pub rule_based_only: Option<bool>,
    pub consumption_period_days: Option<i32>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ConfirmSuggestionRequest {
    pub confirmed_quantity: Option<f64>,
    pub supplier_id: Option<Uuid>,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CreateReplenishmentRuleRequest {
    pub rule_name: String,
    pub rule_type: Option<String>,
    pub warehouse_id: Option<Uuid>,
    pub warehouse_name: Option<String>,
    pub material_category: Option<String>,
    pub material_code: Option<String>,
    pub safety_stock: Option<f64>,
    pub reorder_point: Option<f64>,
    pub max_stock: Option<f64>,
    pub safety_factor: Option<f64>,
    pub lead_time_days: Option<i32>,
    pub consumption_days: Option<i32>,
    pub enabled: Option<bool>,
    pub priority_order: Option<i32>,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UpdateReplenishmentRuleRequest {
    pub rule_name: Option<String>,
    pub rule_type: Option<String>,
    pub safety_stock: Option<f64>,
    pub reorder_point: Option<f64>,
    pub max_stock: Option<f64>,
    pub safety_factor: Option<f64>,
    pub lead_time_days: Option<i32>,
    pub consumption_days: Option<i32>,
    pub enabled: Option<bool>,
    pub priority_order: Option<i32>,
    pub remarks: Option<String>,
}
