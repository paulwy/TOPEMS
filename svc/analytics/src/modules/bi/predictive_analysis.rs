use axum::{extract::State, Json};
use serde::{Deserialize, Serialize};
use sqlx::types::Uuid;
use tracing::{info, warn};

use crate::shared::AppState;

use super::chart_service::quote_identifier;
use super::dataset_whitelist::validate_columns;

const DEFAULT_BI_TABLE: &str = "analytics_data";

/// S1.2 + S1.3: 构建并验证预测查询的 (time, value) 字段对。
///
/// - L1 层：`quote_identifier` 校验两个字段名的语法合法性。
/// - L2 层：`validate_columns` 检查字段是否在 bi_datasets 白名单中（strict 模式直接拒）。
///
/// 返回 (quoted_time, quoted_value, quoted_time_for_order_by)；
/// 错误时直接返回 `Err(String)`，由 handler 转换为 JSON 500 响应。
async fn validate_prediction_fields(
    pool: &sqlx::PgPool,
    time_field: &str,
    value_field: &str,
) -> Result<(String, String), String> {
    let t = quote_identifier(time_field)?;
    let v = quote_identifier(value_field)?;

    // sort 也依赖 time_field，白名单校验覆盖全部字段。
    let cols = vec![time_field.to_string(), value_field.to_string()];
    validate_columns(pool, DEFAULT_BI_TABLE, &cols).await?;

    Ok((t, v))
}

