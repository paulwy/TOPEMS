//! 销售预测模块
//!
//! 支持三种预测算法：
//! - 移动平均法（简单 / 加权）
//! - 指数平滑法（一次指数平滑）
//! - 线性回归（最小二乘法）

use axum::{
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use super::ApiState;
use topems_shared::response::{api_error, ApiResponse};

// ---------------------------------------------------------------------------
// 数据模型
// ---------------------------------------------------------------------------

/// 预测方法
#[derive(Debug, Clone, Copy, Serialize, Deserialize, ToSchema, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ForecastMethod {
    /// 简单移动平均
    MovingAverage,
    /// 加权移动平均
    WeightedMovingAverage,
    /// 一次指数平滑
    ExponentialSmoothing,
    /// 线性回归（最小二乘法）
    LinearRegression,
}

impl ForecastMethod {
    pub fn as_str(&self) -> &'static str {
        match self {
            ForecastMethod::MovingAverage => "moving_average",
            ForecastMethod::WeightedMovingAverage => "weighted_moving_average",
            ForecastMethod::ExponentialSmoothing => "exponential_smoothing",
            ForecastMethod::LinearRegression => "linear_regression",
        }
    }

    pub fn label(&self) -> &'static str {
        match self {
            ForecastMethod::MovingAverage => "简单移动平均",
            ForecastMethod::WeightedMovingAverage => "加权移动平均",
            ForecastMethod::ExponentialSmoothing => "指数平滑",
            ForecastMethod::LinearRegression => "线性回归",
        }
    }

    pub fn description(&self) -> &'static str {
        match self {
            ForecastMethod::MovingAverage => "取最近 N 个数据点的算术平均值作为预测值",
            ForecastMethod::WeightedMovingAverage => "对最近 N 个数据点赋予递减权重后求加权平均",
            ForecastMethod::ExponentialSmoothing => "使用平滑系数 alpha 对历史数据做指数加权",
            ForecastMethod::LinearRegression => "基于最小二乘法拟合线性趋势并外推",
        }
    }

    pub fn all() -> &'static [ForecastMethod] {
        &[
            ForecastMethod::MovingAverage,
            ForecastMethod::WeightedMovingAverage,
            ForecastMethod::ExponentialSmoothing,
            ForecastMethod::LinearRegression,
        ]
    }
}

/// 预测配置
#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct ForecastConfig {
    /// 预测方法
    pub method: ForecastMethod,
    /// 历史数据序列
    pub history_data: Vec<f64>,
    /// 预测周期数
    #[serde(default = "default_forecast_periods")]
    pub forecast_periods: usize,
    /// 指数平滑系数 alpha（0 < alpha < 1，默认 0.3）
    #[serde(default = "default_alpha")]
    pub alpha: f64,
    /// 移动平均窗口大小（默认 3）
    #[serde(default = "default_window_size")]
    pub window_size: usize,
}

fn default_forecast_periods() -> usize {
    3
}
fn default_alpha() -> f64 {
    0.3
}
fn default_window_size() -> usize {
    3
}

/// 预测结果
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ForecastResult {
    /// 使用的方法
    pub method: ForecastMethod,
    /// 预测值序列
    pub forecasts: Vec<f64>,
    /// 平均绝对百分比误差（MAPE，%）
    pub mape: f64,
    /// 均方根误差（RMSE）
    pub rmse: f64,
    /// 决定系数 R²
    pub r_squared: f64,
}

/// 方法信息
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ForecastMethodInfo {
    pub method: ForecastMethod,
    pub label: String,
    pub description: String,
}

/// 预测评估结果
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ForecastEvaluation {
    /// 最优方法
    pub best_method: ForecastMethod,
    /// 所有方法的评估结果
    pub results: Vec<ForecastResult>,
}

// ---------------------------------------------------------------------------
// 预测算法（纯函数，可独立测试）
// ---------------------------------------------------------------------------

/// 简单移动平均：取最近 window_size 个数据点的平均值
pub fn moving_average(data: &[f64], window_size: usize, periods: usize) -> Vec<f64> {
    if data.is_empty() || window_size == 0 || periods == 0 {
        return vec![];
    }
    let window = window_size.min(data.len());
    let last_values = &data[data.len() - window..];
    let avg: f64 = last_values.iter().sum::<f64>() / window as f64;
    vec![avg; periods]
}

