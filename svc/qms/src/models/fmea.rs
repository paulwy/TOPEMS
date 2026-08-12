//! FMEA (Failure Mode and Effects Analysis) DTOs

use chrono::NaiveDate;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct FmeaQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
    pub product_id: Option<String>,
    pub process_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct FmeaAnalysis {
    pub id: String,
    pub tenant_id: String,
    pub fmea_no: String,
    pub title: String,
    pub fmea_type: String,
    pub product_id: Option<String>,
    pub product_name: Option<String>,
    pub process_id: Option<String>,
    pub process_name: Option<String>,
    pub scope: Option<String>,
    pub status: Option<String>,
    pub revision: Option<String>,
    pub team: Option<String>,
    pub leader: Option<String>,
    pub description: Option<String>,
    pub created_by: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateFmeaRequest {
    pub title: String,
    pub fmea_type: String,
    pub product_id: Option<String>,
    pub product_name: Option<String>,
    pub process_id: Option<String>,
    pub process_name: Option<String>,
    pub scope: Option<String>,
    pub revision: Option<String>,
    pub team: Option<String>,
    pub leader: Option<String>,
    pub description: Option<String>,
    pub created_by: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UpdateFmeaRequest {
    pub title: Option<String>,
    pub fmea_type: Option<String>,
    pub scope: Option<String>,
    pub status: Option<String>,
    pub revision: Option<String>,
    pub team: Option<String>,
    pub leader: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct FmeaItem {
    pub id: String,
    pub tenant_id: String,
    pub fmea_id: String,
    pub component: String,
    pub function: Option<String>,
    pub failure_mode: String,
    pub failure_effect: Option<String>,
    pub failure_cause: Option<String>,
    pub severity: i32,
    pub occurrence: i32,
    pub detection: i32,
    pub rpn: Option<i32>,
    pub current_controls: Option<String>,
    pub recommended_actions: Option<String>,
    pub responsible: Option<String>,
    pub target_date: Option<String>,
    pub action_status: Option<String>,
    pub revised_severity: Option<i32>,
    pub revised_occurrence: Option<i32>,
    pub revised_detection: Option<i32>,
    pub revised_rpn: Option<i32>,
    pub sort_order: Option<i32>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct FmeaItemQuery {
    pub fmea_id: Option<String>,
    pub min_rpn: Option<i64>,
    pub action_status: Option<String>,
    pub sort_by: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateFmeaItemRequest {
    pub fmea_id: String,
    pub component: String,
    pub function: Option<String>,
    pub failure_mode: String,
    pub failure_effect: Option<String>,
    pub failure_cause: Option<String>,
    pub severity: i32,
    pub occurrence: i32,
    pub detection: i32,
    pub current_controls: Option<String>,
    pub recommended_actions: Option<String>,
    pub responsible: Option<String>,
    pub target_date: Option<NaiveDate>,
    pub sort_order: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UpdateFmeaItemRequest {
    pub component: Option<String>,
    pub function: Option<String>,
    pub failure_mode: Option<String>,
    pub failure_effect: Option<String>,
    pub failure_cause: Option<String>,
    pub severity: Option<i32>,
    pub occurrence: Option<i32>,
    pub detection: Option<i32>,
    pub current_controls: Option<String>,
    pub recommended_actions: Option<String>,
    pub responsible: Option<String>,
    pub target_date: Option<NaiveDate>,
    pub action_status: Option<String>,
    pub revised_severity: Option<i32>,
    pub revised_occurrence: Option<i32>,
    pub revised_detection: Option<i32>,
    pub sort_order: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct FmeaStatistics {
    pub total_items: i64,
    pub high_risk_count: i64,
    pub medium_risk_count: i64,
    pub low_risk_count: i64,
    pub average_rpn: f64,
    pub max_rpn: i64,
    pub min_rpn: i64,
}
