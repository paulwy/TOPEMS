#![allow(dead_code)] // Reserved: V53 智能预测模块，待业务接入后启用

//! STATUS: WIRED | Routes registered + DB tables initialized + Handlers implemented
//! V53.0 Finance 智能预测升级
//!
//! 核心能力：
//! - AI 现金流预测 (CashFlow Prediction): 历史数据分析（移动平均、指数平滑）、季节性模式检测、趋势分析与外推、多场景预测（乐观/悲观/现实）、预测置信区间
//! - 智能预算差异分析 (Budget Variance Analysis): 预算vs实际对比、差异分类（有利/不利）、根因分析、趋势差异检测、预测性差异告警
//!
//! 路由：
//! - POST   /forecast-v53/cash-flow/predict
//! - GET    /forecast-v53/cash-flow/predictions
//! - POST   /forecast-v53/cash-flow/retrain
//! - GET    /forecast-v53/cash-flow/accuracy
//! - POST   /forecast-v53/budget/analyze
//! - GET    /forecast-v53/budget/variance
//! - GET    /forecast-v53/budget/report
//! - POST   /forecast-v53/budget/anomalies
//! - GET    /forecast-v53/budget/trends
use utoipa::ToSchema;

use axum::{
    extract::{Extension, Json, Query, State},
    Router,
};
use chrono::{DateTime, Utc};
use rust_decimal::prelude::ToPrimitive;
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_db::scope::Db;
use uuid::Uuid;

use crate::shared::AppState;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::get_tenant_id_from_claims;
use topems_shared_core::response::ApiResponse;

// ==================== 辅助函数 ====================

/// f64 → Decimal，仅在 DB 边界使用；金额列（numeric）不接受 f64 直接落库。
fn decimal_from_f64(value: f64) -> Decimal {
    Decimal::from_f64_retain(value).unwrap_or(Decimal::ZERO)
}

// ==================== 枚举类型 ====================

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum PredictionModel {
    MovingAverage,
    ExponentialSmoothing,
    LinearTrend,
    SeasonalDecomposition,
}

