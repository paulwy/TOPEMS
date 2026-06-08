use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DashboardStats {
    pub customers: CustomerStats,
    pub contacts: ContactStats,
    pub opportunities: OpportunityStats,
    pub interactions: InteractionStats,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CustomerStats {
    pub total: i64,
    pub active: i64,
    pub by_industry: Vec<IndustryCount>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct IndustryCount {
    pub industry: Option<String>,
    pub count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContactStats {
    pub total: i64,
    pub active: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OpportunityStats {
    pub total: i64,
    pub by_stage: Vec<StageCount>,
    pub total_value: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct StageCount {
    pub stage: String,
    pub count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InteractionStats {
    pub total: i64,
    pub scheduled: i64,
    pub completed: i64,
    pub by_type: Vec<TypeCount>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct TypeCount {
    pub r#type: String,
    pub count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CustomerWithDetails {
    pub customer: crate::models::Customer,
    pub contacts: Vec<crate::models::Contact>,
    pub opportunities: Vec<crate::models::Opportunity>,
    pub recent_interactions: Vec<crate::models::Interaction>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FunnelStage {
    pub stage: String,
    pub count: i64,
    pub total_value: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SalesForecast {
    pub months: i32,
    pub total_forecast: f64,
    pub last_month_actual: f64,
    pub monthly_forecast: Vec<serde_json::Value>,
}