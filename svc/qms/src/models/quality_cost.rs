//! Quality Cost DTOs

use bigdecimal::BigDecimal;
use chrono::NaiveDate;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct QualityCostQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub cost_category: Option<String>,
    pub department: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct QualityCost {
    pub id: String,
    pub tenant_id: String,
    pub cost_no: String,
    pub cost_category: String,
    pub cost_type: Option<String>,
    pub amount: BigDecimal,
    pub department: Option<String>,
    pub description: Option<String>,
    pub related_issue_id: Option<String>,
    pub incurred_date: Option<String>,
    pub created_by: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ListQualityCostsResponse {
    pub costs: Vec<QualityCost>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateQualityCostRequest {
    pub cost_category: String,
    pub cost_type: Option<String>,
    pub amount: BigDecimal,
    pub department: Option<String>,
    pub description: Option<String>,
    pub related_issue_id: Option<String>,
    pub incurred_date: Option<NaiveDate>,
    pub created_by: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UpdateQualityCostRequest {
    pub cost_category: Option<String>,
    pub cost_type: Option<String>,
    pub amount: Option<BigDecimal>,
    pub department: Option<String>,
    pub description: Option<String>,
    pub related_issue_id: Option<String>,
    pub incurred_date: Option<NaiveDate>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CostCategorySummary {
    pub category: String,
    pub total_amount: f64,
    pub count: i64,
    pub percentage: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CostTrendItem {
    pub period: String,
    pub prevention: f64,
    pub appraisal: f64,
    pub internal_failure: f64,
    pub external_failure: f64,
    pub total: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CostDepartmentSummary {
    pub department: String,
    pub total_amount: f64,
    pub count: i64,
    pub percentage: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct QualityCostStatistics {
    pub total_cost: f64,
    pub category_summary: Vec<CostCategorySummary>,
    pub department_summary: Vec<CostDepartmentSummary>,
}