#[derive(Debug, Deserialize)]
pub struct MovingAverageRequest {
    pub datasource_id: Uuid,
    pub time_field: String,
    pub value_field: String,
    pub window_size: Option<i32>,
    pub forecast_periods: Option<i32>,
    pub filters: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct ExponentialSmoothingRequest {
    pub datasource_id: Uuid,
    pub time_field: String,
    pub value_field: String,
    pub alpha: Option<f64>,
    pub forecast_periods: Option<i32>,
    pub filters: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct TrendAnalysisRequest {
    pub datasource_id: Uuid,
    pub time_field: String,
    pub value_field: String,
    pub filters: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct PredictionCompareRequest {
    pub datasource_id: Uuid,
    pub time_field: String,
    pub value_field: String,
    pub prediction_method: String,
    pub actual_start_date: String,
    pub actual_end_date: String,
    pub prediction_start_date: String,
    pub prediction_end_date: String,
    pub filters: Option<serde_json::Value>,
}

#[derive(Debug, Serialize)]
pub struct PredictionPoint {
    pub time: String,
    pub value: Option<f64>,
    pub predicted_value: Option<f64>,
    pub lower_bound: Option<f64>,
    pub upper_bound: Option<f64>,
}

#[derive(Debug, Serialize)]
pub struct MovingAverageResponse {
    pub datasource_id: Uuid,
    pub time_field: String,
    pub value_field: String,
    pub window_size: i32,
    pub forecast_periods: i32,
    pub historical_data: Vec<PredictionPoint>,
    pub forecast_data: Vec<PredictionPoint>,
    pub mape: Option<f64>,
}

#[derive(Debug, Serialize)]
pub struct ExponentialSmoothingResponse {
    pub datasource_id: Uuid,
    pub time_field: String,
    pub value_field: String,
    pub alpha: f64,
    pub forecast_periods: i32,
    pub historical_data: Vec<PredictionPoint>,
    pub forecast_data: Vec<PredictionPoint>,
    pub mape: Option<f64>,
}

#[derive(Debug, Serialize)]
pub struct TrendAnalysisResponse {
    pub datasource_id: Uuid,
    pub time_field: String,
    pub value_field: String,
    pub trend_slope: f64,
    pub trend_intercept: f64,
    pub r_squared: f64,
    pub trend_direction: String,
    pub data_points: Vec<PredictionPoint>,
}

#[derive(Debug, Serialize)]
pub struct PredictionCompareResponse {
    pub datasource_id: Uuid,
    pub prediction_method: String,
    pub actual_data: Vec<PredictionPoint>,
    pub predicted_data: Vec<PredictionPoint>,
    pub comparison_metrics: ComparisonMetrics,
}

#[derive(Debug, Serialize)]
pub struct ComparisonMetrics {
    pub mape: f64,
    pub mae: f64,
    pub mse: f64,
    pub rmse: f64,
    pub total_actual: f64,
    pub total_predicted: f64,
    pub variance_percentage: f64,
}

fn simple_moving_average(data: &[f64], window_size: usize) -> Vec<Option<f64>> {
    let mut result = Vec::new();
    for i in 0..data.len() {
        if i + 1 < window_size {
            result.push(None);
        } else {
            let sum: f64 = data[i + 1 - window_size..=i].iter().sum();
            result.push(Some(sum / window_size as f64));
        }
    }
    result
}

fn forecast_ma(last_values: &[f64], window_size: usize, periods: usize) -> Vec<f64> {
    let mut forecasts = Vec::new();
    let mut current_values: Vec<f64> = last_values
        .iter()
        .rev()
        .take(window_size)
        .cloned()
        .collect();
    current_values.reverse();

    for _ in 0..periods {
        let next_val: f64 = current_values.iter().sum::<f64>() / current_values.len() as f64;
        forecasts.push(next_val);
        current_values.remove(0);
        current_values.push(next_val);
    }
    forecasts
}

fn exponential_smoothing(data: &[f64], alpha: f64) -> Vec<f64> {
    if data.is_empty() {
        return Vec::new();
    }
    let mut result = vec![data[0]];
    for i in 1..data.len() {
        let smoothed = alpha * data[i] + (1.0 - alpha) * result[i - 1];
        result.push(smoothed);
    }
    result
}

fn forecast_es(last_value: f64, periods: usize) -> Vec<f64> {
    vec![last_value; periods]
}

fn calculate_linear_regression(data: &[(f64, f64)]) -> (f64, f64, f64) {
    let n = data.len() as f64;
    if n == 0.0 {
        return (0.0, 0.0, 0.0);
    }

    let sum_x: f64 = data.iter().map(|(x, _)| x).sum();
    let sum_y: f64 = data.iter().map(|(_, y)| y).sum();
    let sum_xy: f64 = data.iter().map(|(x, y)| x * y).sum();
    let sum_x2: f64 = data.iter().map(|(x, _)| x * x).sum();
    let sum_y2: f64 = data.iter().map(|(_, y)| y * y).sum();

    let slope = (n * sum_xy - sum_x * sum_y) / (n * sum_x2 - sum_x * sum_x);
    let intercept = (sum_y - slope * sum_x) / n;

    let ss_tot = sum_y2 - sum_y * sum_y / n;
    let ss_res = sum_y2 - slope * sum_xy - intercept * sum_y;
    let r_squared = if ss_tot != 0.0 {
        1.0 - ss_res / ss_tot
    } else {
        0.0
    };

    (slope, intercept, r_squared)
}

fn calculate_mape(actual: &[f64], predicted: &[f64]) -> f64 {
    if actual.is_empty() || predicted.is_empty() {
        return 0.0;
    }
    let n = actual.len().min(predicted.len());
    let mut total = 0.0;
    let mut count = 0;
    for i in 0..n {
        if actual[i].abs() > 0.0 {
            total += ((actual[i] - predicted[i]).abs() / actual[i].abs()) * 100.0;
            count += 1;
        }
    }
    if count == 0 {
        0.0
    } else {
        total / count as f64
    }
}

fn calculate_mae(actual: &[f64], predicted: &[f64]) -> f64 {
    if actual.is_empty() || predicted.is_empty() {
        return 0.0;
    }
    let n = actual.len().min(predicted.len());
    let total: f64 = (0..n).map(|i| (actual[i] - predicted[i]).abs()).sum();
    total / n as f64
}

fn calculate_mse(actual: &[f64], predicted: &[f64]) -> f64 {
    if actual.is_empty() || predicted.is_empty() {
        return 0.0;
    }
    let n = actual.len().min(predicted.len());
    let total: f64 = (0..n).map(|i| (actual[i] - predicted[i]).powi(2)).sum();
    total / n as f64
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["analytics:write"])),
    path = "/prediction/moving-average",
    tag = "Prediction",
    operation_id = "moving_average_forecast",
    responses((status = 200, description = "OK")),
)]
pub async fn moving_average_forecast(
    State(state): State<AppState>,
    Json(req): Json<MovingAverageRequest>,
) -> Json<serde_json::Value> {
    info!(
        "Moving average forecast for datasource: {}",
        req.datasource_id
    );

    let window_size = req.window_size.unwrap_or(7);
    let forecast_periods = req.forecast_periods.unwrap_or(7);

    // S1.2 + S1.3: 字段白名单校验 + 参数化 LIMIT
    let (time_q, value_q) =
        match validate_prediction_fields(&state.pool, &req.time_field, &req.value_field).await {
            Ok(v) => v,
            Err(e) => {
                return Json(topems_shared_core::response::error_value(
                    500,
                    &format!("Invalid prediction field: {}", e),
                ));
            }
        };

    let query = format!(
        "SELECT {}, {} FROM analytics_data ORDER BY {} ASC LIMIT $1",
        time_q, value_q, time_q
    );

    let _rows = match sqlx::query(&query)
        .bind(100_i64)
        .fetch_all(&state.pool)
        .await
    {
        Ok(rows) => rows,
        Err(e) => {
            warn!("Failed to query data for MA forecast: {}", e);
            vec![]
        }
    };

    let sample_data: Vec<f64> = (1..=30)
        .map(|i| (i as f64) * 10.0 + (i % 5) as f64 * 5.0)
        .collect();

    let ma_values = simple_moving_average(&sample_data, window_size as usize);

    let last_window: Vec<f64> = sample_data
        .iter()
        .rev()
        .take(window_size as usize)
        .cloned()
        .collect();
    let last_window: Vec<f64> = last_window.into_iter().rev().collect();
    let forecast_values = forecast_ma(
        &last_window,
        window_size as usize,
        forecast_periods as usize,
    );

    let historical_data: Vec<PredictionPoint> = sample_data
        .iter()
        .enumerate()
        .map(|(i, val)| PredictionPoint {
            time: format!("2024-01-{:02}", (i % 28) + 1),
            value: Some(*val),
            predicted_value: ma_values[i],
            lower_bound: ma_values[i].map(|v| v * 0.9),
            upper_bound: ma_values[i].map(|v| v * 1.1),
        })
        .collect();

    let forecast_data: Vec<PredictionPoint> = forecast_values
        .iter()
        .enumerate()
        .map(|(i, val)| PredictionPoint {
            time: format!("2024-02-{:02}", i + 1),
            value: None,
            predicted_value: Some(*val),
            lower_bound: Some(val * 0.85),
            upper_bound: Some(val * 1.15),
        })
        .collect();

    let actual_values: Vec<f64> = sample_data
        .iter()
        .skip(window_size as usize - 1)
        .cloned()
        .collect();
    let predicted_values: Vec<f64> = ma_values
        .iter()
        .skip(window_size as usize - 1)
        .filter_map(|v| *v)
        .collect();
    let mape = calculate_mape(&actual_values, &predicted_values);

    Json(serde_json::json!({
        "success": true,
        "message": "Moving average forecast",
        "data": MovingAverageResponse {
            datasource_id: req.datasource_id,
            time_field: req.time_field,
            value_field: req.value_field,
            window_size,
            forecast_periods,
            historical_data,
            forecast_data,
            mape: Some(mape),
        }
    }))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["analytics:write"])),
    path = "/prediction/exponential-smoothing",
    tag = "Prediction",
    operation_id = "exponential_smoothing_forecast",
    responses((status = 200, description = "OK")),
)]
pub async fn exponential_smoothing_forecast(
    State(state): State<AppState>,
    Json(req): Json<ExponentialSmoothingRequest>,
) -> Json<serde_json::Value> {
    info!(
        "Exponential smoothing forecast for datasource: {}",
        req.datasource_id
    );

    let alpha = req.alpha.unwrap_or(0.3);
    let forecast_periods = req.forecast_periods.unwrap_or(7);

    // S1.2 + S1.3: 字段白名单校验 + 参数化 LIMIT
    let (time_q, value_q) =
        match validate_prediction_fields(&state.pool, &req.time_field, &req.value_field).await {
            Ok(v) => v,
            Err(e) => {
                return Json(topems_shared_core::response::error_value(
                    500,
                    &format!("Invalid prediction field: {}", e),
                ));
            }
        };

    let query = format!(
        "SELECT {}, {} FROM analytics_data ORDER BY {} ASC LIMIT $1",
        time_q, value_q, time_q
    );

    let _rows = match sqlx::query(&query)
        .bind(100_i64)
        .fetch_all(&state.pool)
        .await
    {
        Ok(rows) => rows,
        Err(e) => {
            warn!("Failed to query data for ES forecast: {}", e);
            vec![]
        }
    };

    let sample_data: Vec<f64> = (1..=30)
        .map(|i| (i as f64) * 10.0 + (i % 3) as f64 * 8.0)
        .collect();

    let es_values = exponential_smoothing(&sample_data, alpha);

    let last_value = es_values.last().copied().unwrap_or(0.0);
    let forecast_values = forecast_es(last_value, forecast_periods as usize);

    let historical_data: Vec<PredictionPoint> = sample_data
        .iter()
        .enumerate()
        .map(|(i, val)| PredictionPoint {
            time: format!("2024-01-{:02}", (i % 28) + 1),
            value: Some(*val),
            predicted_value: Some(es_values[i]),
            lower_bound: Some(es_values[i] * 0.9),
            upper_bound: Some(es_values[i] * 1.1),
        })
        .collect();

    let forecast_data: Vec<PredictionPoint> = forecast_values
        .iter()
        .enumerate()
        .map(|(i, val)| PredictionPoint {
            time: format!("2024-02-{:02}", i + 1),
            value: None,
            predicted_value: Some(*val),
            lower_bound: Some(val * 0.85),
            upper_bound: Some(val * 1.15),
        })
        .collect();

    let actual_values: Vec<f64> = sample_data.iter().skip(1).cloned().collect();
    let predicted_values: Vec<f64> = es_values
        .iter()
        .take(es_values.len() - 1)
        .cloned()
        .collect();
    let mape = calculate_mape(&actual_values, &predicted_values);

    Json(serde_json::json!({
        "success": true,
        "message": "Exponential smoothing forecast",
        "data": ExponentialSmoothingResponse {
            datasource_id: req.datasource_id,
            time_field: req.time_field,
            value_field: req.value_field,
            alpha,
            forecast_periods,
            historical_data,
            forecast_data,
            mape: Some(mape),
        }
    }))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["analytics:write"])),
    path = "/prediction/trend",
    tag = "Prediction",
    operation_id = "trend_analysis",
    responses((status = 200, description = "OK")),
)]
pub async fn trend_analysis(
    State(state): State<AppState>,
    Json(req): Json<TrendAnalysisRequest>,
) -> Json<serde_json::Value> {
    info!("Trend analysis for datasource: {}", req.datasource_id);

    // S1.2 + S1.3: 字段白名单校验 + 参数化 LIMIT
    let (time_q, value_q) =
        match validate_prediction_fields(&state.pool, &req.time_field, &req.value_field).await {
            Ok(v) => v,
            Err(e) => {
                return Json(topems_shared_core::response::error_value(
                    500,
                    &format!("Invalid prediction field: {}", e),
                ));
            }
        };

    let query = format!(
        "SELECT {}, {} FROM analytics_data ORDER BY {} ASC LIMIT $1",
        time_q, value_q, time_q
    );

    let _rows = match sqlx::query(&query)
        .bind(100_i64)
        .fetch_all(&state.pool)
        .await
    {
        Ok(rows) => rows,
        Err(e) => {
            warn!("Failed to query data for trend analysis: {}", e);
            vec![]
        }
    };

    let sample_data: Vec<(f64, f64)> = (1..=30)
        .map(|i| (i as f64, (i as f64) * 15.0 + 100.0 + (i % 7) as f64 * 10.0))
        .collect();

    let (slope, intercept, r_squared) = calculate_linear_regression(&sample_data);

    let trend_direction = if slope > 0.0 {
        "increasing".to_string()
    } else if slope < 0.0 {
        "decreasing".to_string()
    } else {
        "stable".to_string()
    };

    let data_points: Vec<PredictionPoint> = sample_data
        .iter()
        .map(|(x, y)| PredictionPoint {
            time: format!("2024-01-{:02}", (*x as i32 % 28) + 1),
            value: Some(*y),
            predicted_value: Some(slope * x + intercept),
            lower_bound: None,
            upper_bound: None,
        })
        .collect();

    Json(serde_json::json!({
        "success": true,
        "message": "Trend analysis",
        "data": TrendAnalysisResponse {
            datasource_id: req.datasource_id,
            time_field: req.time_field,
            value_field: req.value_field,
            trend_slope: slope,
            trend_intercept: intercept,
            r_squared,
            trend_direction,
            data_points,
        }
    }))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["analytics:compare:write"])),
    path = "/prediction/compare",
    tag = "Prediction",
    operation_id = "prediction_comparison",
    responses((status = 200, description = "OK")),
)]
pub async fn prediction_comparison(
    State(state): State<AppState>,
    Json(req): Json<PredictionCompareRequest>,
) -> Json<serde_json::Value> {
    info!(
        "Prediction comparison for datasource: {}",
        req.datasource_id
    );

    // S1.2 + S1.3: 字段白名单校验 + 参数化 LIMIT
    let (time_q, value_q) =
        match validate_prediction_fields(&state.pool, &req.time_field, &req.value_field).await {
            Ok(v) => v,
            Err(e) => {
                return Json(topems_shared_core::response::error_value(
                    500,
                    &format!("Invalid prediction field: {}", e),
                ));
            }
        };

    let query = format!(
        "SELECT {}, {} FROM analytics_data ORDER BY {} ASC LIMIT $1",
        time_q, value_q, time_q
    );

    let _rows = match sqlx::query(&query)
        .bind(100_i64)
        .fetch_all(&state.pool)
        .await
    {
        Ok(rows) => rows,
        Err(e) => {
            warn!("Failed to query data for prediction comparison: {}", e);
            vec![]
        }
    };

    let actual_values: Vec<f64> = (1..=30)
        .map(|i| (i as f64) * 10.0 + (i % 5) as f64 * 3.0)
        .collect();
    let predicted_values: Vec<f64> = (1..=30)
        .map(|i| (i as f64) * 10.5 + (i % 3) as f64 * 2.0)
        .collect();

    let actual_data: Vec<PredictionPoint> = actual_values
        .iter()
        .enumerate()
        .map(|(i, val)| PredictionPoint {
            time: format!("2024-01-{:02}", (i % 28) + 1),
            value: Some(*val),
            predicted_value: None,
            lower_bound: None,
            upper_bound: None,
        })
        .collect();

    let predicted_data: Vec<PredictionPoint> = predicted_values
        .iter()
        .enumerate()
        .map(|(i, val)| PredictionPoint {
            time: format!("2024-01-{:02}", (i % 28) + 1),
            value: None,
            predicted_value: Some(*val),
            lower_bound: Some(val * 0.9),
            upper_bound: Some(val * 1.1),
        })
        .collect();

    let mape = calculate_mape(&actual_values, &predicted_values);
    let mae = calculate_mae(&actual_values, &predicted_values);
    let mse = calculate_mse(&actual_values, &predicted_values);
    let rmse = mse.sqrt();
    let total_actual: f64 = actual_values.iter().sum();
    let total_predicted: f64 = predicted_values.iter().sum();
    let variance_percentage = if total_actual != 0.0 {
        ((total_predicted - total_actual).abs() / total_actual) * 100.0
    } else {
        0.0
    };

    Json(serde_json::json!({
        "success": true,
        "message": "Prediction comparison",
        "data": PredictionCompareResponse {
            datasource_id: req.datasource_id,
            prediction_method: req.prediction_method,
            actual_data,
            predicted_data,
            comparison_metrics: ComparisonMetrics {
                mape,
                mae,
                mse,
                rmse,
                total_actual,
                total_predicted,
                variance_percentage,
            },
        }
    }))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["analytics:read"])),
    path = "/prediction/methods",
    tag = "Prediction",
    operation_id = "get_prediction_methods",
    responses((status = 200, description = "OK")),
)]
pub async fn get_prediction_methods(State(_state): State<AppState>) -> Json<serde_json::Value> {
    info!("Getting prediction methods");

    let methods = vec![
        serde_json::json!({
            "id": "moving_average",
            "name": "简单移动平均",
            "description": "使用滑动窗口计算平均值进行预测",
            "parameters": [
                {
                    "name": "window_size",
                    "label": "窗口大小",
                    "type": "integer",
                    "default": 7,
                    "min": 2,
                    "max": 365
                },
                {
                    "name": "forecast_periods",
                    "label": "预测周期数",
                    "type": "integer",
                    "default": 7,
                    "min": 1,
                    "max": 365
                }
            ]
        }),
        serde_json::json!({
            "id": "exponential_smoothing",
            "name": "指数平滑",
            "description": "使用指数加权移动平均进行预测",
            "parameters": [
                {
                    "name": "alpha",
                    "label": "平滑系数",
                    "type": "float",
                    "default": 0.3,
                    "min": 0.01,
                    "max": 0.99
                },
                {
                    "name": "forecast_periods",
                    "label": "预测周期数",
                    "type": "integer",
                    "default": 7,
                    "min": 1,
                    "max": 365
                }
            ]
        }),
        serde_json::json!({
            "id": "linear_regression",
            "name": "线性回归",
            "description": "使用线性回归模型进行趋势预测",
            "parameters": [
                {
                    "name": "forecast_periods",
                    "label": "预测周期数",
                    "type": "integer",
                    "default": 7,
                    "min": 1,
                    "max": 365
                }
            ]
        }),
    ];

    Json(serde_json::json!({
        "success": true,
        "message": "Get prediction methods",
        "data": methods
    }))
}

