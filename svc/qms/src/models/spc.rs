//! SPC (Statistical Process Control) DTOs

use bigdecimal::BigDecimal;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct SpcChartQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub chart_type: Option<String>,
    pub product_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct SpcChart {
    pub id: String,
    pub tenant_id: String,
    pub chart_no: String,
    pub chart_type: String,
    pub product_id: Option<String>,
    pub product_name: Option<String>,
    pub parameter_name: String,
    pub ucl: Option<BigDecimal>,
    pub cl: Option<BigDecimal>,
    pub lcl: Option<BigDecimal>,
    pub cp: Option<BigDecimal>,
    pub cpk: Option<BigDecimal>,
    pub pp: Option<BigDecimal>,
    pub ppk: Option<BigDecimal>,
    pub sample_count: Option<i32>,
    pub status: Option<String>,
    pub created_by: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateSpcChartRequest {
    pub chart_type: String,
    pub product_id: Option<String>,
    pub product_name: Option<String>,
    pub parameter_name: String,
    pub ucl: Option<BigDecimal>,
    pub cl: Option<BigDecimal>,
    pub lcl: Option<BigDecimal>,
    pub created_by: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UpdateSpcChartRequest {
    pub chart_type: Option<String>,
    pub parameter_name: Option<String>,
    pub ucl: Option<BigDecimal>,
    pub cl: Option<BigDecimal>,
    pub lcl: Option<BigDecimal>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct SpcDataPoint {
    pub id: String,
    pub tenant_id: String,
    pub chart_id: String,
    pub sample_no: i32,
    pub value: BigDecimal,
    pub subgroup_size: Option<i32>,
    pub is_out_of_control: Option<bool>,
    pub trend_flag: Option<String>,
    pub measured_at: Option<String>,
    pub created_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct SpcDataQuery {
    pub chart_id: String,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
    pub limit: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateSpcDataRequest {
    pub chart_id: String,
    pub sample_no: i32,
    pub value: BigDecimal,
    pub subgroup_size: Option<i32>,
    pub measured_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ControlLimitResult {
    pub ucl: f64,
    pub cl: f64,
    pub lcl: f64,
    pub cp: Option<f64>,
    pub cpk: Option<f64>,
    pub pp: Option<f64>,
    pub ppk: Option<f64>,
    pub out_of_control_count: i64,
    pub data_points: Vec<CalculatedDataPoint>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CalculatedDataPoint {
    pub sample_no: i32,
    pub value: f64,
    pub subgroup_size: Option<i32>,
    pub is_out_of_control: Option<bool>,
    pub trend_flag: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CalculateControlLimitRequest {
    pub chart_type: String,
    pub values: Vec<f64>,
    pub subgroup_size: Option<i64>,
    pub usl: Option<f64>,
    pub lsl: Option<f64>,
}