/// 加权移动平均：对最近 window_size 个数据点赋予线性递增权重
/// 最近的数据权重最大（=window），最远的数据权重最小（=1）
pub fn weighted_moving_average(data: &[f64], window_size: usize, periods: usize) -> Vec<f64> {
    if data.is_empty() || window_size == 0 || periods == 0 {
        return vec![];
    }
    let window = window_size.min(data.len());
    let last_values = &data[data.len() - window..];

    // 权重：1, 2, ..., window（最远 → 最近，最近的数据权重最大）
    let weights: Vec<f64> = (1..=window).map(|w| w as f64).collect();
    let weight_sum: f64 = weights.iter().sum();

    let weighted_sum: f64 = last_values
        .iter()
        .zip(weights.iter())
        .map(|(v, w)| v * w)
        .sum();
    let forecast = weighted_sum / weight_sum;
    vec![forecast; periods]
}

/// 一次指数平滑：S_t = alpha * Y_t + (1-alpha) * S_{t-1}
/// 预测值 = 最后一个平滑值
pub fn exponential_smoothing(data: &[f64], alpha: f64, periods: usize) -> Vec<f64> {
    if data.is_empty() || periods == 0 {
        return vec![];
    }
    let a = alpha.clamp(0.0, 1.0);
    let mut smoothed = data[0];
    for &val in &data[1..] {
        smoothed = a * val + (1.0 - a) * smoothed;
    }
    vec![smoothed; periods]
}

/// 线性回归（最小二乘法）：拟合 y = a + b*x，外推预测
pub fn linear_regression(data: &[f64], periods: usize) -> Vec<f64> {
    if data.is_empty() || periods == 0 {
        return vec![];
    }
    let n = data.len() as f64;
    let sum_x: f64 = (0..data.len()).map(|i| i as f64).sum();
    let sum_y: f64 = data.iter().sum();
    let sum_xy: f64 = data.iter().enumerate().map(|(i, &y)| i as f64 * y).sum();
    let sum_x2: f64 = (0..data.len()).map(|i| (i as f64).powi(2)).sum();

    let denominator = n * sum_x2 - sum_x * sum_x;
    let (slope, intercept) = if denominator.abs() < 1e-10 {
        // 所有 x 相同（只有一个数据点），退化为均值
        (0.0, sum_y / n)
    } else {
        let slope = (n * sum_xy - sum_x * sum_y) / denominator;
        let intercept = (sum_y - slope * sum_x) / n;
        (slope, intercept)
    };

    let last_x = (data.len() - 1) as f64;
    (0..periods)
        .map(|i| {
            let x = last_x + (i + 1) as f64;
            intercept + slope * x
        })
        .collect()
}

// ---------------------------------------------------------------------------
// 误差指标（纯函数，可独立测试）
// ---------------------------------------------------------------------------

/// 平均绝对百分比误差（MAPE）
/// actual 和 forecast 必须等长
pub fn calculate_mape(actual: &[f64], forecast: &[f64]) -> f64 {
    if actual.is_empty() || actual.len() != forecast.len() {
        return 0.0;
    }
    let mut sum = 0.0;
    let mut count = 0;
    for (a, f) in actual.iter().zip(forecast.iter()) {
        if a.abs() > 1e-10 {
            sum += ((a - f) / a).abs();
            count += 1;
        }
    }
    if count == 0 {
        return 0.0;
    }
    (sum / count as f64) * 100.0
}

/// 均方根误差（RMSE）
pub fn calculate_rmse(actual: &[f64], forecast: &[f64]) -> f64 {
    if actual.is_empty() || actual.len() != forecast.len() {
        return 0.0;
    }
    let n = actual.len() as f64;
    let sum_sq: f64 = actual
        .iter()
        .zip(forecast.iter())
        .map(|(a, f)| (a - f).powi(2))
        .sum();
    (sum_sq / n).sqrt()
}

/// 决定系数 R²
pub fn calculate_r_squared(actual: &[f64], forecast: &[f64]) -> f64 {
    if actual.is_empty() || actual.len() != forecast.len() {
        return 0.0;
    }
    let mean_actual: f64 = actual.iter().sum::<f64>() / actual.len() as f64;
    let ss_res: f64 = actual
        .iter()
        .zip(forecast.iter())
        .map(|(a, f)| (a - f).powi(2))
        .sum();
    let ss_tot: f64 = actual.iter().map(|a| (a - mean_actual).powi(2)).sum();
    if ss_tot.abs() < 1e-10 {
        // 所有实际值相同，如果预测也全对则 R²=1，否则为 0
        return if ss_res.abs() < 1e-10 { 1.0 } else { 0.0 };
    }
    1.0 - ss_res / ss_tot
}