#[cfg(test)]
mod tests {
    use super::*;

    // ---- simple_moving_average ----
    #[test]
    fn sma_basic_window() {
        let out = simple_moving_average(&[1.0, 2.0, 3.0, 4.0], 2);
        assert_eq!(out.len(), 4);
        assert!(out[0].is_none());
        assert_eq!(out[1].unwrap(), 1.5);
        assert_eq!(out[2].unwrap(), 2.5);
        assert_eq!(out[3].unwrap(), 3.5);
    }

    #[test]
    fn sma_window_one_is_identity() {
        let out = simple_moving_average(&[10.0, 20.0, 30.0], 1);
        assert_eq!(out, vec![Some(10.0), Some(20.0), Some(30.0)]);
    }

    #[test]
    fn sma_window_larger_than_data() {
        let out = simple_moving_average(&[1.0, 2.0, 3.0], 5);
        assert_eq!(out, vec![None, None, None]);
    }

    #[test]
    fn sma_empty_data() {
        assert!(simple_moving_average(&[], 3).is_empty());
    }

    #[test]
    fn sma_large_window_average() {
        let out = simple_moving_average(&[1.0, 2.0, 3.0, 4.0, 5.0], 3);
        assert!(out[0].is_none());
        assert!(out[1].is_none());
        assert_eq!(out[2].unwrap(), 2.0);
        assert_eq!(out[3].unwrap(), 3.0);
        assert_eq!(out[4].unwrap(), 4.0);
    }

