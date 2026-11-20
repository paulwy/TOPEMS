#![allow(dead_code)] // Reserved: V59 智能风控升级模块，待业务接入后启用

//! STATUS: WIRED | Routes registered + DB tables initialized + Handlers implemented
//! V59.0 Finance 智能风控升级
//!
//! 核心能力：
//! - 实时反欺诈 (Real-time Anti-Fraud): 欺诈信号检测、设备指纹、决策引擎、规则管理
//! - 信用评分 (Credit Scoring): 评分模型、信用画像、因素分析、模型对比
//! - 压力测试 (Stress Testing): 场景建模、压力运行、结果分析、参数对比
//!
//! 路由：
//! - Fraud: POST /finance-v59/fraud/analyze, GET /finance-v59/fraud/decision/{id},
//!   GET /finance-v59/fraud/signals, POST /finance-v59/fraud/device,
//!   GET /finance-v59/fraud/device/{id}, GET /finance-v59/fraud/blocked,
//!   POST /finance-v59/fraud/rule, GET /finance-v59/fraud/rules
//! - Credit: POST /finance-v59/credit/score, GET /finance-v59/credit/profile/{id},
//!   GET /finance-v59/credit/models, POST /finance-v59/credit/model,
//!   PUT /finance-v59/credit/model/{id}, GET /finance-v59/credit/factors,
//!   GET /finance-v59/credit/compare, POST /finance-v59/credit/bulk
//! - Stress: POST /finance-v59/stress/scenario, POST /finance-v59/stress/run,
//!   GET /finance-v59/stress/result/{id}, GET /finance-v59/stress/scenarios,
//!   POST /finance-v59/stress/compare, GET /finance-v59/stress/params,
//!   GET /finance-v59/stress/summary