/// 执行预测并计算误差指标
pub fn predict(config: &ForecastConfig) -> ForecastResult {
    let forecasts = match config.method {
        ForecastMethod::MovingAverage => moving_average(
            &config.history_data,
            config.window_size,
            config.forecast_periods,
        ),
        ForecastMethod::WeightedMovingAverage => weighted_moving_average(
            &config.history_data,
            config.window_size,
            config.forecast_periods,
        ),
        ForecastMethod::ExponentialSmoothing => {
            exponential_smoothing(&config.history_data, config.alpha, config.forecast_periods)
        }
        ForecastMethod::LinearRegression => {
            linear_regression(&config.history_data, config.forecast_periods)
        }
    };

    // 使用 in-sample 误差评估：
    // 用 history_data 的前 N-1 个点预测第 N 个点，计算误差
    let (mape, rmse, r_squared) = compute_in_sample_metrics(config);

    ForecastResult {
        method: config.method,
        forecasts,
        mape,
        rmse,
        r_squared,
    }
}

/// 计算 in-sample 误差指标：
/// 使用 history_data 中前 i 个点预测第 i+1 个点，对比实际值计算 MAPE/RMSE/R²
fn compute_in_sample_metrics(config: &ForecastConfig) -> (f64, f64, f64) {
    let data = &config.history_data;
    if data.len() < 3 {
        return (0.0, 0.0, 0.0);
    }

    let mut predictions: Vec<f64> = Vec::new();
    let mut actuals: Vec<f64> = Vec::new();

    // 从第 max(window, 1) 个点开始做一步预测
    let min_history = match config.method {
        ForecastMethod::MovingAverage | ForecastMethod::WeightedMovingAverage => {
            config.window_size.max(1)
        }
        _ => 1,
    };

    for i in min_history..data.len() {
        let history = &data[..i];
        let pred = match config.method {
            ForecastMethod::MovingAverage => {
                let window = config.window_size.min(history.len());
                if window == 0 {
                    continue;
                }
                history[history.len() - window..].iter().sum::<f64>() / window as f64
            }
            ForecastMethod::WeightedMovingAverage => {
                let window = config.window_size.min(history.len());
                if window == 0 {
                    continue;
                }
                let vals = &history[history.len() - window..];
                let weights: Vec<f64> = (1..=window).map(|w| w as f64).collect();
                let wsum: f64 = weights.iter().sum();
                let wsum_val: f64 = vals.iter().zip(weights.iter()).map(|(v, w)| v * w).sum();
                wsum_val / wsum
            }
            ForecastMethod::ExponentialSmoothing => {
                let a = config.alpha.clamp(0.0, 1.0);
                let mut s = history[0];
                for &v in &history[1..] {
                    s = a * v + (1.0 - a) * s;
                }
                s
            }
            ForecastMethod::LinearRegression => {
                let n = history.len() as f64;
                let sx: f64 = (0..history.len()).map(|i| i as f64).sum();
                let sy: f64 = history.iter().sum();
                let sxy: f64 = history.iter().enumerate().map(|(i, &y)| i as f64 * y).sum();
                let sx2: f64 = (0..history.len()).map(|i| (i as f64).powi(2)).sum();
                let denom = n * sx2 - sx * sx;
                if denom.abs() < 1e-10 {
                    sy / n
                } else {
                    let slope = (n * sxy - sx * sy) / denom;
                    let intercept = (sy - slope * sx) / n;
                    intercept + slope * (history.len() as f64)
                }
            }
        };
        predictions.push(pred);
        actuals.push(data[i]);
    }

    if predictions.is_empty() {
        return (0.0, 0.0, 0.0);
    }

    let mape = calculate_mape(&actuals, &predictions);
    let rmse = calculate_rmse(&actuals, &predictions);
    let r_squared = calculate_r_squared(&actuals, &predictions);
    (mape, rmse, r_squared)
}