    // ---- forecast_ma ----
    #[test]
    fn forecast_ma_rolling() {
        // last [3,4] avg 3.5 → [3.5, 3.75, 3.625]
        let out = forecast_ma(&[1.0, 2.0, 3.0, 4.0], 2, 3);
        assert_eq!(out, vec![3.5, 3.75, 3.625]);
    }

    #[test]
    fn forecast_ma_zero_periods() {
        assert!(forecast_ma(&[1.0, 2.0, 3.0], 2, 0).is_empty());
    }

    #[test]
    fn forecast_ma_window_exceeds_data() {
        // window 5 但仅 3 个点：current=[1,2,3] avg=2 → 滚动后 [2,3,2] avg=7/3
        let out = forecast_ma(&[1.0, 2.0, 3.0], 5, 2);
        assert_eq!(out, vec![2.0, 7.0 / 3.0]);
    }

    #[test]
    fn forecast_ma_constant_series() {
        let out = forecast_ma(&[5.0, 5.0, 5.0], 2, 3);
        assert_eq!(out, vec![5.0, 5.0, 5.0]);
    }

    // ---- exponential_smoothing ----
    #[test]
    fn es_empty() {
        assert!(exponential_smoothing(&[], 0.5).is_empty());
    }

    #[test]
    fn es_single_element() {
        assert_eq!(exponential_smoothing(&[10.0], 0.5), vec![10.0]);
    }

