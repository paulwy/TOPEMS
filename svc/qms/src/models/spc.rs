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

#[cfg(test)]
mod tests {
    use super::*;
    use serde::{Deserialize, Serialize};

    fn roundtrip<T: Serialize + for<'de> Deserialize<'de>>(item: &T) {
        let json = serde_json::to_string(item).unwrap();
        let v1: serde_json::Value = serde_json::from_str(&json).unwrap();
        let back: T = serde_json::from_str(&json).unwrap();
        let json2 = serde_json::to_string(&back).unwrap();
        let v2: serde_json::Value = serde_json::from_str(&json2).unwrap();
        assert_eq!(v1, v2);
    }

    #[test]
    fn test_spc_chart_query() {
        roundtrip(&SpcChartQuery {
            page: Some(1),
            page_size: Some(10),
            chart_type: None,
            product_id: None,
        });
    }

    #[test]
    fn test_spc_chart() {
        roundtrip(&SpcChart {
            id: "id".to_string(),
            tenant_id: "t".to_string(),
            chart_no: "CH001".to_string(),
            chart_type: "XbarR".to_string(),
            product_id: None,
            product_name: None,
            parameter_name: "p".to_string(),
            ucl: Some(BigDecimal::from(10)),
            cl: Some(BigDecimal::from(5)),
            lcl: Some(BigDecimal::from(0)),
            cp: None,
            cpk: None,
            pp: None,
            ppk: None,
            sample_count: None,
            status: None,
            created_by: None,
            created_at: None,
            updated_at: None,
        });
    }

    #[test]
    fn test_create_spc_chart_request() {
        roundtrip(&CreateSpcChartRequest {
            chart_type: "XbarR".to_string(),
            product_id: None,
            product_name: None,
            parameter_name: "p".to_string(),
            ucl: None,
            cl: None,
            lcl: None,
            created_by: None,
        });
    }

    #[test]
    fn test_update_spc_chart_request() {
        roundtrip(&UpdateSpcChartRequest {
            chart_type: None,
            parameter_name: None,
            ucl: None,
            cl: None,
            lcl: None,
            status: None,
        });
    }

    #[test]
    fn test_spc_data_point() {
        roundtrip(&SpcDataPoint {
            id: "id".to_string(),
            tenant_id: "t".to_string(),
            chart_id: "c".to_string(),
            sample_no: 1,
            value: BigDecimal::from(0),
            subgroup_size: None,
            is_out_of_control: None,
            trend_flag: None,
            measured_at: None,
            created_at: None,
        });
    }

    #[test]
    fn test_spc_data_query() {
        roundtrip(&SpcDataQuery {
            chart_id: "c".to_string(),
            start_time: None,
            end_time: None,
            limit: None,
        });
    }

    #[test]
    fn test_create_spc_data_request() {
        roundtrip(&CreateSpcDataRequest {
            chart_id: "c".to_string(),
            sample_no: 1,
            value: BigDecimal::from(0),
            subgroup_size: None,
            measured_at: None,
        });
    }

    #[test]
    fn test_control_limit_result() {
        roundtrip(&ControlLimitResult {
            ucl: 10.0,
            cl: 5.0,
            lcl: 0.0,
            cp: None,
            cpk: None,
            pp: None,
            ppk: None,
            out_of_control_count: 0,
            data_points: vec![CalculatedDataPoint {
                sample_no: 1,
                value: 5.0,
                subgroup_size: None,
                is_out_of_control: None,
                trend_flag: None,
            }],
        });
    }

    #[test]
    fn test_calculate_control_limit_request() {
        roundtrip(&CalculateControlLimitRequest {
            chart_type: "XbarR".to_string(),
            values: vec![1.0, 2.0, 3.0],
            subgroup_size: None,
            usl: None,
            lsl: None,
        });
    }
}