/// 评估所有方法的预测效果，返回最优方法（MAPE 最低）
pub fn evaluate_all(config: &ForecastConfig) -> ForecastEvaluation {
    let mut results: Vec<ForecastResult> = Vec::new();
    let mut best_method = ForecastMethod::MovingAverage;
    let mut best_mape = f64::MAX;

    for &method in ForecastMethod::all() {
        let method_config = ForecastConfig {
            method,
            history_data: config.history_data.clone(),
            forecast_periods: config.forecast_periods,
            alpha: config.alpha,
            window_size: config.window_size,
        };
        let result = predict(&method_config);
        if result.mape < best_mape {
            best_mape = result.mape;
            best_method = method;
        }
        results.push(result);
    }

    ForecastEvaluation {
        best_method,
        results,
    }
}

// ---------------------------------------------------------------------------
// 路由
// ---------------------------------------------------------------------------

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route("/forecast/predict", post(predict_handler))
        .route("/forecast/methods", get(get_methods))
        .route("/forecast/evaluate", post(evaluate))
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

/// POST /forecast/predict — 执行预测
async fn predict_handler(Json(req): Json<ForecastConfig>) -> Json<ApiResponse<ForecastResult>> {
    if req.history_data.is_empty() {
        return Json(api_error(400, "历史数据不能为空"));
    }
    if req.forecast_periods == 0 {
        return Json(api_error(400, "预测周期数必须大于 0"));
    }

    let result = predict(&req);
    Json(ApiResponse::success(result, "预测完成"))
}

/// GET /forecast/methods — 获取支持的预测方法列表
async fn get_methods() -> Json<ApiResponse<Vec<ForecastMethodInfo>>> {
    let methods: Vec<ForecastMethodInfo> = ForecastMethod::all()
        .iter()
        .map(|&m| ForecastMethodInfo {
            method: m,
            label: m.label().to_string(),
            description: m.description().to_string(),
        })
        .collect();
    Json(ApiResponse::success(methods, "获取预测方法列表成功"))
}

/// POST /forecast/evaluate — 评估多个方法的预测效果
async fn evaluate(Json(req): Json<ForecastConfig>) -> Json<ApiResponse<ForecastEvaluation>> {
    if req.history_data.len() < 3 {
        return Json(api_error(400, "评估至少需要 3 个历史数据点"));
    }

    let evaluation = evaluate_all(&req);
    Json(ApiResponse::success(evaluation, "预测评估完成"))
}