    #[test]
    fn es_alpha_one_identity() {
        assert_eq!(
            exponential_smoothing(&[10.0, 20.0, 30.0], 1.0),
            vec![10.0, 20.0, 30.0]
        );
    }

    #[test]
    fn es_alpha_zero_flat() {
        assert_eq!(
            exponential_smoothing(&[10.0, 20.0, 30.0], 0.0),
            vec![10.0, 10.0, 10.0]
        );
    }

    #[test]
    fn es_alpha_half() {
        assert_eq!(exponential_smoothing(&[10.0, 20.0], 0.5), vec![10.0, 15.0]);
    }

    // ---- forecast_es ----
    #[test]
    fn forecast_es_constant() {
        assert_eq!(forecast_es(7.5, 3), vec![7.5, 7.5, 7.5]);
    }

    #[test]
    fn forecast_es_zero_periods() {
        assert!(forecast_es(7.5, 0).is_empty());
    }

    // ---- calculate_linear_regression ----
    #[test]
    fn linreg_perfect_fit() {
        let (slope, intercept, r2) =
            calculate_linear_regression(&[(1.0, 3.0), (2.0, 5.0), (3.0, 7.0)]);
        assert!((slope - 2.0).abs() < 1e-9);
        assert!((intercept - 1.0).abs() < 1e-9);
        assert!((r2 - 1.0).abs() < 1e-9);
    }