use axum::{
    extract::{Extension, Json, Path, Query, State},
    Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use topems_shared_boundary::only_own_schema_query;
use topems_shared_db::scope::Db;
use uuid::Uuid;

use crate::shared::AppState;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::get_tenant_id_from_claims;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_core::response::ApiResponse;

// ==================== 枚举类型 ====================

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum FraudSignalType {
    Velocity,
    Geolocation,
    Device,
    Behavior,
    Pattern,
}

impl FraudSignalType {
    fn as_str(&self) -> &'static str {
        match self {
            FraudSignalType::Velocity => "velocity",
            FraudSignalType::Geolocation => "geolocation",
            FraudSignalType::Device => "device",
            FraudSignalType::Behavior => "behavior",
            FraudSignalType::Pattern => "pattern",
        }
    }

    fn from_str(s: &str) -> Self {
        match s {
            "geolocation" => FraudSignalType::Geolocation,
            "device" => FraudSignalType::Device,
            "behavior" => FraudSignalType::Behavior,
            "pattern" => FraudSignalType::Pattern,
            _ => FraudSignalType::Velocity,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum RiskLevel {
    Low,
    Medium,
    High,
    Critical,
}

impl RiskLevel {
    fn as_str(&self) -> &'static str {
        match self {
            RiskLevel::Low => "low",
            RiskLevel::Medium => "medium",
            RiskLevel::High => "high",
            RiskLevel::Critical => "critical",
        }
    }

    fn from_str(s: &str) -> Self {
        match s {
            "medium" => RiskLevel::Medium,
            "high" => RiskLevel::High,
            "critical" => RiskLevel::Critical,
            _ => RiskLevel::Low,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum FraudAction {
    Approve,
    Review,
    Block,
}

impl FraudAction {
    fn as_str(&self) -> &'static str {
        match self {
            FraudAction::Approve => "approve",
            FraudAction::Review => "review",
            FraudAction::Block => "block",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum CreditGrade {
    AAA,
    AA,
    A,
    B,
    C,
    D,
}

impl CreditGrade {
    fn as_str(&self) -> &'static str {
        match self {
            CreditGrade::AAA => "AAA",
            CreditGrade::AA => "AA",
            CreditGrade::A => "A",
            CreditGrade::B => "B",
            CreditGrade::C => "C",
            CreditGrade::D => "D",
        }
    }

    fn from_score(score: i32) -> Self {
        if score >= 750 {
            CreditGrade::AAA
        } else if score >= 700 {
            CreditGrade::AA
        } else if score >= 650 {
            CreditGrade::A
        } else if score >= 550 {
            CreditGrade::B
        } else if score >= 400 {
            CreditGrade::C
        } else {
            CreditGrade::D
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum StressScenarioType {
    Market,
    Credit,
    Liquidity,
    Operational,
}

impl StressScenarioType {
    fn as_str(&self) -> &'static str {
        match self {
            StressScenarioType::Market => "market",
            StressScenarioType::Credit => "credit",
            StressScenarioType::Liquidity => "liquidity",
            StressScenarioType::Operational => "operational",
        }
    }

    fn from_str(s: &str) -> Self {
        match s {
            "credit" => StressScenarioType::Credit,
            "liquidity" => StressScenarioType::Liquidity,
            "operational" => StressScenarioType::Operational,
            _ => StressScenarioType::Market,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ShockType {
    Parallel,
    Sequential,
    Reverse,
}

impl ShockType {
    fn as_str(&self) -> &'static str {
        match self {
            ShockType::Parallel => "parallel",
            ShockType::Sequential => "sequential",
            ShockType::Reverse => "reverse",
        }
    }
}

// ==================== 数据模型 ====================

// --- 反欺诈 ---

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct FraudSignal {
    pub id: Uuid,
    pub signal_type: String,
    pub score: f64,
    pub confidence: f64,
    pub metadata: Option<serde_json::Value>,
    pub detected_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct FraudDecision {
    pub id: Uuid,
    pub transaction_id: String,
    pub risk_level: String,
    pub action: String,
    pub reason: String,
    pub signals: Option<serde_json::Value>,
    pub decided_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct DeviceProfile {
    pub id: Uuid,
    pub device_id: String,
    pub fingerprint: String,
    pub trust_score: f64,
    pub last_seen: DateTime<Utc>,
    pub ip_history: Option<serde_json::Value>,
}

// --- 信用评分 ---

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct CreditProfile {
    pub id: Uuid,
    pub entity_id: String,
    pub score: i32,
    pub grade: String,
    pub factors: Option<serde_json::Value>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ScoringModel {
    pub id: Uuid,
    pub name: String,
    pub version: String,
    pub features: Option<serde_json::Value>,
    pub weights: Option<serde_json::Value>,
    pub accuracy: f64,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScoreFactor {
    pub name: String,
    pub weight: f64,
    pub value: f64,
    pub description: String,
}

// --- 压力测试 ---

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct StressScenario {
    pub id: Uuid,
    pub name: String,
    pub scenario_type: String,
    pub severity: String,
    pub assumptions: Option<serde_json::Value>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct StressResult {
    pub id: Uuid,
    pub scenario_id: Uuid,
    pub entity_id: String,
    pub impact_value: f64,
    pub capital_adequacy: f64,
    pub liquidity_ratio: f64,
    pub pass_fail: bool,
    pub details: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScenarioParameter {
    pub name: String,
    pub base_value: f64,
    pub shocked_value: f64,
    pub shock_type: String,
}

// ==================== 数据库初始化 ====================

// ==================== 1. 实时反欺诈 ====================

pub struct AntiFraudEngine;

#[derive(Debug, Deserialize)]
pub struct AnalyzeTransactionRequest {
    pub transaction_id: String,
    pub amount: Option<f64>,
    pub device_id: Option<String>,
    pub location: Option<String>,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct CreateDeviceRequest {
    pub device_id: String,
    pub fingerprint: String,
    pub trust_score: Option<f64>,
    pub ip_history: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct AddRuleRequest {
    pub name: String,
    pub signal_type: String,
    pub threshold: Option<f64>,
    pub enabled: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct FraudRule {
    pub id: Uuid,
    pub name: String,
    pub signal_type: String,
    pub threshold: f64,
    pub enabled: bool,
}

impl AntiFraudEngine {
    #[allow(clippy::as_conversions, clippy::cast_precision_loss)]
    pub async fn analyze_transaction(
        db: &Db,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
        tenant_id: Uuid,
        req: AnalyzeTransactionRequest,
    ) -> Result<FraudDecision, sqlx::Error> {
        let now = Utc::now();
        let mut signals: Vec<FraudSignal> = Vec::new();
        let mut total_score = 0.0f64;

        if let Some(ref did) = req.device_id {
            let trust = Self::get_device_trust(db, txn, tenant_id, did)
                .await
                .unwrap_or(1.0);
            if trust < 0.5 {
                let signal = Self::create_signal(
                    db,
                    txn,
                    tenant_id,
                    FraudSignalType::Device,
                    0.8,
                    0.9,
                    serde_json::json!({"device_id": did, "trust_score": trust}),
                    now,
                )
                .await?;
                total_score += 0.8;
                signals.push(signal);
            }
        }

        if let Some(ref loc) = req.location {
            if loc.is_empty() {
                let signal = Self::create_signal(
                    db,
                    txn,
                    tenant_id,
                    FraudSignalType::Geolocation,
                    0.5,
                    0.7,
                    serde_json::json!({"location": loc}),
                    now,
                )
                .await?;
                total_score += 0.5;
                signals.push(signal);
            }
        }

        let mut scope = db.scope_with(txn).await?;
        let recent_count: i64 = sqlx::query_scalar(
            only_own_schema_query!("finance", "SELECT COUNT(*) FROM finance.finance_v59_fraud_decisions WHERE tenant_id = $1 AND transaction_id LIKE $2 || '%' AND decided_at > NOW() - INTERVAL '10 minutes'"),
        )
        .bind(tenant_id)
        .bind(&req.transaction_id)
        .fetch_one(&mut scope)
        .await
        .unwrap_or(0);
        let _ = scope.commit().await;

        if recent_count > 5 {
            let signal = Self::create_signal(
                db,
                txn,
                tenant_id,
                FraudSignalType::Velocity,
                (recent_count as f64 / 10.0).min(1.0),
                0.95,
                serde_json::json!({"recent_count": recent_count}),
                now,
            )
            .await?;
            total_score += (recent_count as f64 / 10.0).min(1.0);
            signals.push(signal);
        }

        total_score = total_score.min(1.0);

        let risk_level = if total_score >= 0.8 {
            RiskLevel::Critical
        } else if total_score >= 0.6 {
            RiskLevel::High
        } else if total_score >= 0.3 {
            RiskLevel::Medium
        } else {
            RiskLevel::Low
        };

        let action = if total_score >= 0.8 {
            FraudAction::Block
        } else if total_score >= 0.5 {
            FraudAction::Review
        } else {
            FraudAction::Approve
        };

        let reason = if signals.is_empty() {
            "交易正常，无异常信号".to_string()
        } else {
            let signal_names: Vec<&str> = signals.iter().map(|s| s.signal_type.as_str()).collect();
            format!("检测到 {} 类异常信号: {:?}", signals.len(), signal_names)
        };

        let signals_json = serde_json::Value::Array(
            signals
                .iter()
                .map(|s| {
                    serde_json::json!({
                        "id": s.id,
                        "signal_type": s.signal_type,
                        "score": s.score,
                        "confidence": s.confidence,
                    })
                })
                .collect(),
        );

        let id = Uuid::new_v4();
        let mut scope = db.scope_with(txn).await?;
        let decision = sqlx::query_as::<_, FraudDecision>(only_own_schema_query!(
            "finance",
            r#"INSERT INTO finance.finance_v59_fraud_decisions
                (id, tenant_id, transaction_id, risk_level, action, reason, signals, decided_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id, transaction_id, risk_level, action, reason, signals, decided_at"#
        ))
        .bind(id)
        .bind(tenant_id)
        .bind(&req.transaction_id)
        .bind(risk_level.as_str())
        .bind(action.as_str())
        .bind(&reason)
        .bind(signals_json)
        .bind(now)
        .fetch_one(&mut scope)
        .await?;
        scope.commit().await?;
        Ok(decision)
    }

    async fn create_signal(
        db: &Db,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
        tenant_id: Uuid,
        signal_type: FraudSignalType,
        score: f64,
        confidence: f64,
        metadata: serde_json::Value,
        detected_at: DateTime<Utc>,
    ) -> Result<FraudSignal, sqlx::Error> {
        let id = Uuid::new_v4();
        let mut scope = db.scope_with(txn).await?;
        let signal = sqlx::query_as::<_, FraudSignal>(only_own_schema_query!(
            "finance",
            r#"INSERT INTO finance.finance_v59_fraud_signals
                (id, tenant_id, signal_type, score, confidence, metadata, detected_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, signal_type, score, confidence, metadata, detected_at"#
        ))
        .bind(id)
        .bind(tenant_id)
        .bind(signal_type.as_str())
        .bind(score)
        .bind(confidence)
        .bind(metadata)
        .bind(detected_at)
        .fetch_one(&mut scope)
        .await?;
        scope.commit().await?;
        Ok(signal)
    }

    pub async fn get_fraud_decision(
        db: &Db,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
        _tenant_id: Option<Uuid>,
        decision_id: Uuid,
    ) -> Result<FraudDecision, sqlx::Error> {
        let mut scope = db.scope_with(txn).await?;
        let decision = sqlx::query_as(
            only_own_schema_query!("finance", "SELECT id, transaction_id, risk_level, action, reason, signals, decided_at FROM finance.finance_v59_fraud_decisions WHERE id = $1"),
        )
        .bind(decision_id)
        .fetch_one(&mut scope)
        .await;
        let _ = scope.commit().await;
        decision
    }

    pub async fn get_signals(
        db: &Db,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
        _tenant_id: Option<Uuid>,
        signal_type: Option<String>,
    ) -> Result<Vec<FraudSignal>, sqlx::Error> {
        let mut scope = db.scope_with(txn).await?;
        let mut query = String::from(
            "SELECT id, signal_type, score, confidence, metadata, detected_at FROM finance.finance_v59_fraud_signals",
        );

        if signal_type.is_some() {
            query.push_str(" AND signal_type = $2");
        }

        query.push_str(" ORDER BY detected_at DESC LIMIT 500");

        let mut q = sqlx::query_as::<_, FraudSignal>(sqlx::AssertSqlSafe(query));
        if let Some(ref st) = signal_type {
            q = q.bind(st);
        }

        let signals = q.fetch_all(&mut scope).await;
        let _ = scope.commit().await;
        signals
    }

    pub async fn update_device_profile(
        db: &Db,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
        tenant_id: Uuid,
        req: CreateDeviceRequest,
    ) -> Result<DeviceProfile, sqlx::Error> {
        let now = Utc::now();
        let id = Uuid::new_v4();
        let trust_score = req.trust_score.unwrap_or(1.0);

        let mut scope = db.scope_with(txn).await?;
        let profile = sqlx::query_as::<_, DeviceProfile>(only_own_schema_query!(
            "finance",
            r#"INSERT INTO finance.finance_v59_device_profiles
                (id, tenant_id, device_id, fingerprint, trust_score, last_seen, ip_history)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (tenant_id, device_id) DO UPDATE
            SET fingerprint = EXCLUDED.fingerprint,
                trust_score = EXCLUDED.trust_score,
                last_seen = EXCLUDED.last_seen,
                ip_history = EXCLUDED.ip_history
            RETURNING id, device_id, fingerprint, trust_score, last_seen, ip_history"#
        ))
        .bind(id)
        .bind(tenant_id)
        .bind(&req.device_id)
        .bind(&req.fingerprint)
        .bind(trust_score)
        .bind(now)
        .bind(&req.ip_history)
        .fetch_one(&mut scope)
        .await?;
        scope.commit().await?;
        Ok(profile)
    }

    pub async fn get_device_trust(
        db: &Db,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
        tenant_id: Uuid,
        device_id: &str,
    ) -> Result<f64, sqlx::Error> {
        let mut scope = db.scope_with(txn).await?;
        let result: Option<(f64,)> = sqlx::query_as(
            only_own_schema_query!("finance", "SELECT trust_score FROM finance.finance_v59_device_profiles WHERE tenant_id = $1 AND device_id = $2"),
        )
        .bind(tenant_id)
        .bind(device_id)
        .fetch_optional(&mut scope)
        .await?;
        let _ = scope.commit().await;

        Ok(result.map(|r| r.0).unwrap_or(1.0))
    }

    pub async fn list_blocked_devices(
        db: &Db,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
        _tenant_id: Option<Uuid>,
    ) -> Result<Vec<DeviceProfile>, sqlx::Error> {
        let mut scope = db.scope_with(txn).await?;
        let devices = sqlx::query_as(
            only_own_schema_query!("finance", "SELECT id, device_id, fingerprint, trust_score, last_seen, ip_history FROM finance.finance_v59_device_profiles WHERE trust_score < 0.5 ORDER BY trust_score ASC"),
        )
        .fetch_all(&mut scope)
        .await;
        let _ = scope.commit().await;
        devices
    }

    pub async fn add_rule(
        db: &Db,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
        tenant_id: Uuid,
        req: AddRuleRequest,
    ) -> Result<FraudRule, sqlx::Error> {
        let id = Uuid::new_v4();
        let threshold = req.threshold.unwrap_or(0.5);
        let enabled = req.enabled.unwrap_or(true);

        let mut scope = db.scope_with(txn).await?;
        let rule = sqlx::query_as::<_, FraudRule>(only_own_schema_query!(
            "finance",
            r#"INSERT INTO finance.finance_v59_fraud_rules
                (id, tenant_id, name, signal_type, threshold, enabled)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, name, signal_type, threshold, enabled"#
        ))
        .bind(id)
        .bind(tenant_id)
        .bind(&req.name)
        .bind(&req.signal_type)
        .bind(threshold)
        .bind(enabled)
        .fetch_one(&mut scope)
        .await?;
        scope.commit().await?;
        Ok(rule)
    }

    pub async fn get_rules(
        db: &Db,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
        _tenant_id: Option<Uuid>,
    ) -> Result<Vec<FraudRule>, sqlx::Error> {
        let mut scope = db.scope_with(txn).await?;
        let rules = sqlx::query_as(
            only_own_schema_query!("finance", "SELECT id, name, signal_type, threshold, enabled FROM finance.finance_v59_fraud_rules ORDER BY signal_type, name"),
        )
        .fetch_all(&mut scope)
        .await;
        let _ = scope.commit().await;
        rules
    }
}

// ==================== 2. 信用评分 ====================

pub struct CreditScoringEngine;

#[derive(Debug, Deserialize)]
pub struct CalculateScoreRequest {
    pub entity_id: String,
    pub features: Option<serde_json::Value>,
    pub model_id: Option<Uuid>,
}

#[derive(Debug, Deserialize)]
pub struct CreateModelRequest {
    pub name: String,
    pub version: Option<String>,
    pub features: Option<serde_json::Value>,
    pub weights: Option<serde_json::Value>,
    pub accuracy: Option<f64>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateModelRequest {
    pub name: Option<String>,
    pub features: Option<serde_json::Value>,
    pub weights: Option<serde_json::Value>,
    pub accuracy: Option<f64>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize, utoipa::IntoParams)]
pub struct CompareModelsRequest {
    pub model_ids: Vec<Uuid>,
}

#[derive(Debug, Deserialize)]
pub struct BulkScoreRequest {
    pub entity_ids: Vec<String>,
    pub model_id: Option<Uuid>,
}

impl CreditScoringEngine {
    #[allow(clippy::as_conversions, clippy::cast_possible_truncation)]
    pub async fn calculate_score(
        db: &Db,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
        tenant_id: Uuid,
        req: CalculateScoreRequest,
    ) -> Result<CreditProfile, sqlx::Error> {
        let now = Utc::now();
        let base_score = 600.0f64;

        let features = req
            .features
            .clone()
            .unwrap_or_else(|| serde_json::json!({}));

        let payment_history = features
            .get("payment_history")
            .and_then(|v| v.as_f64())
            .unwrap_or(0.8);
        let debt_ratio = features
            .get("debt_ratio")
            .and_then(|v| v.as_f64())
            .unwrap_or(0.3);
        let income_stability = features
            .get("income_stability")
            .and_then(|v| v.as_f64())
            .unwrap_or(0.7);
        let history_length = features
            .get("history_length")
            .and_then(|v| v.as_f64())
            .unwrap_or(0.5);

        let score = (base_score + payment_history * 100.0 - debt_ratio * 200.0
            + income_stability * 80.0
            + history_length * 50.0)
            .clamp(300.0, 850.0) as i32;

        let grade = CreditGrade::from_score(score);

        let factors = serde_json::json!([
            {"name": "payment_history", "weight": 0.30, "value": payment_history, "description": "付款历史记录"},
            {"name": "debt_ratio", "weight": 0.35, "value": debt_ratio, "description": "负债率"},
            {"name": "income_stability", "weight": 0.20, "value": income_stability, "description": "收入稳定性"},
            {"name": "history_length", "weight": 0.15, "value": history_length, "description": "信用历史长度"},
        ]);

        let id = Uuid::new_v4();
        let mut scope = db.scope_with(txn).await?;
        let profile = sqlx::query_as::<_, CreditProfile>(only_own_schema_query!(
            "finance",
            r#"INSERT INTO finance.finance_v59_credit_profiles
                (id, tenant_id, entity_id, score, grade, factors, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (tenant_id, entity_id) DO UPDATE
            SET score = EXCLUDED.score,
                grade = EXCLUDED.grade,
                factors = EXCLUDED.factors,
                updated_at = EXCLUDED.updated_at
            RETURNING id, entity_id, score, grade, factors, updated_at"#
        ))
        .bind(id)
        .bind(tenant_id)
        .bind(&req.entity_id)
        .bind(score)
        .bind(grade.as_str())
        .bind(factors)
        .bind(now)
        .fetch_one(&mut scope)
        .await?;
        scope.commit().await?;
        Ok(profile)
    }

    pub async fn get_credit_profile(
        db: &Db,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
        tenant_id: Uuid,
        entity_id: String,
    ) -> Result<CreditProfile, sqlx::Error> {
        let mut scope = db.scope_with(txn).await?;
        let profile = sqlx::query_as(
            only_own_schema_query!("finance", "SELECT id, entity_id, score, grade, factors, updated_at FROM finance.finance_v59_credit_profiles WHERE tenant_id = $1 AND entity_id = $2"),
        )
        .bind(tenant_id)
        .bind(&entity_id)
        .fetch_one(&mut scope)
        .await;
        let _ = scope.commit().await;
        profile
    }

    pub async fn get_scoring_models(
        db: &Db,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
        _tenant_id: Option<Uuid>,
    ) -> Result<Vec<ScoringModel>, sqlx::Error> {
        let mut scope = db.scope_with(txn).await?;
        let models = sqlx::query_as(
            only_own_schema_query!("finance", "SELECT id, name, version, features, weights, accuracy, status FROM finance.finance_v59_scoring_models ORDER BY created_at DESC LIMIT 100"),
        )
        .fetch_all(&mut scope)
        .await;
        let _ = scope.commit().await;
        models
    }

    pub async fn create_model(
        db: &Db,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
        tenant_id: Uuid,
        req: CreateModelRequest,
    ) -> Result<ScoringModel, sqlx::Error> {
        let id = Uuid::new_v4();
        let version = req.version.unwrap_or_else(|| "1.0".to_string());
        let accuracy = req.accuracy.unwrap_or(0.5);

        let mut scope = db.scope_with(txn).await?;
        let model = sqlx::query_as::<_, ScoringModel>(only_own_schema_query!(
            "finance",
            r#"INSERT INTO finance.finance_v59_scoring_models
                (id, tenant_id, name, version, features, weights, accuracy, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
            RETURNING id, name, version, features, weights, accuracy, status"#
        ))
        .bind(id)
        .bind(tenant_id)
        .bind(&req.name)
        .bind(&version)
        .bind(&req.features)
        .bind(&req.weights)
        .bind(accuracy)
        .fetch_one(&mut scope)
        .await?;
        scope.commit().await?;
        Ok(model)
    }

    pub async fn update_model(
        db: &Db,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
        tenant_id: Uuid,
        model_id: Uuid,
        req: UpdateModelRequest,
    ) -> Result<ScoringModel, sqlx::Error> {
        let mut scope = db.scope_with(txn).await?;
        let current: ScoringModel = sqlx::query_as(
            only_own_schema_query!("finance", "SELECT id, name, version, features, weights, accuracy, status FROM finance.finance_v59_scoring_models WHERE id = $1 AND tenant_id = $2"),
        )
        .bind(model_id)
        .bind(tenant_id)
        .fetch_one(&mut scope)
        .await?;

        let name = req.name.unwrap_or(current.name);
        let features = req.features.or(current.features);
        let weights = req.weights.or(current.weights);
        let accuracy = req.accuracy.unwrap_or(current.accuracy);
        let status = req.status.unwrap_or(current.status);

        let model = sqlx::query_as(only_own_schema_query!(
            "finance",
            r#"UPDATE finance.finance_v59_scoring_models
            SET name = $1, features = $2, weights = $3, accuracy = $4, status = $5
            WHERE id = $6 AND tenant_id = $7
            RETURNING id, name, version, features, weights, accuracy, status"#
        ))
        .bind(name)
        .bind(features)
        .bind(weights)
        .bind(accuracy)
        .bind(status)
        .bind(model_id)
        .bind(tenant_id)
        .fetch_one(&mut scope)
        .await?;
        scope.commit().await?;
        Ok(model)
    }

    pub async fn get_score_factors(
        db: &Db,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
        tenant_id: Uuid,
        entity_id: Option<String>,
    ) -> Result<Vec<ScoreFactor>, sqlx::Error> {
        if let Some(ref eid) = entity_id {
            let profile = Self::get_credit_profile(db, txn, tenant_id, eid.clone()).await?;
            let factors_json = profile.factors.unwrap_or_else(|| serde_json::json!([]));
            let factors: Vec<ScoreFactor> =
                serde_json::from_value(factors_json).unwrap_or_default();
            return Ok(factors);
        }

        Ok(vec![
            ScoreFactor {
                name: "payment_history".to_string(),
                weight: 0.30,
                value: 0.8,
                description: "付款历史记录".to_string(),
            },
            ScoreFactor {
                name: "debt_ratio".to_string(),
                weight: 0.35,
                value: 0.3,
                description: "负债率".to_string(),
            },
            ScoreFactor {
                name: "income_stability".to_string(),
                weight: 0.20,
                value: 0.7,
                description: "收入稳定性".to_string(),
            },
            ScoreFactor {
                name: "history_length".to_string(),
                weight: 0.15,
                value: 0.5,
                description: "信用历史长度".to_string(),
            },
        ])
    }

    pub async fn get_model_comparison(
        db: &Db,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
        _tenant_id: Option<Uuid>,
        model_ids: Vec<Uuid>,
    ) -> Result<serde_json::Value, sqlx::Error> {
        let mut scope = db.scope_with(txn).await?;
        let mut models = Vec::new();

        for mid in &model_ids {
            let model = sqlx::query_as::<_, ScoringModel>(
                only_own_schema_query!("finance", "SELECT id, name, version, features, weights, accuracy, status FROM finance.finance_v59_scoring_models WHERE id = $1"),
            )
            .bind(mid)
            .fetch_optional(&mut scope)
            .await;

            if let Ok(Some(m)) = model {
                models.push(serde_json::json!({
                    "id": m.id,
                    "name": m.name,
                    "version": m.version,
                    "accuracy": m.accuracy,
                    "status": m.status,
                    "feature_count": m.features
                        .and_then(|f| {
                            f.as_array().map(|arr| arr.len())
                        }).unwrap_or(0),
                }));
            }
        }
        let _ = scope.commit().await;

        Ok(serde_json::json!({
            "models": models,
            "comparison_count": model_ids.len(),
        }))
    }

    pub async fn bulk_score(
        db: &Db,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
        tenant_id: Uuid,
        req: BulkScoreRequest,
    ) -> Result<Vec<CreditProfile>, sqlx::Error> {
        let mut profiles = Vec::new();

        for entity_id in &req.entity_ids {
            let score_req = CalculateScoreRequest {
                entity_id: entity_id.clone(),
                features: None,
                model_id: req.model_id,
            };

            match Self::calculate_score(db, txn, tenant_id, score_req).await {
                Ok(profile) => profiles.push(profile),
                Err(_) => continue,
            }
        }

        Ok(profiles)
    }
}

// ==================== 3. 压力测试 ====================

pub struct StressTestEngine;

#[derive(Debug, Deserialize)]
pub struct CreateScenarioRequest {
    pub name: String,
    pub scenario_type: Option<String>,
    pub severity: Option<String>,
    pub assumptions: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct RunStressTestRequest {
    pub scenario_id: Uuid,
    pub entity_id: String,
    pub parameters: Option<Vec<ScenarioParameter>>,
}

#[derive(Debug, Deserialize)]
pub struct CompareScenariosRequest {
    pub scenario_ids: Vec<Uuid>,
}

impl StressTestEngine {
    pub async fn create_scenario(
        db: &Db,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
        tenant_id: Uuid,
        req: CreateScenarioRequest,
    ) -> Result<StressScenario, sqlx::Error> {
        let id = Uuid::new_v4();
        let scenario_type = req
            .scenario_type
            .as_deref()
            .map(StressScenarioType::from_str)
            .unwrap_or(StressScenarioType::Market);
        let severity = req.severity.unwrap_or_else(|| "medium".to_string());
        let now = Utc::now();

        let mut scope = db.scope_with(txn).await?;
        let scenario = sqlx::query_as::<_, StressScenario>(only_own_schema_query!(
            "finance",
            r#"INSERT INTO finance.finance_v59_stress_scenarios
                (id, tenant_id, name, scenario_type, severity, assumptions, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, name, scenario_type, severity, assumptions, created_at"#
        ))
        .bind(id)
        .bind(tenant_id)
        .bind(&req.name)
        .bind(scenario_type.as_str())
        .bind(&severity)
        .bind(&req.assumptions)
        .bind(now)
        .fetch_one(&mut scope)
        .await?;
        scope.commit().await?;
        Ok(scenario)
    }

    pub async fn run_stress_test(
        db: &Db,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
        tenant_id: Uuid,
        req: RunStressTestRequest,
    ) -> Result<StressResult, sqlx::Error> {
        let mut scope = db.scope_with(txn).await?;
        let scenario = sqlx::query_as::<_, StressScenario>(
            only_own_schema_query!("finance", "SELECT id, name, scenario_type, severity, assumptions, created_at FROM finance.finance_v59_stress_scenarios WHERE id = $1 AND tenant_id = $2"),
        )
        .bind(req.scenario_id)
        .bind(tenant_id)
        .fetch_one(&mut scope)
        .await?;
        let _ = scope.commit().await;

        let assumptions = scenario
            .assumptions
            .clone()
            .unwrap_or_else(|| serde_json::json!({}));

        let severity_factor = match scenario.severity.as_str() {
            "critical" => 0.3,
            "high" => 0.5,
            "medium" => 0.7,
            "low" => 0.9,
            _ => 0.7,
        };

        let base_impact = assumptions
            .get("base_impact")
            .and_then(|v| v.as_f64())
            .unwrap_or(1000000.0);

        let impact_value = base_impact * (1.0 - severity_factor);
        let capital_adequacy = (0.15 * severity_factor).max(0.0).min(0.3);
        let liquidity_ratio = (0.20 * severity_factor).max(0.0).min(0.4);
        let pass_fail = capital_adequacy >= 0.08 && liquidity_ratio >= 0.10;

        let details = serde_json::json!({
            "scenario_name": scenario.name,
            "scenario_type": scenario.scenario_type,
            "severity_factor": severity_factor,
            "base_impact": base_impact,
            "shocked_impact": impact_value,
            "parameters": req.parameters,
        });

        let id = Uuid::new_v4();
        let mut scope = db.scope_with(txn).await?;
        let result = sqlx::query_as::<_, StressResult>(
            only_own_schema_query!("finance", r#"INSERT INTO finance.finance_v59_stress_results
                (id, tenant_id, scenario_id, entity_id, impact_value, capital_adequacy, liquidity_ratio, pass_fail, details)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id, scenario_id, entity_id, impact_value, capital_adequacy, liquidity_ratio, pass_fail, details"#),
        )
        .bind(id)
        .bind(tenant_id)
        .bind(req.scenario_id)
        .bind(&req.entity_id)
        .bind(impact_value)
        .bind(capital_adequacy)
        .bind(liquidity_ratio)
        .bind(pass_fail)
        .bind(details)
        .fetch_one(&mut scope)
        .await?;
        scope.commit().await?;
        Ok(result)
    }

    pub async fn get_test_result(
        db: &Db,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
        _tenant_id: Option<Uuid>,
        result_id: Uuid,
    ) -> Result<StressResult, sqlx::Error> {
        let mut scope = db.scope_with(txn).await?;
        let result = sqlx::query_as(
            only_own_schema_query!("finance", "SELECT id, scenario_id, entity_id, impact_value, capital_adequacy, liquidity_ratio, pass_fail, details FROM finance.finance_v59_stress_results WHERE id = $1"),
        )
        .bind(result_id)
        .fetch_one(&mut scope)
        .await;
        let _ = scope.commit().await;
        result
    }

    pub async fn list_scenarios(
        db: &Db,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
        _tenant_id: Option<Uuid>,
    ) -> Result<Vec<StressScenario>, sqlx::Error> {
        let mut scope = db.scope_with(txn).await?;
        let scenarios = sqlx::query_as(
            only_own_schema_query!("finance", "SELECT id, name, scenario_type, severity, assumptions, created_at FROM finance.finance_v59_stress_scenarios ORDER BY created_at DESC LIMIT 200"),
        )
        .fetch_all(&mut scope)
        .await;
        let _ = scope.commit().await;
        scenarios
    }

    #[allow(
        clippy::as_conversions,
        clippy::cast_possible_wrap,
        clippy::cast_precision_loss
    )]
    pub async fn compare_scenarios(
        db: &Db,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
        tenant_id: Uuid,
        scenario_ids: Vec<Uuid>,
    ) -> Result<serde_json::Value, sqlx::Error> {
        let mut scope = db.scope_with(txn).await?;
        let mut comparison = Vec::new();

        for sid in &scenario_ids {
            let scenario = sqlx::query_as::<_, StressScenario>(
                only_own_schema_query!("finance", "SELECT id, name, scenario_type, severity, assumptions, created_at FROM finance.finance_v59_stress_scenarios WHERE id = $1 AND tenant_id = $2"),
            )
            .bind(sid)
            .bind(tenant_id)
            .fetch_optional(&mut scope)
            .await;

            if let Ok(Some(s)) = scenario {
                let results: Vec<StressResult> = sqlx::query_as(
                    only_own_schema_query!("finance", "SELECT id, scenario_id, entity_id, impact_value, capital_adequacy, liquidity_ratio, pass_fail, details FROM finance.finance_v59_stress_results WHERE scenario_id = $1 AND tenant_id = $2"),
                )
                .bind(sid)
                .bind(tenant_id)
                .fetch_all(&mut scope)
                .await
                .unwrap_or_default();

                let total_impact: f64 = results.iter().map(|r| r.impact_value).sum();
                let pass_count = results.iter().filter(|r| r.pass_fail).count() as i64;
                let fail_count = results.len() as i64 - pass_count;
                let avg_capital = if !results.is_empty() {
                    results.iter().map(|r| r.capital_adequacy).sum::<f64>() / results.len() as f64
                } else {
                    0.0
                };

                comparison.push(serde_json::json!({
                    "scenario_id": s.id,
                    "name": s.name,
                    "type": s.scenario_type,
                    "severity": s.severity,
                    "total_impact": total_impact,
                    "pass_count": pass_count,
                    "fail_count": fail_count,
                    "avg_capital_adequacy": avg_capital,
                    "result_count": results.len(),
                }));
            }
        }
        let _ = scope.commit().await;

        Ok(serde_json::json!({
            "scenarios": comparison,
            "comparison_count": scenario_ids.len(),
        }))
    }

    pub async fn get_scenario_parameters(
        db: &Db,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
        _tenant_id: Option<Uuid>,
        scenario_id: Option<Uuid>,
    ) -> Result<Vec<ScenarioParameter>, sqlx::Error> {
        if let Some(sid) = scenario_id {
            let mut scope = db.scope_with(txn).await?;
            let scenario = sqlx::query_as::<_, StressScenario>(
                only_own_schema_query!("finance", "SELECT id, name, scenario_type, severity, assumptions, created_at FROM finance.finance_v59_stress_scenarios WHERE id = $1"),
            )
            .bind(sid)
            .fetch_one(&mut scope)
            .await?;
            let _ = scope.commit().await;

            let assumptions = scenario
                .assumptions
                .unwrap_or_else(|| serde_json::json!({}));

            let base_rate = assumptions
                .get("base_rate")
                .and_then(|v| v.as_f64())
                .unwrap_or(0.05);
            let shocked_rate = assumptions
                .get("shocked_rate")
                .and_then(|v| v.as_f64())
                .unwrap_or(0.15);

            Ok(vec![
                ScenarioParameter {
                    name: "interest_rate".to_string(),
                    base_value: base_rate,
                    shocked_value: shocked_rate,
                    shock_type: ShockType::Parallel.as_str().to_string(),
                },
                ScenarioParameter {
                    name: "credit_spread".to_string(),
                    base_value: assumptions
                        .get("base_spread")
                        .and_then(|v| v.as_f64())
                        .unwrap_or(0.02),
                    shocked_value: assumptions
                        .get("shocked_spread")
                        .and_then(|v| v.as_f64())
                        .unwrap_or(0.06),
                    shock_type: ShockType::Parallel.as_str().to_string(),
                },
                ScenarioParameter {
                    name: "liquidity_ratio".to_string(),
                    base_value: assumptions
                        .get("base_liquidity")
                        .and_then(|v| v.as_f64())
                        .unwrap_or(0.25),
                    shocked_value: assumptions
                        .get("shocked_liquidity")
                        .and_then(|v| v.as_f64())
                        .unwrap_or(0.12),
                    shock_type: ShockType::Reverse.as_str().to_string(),
                },
            ])
        } else {
            Ok(vec![
                ScenarioParameter {
                    name: "interest_rate".to_string(),
                    base_value: 0.05,
                    shocked_value: 0.15,
                    shock_type: ShockType::Parallel.as_str().to_string(),
                },
                ScenarioParameter {
                    name: "credit_spread".to_string(),
                    base_value: 0.02,
                    shocked_value: 0.06,
                    shock_type: ShockType::Parallel.as_str().to_string(),
                },
                ScenarioParameter {
                    name: "liquidity_ratio".to_string(),
                    base_value: 0.25,
                    shocked_value: 0.12,
                    shock_type: ShockType::Reverse.as_str().to_string(),
                },
            ])
        }
    }

    #[allow(clippy::as_conversions, clippy::cast_possible_wrap)]
    pub async fn get_test_summary(
        db: &Db,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
        tenant_id: Option<Uuid>,
    ) -> Result<serde_json::Value, sqlx::Error> {
        let scenarios = Self::list_scenarios(db, txn, tenant_id).await?;

        let mut scope = db.scope_with(txn).await?;
        let mut summary_data = Vec::new();
        let mut total_impact = 0.0f64;
        let mut pass_count = 0i64;
        let mut fail_count = 0i64;

        for scenario in &scenarios {
            let results: Vec<StressResult> = sqlx::query_as(
                only_own_schema_query!("finance", "SELECT id, scenario_id, entity_id, impact_value, capital_adequacy, liquidity_ratio, pass_fail, details FROM finance.finance_v59_stress_results WHERE scenario_id = $1"),
            )
            .bind(scenario.id)
            .fetch_all(&mut scope)
            .await
            .unwrap_or_default();

            let scenario_impact: f64 = results.iter().map(|r| r.impact_value).sum();
            total_impact += scenario_impact;
            pass_count += results.iter().filter(|r| r.pass_fail).count() as i64;
            fail_count +=
                results.len() as i64 - results.iter().filter(|r| r.pass_fail).count() as i64;

            summary_data.push(serde_json::json!({
                "scenario_id": scenario.id,
                "name": scenario.name,
                "type": scenario.scenario_type,
                "severity": scenario.severity,
                "tests_run": results.len(),
                "total_impact": scenario_impact,
            }));
        }
        let _ = scope.commit().await;

        Ok(serde_json::json!({
            "total_scenarios": scenarios.len(),
            "total_tests": pass_count + fail_count,
            "pass_count": pass_count,
            "fail_count": fail_count,
            "total_impact": total_impact,
            "scenarios": summary_data,
        }))
    }
}

// ==================== API Handlers ====================

// --- Anti-Fraud Handlers ---

pub async fn analyze_transaction_handler(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<AnalyzeTransactionRequest>,
) -> ApiResponse<FraudDecision> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let db = state.db.clone();
    let tenant_id = get_tenant_id_from_claims(&claims);
    match AntiFraudEngine::analyze_transaction(&db, txn, tenant_id, req).await {
        Ok(decision) => ApiResponse::success(decision, "分析完成"),
        Err(e) => crate::shared::err_resp(e),
    }
}

pub async fn get_fraud_decision_handler(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<FraudDecision> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let db = state.db.clone();
    let tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(get_tenant_id_from_claims(&claims))
    };
    match AntiFraudEngine::get_fraud_decision(&db, txn, tenant_id, id).await {
        Ok(decision) => ApiResponse::success(decision, "查询成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

#[derive(Debug, Deserialize, utoipa::IntoParams)]
pub struct SignalQueryParams {
    pub signal_type: Option<String>,
}

pub async fn get_signals_handler(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<SignalQueryParams>,
) -> ApiResponse<Vec<FraudSignal>> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let db = state.db.clone();
    let tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(get_tenant_id_from_claims(&claims))
    };
    match AntiFraudEngine::get_signals(&db, txn, tenant_id, params.signal_type).await {
        Ok(signals) => ApiResponse::success(signals, "查询成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

pub async fn create_device_handler(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateDeviceRequest>,
) -> ApiResponse<DeviceProfile> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let db = state.db.clone();
    let tenant_id = get_tenant_id_from_claims(&claims);
    match AntiFraudEngine::update_device_profile(&db, txn, tenant_id, req).await {
        Ok(profile) => ApiResponse::success(profile, "设备画像创建成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

pub async fn get_device_handler(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(_claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<DeviceProfile> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let db = state.db.clone();
    let mut scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return crate::shared::err_resp(e),
    };
    let result: Result<DeviceProfile, sqlx::Error> = sqlx::query_as(
        only_own_schema_query!("finance", "SELECT id, device_id, fingerprint, trust_score, last_seen, ip_history FROM finance.finance_v59_device_profiles WHERE id = $1"),
    )
    .bind(id)
    .fetch_one(&mut scope)
    .await;
    let _ = scope.commit().await;

    match result {
        Ok(profile) => ApiResponse::success(profile, "查询成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

pub async fn list_blocked_devices_handler(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
) -> ApiResponse<Vec<DeviceProfile>> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let db = state.db.clone();
    let tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(get_tenant_id_from_claims(&claims))
    };
    match AntiFraudEngine::list_blocked_devices(&db, txn, tenant_id).await {
        Ok(devices) => ApiResponse::success(devices, "查询成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

pub async fn add_rule_handler(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<AddRuleRequest>,
) -> ApiResponse<FraudRule> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let db = state.db.clone();
    let tenant_id = get_tenant_id_from_claims(&claims);
    match AntiFraudEngine::add_rule(&db, txn, tenant_id, req).await {
        Ok(rule) => ApiResponse::success(rule, "规则添加成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

pub async fn get_rules_handler(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
) -> ApiResponse<Vec<FraudRule>> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let db = state.db.clone();
    let tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(get_tenant_id_from_claims(&claims))
    };
    match AntiFraudEngine::get_rules(&db, txn, tenant_id).await {
        Ok(rules) => ApiResponse::success(rules, "查询成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

// --- Credit Scoring Handlers ---

pub async fn calculate_score_handler(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CalculateScoreRequest>,
) -> ApiResponse<CreditProfile> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let db = state.db.clone();
    let tenant_id = get_tenant_id_from_claims(&claims);
    match CreditScoringEngine::calculate_score(&db, txn, tenant_id, req).await {
        Ok(profile) => ApiResponse::success(profile, "评分完成"),
        Err(e) => crate::shared::err_resp(e),
    }
}

pub async fn get_credit_profile_handler(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> ApiResponse<CreditProfile> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let db = state.db.clone();
    let tenant_id = get_tenant_id_from_claims(&claims);
    match CreditScoringEngine::get_credit_profile(&db, txn, tenant_id, id).await {
        Ok(profile) => ApiResponse::success(profile, "查询成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

pub async fn get_scoring_models_handler(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
) -> ApiResponse<Vec<ScoringModel>> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let db = state.db.clone();
    let tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(get_tenant_id_from_claims(&claims))
    };
    match CreditScoringEngine::get_scoring_models(&db, txn, tenant_id).await {
        Ok(models) => ApiResponse::success(models, "查询成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

pub async fn create_model_handler(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateModelRequest>,
) -> ApiResponse<ScoringModel> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let db = state.db.clone();
    let tenant_id = get_tenant_id_from_claims(&claims);
    match CreditScoringEngine::create_model(&db, txn, tenant_id, req).await {
        Ok(model) => ApiResponse::success(model, "模型创建成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

pub async fn update_model_handler(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateModelRequest>,
) -> ApiResponse<ScoringModel> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let db = state.db.clone();
    let tenant_id = get_tenant_id_from_claims(&claims);
    match CreditScoringEngine::update_model(&db, txn, tenant_id, id, req).await {
        Ok(model) => ApiResponse::success(model, "模型更新成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

#[derive(Debug, Deserialize, utoipa::IntoParams)]
pub struct FactorQueryParams {
    pub entity_id: Option<String>,
}

pub async fn get_score_factors_handler(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<FactorQueryParams>,
) -> ApiResponse<Vec<ScoreFactor>> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let db = state.db.clone();
    let tenant_id = get_tenant_id_from_claims(&claims);
    match CreditScoringEngine::get_score_factors(&db, txn, tenant_id, params.entity_id).await {
        Ok(factors) => ApiResponse::success(factors, "查询成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

pub async fn get_model_comparison_handler(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<CompareModelsRequest>,
) -> ApiResponse<serde_json::Value> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let db = state.db.clone();
    let tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(get_tenant_id_from_claims(&claims))
    };
    match CreditScoringEngine::get_model_comparison(&db, txn, tenant_id, params.model_ids).await {
        Ok(result) => ApiResponse::success(result, "对比完成"),
        Err(e) => crate::shared::err_resp(e),
    }
}

pub async fn bulk_score_handler(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<BulkScoreRequest>,
) -> ApiResponse<Vec<CreditProfile>> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let db = state.db.clone();
    let tenant_id = get_tenant_id_from_claims(&claims);
    match CreditScoringEngine::bulk_score(&db, txn, tenant_id, req).await {
        Ok(profiles) => ApiResponse::success(profiles, "批量评分完成"),
        Err(e) => crate::shared::err_resp(e),
    }
}

// --- Stress Testing Handlers ---

pub async fn create_scenario_handler(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateScenarioRequest>,
) -> ApiResponse<StressScenario> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let db = state.db.clone();
    let tenant_id = get_tenant_id_from_claims(&claims);
    match StressTestEngine::create_scenario(&db, txn, tenant_id, req).await {
        Ok(scenario) => ApiResponse::success(scenario, "场景创建成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

pub async fn run_stress_test_handler(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<RunStressTestRequest>,
) -> ApiResponse<StressResult> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let db = state.db.clone();
    let tenant_id = get_tenant_id_from_claims(&claims);
    match StressTestEngine::run_stress_test(&db, txn, tenant_id, req).await {
        Ok(result) => ApiResponse::success(result, "压力测试完成"),
        Err(e) => crate::shared::err_resp(e),
    }
}

pub async fn get_test_result_handler(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<StressResult> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let db = state.db.clone();
    let tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(get_tenant_id_from_claims(&claims))
    };
    match StressTestEngine::get_test_result(&db, txn, tenant_id, id).await {
        Ok(result) => ApiResponse::success(result, "查询成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

pub async fn list_scenarios_handler(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
) -> ApiResponse<Vec<StressScenario>> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let db = state.db.clone();
    let tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(get_tenant_id_from_claims(&claims))
    };
    match StressTestEngine::list_scenarios(&db, txn, tenant_id).await {
        Ok(scenarios) => ApiResponse::success(scenarios, "查询成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}
#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:write"])),
    path = "/finance-v59/stress/compare",
    responses(
        (status = 200, description = "成功"),
        (status = 201, description = "创建成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误"),
    ),
    tag = "Finance Risk V59",
    operation_id = "compare_scenarios_handler",
)]

pub async fn compare_scenarios_handler(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CompareScenariosRequest>,
) -> ApiResponse<serde_json::Value> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let db = state.db.clone();
    let tenant_id = get_tenant_id_from_claims(&claims);
    match StressTestEngine::compare_scenarios(&db, txn, tenant_id, req.scenario_ids).await {
        Ok(result) => ApiResponse::success(result, "对比完成"),
        Err(e) => crate::shared::err_resp(e),
    }
}

#[derive(Debug, Deserialize, utoipa::IntoParams)]
pub struct GetParamsQueryParams {
    pub scenario_id: Option<Uuid>,
}

pub async fn get_scenario_parameters_handler(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<GetParamsQueryParams>,
) -> ApiResponse<Vec<ScenarioParameter>> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let db = state.db.clone();
    let tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(get_tenant_id_from_claims(&claims))
    };
    match StressTestEngine::get_scenario_parameters(&db, txn, tenant_id, params.scenario_id).await {
        Ok(params) => ApiResponse::success(params, "查询成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

pub async fn get_test_summary_handler(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
) -> ApiResponse<serde_json::Value> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let db = state.db.clone();
    let tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(get_tenant_id_from_claims(&claims))
    };
    match StressTestEngine::get_test_summary(&db, txn, tenant_id).await {
        Ok(summary) => ApiResponse::success(summary, "查询成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

// ==================== 路由注册 ====================

pub fn create_routes() -> Router<AppState> {
    Router::new()
        // Anti-Fraud routes
        .route(
            "/finance-v59/fraud/analyze",
            axum::routing::post(analyze_transaction_handler),
        )
        .route(
            "/finance-v59/fraud/decision/{id}",
            axum::routing::get(get_fraud_decision_handler),
        )
        .route(
            "/finance-v59/fraud/signals",
            axum::routing::get(get_signals_handler),
        )
        .route(
            "/finance-v59/fraud/device",
            axum::routing::post(create_device_handler),
        )
        .route(
            "/finance-v59/fraud/device/{id}",
            axum::routing::get(get_device_handler),
        )
        .route(
            "/finance-v59/fraud/blocked",
            axum::routing::get(list_blocked_devices_handler),
        )
        .route(
            "/finance-v59/fraud/rule",
            axum::routing::post(add_rule_handler),
        )
        .route(
            "/finance-v59/fraud/rules",
            axum::routing::get(get_rules_handler),
        )
        // Credit Scoring routes
        .route(
            "/finance-v59/credit/score",
            axum::routing::post(calculate_score_handler),
        )
        .route(
            "/finance-v59/credit/profile/{id}",
            axum::routing::get(get_credit_profile_handler),
        )
        .route(
            "/finance-v59/credit/models",
            axum::routing::get(get_scoring_models_handler),
        )
        .route(
            "/finance-v59/credit/model",
            axum::routing::post(create_model_handler),
        )
        .route(
            "/finance-v59/credit/model/{id}",
            axum::routing::put(update_model_handler),
        )
        .route(
            "/finance-v59/credit/factors",
            axum::routing::get(get_score_factors_handler),
        )
        .route(
            "/finance-v59/credit/compare",
            axum::routing::get(get_model_comparison_handler),
        )
        .route(
            "/finance-v59/credit/bulk",
            axum::routing::post(bulk_score_handler),
        )
        // Stress Testing routes
        .route(
            "/finance-v59/stress/scenario",
            axum::routing::post(create_scenario_handler),
        )
        .route(
            "/finance-v59/stress/run",
            axum::routing::post(run_stress_test_handler),
        )
        .route(
            "/finance-v59/stress/result/{id}",
            axum::routing::get(get_test_result_handler),
        )
        .route(
            "/finance-v59/stress/scenarios",
            axum::routing::get(list_scenarios_handler),
        )
        .route(
            "/finance-v59/stress/compare",
            axum::routing::post(compare_scenarios_handler),
        )
        .route(
            "/finance-v59/stress/params",
            axum::routing::get(get_scenario_parameters_handler),
        )
        .route(
            "/finance-v59/stress/summary",
            axum::routing::get(get_test_summary_handler),
        )
        // 批 41：反欺诈/信用评分/压力测试路由统一挂 finance:risk:read 细码（纵深防御；
        // 写端点在网关层 require_finance_write 已要求 finance:admin）
        .layer(axum::middleware::from_fn(
            topems_shared_auth::middleware::require_permission("finance:risk:read"),
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
    fn enum_fraud_signal_type() {
        roundtrip(&FraudSignalType::Velocity);
        roundtrip(&FraudSignalType::Geolocation);
        roundtrip(&FraudSignalType::Device);
        roundtrip(&FraudSignalType::Behavior);
        roundtrip(&FraudSignalType::Pattern);
    }

    #[test]
    fn enum_risk_level() {
        roundtrip(&RiskLevel::Low);
        roundtrip(&RiskLevel::Medium);
        roundtrip(&RiskLevel::High);
        roundtrip(&RiskLevel::Critical);
    }

    #[test]
    fn enum_fraud_action() {
        roundtrip(&FraudAction::Approve);
        roundtrip(&FraudAction::Review);
        roundtrip(&FraudAction::Block);
    }

    #[test]
    fn enum_credit_grade() {
        roundtrip(&CreditGrade::AAA);
        roundtrip(&CreditGrade::AA);
        roundtrip(&CreditGrade::A);
        roundtrip(&CreditGrade::B);
        roundtrip(&CreditGrade::C);
        roundtrip(&CreditGrade::D);
    }

    #[test]
    fn enum_stress_scenario_type() {
        roundtrip(&StressScenarioType::Market);
        roundtrip(&StressScenarioType::Credit);
        roundtrip(&StressScenarioType::Liquidity);
        roundtrip(&StressScenarioType::Operational);
    }

    #[test]
    fn enum_shock_type() {
        roundtrip(&ShockType::Parallel);
        roundtrip(&ShockType::Sequential);
        roundtrip(&ShockType::Reverse);
    }

    #[test]
    fn struct_fraud_signal() {
        let v = FraudSignal {
            id: Uuid::new_v4(),
            signal_type: "velocity".into(),
            score: 0.85,
            confidence: 0.9,
            metadata: Some(serde_json::json!({"count":10})),
            detected_at: Utc::now(),
        };
        roundtrip(&v);
    }

    #[test]
    fn struct_fraud_decision() {
        let v = FraudDecision {
            id: Uuid::new_v4(),
            transaction_id: "TX-001".into(),
            risk_level: "high".into(),
            action: "review".into(),
            reason: "多信号触发".into(),
            signals: Some(serde_json::json!(["velocity", "device"])),
            decided_at: Utc::now(),
        };
        roundtrip(&v);
    }

    #[test]
    fn struct_device_profile() {
        let v = DeviceProfile {
            id: Uuid::new_v4(),
            device_id: "DEV-001".into(),
            fingerprint: "fp-abc123".into(),
            trust_score: 0.7,
            last_seen: Utc::now(),
            ip_history: Some(serde_json::json!(["1.2.3.4"])),
        };
        roundtrip(&v);
    }

    #[test]
    fn struct_credit_profile() {
        let v = CreditProfile {
            id: Uuid::new_v4(),
            entity_id: "Entity-A".into(),
            score: 720,
            grade: "AA".into(),
            factors: Some(serde_json::json!({"payment":0.9})),
            updated_at: Utc::now(),
        };
        roundtrip(&v);
    }

    #[test]
    fn struct_scoring_model() {
        let v = ScoringModel {
            id: Uuid::new_v4(),
            name: "基础评分模型".into(),
            version: "v1.0".into(),
            features: Some(serde_json::json!(["income", "debt"])),
            weights: Some(serde_json::json!({"income":0.3})),
            accuracy: 0.88,
            status: "active".into(),
        };
        roundtrip(&v);
    }

    #[test]
    fn struct_score_factor() {
        let v = ScoreFactor {
            name: "payment_history".into(),
            weight: 0.35,
            value: 0.95,
            description: "还款记录".into(),
        };
        roundtrip(&v);
    }

    #[test]
    fn struct_stress_scenario() {
        let v = StressScenario {
            id: Uuid::new_v4(),
            name: "利率冲击".into(),
            scenario_type: "market".into(),
            severity: "high".into(),
            assumptions: Some(serde_json::json!({"rate_shock":0.03})),
            created_at: Utc::now(),
        };
        roundtrip(&v);
    }

    #[test]
    fn struct_stress_result() {
        let v = StressResult {
            id: Uuid::new_v4(),
            scenario_id: Uuid::new_v4(),
            entity_id: "Bank-A".into(),
            impact_value: -5000000.0,
            capital_adequacy: 0.08,
            liquidity_ratio: 1.2,
            pass_fail: true,
            details: Some(serde_json::json!({"note":"ok"})),
        };
        roundtrip(&v);
    }

    #[test]
    fn struct_scenario_parameter() {
        let v = ScenarioParameter {
            name: "interest_rate".into(),
            base_value: 0.03,
            shocked_value: 0.06,
            shock_type: "parallel".into(),
        };
        roundtrip(&v);
    }

    #[test]
    fn struct_fraud_rule() {
        let v = FraudRule {
            id: Uuid::new_v4(),
            name: "异地登录".into(),
            signal_type: "geolocation".into(),
            threshold: 0.8,
            enabled: true,
        };
        roundtrip(&v);
    }

    // ===== as_str / from_str / from_score pure function tests =====

    #[test]
    fn fraud_signal_type_as_str_all_variants() {
        assert_eq!(FraudSignalType::Velocity.as_str(), "velocity");
        assert_eq!(FraudSignalType::Geolocation.as_str(), "geolocation");
        assert_eq!(FraudSignalType::Device.as_str(), "device");
        assert_eq!(FraudSignalType::Behavior.as_str(), "behavior");
        assert_eq!(FraudSignalType::Pattern.as_str(), "pattern");
    }

    #[test]
    fn fraud_signal_type_from_str_all_variants() {
        assert_eq!(
            FraudSignalType::from_str("velocity"),
            FraudSignalType::Velocity
        );
        assert_eq!(
            FraudSignalType::from_str("geolocation"),
            FraudSignalType::Geolocation
        );
        assert_eq!(FraudSignalType::from_str("device"), FraudSignalType::Device);
        assert_eq!(
            FraudSignalType::from_str("behavior"),
            FraudSignalType::Behavior
        );
        assert_eq!(
            FraudSignalType::from_str("pattern"),
            FraudSignalType::Pattern
        );
    }

    #[test]
    fn fraud_signal_type_from_str_unknown_defaults_to_velocity() {
        assert_eq!(
            FraudSignalType::from_str("unknown"),
            FraudSignalType::Velocity
        );
        assert_eq!(FraudSignalType::from_str(""), FraudSignalType::Velocity);
    }

    #[test]
    fn risk_level_as_str_all_variants() {
        assert_eq!(RiskLevel::Low.as_str(), "low");
        assert_eq!(RiskLevel::Medium.as_str(), "medium");
        assert_eq!(RiskLevel::High.as_str(), "high");
        assert_eq!(RiskLevel::Critical.as_str(), "critical");
    }

    #[test]
    fn risk_level_from_str_all_variants() {
        assert_eq!(RiskLevel::from_str("low"), RiskLevel::Low);
        assert_eq!(RiskLevel::from_str("medium"), RiskLevel::Medium);
        assert_eq!(RiskLevel::from_str("high"), RiskLevel::High);
        assert_eq!(RiskLevel::from_str("critical"), RiskLevel::Critical);
    }

    #[test]
    fn risk_level_from_str_unknown_defaults_to_low() {
        assert_eq!(RiskLevel::from_str("xxx"), RiskLevel::Low);
        assert_eq!(RiskLevel::from_str(""), RiskLevel::Low);
    }

    #[test]
    fn fraud_action_as_str_all_variants() {
        assert_eq!(FraudAction::Approve.as_str(), "approve");
        assert_eq!(FraudAction::Review.as_str(), "review");
        assert_eq!(FraudAction::Block.as_str(), "block");
    }

    #[test]
    fn credit_grade_as_str_all_variants() {
        assert_eq!(CreditGrade::AAA.as_str(), "AAA");
        assert_eq!(CreditGrade::AA.as_str(), "AA");
        assert_eq!(CreditGrade::A.as_str(), "A");
        assert_eq!(CreditGrade::B.as_str(), "B");
        assert_eq!(CreditGrade::C.as_str(), "C");
        assert_eq!(CreditGrade::D.as_str(), "D");
    }

    #[test]
    fn credit_grade_from_score_aaa_boundary() {
        assert_eq!(CreditGrade::from_score(750), CreditGrade::AAA);
        assert_eq!(CreditGrade::from_score(850), CreditGrade::AAA);
        assert_eq!(CreditGrade::from_score(999), CreditGrade::AAA);
    }

    #[test]
    fn credit_grade_from_score_aa_boundary() {
        assert_eq!(CreditGrade::from_score(749), CreditGrade::AA);
        assert_eq!(CreditGrade::from_score(700), CreditGrade::AA);
        assert_eq!(CreditGrade::from_score(730), CreditGrade::AA);
    }

    #[test]
    fn credit_grade_from_score_a_boundary() {
        assert_eq!(CreditGrade::from_score(699), CreditGrade::A);
        assert_eq!(CreditGrade::from_score(650), CreditGrade::A);
        assert_eq!(CreditGrade::from_score(670), CreditGrade::A);
    }

    #[test]
    fn credit_grade_from_score_b_boundary() {
        assert_eq!(CreditGrade::from_score(649), CreditGrade::B);
        assert_eq!(CreditGrade::from_score(550), CreditGrade::B);
        assert_eq!(CreditGrade::from_score(600), CreditGrade::B);
    }

    #[test]
    fn credit_grade_from_score_c_boundary() {
        assert_eq!(CreditGrade::from_score(549), CreditGrade::C);
        assert_eq!(CreditGrade::from_score(400), CreditGrade::C);
        assert_eq!(CreditGrade::from_score(450), CreditGrade::C);
    }

    #[test]
    fn credit_grade_from_score_d_boundary() {
        assert_eq!(CreditGrade::from_score(399), CreditGrade::D);
        assert_eq!(CreditGrade::from_score(0), CreditGrade::D);
        assert_eq!(CreditGrade::from_score(-100), CreditGrade::D);
    }

    #[test]
    fn stress_scenario_type_as_str_all_variants() {
        assert_eq!(StressScenarioType::Market.as_str(), "market");
        assert_eq!(StressScenarioType::Credit.as_str(), "credit");
        assert_eq!(StressScenarioType::Liquidity.as_str(), "liquidity");
        assert_eq!(StressScenarioType::Operational.as_str(), "operational");
    }

    #[test]
    fn stress_scenario_type_from_str_all_variants() {
        assert_eq!(
            StressScenarioType::from_str("market"),
            StressScenarioType::Market
        );
        assert_eq!(
            StressScenarioType::from_str("credit"),
            StressScenarioType::Credit
        );
        assert_eq!(
            StressScenarioType::from_str("liquidity"),
            StressScenarioType::Liquidity
        );
        assert_eq!(
            StressScenarioType::from_str("operational"),
            StressScenarioType::Operational
        );
    }

    #[test]
    fn stress_scenario_type_from_str_unknown_defaults_to_market() {
        assert_eq!(
            StressScenarioType::from_str("unknown"),
            StressScenarioType::Market
        );
        assert_eq!(StressScenarioType::from_str(""), StressScenarioType::Market);
    }

    #[test]
    fn shock_type_as_str_all_variants() {
        assert_eq!(ShockType::Parallel.as_str(), "parallel");
        assert_eq!(ShockType::Sequential.as_str(), "sequential");
        assert_eq!(ShockType::Reverse.as_str(), "reverse");
    }
}