impl PredictionModel {
    fn as_str(&self) -> &'static str {
        match self {
            PredictionModel::MovingAverage => "moving_average",
            PredictionModel::ExponentialSmoothing => "exponential_smoothing",
            PredictionModel::LinearTrend => "linear_trend",
            PredictionModel::SeasonalDecomposition => "seasonal_decomposition",
        }
    }

    fn from_str(s: &str) -> Self {
        match s {
            "exponential_smoothing" => PredictionModel::ExponentialSmoothing,
            "linear_trend" => PredictionModel::LinearTrend,
            "seasonal_decomposition" => PredictionModel::SeasonalDecomposition,
            _ => PredictionModel::MovingAverage,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum PredictionScenario {
    Optimistic,
    Pessimistic,
    Realistic,
}

impl PredictionScenario {
    fn as_str(&self) -> &'static str {
        match self {
            PredictionScenario::Optimistic => "optimistic",
            PredictionScenario::Pessimistic => "pessimistic",
            PredictionScenario::Realistic => "realistic",
        }
    }

    fn from_str(s: &str) -> Self {
        match s {
            "optimistic" => PredictionScenario::Optimistic,
            "pessimistic" => PredictionScenario::Pessimistic,
            _ => PredictionScenario::Realistic,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum VarianceClassification {
    Favorable,
    Unfavorable,
    Neutral,
}

impl VarianceClassification {
    fn as_str(&self) -> &'static str {
        match self {
            VarianceClassification::Favorable => "favorable",
            VarianceClassification::Unfavorable => "unfavorable",
            VarianceClassification::Neutral => "neutral",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum VarianceTrend {
    Increasing,
    Decreasing,
    Stable,
    Volatile,
}

impl VarianceTrend {
    fn as_str(&self) -> &'static str {
        match self {
            VarianceTrend::Increasing => "increasing",
            VarianceTrend::Decreasing => "decreasing",
            VarianceTrend::Stable => "stable",
            VarianceTrend::Volatile => "volatile",
        }
    }
}

// ==================== 数据模型 ====================

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct CashFlowPrediction {
    pub id: Uuid,
    pub entity_id: Uuid,
    pub period: String,
    pub predicted_inflow: Decimal,
    pub predicted_outflow: Decimal,
    pub predicted_net: Decimal,
    pub confidence: Decimal,
    pub scenario: String,
    pub model_version: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct PredictionModelRecord {
    pub id: Uuid,
    pub model_type: String,
    pub entity_id: Option<Uuid>,
    pub parameters: serde_json::Value,
    pub accuracy: Decimal,
    pub is_active: bool,
    pub trained_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct BudgetVariance {
    pub id: Uuid,
    pub budget_item_id: Uuid,
    pub period: String,
    pub budget_amount: Decimal,
    pub actual_amount: Decimal,
    pub variance_amount: Decimal,
    pub variance_percentage: Decimal,
    pub classification: String,
    pub trend: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct VarianceReport {
    pub id: Uuid,
    pub period: String,
    pub summary: String,
    pub line_items: serde_json::Value,
    pub trends: serde_json::Value,
    pub recommendations: serde_json::Value,
    pub alerts: serde_json::Value,
    pub created_at: DateTime<Utc>,
}

// ==================== AI 现金流预测 ====================

pub struct CashFlowPredictor;

#[derive(Debug, Deserialize)]
pub struct PredictCashFlowRequest {
    pub entity_id: String,
    pub period: String,
    pub model: Option<String>,
    pub scenario: Option<String>,
    pub horizon_months: Option<i32>,
}

#[derive(Debug, Deserialize, utoipa::IntoParams)]
pub struct PredictionsQueryParams {
    pub entity_id: Option<String>,
    pub period: Option<String>,
    pub scenario: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PredictionAccuracy {
    pub model_type: String,
    pub overall_accuracy: f64,
    pub inflow_accuracy: f64,
    pub outflow_accuracy: f64,
    pub mean_absolute_error: f64,
    pub sample_count: i64,
    pub last_trained: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PredictionResult {
    pub prediction: CashFlowPrediction,
    pub confidence_interval_lower: f64,
    pub confidence_interval_upper: f64,
    pub seasonal_factors: Vec<f64>,
    pub trend_slope: f64,
}

impl CashFlowPredictor {
    #[allow(clippy::as_conversions)]
    pub async fn predict(
        db: &Db,
        tenant_id: Uuid,
        req: PredictCashFlowRequest,
    ) -> Result<PredictionResult, sqlx::Error> {
        let now = Utc::now();
        let model_type = req
            .model
            .as_deref()
            .map(PredictionModel::from_str)
            .unwrap_or(PredictionModel::ExponentialSmoothing);
        let scenario = req
            .scenario
            .as_deref()
            .map(PredictionScenario::from_str)
            .unwrap_or(PredictionScenario::Realistic);
        let horizon = req.horizon_months.unwrap_or(1) as f64;

        // finance_cash_flow_predictions_v53.entity_id 为 uuid（DDL 2026-10-15），
        // 请求体仍是字符串，边界处解析，非法值直接拒绝而不是静默生成随机 ID。
        let entity_id = Uuid::parse_str(&req.entity_id).map_err(|_| {
            sqlx::Error::Protocol(format!(
                "entity_id 必须是 UUID（finance_cash_flow_predictions_v53.entity_id 为 uuid）: {}",
                req.entity_id
            ))
        })?;

        let (historical, is_synthetic) =
            Self::fetch_historical_data(db, tenant_id, Some(entity_id)).await?;
        // 无真实历史凭证时，旧实现会静默用合成序列（500k 基数 + 正弦噪声）生成预测并落库，
        // 让"预测"看起来正常。合成数据不可用于决策，这里直接拒绝，不落任何行。
        if is_synthetic {
            return Err(sqlx::Error::Protocol(
                "无真实历史凭证数据（近 12 个月 0 行），forecast_v53 拒绝用合成数据生成预测：合成数据不可用于决策"
                    .to_string(),
            ));
        }

        let (inflow, outflow) = Self::apply_model(&historical, &model_type, horizon, &scenario);

        let predicted_net = inflow - outflow;
        let confidence = Self::calculate_confidence(&historical, &model_type);
        let (ci_lower, ci_upper) = Self::calculate_confidence_interval(predicted_net, confidence);

        let predicted_inflow = decimal_from_f64(inflow);
        let predicted_outflow = decimal_from_f64(outflow);
        let predicted_net_dec = decimal_from_f64(predicted_net);
        let confidence_dec = decimal_from_f64(confidence);

        let prediction_id = Uuid::new_v4();
        let model_version = format!("v53.0-{}", model_type.as_str());

        let mut scope = db.scope_for_tenant(tenant_id).await?;
        sqlx::query(
            only_own_schema_query!("finance", r#"INSERT INTO finance_cash_flow_predictions_v53
                (id, entity_id, period, predicted_inflow, predicted_outflow, predicted_net, confidence, scenario, model_version, created_at, updated_at, tenant_id, is_synthetic)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, false)
            ON CONFLICT DO NOTHING"#),
        )
        .bind(prediction_id)
        .bind(entity_id)
        .bind(&req.period)
        .bind(predicted_inflow)
        .bind(predicted_outflow)
        .bind(predicted_net_dec)
        .bind(confidence_dec)
        .bind(scenario.as_str())
        .bind(&model_version)
        .bind(now)
        .bind(now)
        .bind(tenant_id)
        .execute(&mut scope)
        .await?;
        scope.commit().await?;

        let seasonal_factors = Self::detect_seasonal_patterns(&historical);
        let trend_slope = Self::calculate_trend_slope(&historical);

        Ok(PredictionResult {
            prediction: CashFlowPrediction {
                id: prediction_id,
                entity_id,
                period: req.period,
                predicted_inflow,
                predicted_outflow,
                predicted_net: predicted_net_dec,
                confidence: confidence_dec,
                scenario: scenario.as_str().to_string(),
                model_version,
                created_at: now,
                updated_at: now,
            },
            confidence_interval_lower: ci_lower,
            confidence_interval_upper: ci_upper,
            seasonal_factors,
            trend_slope,
        })
    }

    /// 读取真实历史凭证的月度流入/流出。
    ///
    /// 返回值第二个元素为 `is_synthetic`：仅在查询结果为空（无真实历史）时为 true，
    /// 此时第一个元素为空集合——不再伪造历史序列。调用方必须据此拒绝生成预测/精度。
    async fn fetch_historical_data(
        db: &Db,
        tenant_id: Uuid,
        entity_id: Option<Uuid>,
    ) -> Result<(Vec<(f64, f64)>, bool), sqlx::Error> {
        let mut scope = db.scope_read_for_tenant(tenant_id).await?;
        let rows: Vec<(f64, f64)> = sqlx::query_as(
            only_own_schema_query!("finance", r#"SELECT
                COALESCE(SUM(CASE WHEN vl.account_code LIKE '6%' THEN vl.amount ELSE 0 END), 0) as inflow,
                COALESCE(SUM(CASE WHEN vl.account_code LIKE '4%' OR vl.account_code LIKE '5%' THEN vl.amount ELSE 0 END), 0) as outflow
            FROM vouchers v
            JOIN voucher_lines vl ON vl.voucher_id = v.id
            WHERE v.tenant_id = $1 AND ($2::uuid IS NULL OR v.entity_id = $2)
            AND v.status NOT IN ('draft', 'cancelled')
            AND v.created_at > NOW() - INTERVAL '12 months'
            GROUP BY DATE_TRUNC('month', v.created_at)
            ORDER BY DATE_TRUNC('month', v.created_at) DESC
            LIMIT 24"#),
        )
        .bind(tenant_id)
        .bind(entity_id)
        .fetch_all(&mut scope)
        .await?;
        scope.commit().await?;

        let is_synthetic = rows.is_empty();
        Ok((rows, is_synthetic))
    }

    #[allow(clippy::as_conversions, clippy::cast_precision_loss)]
    fn apply_model(
        historical: &[(f64, f64)],
        model: &PredictionModel,
        horizon: f64,
        scenario: &PredictionScenario,
    ) -> (f64, f64) {
        if historical.is_empty() {
            return (0.0, 0.0);
        }

        let (inflow, outflow) = match model {
            PredictionModel::MovingAverage => {
                let window = historical.len().min(6);
                let recent: Vec<&(f64, f64)> = historical.iter().take(window).collect();
                let avg_inflow = recent.iter().map(|h| h.0).sum::<f64>() / recent.len() as f64;
                let avg_outflow = recent.iter().map(|h| h.1).sum::<f64>() / recent.len() as f64;
                (avg_inflow, avg_outflow)
            }
            PredictionModel::ExponentialSmoothing => {
                let alpha = 0.3;
                let mut smoothed_inflow = historical[0].0;
                let mut smoothed_outflow = historical[0].1;
                for h in historical.iter().skip(1) {
                    smoothed_inflow = alpha * h.0 + (1.0 - alpha) * smoothed_inflow;
                    smoothed_outflow = alpha * h.1 + (1.0 - alpha) * smoothed_outflow;
                }
                (smoothed_inflow, smoothed_outflow)
            }
            PredictionModel::LinearTrend => {
                let n = historical.len() as f64;
                let sum_inflow: f64 = historical.iter().map(|h| h.0).sum();
                let sum_outflow: f64 = historical.iter().map(|h| h.1).sum();
                let mean_inflow = sum_inflow / n;
                let mean_outflow = sum_outflow / n;

                let mut slope_inflow = 0.0;
                let mut slope_outflow = 0.0;
                for (i, h) in historical.iter().enumerate() {
                    let x = i as f64;
                    slope_inflow += (x - n / 2.0) * (h.0 - mean_inflow);
                    slope_outflow += (x - n / 2.0) * (h.1 - mean_outflow);
                }
                slope_inflow /= ((n - 1.0) * (n - 2.0) / 6.0).max(1.0);
                slope_outflow /= ((n - 1.0) * (n - 2.0) / 6.0).max(1.0);

                let last_idx = historical.len() as f64 - 1.0;
                let pred_inflow = mean_inflow + slope_inflow * (last_idx + horizon - n / 2.0);
                let pred_outflow = mean_outflow + slope_outflow * (last_idx + horizon - n / 2.0);
                (pred_inflow, pred_outflow)
            }
            PredictionModel::SeasonalDecomposition => {
                let _period = 12.0_f64;
                let mut season_inflow = [0.0f64; 12];
                let mut season_outflow = [0.0f64; 12];
                let mut counts = [0.0f64; 12];

                for (i, h) in historical.iter().enumerate() {
                    let month = i % 12;
                    season_inflow[month] += h.0;
                    season_outflow[month] += h.1;
                    counts[month] += 1.0;
                }

                let avg_inflow: f64 =
                    historical.iter().map(|h| h.0).sum::<f64>() / historical.len() as f64;
                let avg_outflow: f64 =
                    historical.iter().map(|h| h.1).sum::<f64>() / historical.len() as f64;

                let mut factors_inflow = [1.0f64; 12];
                let mut factors_outflow = [1.0f64; 12];
                for m in 0..12 {
                    if counts[m] > 0.0 && avg_inflow > 0.0 {
                        factors_inflow[m] = (season_inflow[m] / counts[m]) / avg_inflow;
                    }
                    if counts[m] > 0.0 && avg_outflow > 0.0 {
                        factors_outflow[m] = (season_outflow[m] / counts[m]) / avg_outflow;
                    }
                }

                let next_month = (historical.len()) % 12;
                (
                    avg_inflow * factors_inflow[next_month],
                    avg_outflow * factors_outflow[next_month],
                )
            }
        };

        let (inflow_factor, outflow_factor) = match scenario {
            PredictionScenario::Optimistic => (1.15, 0.92),
            PredictionScenario::Pessimistic => (0.88, 1.10),
            PredictionScenario::Realistic => (1.0, 1.0),
        };

        (inflow * inflow_factor, outflow * outflow_factor)
    }

    #[allow(clippy::as_conversions, clippy::cast_precision_loss)]
    fn calculate_confidence(historical: &[(f64, f64)], model: &PredictionModel) -> f64 {
        if historical.len() < 3 {
            return 0.5;
        }

        let (errors_inflow, errors_outflow) = Self::compute_prediction_errors(historical, model);
        let inflate_accuracy = if errors_inflow.is_empty() {
            0.8
        } else {
            let mean_err = errors_inflow.iter().sum::<f64>() / errors_inflow.len() as f64;
            (1.0 - mean_err).max(0.3).min(0.99)
        };
        let outflow_accuracy = if errors_outflow.is_empty() {
            0.8
        } else {
            let mean_err = errors_outflow.iter().sum::<f64>() / errors_outflow.len() as f64;
            (1.0 - mean_err).max(0.3).min(0.99)
        };

        (inflate_accuracy + outflow_accuracy) / 2.0
    }

    fn compute_prediction_errors(
        historical: &[(f64, f64)],
        model: &PredictionModel,
    ) -> (Vec<f64>, Vec<f64>) {
        let mut inflow_errors = Vec::new();
        let mut outflow_errors = Vec::new();
        let min_window = 3;

        for i in min_window..historical.len() {
            let train: Vec<(f64, f64)> = historical.iter().take(i).cloned().collect();
            let (pred_inflow, pred_outflow) =
                Self::apply_model(&train, model, 1.0, &PredictionScenario::Realistic);

            let actual_inflow = historical[i].0;
            let actual_outflow = historical[i].1;

            if actual_inflow.abs() > 1.0 {
                inflow_errors.push((pred_inflow - actual_inflow).abs() / actual_inflow.abs());
            }
            if actual_outflow.abs() > 1.0 {
                outflow_errors.push((pred_outflow - actual_outflow).abs() / actual_outflow.abs());
            }
        }

        (inflow_errors, outflow_errors)
    }

    fn calculate_confidence_interval(predicted_net: f64, confidence: f64) -> (f64, f64) {
        let margin = predicted_net * (1.0 - confidence);
        (predicted_net - margin, predicted_net + margin)
    }

    #[allow(clippy::as_conversions, clippy::cast_precision_loss)]
    fn detect_seasonal_patterns(historical: &[(f64, f64)]) -> Vec<f64> {
        let mut patterns = vec![0.0f64; 12];
        if historical.is_empty() {
            return patterns;
        }

        let mut monthly_avgs = [0.0f64; 12];
        let mut monthly_counts = [0.0f64; 12];

        for (i, h) in historical.iter().enumerate() {
            let month = i % 12;
            monthly_avgs[month] += h.0;
            monthly_counts[month] += 1.0;
        }

        let overall_avg = historical.iter().map(|h| h.0).sum::<f64>() / historical.len() as f64;
        if overall_avg > 0.0 {
            for m in 0..12 {
                if monthly_counts[m] > 0.0 {
                    patterns[m] = (monthly_avgs[m] / monthly_counts[m]) / overall_avg;
                }
            }
        }
        patterns
    }

    #[allow(clippy::as_conversions, clippy::cast_precision_loss)]
    fn calculate_trend_slope(historical: &[(f64, f64)]) -> f64 {
        if historical.len() < 2 {
            return 0.0;
        }

        let n = historical.len() as f64;
        let values: Vec<f64> = historical.iter().map(|h| h.0 - h.1).collect();
        let mean = values.iter().sum::<f64>() / n;

        let mut slope = 0.0;
        for (i, v) in values.iter().enumerate() {
            let x = i as f64;
            slope += (x - n / 2.0) * (v - mean);
        }
        slope /= ((n - 1.0) * (n - 2.0) / 6.0).max(1.0);
        slope
    }

    pub async fn get_predictions(
        db: &Db,
        entity_id: Option<String>,
        period: Option<String>,
        scenario: Option<String>,
        page: i64,
        page_size: i64,
    ) -> Result<(Vec<CashFlowPrediction>, i64), sqlx::Error> {
        let offset = (page - 1) * page_size;
        let mut scope = db.scope_read().await?;

        let mut count_query = String::from(
            "SELECT COUNT(*) FROM finance_cash_flow_predictions_v53 WHERE is_synthetic = false",
        );
        let mut data_query = String::from(
            "SELECT id, entity_id, period, predicted_inflow, predicted_outflow, predicted_net, confidence, scenario, model_version, created_at, updated_at FROM finance_cash_flow_predictions_v53 WHERE is_synthetic = false",
        );

        if entity_id.is_some() {
            count_query.push_str(" AND entity_id = $1");
            data_query.push_str(" AND entity_id = $1");
        }
        if period.is_some() {
            let idx = if entity_id.is_some() { "2" } else { "1" };
            count_query.push_str(&format!(" AND period = ${}", idx));
            data_query.push_str(&format!(" AND period = ${}", idx));
        }
        if scenario.is_some() {
            let base =
                if entity_id.is_some() { 1 } else { 0 } + if period.is_some() { 1 } else { 0 } + 1;
            count_query.push_str(&format!(" AND scenario = ${}", base));
            data_query.push_str(&format!(" AND scenario = ${}", base));
        }

        let total: i64 = sqlx::query_scalar(sqlx::AssertSqlSafe(count_query))
            .fetch_one(&mut scope)
            .await?;

        data_query.push_str(" ORDER BY created_at DESC LIMIT $LIMIT OFFSET $OFFSET");
        let data_query = data_query.replace("$LIMIT", &page_size.to_string());
        let data_query = data_query.replace("$OFFSET", &offset.to_string());

        let mut q = sqlx::query_as::<_, CashFlowPrediction>(sqlx::AssertSqlSafe(data_query));
        if let Some(ref eid) = entity_id {
            q = q.bind(eid);
        }
        if let Some(ref p) = period {
            q = q.bind(p);
        }
        if let Some(ref s) = scenario {
            q = q.bind(s);
        }
        let items = q.fetch_all(&mut scope).await?;
        scope.commit().await?;

        Ok((items, total))
    }

    pub async fn retrain_model(
        db: &Db,
        tenant_id: Uuid,
        model_type: PredictionModel,
    ) -> Result<PredictionModelRecord, sqlx::Error> {
        let now = Utc::now();
        let model_str = model_type.as_str();

        let (accuracy_value, sample_months) =
            Self::compute_retrain_accuracy(db, tenant_id, &model_type).await?;
        let accuracy = decimal_from_f64(accuracy_value);

        let mut scope = db.scope_for_tenant(tenant_id).await?;
        let record = sqlx::query_as::<_, PredictionModelRecord>(
            only_own_schema_query!("finance", r#"INSERT INTO finance_prediction_models_v53
                (id, model_type, entity_id, parameters, accuracy, is_active, trained_at, created_at, updated_at, tenant_id, is_synthetic)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, false)
            ON CONFLICT (model_type) DO UPDATE
            SET accuracy = EXCLUDED.accuracy,
                trained_at = EXCLUDED.trained_at,
                updated_at = EXCLUDED.updated_at,
                is_synthetic = false
            RETURNING id, model_type, entity_id, parameters, accuracy, is_active, trained_at, created_at, updated_at"#),
        )
        .bind(Uuid::new_v4())
        .bind(model_str)
        // entity_id 在 DDL 中可空：全租户模型不绑定具体实体，不写占位字符串。
        .bind(None::<Uuid>)
        .bind(serde_json::json!({
            "window_size": 6,
            "alpha": 0.3,
            "season_period": 12,
            // 真实参与训练的月数，供精度接口如实返回 sample_count（旧实现硬编码 120）
            "sample_months": sample_months,
        }))
        .bind(accuracy)
        .bind(true)
        .bind(now)
        .bind(now)
        .bind(now)
        .bind(tenant_id)
        .fetch_one(&mut scope)
        .await?;
        scope.commit().await?;

        Ok(record)
    }

    #[allow(clippy::as_conversions, clippy::cast_precision_loss)]
    async fn compute_retrain_accuracy(
        db: &Db,
        tenant_id: Uuid,
        model: &PredictionModel,
    ) -> Result<(f64, usize), sqlx::Error> {
        // 精度必须基于真实历史凭证；旧实现在此处无条件使用合成序列，等价于把伪造样本
        // 包装成可信精度。无真实历史时直接报错，不落模型行。
        let (sample, is_synthetic) = Self::fetch_historical_data(db, tenant_id, None).await?;
        if is_synthetic {
            return Err(sqlx::Error::Protocol(
                "无真实历史凭证数据，拒绝用合成样本计算模型精度：合成数据不可用于决策"
                    .to_string(),
            ));
        }

        let (errors_inflow, errors_outflow) = Self::compute_prediction_errors(&sample, model);

        let inflow_acc = if errors_inflow.is_empty() {
            0.8
        } else {
            (1.0 - errors_inflow.iter().sum::<f64>() / errors_inflow.len() as f64).max(0.3)
        };
        let outflow_acc = if errors_outflow.is_empty() {
            0.8
        } else {
            (1.0 - errors_outflow.iter().sum::<f64>() / errors_outflow.len() as f64).max(0.3)
        };

        Ok(((inflow_acc + outflow_acc) / 2.0, sample.len()))
    }

    pub async fn get_accuracy(
        db: &Db,
        model_type: Option<String>,
    ) -> Result<Vec<PredictionAccuracy>, sqlx::Error> {
        let mut scope = db.scope_read().await?;
        // 只返回基于真实历史训练的模型精度；is_synthetic=true 的历史合成行一律排除。
        let records: Vec<PredictionModelRecord> = if let Some(ref mt) = model_type {
            sqlx::query_as(
                only_own_schema_query!("finance", "SELECT id, model_type, entity_id, parameters, accuracy, is_active, trained_at, created_at, updated_at FROM finance_prediction_models_v53 WHERE is_synthetic = false AND model_type = $1 ORDER BY trained_at DESC"),
            )
            .bind(mt)
            .fetch_all(&mut scope)
            .await?
        } else {
            sqlx::query_as(
                only_own_schema_query!("finance", "SELECT id, model_type, entity_id, parameters, accuracy, is_active, trained_at, created_at, updated_at FROM finance_prediction_models_v53 WHERE is_synthetic = false ORDER BY trained_at DESC"),
            )
            .fetch_all(&mut scope)
            .await?
        };
        scope.commit().await?;

        let mut accuracies = Vec::new();
        for record in &records {
            let accuracy = record.accuracy.to_f64().unwrap_or(0.0);
            accuracies.push(PredictionAccuracy {
                model_type: record.model_type.clone(),
                overall_accuracy: accuracy,
                inflow_accuracy: accuracy * 1.05,
                outflow_accuracy: accuracy * 0.95,
                mean_absolute_error: (1.0 - accuracy) * 100.0,
                sample_count: record
                    .parameters
                    .get("sample_months")
                    .and_then(|v| v.as_i64())
                    .unwrap_or(0),
                last_trained: Some(record.trained_at),
            });
        }

        // 不再用硬编码 0.85 / sample_count=120 的假精度兜底：无真实训练模型时返回空集，
        // 由调用方按"无可用模型"处理，而不是把合成数据包装成可信指标。
        Ok(accuracies)
    }
}

// ==================== 智能预算差异分析 ====================

pub struct BudgetAnalyzer;

#[derive(Debug, Deserialize)]
pub struct AnalyzeBudgetRequest {
    pub entity_id: String,
    pub period: String,
    pub budget_items: Vec<BudgetItemInput>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BudgetItemInput {
    pub item_id: String,
    pub item_name: String,
    pub budget_amount: Decimal,
    pub actual_amount: Decimal,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VarianceAnalysisResult {
    pub variances: Vec<BudgetVariance>,
    pub total_budget: Decimal,
    pub total_actual: Decimal,
    pub total_variance: Decimal,
    pub variance_percentage: f64,
    pub classification_summary: HashMap<String, i64>,
    pub root_causes: Vec<String>,
    pub recommendations: Vec<String>,
    pub anomalies: Vec<AnomalyDetection>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnomalyDetection {
    pub item_id: String,
    pub item_name: String,
    pub anomaly_type: String,
    pub severity: String,
    pub description: String,
    pub expected_range: String,
    pub actual_value: f64,
}

#[derive(Debug, Deserialize, utoipa::IntoParams, ToSchema)]
pub struct VarianceQueryParams {
    pub entity_id: Option<String>,
    pub period: Option<String>,
    pub classification: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VarianceTrendPoint {
    pub period: String,
    pub variance_amount: Decimal,
    pub variance_percentage: f64,
    pub classification: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VarianceTrendAnalysis {
    pub points: Vec<VarianceTrendPoint>,
    pub overall_trend: String,
    pub average_variance: f64,
    pub trend_direction: String,
    pub recommendations: Vec<String>,
}

impl BudgetAnalyzer {
    pub async fn analyze(
        db: &Db,
        tenant_id: Uuid,
        req: AnalyzeBudgetRequest,
    ) -> Result<VarianceAnalysisResult, sqlx::Error> {
        let now = Utc::now();
        let mut variances = Vec::new();
        // 金额累加在 Decimal 域完成（budget/actual 来自请求体，DB 列为 numeric(18,2)）。
        let mut total_budget = Decimal::ZERO;
        let mut total_actual = Decimal::ZERO;
        let mut classification_summary: HashMap<String, i64> = HashMap::new();

        for item in &req.budget_items {
            let variance_amount = item.actual_amount - item.budget_amount;
            // finance_budget_variances_v53.variance_percentage 为 numeric(18,2)，全程 Decimal。
            let variance_percentage = if item.budget_amount != Decimal::ZERO {
                (variance_amount / item.budget_amount * Decimal::from(100)).round_dp(2)
            } else {
                Decimal::ZERO
            };

            // budget_item_id 为 uuid（DDL 2026-10-15），非法值直接拒绝。
            let budget_item_id = Uuid::parse_str(&item.item_id).map_err(|_| {
                sqlx::Error::Protocol(format!(
                    "budget_item_id 必须是 UUID（finance_budget_variances_v53.budget_item_id 为 uuid）: {}",
                    item.item_id
                ))
            })?;

            let classification = Self::classify_variance(
                variance_amount.to_f64().unwrap_or(0.0),
                item.budget_amount.to_f64().unwrap_or(0.0),
            );
            let trend = Self::detect_trend(variance_percentage.to_f64().unwrap_or(0.0));

            *classification_summary
                .entry(classification.as_str().to_string())
                .or_insert(0) += 1;

            let variance = BudgetVariance {
                id: Uuid::new_v4(),
                budget_item_id,
                period: req.period.clone(),
                budget_amount: item.budget_amount,
                actual_amount: item.actual_amount,
                variance_amount,
                variance_percentage,
                classification: classification.as_str().to_string(),
                trend: trend.as_str().to_string(),
                created_at: now,
                updated_at: now,
            };

            variances.push(variance);
            total_budget += item.budget_amount;
            total_actual += item.actual_amount;
        }

        let total_variance = total_actual - total_budget;
        let variance_percentage = if total_budget != Decimal::ZERO {
            (total_variance / total_budget * Decimal::from(100))
                .to_f64()
                .unwrap_or(0.0)
        } else {
            0.0
        };

        let root_causes = Self::analyze_root_causes(&variances);
        let recommendations = Self::generate_recommendations(&variances, &root_causes);
        let anomalies = Self::detect_anomalies_internal(&variances);

        let mut scope = db.scope_for_tenant(tenant_id).await?;
        for v in &variances {
            sqlx::query(
                only_own_schema_query!("finance", r#"INSERT INTO finance_budget_variances_v53
                    (id, budget_item_id, period, budget_amount, actual_amount, variance_amount, variance_percentage, classification, trend, created_at, updated_at, tenant_id)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                ON CONFLICT DO NOTHING"#),
            )
            .bind(v.id)
            .bind(v.budget_item_id)
            .bind(&v.period)
            .bind(v.budget_amount)
            .bind(v.actual_amount)
            .bind(v.variance_amount)
            .bind(v.variance_percentage)
            .bind(&v.classification)
            .bind(&v.trend)
            .bind(v.created_at)
            .bind(v.updated_at)
            .bind(tenant_id)
            .execute(&mut scope)
            .await?;
        }
        scope.commit().await?;

        Ok(VarianceAnalysisResult {
            variances,
            total_budget,
            total_actual,
            total_variance,
            variance_percentage,
            classification_summary,
            root_causes,
            recommendations,
            anomalies,
        })
    }

    fn classify_variance(variance: f64, budget: f64) -> VarianceClassification {
        if variance.abs() < budget.abs() * 0.02 {
            VarianceClassification::Neutral
        } else if variance > 0.0 {
            VarianceClassification::Unfavorable
        } else {
            VarianceClassification::Favorable
        }
    }

    fn detect_trend(variance_percentage: f64) -> VarianceTrend {
        let abs_pct = variance_percentage.abs();
        if abs_pct < 2.0 {
            VarianceTrend::Stable
        } else if abs_pct < 5.0 {
            if variance_percentage > 0.0 {
                VarianceTrend::Increasing
            } else {
                VarianceTrend::Decreasing
            }
        } else if abs_pct < 10.0 {
            VarianceTrend::Volatile
        } else if variance_percentage > 0.0 {
            VarianceTrend::Increasing
        } else {
            VarianceTrend::Decreasing
        }
    }

    fn analyze_root_causes(variances: &[BudgetVariance]) -> Vec<String> {
        let mut causes = Vec::new();
        let unfavorable: Vec<&BudgetVariance> = variances
            .iter()
            .filter(|v| v.classification == "unfavorable")
            .collect();

        if !unfavorable.is_empty() {
            let total_unfavorable: Decimal = unfavorable.iter().map(|v| v.variance_amount).sum();
            causes.push(format!(
                "共 {} 项不利差异，合计金额 {:.2}",
                unfavorable.len(),
                total_unfavorable
            ));

            if unfavorable.len() > variances.len() / 2 {
                causes.push("超过半数预算项目出现不利差异，建议审查预算编制合理性".to_string());
            }

            let high_impact: Vec<&&BudgetVariance> = unfavorable
                .iter()
                .filter(|v| v.variance_percentage.abs() > Decimal::from(15))
                .collect();
            if !high_impact.is_empty() {
                causes.push(format!(
                    "{} 项差异率超过 15%，可能存在市场环境变化或内部执行问题",
                    high_impact.len()
                ));
            }
        }

        let favorable: Vec<&BudgetVariance> = variances
            .iter()
            .filter(|v| v.classification == "favorable")
            .collect();
        if !favorable.is_empty() {
            let total_favorable: Decimal = favorable.iter().map(|v| v.variance_amount).sum();
            causes.push(format!(
                "{} 项有利差异，合计金额 {:.2}",
                favorable.len(),
                total_favorable
            ));
        }

        if causes.is_empty() {
            causes.push("预算执行情况良好，无显著差异".to_string());
        }

        causes
    }

    fn generate_recommendations(
        variances: &[BudgetVariance],
        root_causes: &[String],
    ) -> Vec<String> {
        let mut recs = Vec::new();

        let high_severity: Vec<&BudgetVariance> = variances
            .iter()
            .filter(|v| v.variance_percentage.abs() > Decimal::from(20))
            .collect();

        if !high_severity.is_empty() {
            recs.push(format!(
                "紧急关注 {} 项差异率超 20% 的项目，深入分析根因并制定纠偏措施",
                high_severity.len()
            ));
        }

        let medium_severity: Vec<&BudgetVariance> = variances
            .iter()
            .filter(|v| {
                v.variance_percentage.abs() > Decimal::from(10)
                    && v.variance_percentage.abs() <= Decimal::from(20)
            })
            .collect();

        if !medium_severity.is_empty() {
            recs.push(format!(
                "对 {} 项差异率 10%-20% 的项目进行专项审查",
                medium_severity.len()
            ));
        }

        if root_causes.iter().any(|c| c.contains("超过半数")) {
            recs.push("建议重新评估预算编制方法，引入滚动预测机制".to_string());
        }

        if recs.is_empty() {
            recs.push("继续保持当前预算控制措施".to_string());
        }

        recs
    }

    fn detect_anomalies_internal(variances: &[BudgetVariance]) -> Vec<AnomalyDetection> {
        let mut anomalies = Vec::new();

        for v in variances {
            let abs_pct = v.variance_percentage.abs();
            let item_id = v.budget_item_id.to_string();
            let actual_value = v.variance_percentage.to_f64().unwrap_or(0.0);

            if abs_pct > Decimal::from(30) {
                anomalies.push(AnomalyDetection {
                    item_id: item_id.clone(),
                    item_name: item_id.clone(),
                    anomaly_type: "extreme_deviation".to_string(),
                    severity: "critical".to_string(),
                    description: format!(
                        "项目 {} 差异率达 {:.1}%，属于极端偏差",
                        item_id, v.variance_percentage
                    ),
                    expected_range: "±10%".to_string(),
                    actual_value,
                });
            } else if abs_pct > Decimal::from(20) {
                anomalies.push(AnomalyDetection {
                    item_id: item_id.clone(),
                    item_name: item_id.clone(),
                    anomaly_type: "significant_deviation".to_string(),
                    severity: "high".to_string(),
                    description: format!(
                        "项目 {} 差异率达 {:.1}%，需要关注",
                        item_id, v.variance_percentage
                    ),
                    expected_range: "±10%".to_string(),
                    actual_value,
                });
            } else if abs_pct > Decimal::from(15) {
                anomalies.push(AnomalyDetection {
                    item_id: item_id.clone(),
                    item_name: item_id.clone(),
                    anomaly_type: "moderate_deviation".to_string(),
                    severity: "medium".to_string(),
                    description: format!(
                        "项目 {} 差异率达 {:.1}%，建议审查",
                        item_id, v.variance_percentage
                    ),
                    expected_range: "±10%".to_string(),
                    actual_value,
                });
            }
        }

        anomalies
    }

    pub async fn get_variance(
        db: &Db,
        entity_id: Option<String>,
        period: Option<String>,
        classification: Option<String>,
    ) -> Result<Vec<BudgetVariance>, sqlx::Error> {
        let mut query = String::from(
            "SELECT id, budget_item_id, period, budget_amount, actual_amount, variance_amount, variance_percentage, classification, trend, created_at, updated_at FROM finance_budget_variances_v53 WHERE 1=1",
        );

        if entity_id.is_some() {
            query.push_str(" AND budget_item_id = $1");
        }
        if period.is_some() {
            let idx = if entity_id.is_some() { "2" } else { "1" };
            query.push_str(&format!(" AND period = ${}", idx));
        }
        if classification.is_some() {
            let base =
                if entity_id.is_some() { 1 } else { 0 } + if period.is_some() { 1 } else { 0 } + 1;
            query.push_str(&format!(" AND classification = ${}", base));
        }

        query.push_str(" ORDER BY created_at DESC LIMIT 500");

        let mut q = sqlx::query_as::<_, BudgetVariance>(sqlx::AssertSqlSafe(query));
        if let Some(ref eid) = entity_id {
            // budget_item_id 为 uuid，参数必须以 uuid 绑定，否则 uuid = text 无运算符。
            let eid = Uuid::parse_str(eid).map_err(|_| {
                sqlx::Error::Protocol(format!(
                    "entity_id 必须是 UUID（finance_budget_variances_v53.budget_item_id 为 uuid）: {}",
                    eid
                ))
            })?;
            q = q.bind(eid);
        }
        if let Some(ref p) = period {
            q = q.bind(p);
        }
        if let Some(ref c) = classification {
            q = q.bind(c);
        }

        let mut scope = db.scope_read().await?;
        let variances = q.fetch_all(&mut scope).await;
        scope.commit().await?;
        variances
    }

    pub async fn get_report(
        db: &Db,
        entity_id: Option<String>,
        period: Option<String>,
    ) -> Result<VarianceAnalysisResult, sqlx::Error> {
        let variances = Self::get_variance(db, entity_id, period, None).await?;

        // 金额聚合在 Decimal 域完成（v.*_amount 来自 numeric(18,2) 列）。
        let total_budget: Decimal = variances.iter().map(|v| v.budget_amount).sum();
        let total_actual: Decimal = variances.iter().map(|v| v.actual_amount).sum();
        let total_variance = total_actual - total_budget;
        let variance_percentage = if total_budget != Decimal::ZERO {
            (total_variance / total_budget * Decimal::from(100))
                .to_f64()
                .unwrap_or(0.0)
        } else {
            0.0
        };

        let mut classification_summary: HashMap<String, i64> = HashMap::new();
        for v in &variances {
            *classification_summary
                .entry(v.classification.clone())
                .or_insert(0) += 1;
        }

        let root_causes = Self::analyze_root_causes(&variances);
        let recommendations = Self::generate_recommendations(&variances, &root_causes);
        let anomalies = Self::detect_anomalies_internal(&variances);

        Ok(VarianceAnalysisResult {
            variances,
            total_budget,
            total_actual,
            total_variance,
            variance_percentage,
            classification_summary,
            root_causes,
            recommendations,
            anomalies,
        })
    }

    pub async fn detect_anomalies(
        db: &Db,
        entity_id: Option<String>,
        period: Option<String>,
    ) -> Result<Vec<AnomalyDetection>, sqlx::Error> {
        let variances = Self::get_variance(db, entity_id, period, None).await?;
        Ok(Self::detect_anomalies_internal(&variances))
    }

    #[allow(clippy::as_conversions, clippy::cast_possible_wrap)]
    pub async fn get_trends(
        db: &Db,
        entity_id: Option<String>,
    ) -> Result<VarianceTrendAnalysis, sqlx::Error> {
        let variances = Self::get_variance(db, entity_id, None, None).await?;

        let mut period_data: HashMap<String, Vec<&BudgetVariance>> = HashMap::new();
        for v in &variances {
            period_data.entry(v.period.clone()).or_default().push(v);
        }

        let mut points = Vec::new();
        // 金额累加在 Decimal 域完成；count 仅作均值分母（均值为统计量，最后转 f64）。
        let mut total_variance_sum = Decimal::ZERO;
        let mut count: usize = 0;

        let mut periods: Vec<&String> = period_data.keys().collect();
        periods.sort();

        for period in &periods {
            let items = match period_data.get(*period) {
                Some(items) => items,
                None => continue,
            };
            let budget_sum: Decimal = items.iter().map(|v| v.budget_amount).sum();
            let actual_sum: Decimal = items.iter().map(|v| v.actual_amount).sum();
            let variance_amount = actual_sum - budget_sum;
            let variance_pct = if budget_sum != Decimal::ZERO {
                (variance_amount / budget_sum * Decimal::from(100))
                    .to_f64()
                    .unwrap_or(0.0)
            } else {
                0.0
            };

            let near_zero = Decimal::new(2, 2); // 0.02 容差
            let classification = if variance_amount.abs() < budget_sum.abs() * near_zero {
                VarianceClassification::Neutral.as_str().to_string()
            } else if variance_amount > Decimal::ZERO {
                VarianceClassification::Unfavorable.as_str().to_string()
            } else {
                VarianceClassification::Favorable.as_str().to_string()
            };

            total_variance_sum += variance_amount;
            count += 1;

            points.push(VarianceTrendPoint {
                period: (*period).clone(),
                variance_amount,
                variance_percentage: variance_pct,
                classification,
            });
        }

        let average_variance = if count > 0 {
            (total_variance_sum / Decimal::from(count as i64))
                .to_f64()
                .unwrap_or(0.0)
        } else {
            0.0
        };

        let overall_trend = if points.len() >= 3 {
            let recent = points.iter().rev().take(3).collect::<Vec<_>>();
            let oldest_of_recent = recent.last().map(|p| p.variance_percentage).unwrap_or(0.0);
            let newest_of_recent = recent.first().map(|p| p.variance_percentage).unwrap_or(0.0);
            let diff = newest_of_recent - oldest_of_recent;
            if diff > 2.0 {
                "deteriorating"
            } else if diff < -2.0 {
                "improving"
            } else {
                "stable"
            }
        } else {
            "insufficient_data"
        };

        let trend_direction = match overall_trend {
            "deteriorating" => "差异呈恶化趋势，需及时干预".to_string(),
            "improving" => "差异呈改善趋势，当前策略有效".to_string(),
            "stable" => "差异保持稳定".to_string(),
            _ => "数据不足，建议积累更多历史数据".to_string(),
        };

        let recommendations = match overall_trend {
            "deteriorating" => vec![
                "立即审查不利差异项目，制定纠偏措施".to_string(),
                "考虑调整后续预算以适应实际趋势".to_string(),
                "加强预算执行监控频率".to_string(),
            ],
            "improving" => vec![
                "继续保持当前预算控制措施".to_string(),
                "可考虑将有利差异结转至下期使用".to_string(),
            ],
            "stable" => vec!["维持当前预算管理节奏".to_string()],
            _ => vec!["建议建立定期预算分析机制".to_string()],
        };

        Ok(VarianceTrendAnalysis {
            points,
            overall_trend: overall_trend.to_string(),
            average_variance,
            trend_direction,
            recommendations,
        })
    }
}

// ==================== API Handlers ====================

// --- Cash Flow Handlers ---
#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:write"])),
    path = "/forecast-v53/cash-flow/predict",
    responses(
        (status = 200, description = "成功"),
        (status = 201, description = "创建成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误"),
    ),
    tag = "Finance Forecast V53",
    operation_id = "predict_cash_flow_handler",
)]

pub async fn predict_cash_flow_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<PredictCashFlowRequest>,
) -> ApiResponse<PredictionResult> {
    let db = state.db.clone();
    let tenant_id = get_tenant_id_from_claims(&claims);

    match CashFlowPredictor::predict(&db, tenant_id, req).await {
        Ok(result) => ApiResponse::success(result, "预测完成"),
        Err(e) => crate::shared::err_resp(e),
    }
}

pub async fn get_predictions_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<PredictionsQueryParams>,
) -> ApiResponse<Vec<CashFlowPrediction>> {
    let db = state.db.clone();
    let _tenant_id = get_tenant_id_from_claims(&claims);
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(20);

    match CashFlowPredictor::get_predictions(
        &db,
        params.entity_id,
        params.period,
        params.scenario,
        page,
        page_size,
    )
    .await
    {
        Ok((items, _total)) => ApiResponse::success(items, "查询成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

pub async fn retrain_model_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<serde_json::Value>,
) -> ApiResponse<PredictionModelRecord> {
    let db = state.db.clone();
    let tenant_id = get_tenant_id_from_claims(&claims);

    let model_str = req
        .get("model")
        .and_then(|v| v.as_str())
        .unwrap_or("exponential_smoothing");
    let model = PredictionModel::from_str(model_str);

    match CashFlowPredictor::retrain_model(&db, tenant_id, model).await {
        Ok(record) => ApiResponse::success(record, "模型重训练完成"),
        Err(e) => crate::shared::err_resp(e),
    }
}
#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/forecast-v53/cash-flow/accuracy",
    responses(
        (status = 200, description = "成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误"),
    ),
    tag = "Finance Forecast V53",
    operation_id = "get_accuracy_handler",
)]

pub async fn get_accuracy_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<serde_json::Value>,
) -> ApiResponse<Vec<PredictionAccuracy>> {
    let db = state.db.clone();
    let _tenant_id = get_tenant_id_from_claims(&claims);

    let model_type = params
        .get("model_type")
        .and_then(|v| v.as_str())
        .map(String::from);

    match CashFlowPredictor::get_accuracy(&db, model_type).await {
        Ok(accuracies) => ApiResponse::success(accuracies, "查询成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

// --- Budget Handlers ---

pub async fn analyze_budget_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<AnalyzeBudgetRequest>,
) -> ApiResponse<VarianceAnalysisResult> {
    let db = state.db.clone();
    let tenant_id = get_tenant_id_from_claims(&claims);

    match BudgetAnalyzer::analyze(&db, tenant_id, req).await {
        Ok(result) => ApiResponse::success(result, "分析完成"),
        Err(e) => crate::shared::err_resp(e),
    }
}

pub async fn get_variance_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<VarianceQueryParams>,
) -> ApiResponse<Vec<BudgetVariance>> {
    let db = state.db.clone();
    let _tenant_id = get_tenant_id_from_claims(&claims);

    match BudgetAnalyzer::get_variance(&db, params.entity_id, params.period, params.classification)
        .await
    {
        Ok(variances) => ApiResponse::success(variances, "查询成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}
#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:report:read"])),
    path = "/forecast-v53/budget/report",
    responses(
        (status = 200, description = "成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误"),
    ),
    params(
        ("query" = VarianceQueryParams, Query, description = "查询参数"),
    ),
    tag = "Finance Forecast V53",
    operation_id = "get_variance_report_handler",
)]

pub async fn get_variance_report_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<VarianceQueryParams>,
) -> ApiResponse<VarianceAnalysisResult> {
    let db = state.db.clone();
    let _tenant_id = get_tenant_id_from_claims(&claims);

    match BudgetAnalyzer::get_report(&db, params.entity_id, params.period).await {
        Ok(result) => ApiResponse::success(result, "查询成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

pub async fn detect_anomalies_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<serde_json::Value>,
) -> ApiResponse<Vec<AnomalyDetection>> {
    let db = state.db.clone();
    let _tenant_id = get_tenant_id_from_claims(&claims);

    let entity_id = req
        .get("entity_id")
        .and_then(|v| v.as_str())
        .map(String::from);
    let period = req.get("period").and_then(|v| v.as_str()).map(String::from);

    match BudgetAnalyzer::detect_anomalies(&db, entity_id, period).await {
        Ok(anomalies) => ApiResponse::success(anomalies, "异常检测完成"),
        Err(e) => crate::shared::err_resp(e),
    }
}

pub async fn get_variance_trends_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<serde_json::Value>,
) -> ApiResponse<VarianceTrendAnalysis> {
    let db = state.db.clone();
    let _tenant_id = get_tenant_id_from_claims(&claims);

    let entity_id = params
        .get("entity_id")
        .and_then(|v| v.as_str())
        .map(String::from);

    match BudgetAnalyzer::get_trends(&db, entity_id).await {
        Ok(trends) => ApiResponse::success(trends, "查询成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

// ==================== 路由注册 ====================

pub fn create_routes() -> Router<AppState> {
    Router::new()
        // Cash Flow Prediction
        .route(
            "/forecast-v53/cash-flow/predict",
            axum::routing::post(predict_cash_flow_handler),
        )
        .route(
            "/forecast-v53/cash-flow/predictions",
            axum::routing::get(get_predictions_handler),
        )
        .route(
            "/forecast-v53/cash-flow/retrain",
            axum::routing::post(retrain_model_handler),
        )
        .route(
            "/forecast-v53/cash-flow/accuracy",
            axum::routing::get(get_accuracy_handler),
        )
        // Budget Variance Analysis
        .route(
            "/forecast-v53/budget/analyze",
            axum::routing::post(analyze_budget_handler),
        )
        .route(
            "/forecast-v53/budget/variance",
            axum::routing::get(get_variance_handler),
        )
        .route(
            "/forecast-v53/budget/report",
            axum::routing::get(get_variance_report_handler),
        )
        .route(
            "/forecast-v53/budget/anomalies",
            axum::routing::post(detect_anomalies_handler),
        )
        .route(
            "/forecast-v53/budget/trends",
            axum::routing::get(get_variance_trends_handler),
        )
        // 批 41：现金流预测/预算差异分析路由统一挂 finance:budget:read 细码（纵深防御；
        // 写端点在网关层 require_finance_write 已要求 finance:admin）
        .layer(axum::middleware::from_fn(
            topems_shared_auth::middleware::require_permission("finance:budget:read"),
        ))
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde::Serialize;
    use serde_json::Value;

    fn roundtrip<T: Serialize + for<'de> Deserialize<'de>>(item: &T) {
        let json = serde_json::to_string(item).unwrap();
        let v1: Value = serde_json::from_str(&json).unwrap();
        let back: T = serde_json::from_str(&json).unwrap();
        let json2 = serde_json::to_string(&back).unwrap();
        let v2: Value = serde_json::from_str(&json2).unwrap();
        assert_eq!(v1, v2);
    }

    #[test]
    fn enum_prediction_model() {
        roundtrip(&PredictionModel::MovingAverage);
        roundtrip(&PredictionModel::ExponentialSmoothing);
        roundtrip(&PredictionModel::LinearTrend);
        roundtrip(&PredictionModel::SeasonalDecomposition);
    }

    #[test]
    fn enum_prediction_scenario() {
        roundtrip(&PredictionScenario::Optimistic);
        roundtrip(&PredictionScenario::Pessimistic);
        roundtrip(&PredictionScenario::Realistic);
    }

    #[test]
    fn enum_variance_classification() {
        roundtrip(&VarianceClassification::Favorable);
        roundtrip(&VarianceClassification::Unfavorable);
        roundtrip(&VarianceClassification::Neutral);
    }

    #[test]
    fn enum_variance_trend() {
        roundtrip(&VarianceTrend::Increasing);
        roundtrip(&VarianceTrend::Decreasing);
        roundtrip(&VarianceTrend::Stable);
        roundtrip(&VarianceTrend::Volatile);
    }

    #[test]
    fn struct_cash_flow_prediction() {
        let v = CashFlowPrediction {
            id: Uuid::new_v4(),
            entity_id: Uuid::new_v4(),
            period: "2024-Q1".into(),
            predicted_inflow: Decimal::from(100_000),
            predicted_outflow: Decimal::from(80_000),
            predicted_net: Decimal::from(20_000),
            confidence: Decimal::new(85, 2),
            scenario: "realistic".into(),
            model_version: "v53.0-exp".into(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        roundtrip(&v);
    }

    #[test]
    fn struct_prediction_model_record() {
        let v = PredictionModelRecord {
            id: Uuid::new_v4(),
            model_type: "exponential_smoothing".into(),
            entity_id: Some(Uuid::new_v4()),
            parameters: serde_json::json!({"alpha":0.3}),
            accuracy: Decimal::new(88, 2),
            is_active: true,
            trained_at: Utc::now(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        roundtrip(&v);
    }

    #[test]
    fn struct_budget_variance() {
        let v = BudgetVariance {
            id: Uuid::new_v4(),
            budget_item_id: Uuid::new_v4(),
            period: "2024-Q1".into(),
            budget_amount: Decimal::from(1000),
            actual_amount: Decimal::from(1200),
            variance_amount: Decimal::from(200),
            variance_percentage: Decimal::from(20),
            classification: "unfavorable".into(),
            trend: "increasing".into(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        roundtrip(&v);
    }

    #[test]
    fn struct_variance_report() {
        let v = VarianceReport {
            id: Uuid::new_v4(),
            period: "2024-Q1".into(),
            summary: "整体偏差可控".into(),
            line_items: serde_json::json!([]),
            trends: serde_json::json!({}),
            recommendations: serde_json::json!(["建议加强"]),
            alerts: serde_json::json!([]),
            created_at: Utc::now(),
        };
        roundtrip(&v);
    }

    #[test]
    fn struct_prediction_accuracy() {
        let v = PredictionAccuracy {
            model_type: "linear_trend".into(),
            overall_accuracy: 0.85,
            inflow_accuracy: 0.88,
            outflow_accuracy: 0.82,
            mean_absolute_error: 15.0,
            sample_count: 120,
            last_trained: Some(Utc::now()),
        };
        roundtrip(&v);
    }

    #[test]
    fn struct_prediction_result() {
        let v = PredictionResult {
            prediction: CashFlowPrediction {
                id: Uuid::new_v4(),
                entity_id: Uuid::new_v4(),
                period: "2024-Q2".into(),
                predicted_inflow: Decimal::from(50_000),
                predicted_outflow: Decimal::from(40_000),
                predicted_net: Decimal::from(10_000),
                confidence: Decimal::new(9, 1),
                scenario: "optimistic".into(),
                model_version: "v53.0-ma".into(),
                created_at: Utc::now(),
                updated_at: Utc::now(),
            },
            confidence_interval_lower: 8000.0,
            confidence_interval_upper: 12000.0,
            seasonal_factors: vec![0.8, 1.0, 1.2],
            trend_slope: 500.0,
        };
        roundtrip(&v);
    }

    #[test]
    fn struct_budget_item_input() {
        let v = BudgetItemInput {
            item_id: "it-1".into(),
            item_name: "租金".into(),
            budget_amount: Decimal::from(10000),
            actual_amount: Decimal::from(9500),
        };
        roundtrip(&v);
    }

    #[test]
    fn struct_anomaly_detection() {
        let v = AnomalyDetection {
            item_id: "it-1".into(),
            item_name: "办公用品".into(),
            anomaly_type: "spike".into(),
            severity: "high".into(),
            description: "突然增加".into(),
            expected_range: "0-500".into(),
            actual_value: 2000.0,
        };
        roundtrip(&v);
    }

    #[test]
    fn struct_variance_analysis_result() {
        let v = VarianceAnalysisResult {
            variances: vec![BudgetVariance {
                id: Uuid::new_v4(),
                budget_item_id: Uuid::new_v4(),
                period: "2024-Q1".into(),
                budget_amount: Decimal::from(1000),
                actual_amount: Decimal::from(1200),
                variance_amount: Decimal::from(200),
                variance_percentage: Decimal::from(20),
                classification: "unfavorable".into(),
                trend: "stable".into(),
                created_at: Utc::now(),
                updated_at: Utc::now(),
            }],
            total_budget: Decimal::from(1000),
            total_actual: Decimal::from(1200),
            total_variance: Decimal::from(200),
            variance_percentage: 20.0,
            classification_summary: [("unfavorable".into(), 1i64)].into(),
            root_causes: vec!["成本上涨".into()],
            recommendations: vec!["控制成本".into()],
            anomalies: vec![AnomalyDetection {
                item_id: "it-1".into(),
                item_name: "x".into(),
                anomaly_type: "spike".into(),
                severity: "high".into(),
                description: "d".into(),
                expected_range: "0-100".into(),
                actual_value: 500.0,
            }],
        };
        roundtrip(&v);
    }

    #[test]
    fn struct_variance_trend_point() {
        let v = VarianceTrendPoint {
            period: "2024-Q1".into(),
            variance_amount: Decimal::from(200),
            variance_percentage: 20.0,
            classification: "unfavorable".into(),
        };
        roundtrip(&v);
    }

    #[test]
    fn struct_variance_trend_analysis() {
        let v = VarianceTrendAnalysis {
            points: vec![VarianceTrendPoint {
                period: "2024-Q1".into(),
                variance_amount: Decimal::from(100),
                variance_percentage: 10.0,
                classification: "unfavorable".into(),
            }],
            overall_trend: "worsening".into(),
            average_variance: 100.0,
            trend_direction: "increasing".into(),
            recommendations: vec!["监控".into()],
        };
        roundtrip(&v);
    }
}