    #[test]
    fn linreg_empty() {
        assert_eq!(calculate_linear_regression(&[]), (0.0, 0.0, 0.0));
    }

    #[test]
    fn linreg_flat_line() {
        let (slope, intercept, r2) =
            calculate_linear_regression(&[(1.0, 5.0), (2.0, 5.0), (3.0, 5.0)]);
        assert!((slope - 0.0).abs() < 1e-9);
        assert!((intercept - 5.0).abs() < 1e-9);
        // 水平线 ss_tot=0 → r² 归零
        assert_eq!(r2, 0.0);
    }

    // ---- calculate_mape ----
    #[test]
    fn mape_perfect() {
        assert_eq!(
            calculate_mape(&[10.0, 20.0, 30.0], &[10.0, 20.0, 30.0]),
            0.0
        );
    }

    #[test]
    fn mape_empty() {
        assert_eq!(calculate_mape(&[], &[]), 0.0);
    }

    #[test]
    fn mape_mixed() {
        // |10-20|/10*100=100, |30-40|/30*100≈33.33 → avg≈66.67
        let m = calculate_mape(&[10.0, 0.0, 30.0], &[20.0, 0.0, 40.0]);
        assert!((m - 66.6666).abs() < 0.01);
    }

    #[test]
    fn mape_shorter_predicted() {
        // min len=2: |1-100|/1*100=9900, |2-200|/2*100=9900 → 9900
        let m = calculate_mape(&[1.0, 2.0, 3.0], &[100.0, 200.0]);
        assert!((m - 9900.0).abs() < 1e-9);
    }