// ---------------------------------------------------------------------------
// 单元测试
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    // ---- 测试移动平均 ----

    #[test]
    fn test_moving_average_basic() {
        let data = vec![10.0, 20.0, 30.0, 40.0, 50.0];
        // 窗口 3，取最后 3 个值 (30+40+50)/3 = 40
        let result = moving_average(&data, 3, 2);
        assert_eq!(result, vec![40.0, 40.0]);
    }

    #[test]
    fn test_moving_average_window_exceeds_data() {
        let data = vec![10.0, 20.0];
        // 窗口大于数据长度，使用全部数据 (10+20)/2 = 15
        let result = moving_average(&data, 5, 1);
        assert_eq!(result, vec![15.0]);
    }

    #[test]
    fn test_moving_average_empty() {
        assert!(moving_average(&[], 3, 2).is_empty());
        assert!(moving_average(&[1.0], 0, 2).is_empty());
        assert!(moving_average(&[1.0], 3, 0).is_empty());
    }

    // ---- 测试加权移动平均 ----

    #[test]
    fn test_weighted_moving_average_basic() {
        let data = vec![10.0, 20.0, 30.0];
        // 窗口 3：权重 3,2,1（最近→最远）
        // (30*3 + 20*2 + 10*1) / (3+2+1) = (90+40+10)/6 = 140/6
        let result = weighted_moving_average(&data, 3, 1);
        assert!((result[0] - 23.333_333).abs() < 0.01);
    }

    #[test]
    fn test_weighted_moving_average_single() {
        let data = vec![42.0];
        // 窗口 1：权重 [1]，结果 = 42
        let result = weighted_moving_average(&data, 1, 1);
        assert_eq!(result, vec![42.0]);
    }

    #[test]
    fn test_weighted_moving_average_empty() {
        assert!(weighted_moving_average(&[], 3, 2).is_empty());
    }

    // ---- 测试指数平滑 ----

    #[test]
    fn test_exponential_smoothing_alpha_one() {
        // alpha=1 → 平滑值 = 最后一个数据点
        let data = vec![10.0, 20.0, 30.0];
        let result = exponential_smoothing(&data, 1.0, 2);
        assert_eq!(result, vec![30.0, 30.0]);
    }

    #[test]
    fn test_exponential_smoothing_alpha_zero() {
        // alpha=0 → 平滑值 = 第一个数据点
        let data = vec![10.0, 20.0, 30.0];
        let result = exponential_smoothing(&data, 0.0, 1);
        assert_eq!(result, vec![10.0]);
    }

    #[test]
    fn test_exponential_smoothing_basic() {
        let data = vec![100.0, 200.0, 300.0];
        // alpha=0.3
        // S1 = 100
        // S2 = 0.3*200 + 0.7*100 = 60+70 = 130
        // S3 = 0.3*300 + 0.7*130 = 90+91 = 181
        let result = exponential_smoothing(&data, 0.3, 1);
        assert!((result[0] - 181.0).abs() < 0.01);
    }

    #[test]
    fn test_exponential_smoothing_empty() {
        assert!(exponential_smoothing(&[], 0.3, 2).is_empty());
        assert!(exponential_smoothing(&[1.0], 0.3, 0).is_empty());
    }

    // ---- 测试线性回归 ----

    #[test]
    fn test_linear_regression_trend() {
        // 线性增长：y = 10 + 5*x
        let data = vec![10.0, 15.0, 20.0, 25.0, 30.0];
        // 预测 2 期 → x=5 → 35, x=6 → 40
        let result = linear_regression(&data, 2);
        assert_eq!(result.len(), 2);
        assert!((result[0] - 35.0).abs() < 0.01);
        assert!((result[1] - 40.0).abs() < 0.01);
    }

    #[test]
    fn test_linear_regression_flat() {
        // 平稳数据：所有值相同
        let data = vec![50.0, 50.0, 50.0, 50.0];
        let result = linear_regression(&data, 2);
        assert_eq!(result, vec![50.0, 50.0]);
    }

    #[test]
    fn test_linear_regression_single_point() {
        let data = vec![42.0];
        let result = linear_regression(&data, 1);
        assert_eq!(result, vec![42.0]);
    }

    #[test]
    fn test_linear_regression_empty() {
        assert!(linear_regression(&[], 3).is_empty());
        assert!(linear_regression(&[1.0, 2.0], 0).is_empty());
    }

    // ---- 测试 MAPE / RMSE / R² ----

    #[test]
    fn test_mape_perfect_prediction() {
        let actual = vec![100.0, 200.0, 300.0];
        let forecast = vec![100.0, 200.0, 300.0];
        let mape = calculate_mape(&actual, &forecast);
        assert!(mape < 0.001);
    }

    #[test]
    fn test_mape_known_value() {
        // actual=100, forecast=110 → |100-110|/100 = 0.1 = 10%
        let actual = vec![100.0];
        let forecast = vec![110.0];
        let mape = calculate_mape(&actual, &forecast);
        assert!((mape - 10.0).abs() < 0.001);
    }

    #[test]
    fn test_mape_zero_actual() {
        // actual=0 时跳过（不除以零）
        let actual = vec![0.0, 100.0];
        let forecast = vec![50.0, 110.0];
        let mape = calculate_mape(&actual, &forecast);
        // 只有一个有效点：(100,110) → 10%
        assert!((mape - 10.0).abs() < 0.001);
    }

    #[test]
    fn test_rmse_perfect() {
        let actual = vec![10.0, 20.0, 30.0];
        let forecast = vec![10.0, 20.0, 30.0];
        let rmse = calculate_rmse(&actual, &forecast);
        assert!(rmse < 0.001);
    }

    #[test]
    fn test_rmse_known_value() {
        // errors: 1, -1, 1 → squared: 1,1,1 → mean=1 → sqrt=1
        let actual = vec![10.0, 20.0, 30.0];
        let forecast = vec![11.0, 19.0, 31.0];
        let rmse = calculate_rmse(&actual, &forecast);
        assert!((rmse - 1.0).abs() < 0.001);
    }

    #[test]
    fn test_r_squared_perfect() {
        let actual = vec![10.0, 20.0, 30.0];
        let forecast = vec![10.0, 20.0, 30.0];
        let r2 = calculate_r_squared(&actual, &forecast);
        assert!((r2 - 1.0).abs() < 0.001);
    }

    #[test]
    fn test_r_squared_poor() {
        // 预测为常数（均值），R² 应为 0 或接近 0
        let actual = vec![10.0, 20.0, 30.0];
        let forecast = vec![20.0, 20.0, 20.0]; // 均值预测
        let r2 = calculate_r_squared(&actual, &forecast);
        assert!(r2 < 0.001, "均值预测 R² 应接近 0，实际: {}", r2);
    }

    #[test]
    fn test_mismatched_lengths() {
        assert_eq!(calculate_mape(&[1.0], &[1.0, 2.0]), 0.0);
        assert_eq!(calculate_rmse(&[1.0], &[1.0, 2.0]), 0.0);
        assert_eq!(calculate_r_squared(&[1.0], &[1.0, 2.0]), 0.0);
    }

    #[test]
    fn test_empty_inputs() {
        assert_eq!(calculate_mape(&[], &[]), 0.0);
        assert_eq!(calculate_rmse(&[], &[]), 0.0);
        assert_eq!(calculate_r_squared(&[], &[]), 0.0);
    }

    // ---- 测试 predict / evaluate 集成 ----

    #[test]
    fn test_predict_moving_average() {
        let config = ForecastConfig {
            method: ForecastMethod::MovingAverage,
            history_data: vec![10.0, 20.0, 30.0, 40.0, 50.0],
            forecast_periods: 3,
            alpha: 0.3,
            window_size: 3,
        };
        let result = predict(&config);
        assert_eq!(result.method, ForecastMethod::MovingAverage);
        assert_eq!(result.forecasts.len(), 3);
        // (30+40+50)/3 = 40
        assert!((result.forecasts[0] - 40.0).abs() < 0.001);
        assert!(result.mape >= 0.0);
        assert!(result.rmse >= 0.0);
    }

    #[test]
    fn test_predict_linear_regression() {
        let config = ForecastConfig {
            method: ForecastMethod::LinearRegression,
            history_data: vec![10.0, 20.0, 30.0, 40.0],
            forecast_periods: 2,
            alpha: 0.3,
            window_size: 3,
        };
        let result = predict(&config);
        assert_eq!(result.forecasts.len(), 2);
        // y = 10*x → x=4 → 50, x=5 → 60
        assert!((result.forecasts[0] - 50.0).abs() < 0.01);
        assert!((result.forecasts[1] - 60.0).abs() < 0.01);
    }

    #[test]
    fn test_evaluate_all_methods() {
        let config = ForecastConfig {
            method: ForecastMethod::MovingAverage,
            history_data: vec![10.0, 15.0, 20.0, 25.0, 30.0, 35.0, 40.0],
            forecast_periods: 3,
            alpha: 0.3,
            window_size: 3,
        };
        let eval = evaluate_all(&config);
        assert_eq!(eval.results.len(), 4);
        // 线性数据 → 线性回归应该表现最好（MAPE 最低）
        let lr = eval
            .results
            .iter()
            .find(|r| r.method == ForecastMethod::LinearRegression)
            .unwrap();
        // 线性数据上线性回归 in-sample MAPE 应较低（首点只有 1 个历史点无法拟合斜率，拉高均值）
        assert!(
            lr.mape < 10.0,
            "线性回归对线性数据 MAPE 应 < 10%，实际: {}",
            lr.mape
        );
    }

    // ---- 测试配置反序列化 ----

    #[test]
    fn test_forecast_config_deserialize() {
        let json = r#"{"method": "moving_average", "history_data": [1, 2, 3], "forecast_periods": 2, "alpha": 0.5, "window_size": 2}"#;
        let config: ForecastConfig = serde_json::from_str(json).unwrap();
        assert_eq!(config.method, ForecastMethod::MovingAverage);
        assert_eq!(config.history_data, vec![1.0, 2.0, 3.0]);
        assert_eq!(config.forecast_periods, 2);
        assert!((config.alpha - 0.5).abs() < 0.001);
        assert_eq!(config.window_size, 2);
    }

    #[test]
    fn test_forecast_config_defaults() {
        let json = r#"{"method": "exponential_smoothing", "history_data": [1, 2, 3]}"#;
        let config: ForecastConfig = serde_json::from_str(json).unwrap();
        assert_eq!(config.forecast_periods, 3);
        assert!((config.alpha - 0.3).abs() < 0.001);
        assert_eq!(config.window_size, 3);
    }

    #[test]
    fn test_forecast_method_all_count() {
        assert_eq!(ForecastMethod::all().len(), 4);
    }

    #[test]
    fn test_forecast_method_str_roundtrip() {
        for &m in ForecastMethod::all() {
            let s = m.as_str();
            let json = format!("\"{}\"", s);
            let back: ForecastMethod = serde_json::from_str(&json).unwrap();
            assert_eq!(m, back);
        }
    }
}