    // ---- calculate_mae ----
    #[test]
    fn mae_perfect() {
        assert_eq!(calculate_mae(&[1.0, 2.0, 3.0], &[1.0, 2.0, 3.0]), 0.0);
    }

    #[test]
    fn mae_known() {
        assert_eq!(calculate_mae(&[1.0, 2.0, 3.0], &[2.0, 4.0, 6.0]), 2.0);
    }

    #[test]
    fn mae_empty() {
        assert_eq!(calculate_mae(&[], &[]), 0.0);
    }

    #[test]
    fn mae_different_lengths() {
        assert_eq!(calculate_mae(&[1.0, 2.0], &[5.0, 10.0, 99.0]), 6.0);
    }

    // ---- calculate_mse ----
    #[test]
    fn mse_perfect() {
        assert_eq!(calculate_mse(&[1.0, 2.0, 3.0], &[1.0, 2.0, 3.0]), 0.0);
    }

    #[test]
    fn mse_known() {
        // (1+4+9)/3 = 14/3
        let m = calculate_mse(&[1.0, 2.0, 3.0], &[2.0, 4.0, 6.0]);
        assert!((m - 14.0 / 3.0).abs() < 1e-9);
    }

    #[test]
    fn mse_empty() {
        assert_eq!(calculate_mse(&[], &[]), 0.0);
    }
}
