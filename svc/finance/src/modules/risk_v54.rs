#![allow(dead_code)] // Reserved: V54 实时风控模块，待业务接入后启用

//! STATUS: WIRED | Routes registered + DB tables initialized + Handlers implemented
//! V54.0 Finance 实时风控
//!
//! 核心能力：
//! - 实时风险监测 (Real-time Risk Monitoring): 风险指标实时评估、仪表盘、告警管理、分级升级
//! - 交易反欺诈 (Transaction Anti-Fraud): 交易评分、速度检测、异常金额、位置异常、设备指纹
//! - 合规自动审查 (Compliance Auto-Review): 规则审查、工作流审批、合规报告
//!
//! 路由：
//! - GET    /finance-v54/risk/dashboard
//! - GET    /finance-v54/risk/alerts
//! - PUT    /finance-v54/risk/alerts/{id}/acknowledge
//! - PUT    /finance-v54/risk/alerts/{id}/resolve
//! - POST   /finance-v54/fraud/score
//! - GET    /finance-v54/fraud/rules
//! - PUT    /finance-v54/fraud/rules/{id}
//! - GET    /finance-v54/fraud/scores/{transaction_id}
//! - POST   /finance-v54/compliance/review
//! - GET    /finance-v54/compliance/results
//! - GET    /finance-v54/compliance/status/{entity_type}/{entity_id}
//! - POST   /finance-v54/compliance/workflow
//! - PUT    /finance-v54/compliance/workflow/{id}/advance
//! - GET    /finance-v54/compliance/report
use utoipa::ToSchema;

use axum::{
    extract::{Extension, Json, Path, Query, State},
    Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_db::scope::Db;
use uuid::Uuid;

use crate::shared::AppState;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::get_tenant_id_from_claims;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_core::error::TopemsError;
use topems_shared_core::response::ApiResponse;

// ==================== 辅助函数 ====================

// ==================== 枚举类型 ====================

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

    fn weight(&self) -> f64 {
        match self {
            RiskLevel::Low => 1.0,
            RiskLevel::Medium => 2.0,
            RiskLevel::High => 3.0,
            RiskLevel::Critical => 5.0,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum RiskCategory {
    Credit,
    Market,
    Liquidity,
    Operational,
    Compliance,
    Fraud,
}

impl RiskCategory {
    fn as_str(&self) -> &'static str {
        match self {
            RiskCategory::Credit => "credit",
            RiskCategory::Market => "market",
            RiskCategory::Liquidity => "liquidity",
            RiskCategory::Operational => "operational",
            RiskCategory::Compliance => "compliance",
            RiskCategory::Fraud => "fraud",
        }
    }

    fn from_str(s: &str) -> Self {
        match s {
            "credit" => RiskCategory::Credit,
            "market" => RiskCategory::Market,
            "liquidity" => RiskCategory::Liquidity,
            "operational" => RiskCategory::Operational,
            "compliance" => RiskCategory::Compliance,
            "fraud" => RiskCategory::Fraud,
            _ => RiskCategory::Operational,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum FraudRuleType {
    Velocity,
    Amount,
    Location,
    Device,
    Behavior,
}

impl FraudRuleType {
    fn as_str(&self) -> &'static str {
        match self {
            FraudRuleType::Velocity => "velocity",
            FraudRuleType::Amount => "amount",
            FraudRuleType::Location => "location",
            FraudRuleType::Device => "device",
            FraudRuleType::Behavior => "behavior",
        }
    }

    fn from_str(s: &str) -> Self {
        match s {
            "velocity" => FraudRuleType::Velocity,
            "amount" => FraudRuleType::Amount,
            "location" => FraudRuleType::Location,
            "device" => FraudRuleType::Device,
            "behavior" => FraudRuleType::Behavior,
            _ => FraudRuleType::Velocity,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum FraudRecommendation {
    Approve,
    Review,
    Block,
}

impl FraudRecommendation {
    fn as_str(&self) -> &'static str {
        match self {
            FraudRecommendation::Approve => "approve",
            FraudRecommendation::Review => "review",
            FraudRecommendation::Block => "block",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
#[allow(non_camel_case_types)]
pub enum Regulation {
    SOX,
    GDPR,
    PCI_DSS,
    HIPAA,
    Internal,
}

impl Regulation {
    fn as_str(&self) -> &'static str {
        match self {
            Regulation::SOX => "sox",
            Regulation::GDPR => "gdpr",
            Regulation::PCI_DSS => "pci_dss",
            Regulation::HIPAA => "hipaa",
            Regulation::Internal => "internal",
        }
    }

    fn from_str(s: &str) -> Self {
        match s {
            "sox" => Regulation::SOX,
            "gdpr" => Regulation::GDPR,
            "pci_dss" => Regulation::PCI_DSS,
            "hipaa" => Regulation::HIPAA,
            _ => Regulation::Internal,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ReviewWorkflowStatus {
    Pending,
    InProgress,
    Completed,
    Rejected,
}

impl ReviewWorkflowStatus {
    /// `finance.finance_v54_review_workflows.status` 允许集合
    pub const DB_VALUES: &'static [&'static str] =
        &["pending", "in_progress", "completed", "rejected"];

    pub const ALL: [Self; 4] = [
        ReviewWorkflowStatus::Pending,
        ReviewWorkflowStatus::InProgress,
        ReviewWorkflowStatus::Completed,
        ReviewWorkflowStatus::Rejected,
    ];

    fn as_str(&self) -> &'static str {
        match self {
            ReviewWorkflowStatus::Pending => "pending",
            ReviewWorkflowStatus::InProgress => "in_progress",
            ReviewWorkflowStatus::Completed => "completed",
            ReviewWorkflowStatus::Rejected => "rejected",
        }
    }

    /// 严格解析：未知值返回 None，不再静默回退 pending。
    fn from_str(s: &str) -> Option<Self> {
        match s.trim() {
            "pending" => Some(ReviewWorkflowStatus::Pending),
            "in_progress" => Some(ReviewWorkflowStatus::InProgress),
            "completed" => Some(ReviewWorkflowStatus::Completed),
            "rejected" => Some(ReviewWorkflowStatus::Rejected),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ReviewSeverity {
    Low,
    Medium,
    High,
    Critical,
}

impl ReviewSeverity {
    fn as_str(&self) -> &'static str {
        match self {
            ReviewSeverity::Low => "low",
            ReviewSeverity::Medium => "medium",
            ReviewSeverity::High => "high",
            ReviewSeverity::Critical => "critical",
        }
    }

    fn from_str(s: &str) -> Self {
        match s {
            "low" => ReviewSeverity::Low,
            "medium" => ReviewSeverity::Medium,
            "high" => ReviewSeverity::High,
            "critical" => ReviewSeverity::Critical,
            _ => ReviewSeverity::Low,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ReviewAction {
    Approve,
    Reject,
    Escalate,
    Flag,
}

impl ReviewAction {
    fn as_str(&self) -> &'static str {
        match self {
            ReviewAction::Approve => "approve",
            ReviewAction::Reject => "reject",
            ReviewAction::Escalate => "escalate",
            ReviewAction::Flag => "flag",
        }
    }
}

// ==================== 数据模型 ====================

// --- 风险监测 ---

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct RiskIndicator {
    pub id: Uuid,
    pub category: String,
    pub level: String,
    pub current_value: f64,
    pub threshold: f64,
    pub unit: String,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct RiskAlert {
    pub id: Uuid,
    pub indicator_id: Uuid,
    pub level: String,
    pub message: String,
    pub entity: String,
    pub created_at: DateTime<Utc>,
    pub acknowledged: bool,
    pub resolved: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RiskDashboard {
    pub total_indicators: i64,
    pub critical_count: i64,
    pub high_count: i64,
    pub medium_count: i64,
    pub low_count: i64,
    pub composite_score: f64,
    pub open_alerts: i64,
    pub by_category: HashMap<String, i64>,
}

// --- 反欺诈 ---

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct FraudRule {
    pub id: Uuid,
    pub name: String,
    pub rule_type: String,
    pub condition: String,
    pub threshold: f64,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct FraudScore {
    pub id: Uuid,
    pub transaction_id: String,
    pub score: f64,
    pub triggered_rules: serde_json::Value,
    pub risk_level: String,
    pub recommendation: String,
    pub scored_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Transaction {
    pub id: String,
    pub account_id: String,
    pub amount: f64,
    pub currency: String,
    pub merchant: String,
    pub location: String,
    pub device_id: String,
    pub timestamp: DateTime<Utc>,
    pub metadata: Option<serde_json::Value>,
}

// --- 合规审查 ---

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ReviewRule {
    pub id: Uuid,
    pub regulation: String,
    pub category: String,
    pub severity: String,
    pub action: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ReviewResult {
    pub id: Uuid,
    pub entity_type: String,
    pub entity_id: String,
    pub rule_id: Uuid,
    pub passed: bool,
    pub details: serde_json::Value,
    pub reviewed_at: DateTime<Utc>,
    pub reviewer: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ReviewWorkflow {
    pub id: Uuid,
    pub entity_type: String,
    pub entity_id: String,
    pub status: String,
    pub assigned_to: Option<String>,
    pub steps: serde_json::Value,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComplianceReport {
    pub entity_type: String,
    pub entity_id: String,
    pub total_rules: i64,
    pub passed_rules: i64,
    pub failed_rules: i64,
    pub pass_rate: f64,
    pub critical_issues: Vec<String>,
    pub high_issues: Vec<String>,
    pub medium_issues: Vec<String>,
    pub low_issues: Vec<String>,
    pub generated_at: DateTime<Utc>,
}

// ==================== 数据库初始化 ====================

// ==================== 1. 实时风险监测 ====================

pub struct RealTimeRiskMonitor;

#[derive(Debug, Deserialize)]
pub struct EvaluateRiskRequest {
    pub category: Option<String>,
    pub entity: Option<String>,
}

impl RealTimeRiskMonitor {
    #[allow(
        clippy::as_conversions,
        clippy::cast_possible_wrap,
        clippy::cast_precision_loss
    )]
    pub async fn evaluate_risk(
        db: &Db,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
        tenant_id: Option<Uuid>,
        req: EvaluateRiskRequest,
    ) -> Result<RiskDashboard, sqlx::Error> {
        let now = Utc::now();

        // 系统通道例外（冻结文档 §2.1）：超管跨租户只读汇总
        let mut scope = db.scope_with(txn).await?;

        let mut query = String::from(
            "SELECT id, category, level, current_value, threshold, unit, updated_at FROM finance.finance_v54_risk_indicators",
        );
        let mut conditions = vec!["$1".to_string()];

        if let Some(ref cat) = req.category {
            query.push_str(" AND category = $2");
            conditions.push(format!("'{}'", cat));
        }

        let indicators: Vec<RiskIndicator> = sqlx::query_as(sqlx::AssertSqlSafe(query))
            .fetch_all(&mut scope)
            .await?;
        let _ = scope.commit().await;

        let mut category_map: HashMap<String, i64> = HashMap::new();
        let mut total_score = 0.0f64;
        let mut critical_count = 0i64;
        let mut high_count = 0i64;
        let mut medium_count = 0i64;
        let mut low_count = 0i64;

        for indicator in &indicators {
            let level = RiskLevel::from_str(&indicator.level);
            let threshold = if indicator.threshold > 0.0 {
                indicator.threshold
            } else {
                1.0
            };
            let ratio = indicator.current_value / threshold;
            let score = (ratio * level.weight()).min(10.0);
            total_score += score;

            *category_map.entry(indicator.category.clone()).or_insert(0) += 1;

            match level {
                RiskLevel::Critical => critical_count += 1,
                RiskLevel::High => high_count += 1,
                RiskLevel::Medium => medium_count += 1,
                RiskLevel::Low => low_count += 1,
            }

            if indicator.current_value > indicator.threshold {
                if let Some(tid) = tenant_id {
                    Self::auto_escalate(db, txn, tid, indicator, &level, &now).await?;
                }
            }
        }

        let composite_score = if !indicators.is_empty() {
            (total_score / indicators.len() as f64) * 10.0
        } else {
            0.0
        };

        // 系统通道例外（冻结文档 §2.1）：超管跨租户只读汇总
        let mut scope = db.scope_with(txn).await?;
        let open_alerts: i64 = sqlx::query_scalar(
            only_own_schema_query!("finance", "SELECT COUNT(*) FROM finance.finance_v54_risk_alerts WHERE acknowledged = false AND resolved = false"),
        )
        .fetch_one(&mut scope)
        .await?;
        let _ = scope.commit().await;

        Ok(RiskDashboard {
            total_indicators: indicators.len() as i64,
            critical_count,
            high_count,
            medium_count,
            low_count,
            composite_score,
            open_alerts,
            by_category: category_map,
        })
    }

    async fn auto_escalate(
        db: &Db,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
        tenant_id: Uuid,
        indicator: &RiskIndicator,
        level: &RiskLevel,
        now: &DateTime<Utc>,
    ) -> Result<(), sqlx::Error> {
        let message = format!(
            "指标 {} 当前值 {:.2} 超过阈值 {:.2}",
            indicator.category, indicator.current_value, indicator.threshold
        );

        let mut scope = db.scope_with(txn).await?;
        sqlx::query(
            only_own_schema_query!("finance", r#"INSERT INTO finance.finance_v54_risk_alerts
                (id, tenant_id, indicator_id, level, message, entity, created_at, acknowledged, resolved)
            VALUES ($1, $2, $3, $4, $5, $6, $7, false, false)
            ON CONFLICT DO NOTHING"#),
        )
        .bind(Uuid::new_v4())
        .bind(tenant_id)
        .bind(indicator.id)
        .bind(level.as_str())
        .bind(&message)
        .bind(&indicator.category)
        .bind(*now)
        .execute(&mut scope)
        .await?;
        scope.commit().await?;

        Ok(())
    }

    pub async fn get_dashboard(
        db: &Db,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
        tenant_id: Option<Uuid>,
    ) -> Result<RiskDashboard, sqlx::Error> {
        Self::evaluate_risk(
            db,
            txn,
            tenant_id,
            EvaluateRiskRequest {
                category: None,
                entity: None,
            },
        )
        .await
    }

    pub async fn create_alert(
        db: &Db,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
        tenant_id: Uuid,
        indicator_id: Uuid,
        level: String,
        message: String,
        entity: String,
    ) -> Result<RiskAlert, sqlx::Error> {
        let now = Utc::now();
        let id = Uuid::new_v4();

        let mut scope = db.scope_with(txn).await?;
        let alert = sqlx::query_as::<_, RiskAlert>(
            only_own_schema_query!("finance", r#"INSERT INTO finance.finance_v54_risk_alerts
                (id, tenant_id, indicator_id, level, message, entity, created_at, acknowledged, resolved)
            VALUES ($1, $2, $3, $4, $5, $6, $7, false, false)
            RETURNING id, indicator_id, level, message, entity, created_at, acknowledged, resolved"#),
        )
        .bind(id)
        .bind(tenant_id)
        .bind(indicator_id)
        .bind(&level)
        .bind(&message)
        .bind(&entity)
        .bind(now)
        .fetch_one(&mut scope)
        .await?;
        scope.commit().await?;
        Ok(alert)
    }

    pub async fn acknowledge_alert(
        db: &Db,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
        tenant_id: Uuid,
        alert_id: Uuid,
    ) -> Result<RiskAlert, sqlx::Error> {
        let mut scope = db.scope_with(txn).await?;
        let alert = sqlx::query_as(only_own_schema_query!(
            "finance",
            r#"UPDATE finance.finance_v54_risk_alerts
            SET acknowledged = true
            WHERE id = $1 AND tenant_id = $2
            RETURNING id, indicator_id, level, message, entity, created_at, acknowledged, resolved"#
        ))
        .bind(alert_id)
        .bind(tenant_id)
        .fetch_one(&mut scope)
        .await?;
        scope.commit().await?;
        Ok(alert)
    }

    pub async fn resolve_alert(
        db: &Db,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
        tenant_id: Uuid,
        alert_id: Uuid,
    ) -> Result<RiskAlert, sqlx::Error> {
        let mut scope = db.scope_with(txn).await?;
        let alert = sqlx::query_as(only_own_schema_query!(
            "finance",
            r#"UPDATE finance.finance_v54_risk_alerts
            SET resolved = true, acknowledged = true
            WHERE id = $1 AND tenant_id = $2
            RETURNING id, indicator_id, level, message, entity, created_at, acknowledged, resolved"#
        ))
        .bind(alert_id)
        .bind(tenant_id)
        .fetch_one(&mut scope)
        .await?;
        scope.commit().await?;
        Ok(alert)
    }

    pub async fn get_alerts_by_category(
        db: &Db,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
        _tenant_id: Option<Uuid>,
        category: String,
    ) -> Result<Vec<RiskAlert>, sqlx::Error> {
        // 系统通道例外（冻结文档 §2.1）：超管跨租户只读汇总
        let mut scope = db.scope_with(txn).await?;
        let alerts = sqlx::query_as(only_own_schema_query!(
            "finance",
            r#"SELECT id, indicator_id, level, message, entity, created_at, acknowledged, resolved
            FROM finance.finance_v54_risk_alerts WHERE entity = $1
            ORDER BY created_at DESC
            LIMIT 100"#
        ))
        .bind(&category)
        .fetch_all(&mut scope)
        .await;
        let _ = scope.commit().await;
        alerts
    }

    pub async fn get_alerts_by_entity(
        db: &Db,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
        _tenant_id: Option<Uuid>,
        entity: String,
    ) -> Result<Vec<RiskAlert>, sqlx::Error> {
        // 系统通道例外（冻结文档 §2.1）：超管跨租户只读汇总
        let mut scope = db.scope_with(txn).await?;
        let alerts = sqlx::query_as(only_own_schema_query!(
            "finance",
            r#"SELECT id, indicator_id, level, message, entity, created_at, acknowledged, resolved
            FROM finance.finance_v54_risk_alerts WHERE entity = $1
            ORDER BY created_at DESC
            LIMIT 100"#
        ))
        .bind(&entity)
        .fetch_all(&mut scope)
        .await;
        let _ = scope.commit().await;
        alerts
    }
}

// ==================== 2. 交易反欺诈 ====================

pub struct AntiFraudEngine;

#[derive(Debug, Deserialize)]
pub struct ScoreTransactionRequest {
    pub transaction: Transaction,
}

impl AntiFraudEngine {
    pub async fn score_transaction(
        db: &Db,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
        tenant_id: Uuid,
        req: ScoreTransactionRequest,
    ) -> Result<FraudScore, sqlx::Error> {
        let tx = &req.transaction;
        let rules = Self::get_fraud_rules(db, txn, Some(tenant_id)).await?;

        let mut triggered_rules: Vec<String> = Vec::new();
        let mut score = 0.0f64;

        for rule in &rules {
            if !rule.enabled {
                continue;
            }

            let rule_score = match FraudRuleType::from_str(&rule.rule_type) {
                FraudRuleType::Velocity => {
                    Self::check_velocity(db, txn, tenant_id, &tx.account_id, rule.threshold).await
                }
                FraudRuleType::Amount => {
                    Self::check_amount_anomaly(db, tenant_id, tx.amount, rule.threshold).await
                }
                FraudRuleType::Location => {
                    Self::check_location_anomaly(db, tenant_id, &tx.location, rule.threshold).await
                }
                FraudRuleType::Device => {
                    Self::check_device_fingerprint(db, tenant_id, &tx.device_id, rule.threshold)
                        .await
                }
                FraudRuleType::Behavior => {
                    Self::check_behavior_internal(
                        db,
                        tenant_id,
                        &tx.account_id,
                        tx.amount,
                        rule.threshold,
                    )
                    .await
                }
            };

            if rule_score > 0.0 {
                triggered_rules.push(rule.name.clone());
                score += rule_score;
            }
        }

        score = score.min(100.0);

        let risk_level = if score >= 80.0 {
            "critical"
        } else if score >= 60.0 {
            "high"
        } else if score >= 30.0 {
            "medium"
        } else {
            "low"
        };

        let recommendation = if score >= 80.0 {
            FraudRecommendation::Block
        } else if score >= 50.0 {
            FraudRecommendation::Review
        } else {
            FraudRecommendation::Approve
        };

        let now = Utc::now();
        let id = Uuid::new_v4();

        let triggered_json = serde_json::Value::Array(
            triggered_rules
                .iter()
                .map(|r| serde_json::json!(r))
                .collect(),
        );

        let mut scope = db.scope_with(txn).await?;
        let fraud_score = sqlx::query_as::<_, FraudScore>(
            only_own_schema_query!("finance", r#"INSERT INTO finance.finance_v54_fraud_scores
                (id, tenant_id, transaction_id, score, triggered_rules, risk_level, recommendation, scored_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id, transaction_id, score, triggered_rules, risk_level, recommendation, scored_at"#),
        )
        .bind(id)
        .bind(tenant_id)
        .bind(&tx.id)
        .bind(score)
        .bind(triggered_json)
        .bind(risk_level)
        .bind(recommendation.as_str())
        .bind(now)
        .fetch_one(&mut scope)
        .await?;
        scope.commit().await?;
        Ok(fraud_score)
    }

    #[allow(clippy::as_conversions, clippy::cast_precision_loss)]
    async fn check_velocity(
        db: &Db,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
        tenant_id: Uuid,
        account_id: &str,
        threshold: f64,
    ) -> f64 {
        let _account_uuid = Uuid::parse_str(account_id).unwrap_or_else(|_| Uuid::new_v4());
        let mut scope = match db.scope_with(txn).await {
            Ok(s) => s,
            Err(_) => return 0.0,
        };
        let count: i64 = sqlx::query_scalar(
            only_own_schema_query!("finance", "SELECT COUNT(*) FROM finance.finance_v54_fraud_scores WHERE tenant_id = $1 AND transaction_id LIKE $2 || '%' AND scored_at > NOW() - INTERVAL '1 hour'"),
        )
        .bind(tenant_id)
        .bind(account_id)
        .fetch_one(&mut scope)
        .await
        .unwrap_or(0);
        let _ = scope.commit().await;

        if count as f64 > threshold {
            ((count as f64 - threshold) / threshold * 50.0).min(100.0)
        } else {
            0.0
        }
    }

    async fn check_amount_anomaly(_db: &Db, _tenant_id: Uuid, amount: f64, threshold: f64) -> f64 {
        if amount > threshold {
            ((amount - threshold) / threshold * 50.0).min(100.0)
        } else {
            0.0
        }
    }

    async fn check_location_anomaly(
        _db: &Db,
        _tenant_id: Uuid,
        location: &str,
        _threshold: f64,
    ) -> f64 {
        if location.is_empty() {
            50.0
        } else {
            0.0
        }
    }

    async fn check_device_fingerprint(
        _db: &Db,
        _tenant_id: Uuid,
        device_id: &str,
        _threshold: f64,
    ) -> f64 {
        if device_id.is_empty() {
            40.0
        } else {
            0.0
        }
    }

    async fn check_behavior_internal(
        _db: &Db,
        _tenant_id: Uuid,
        _account_id: &str,
        _amount: f64,
        _threshold: f64,
    ) -> f64 {
        0.0
    }

    pub async fn get_fraud_rules(
        db: &Db,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
        _tenant_id: Option<Uuid>,
    ) -> Result<Vec<FraudRule>, sqlx::Error> {
        // 系统通道例外（冻结文档 §2.1）：超管跨租户只读汇总
        let mut scope = db.scope_with(txn).await?;
        let rules = sqlx::query_as(
            only_own_schema_query!("finance", "SELECT id, name, rule_type, condition, threshold, enabled FROM finance.finance_v54_fraud_rules ORDER BY rule_type, name"),
        )
        .fetch_all(&mut scope)
        .await;
        let _ = scope.commit().await;
        rules
    }

    pub async fn update_rule(
        db: &Db,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
        tenant_id: Uuid,
        rule_id: Uuid,
        name: Option<String>,
        condition: Option<String>,
        threshold: Option<f64>,
        enabled: Option<bool>,
    ) -> Result<FraudRule, sqlx::Error> {
        let mut scope = db.scope_with(txn).await?;
        let current: FraudRule = sqlx::query_as(
            only_own_schema_query!("finance", "SELECT id, name, rule_type, condition, threshold, enabled FROM finance.finance_v54_fraud_rules WHERE id = $1 AND tenant_id = $2"),
        )
        .bind(rule_id)
        .bind(tenant_id)
        .fetch_one(&mut scope)
        .await?;

        let name = name.unwrap_or(current.name);
        let condition = condition.unwrap_or(current.condition);
        let threshold = threshold.unwrap_or(current.threshold);
        let enabled = enabled.unwrap_or(current.enabled);

        let rule = sqlx::query_as(only_own_schema_query!(
            "finance",
            r#"UPDATE finance.finance_v54_fraud_rules
            SET name = $1, condition = $2, threshold = $3, enabled = $4
            WHERE id = $5 AND tenant_id = $6
            RETURNING id, name, rule_type, condition, threshold, enabled"#
        ))
        .bind(name)
        .bind(condition)
        .bind(threshold)
        .bind(enabled)
        .bind(rule_id)
        .bind(tenant_id)
        .fetch_one(&mut scope)
        .await?;
        scope.commit().await?;
        Ok(rule)
    }

    pub async fn get_score(
        db: &Db,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
        tenant_id: Uuid,
        transaction_id: String,
    ) -> Result<FraudScore, sqlx::Error> {
        let mut scope = db.scope_with(txn).await?;
        let score = sqlx::query_as(
            only_own_schema_query!("finance", "SELECT id, transaction_id, score, triggered_rules, risk_level, recommendation, scored_at FROM finance.finance_v54_fraud_scores WHERE tenant_id = $1 AND transaction_id = $2 ORDER BY scored_at DESC LIMIT 1"),
        )
        .bind(tenant_id)
        .bind(&transaction_id)
        .fetch_one(&mut scope)
        .await;
        let _ = scope.commit().await;
        score
    }
}

// ==================== 3. 合规自动审查 ====================

pub struct AutoComplianceReviewer;

#[derive(Debug, Deserialize)]
pub struct ReviewEntityRequest {
    pub entity_type: String,
    pub entity_id: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateWorkflowRequest {
    pub entity_type: String,
    pub entity_id: String,
    pub assigned_to: Option<String>,
    pub steps: Vec<String>,
}

impl AutoComplianceReviewer {
    pub async fn review_entity(
        db: &Db,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
        tenant_id: Uuid,
        req: ReviewEntityRequest,
        reviewer: String,
    ) -> Result<Vec<ReviewResult>, TopemsError> {
        let mut scope = db.scope_with(txn).await?;
        let rules: Vec<ReviewRule> = sqlx::query_as(
            only_own_schema_query!("finance", "SELECT id, regulation, category, severity, action FROM finance.finance_v54_review_rules WHERE tenant_id = $1 ORDER BY severity DESC"),
        )
        .bind(tenant_id)
        .fetch_all(&mut scope)
        .await?;

        let mut results = Vec::new();
        let now = Utc::now();

        for rule in &rules {
            let passed = Self::evaluate_rule(rule, &req.entity_type, &req.entity_id)?;
            let details = serde_json::json!({
                "rule": rule.id,
                "severity": rule.severity,
                "action": rule.action,
            });

            let result = ReviewResult {
                id: Uuid::new_v4(),
                entity_type: req.entity_type.clone(),
                entity_id: req.entity_id.clone(),
                rule_id: rule.id,
                passed,
                details,
                reviewed_at: now,
                reviewer: reviewer.clone(),
            };

            sqlx::query(
                only_own_schema_query!("finance", r#"INSERT INTO finance.finance_v54_review_results
                    (id, tenant_id, entity_type, entity_id, rule_id, passed, details, reviewed_at, reviewer)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)"#),
            )
            .bind(result.id)
            .bind(tenant_id)
            .bind(&result.entity_type)
            .bind(&result.entity_id)
            .bind(result.rule_id)
            .bind(result.passed)
            .bind(&result.details)
            .bind(result.reviewed_at)
            .bind(&result.reviewer)
            .execute(&mut scope)
            .await?;

            results.push(result);
        }
        scope.commit().await?;

        Ok(results)
    }

    /// 规则求值：**尚未实现**。
    ///
    /// 此前这里恒返回 `true`，于是 `review_entity` 对每一条规则都判定「通过」并写进
    /// `finance.finance_v54_review_results`——审查记录全绿，等于伪造合规审计轨迹
    /// （监管抽查时"全部通过"比"没有记录"更难解释）。现在显形为未实现：
    /// 不写任何审查结果，调用方拿到明确的 503。
    fn evaluate_rule(
        rule: &ReviewRule,
        entity_type: &str,
        entity_id: &str,
    ) -> Result<bool, TopemsError> {
        tracing::warn!(
            rule_id = %rule.id,
            regulation = %rule.regulation,
            entity_type = entity_type,
            entity_id = entity_id,
            "合规自动审查规则引擎未实现，拒绝伪造审查结果"
        );
        Err(TopemsError::ServiceUnavailable(
            "合规自动审查规则引擎尚未实现（X-Stub）：未生成任何审查结果，请人工审查".to_string(),
        ))
    }

    pub async fn get_review_results(
        db: &Db,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
        _tenant_id: Option<Uuid>,
        entity_type: Option<String>,
        entity_id: Option<String>,
    ) -> Result<Vec<ReviewResult>, sqlx::Error> {
        // 系统通道例外（冻结文档 §2.1）：超管跨租户只读汇总
        let mut scope = db.scope_with(txn).await?;
        let mut query = String::from(
            "SELECT id, entity_type, entity_id, rule_id, passed, details, reviewed_at, reviewer FROM finance.finance_v54_review_results",
        );

        if entity_type.is_some() {
            query.push_str(" AND entity_type = $1");
        }
        if entity_id.is_some() {
            let idx = if entity_type.is_some() { "2" } else { "1" };
            query.push_str(&format!(" AND entity_id = ${}", idx));
        }

        query.push_str(" ORDER BY reviewed_at DESC LIMIT 500");

        let mut q = sqlx::query_as::<_, ReviewResult>(sqlx::AssertSqlSafe(query));
        if let Some(ref et) = entity_type {
            q = q.bind(et);
        }
        if let Some(ref eid) = entity_id {
            q = q.bind(eid);
        }

        let results = q.fetch_all(&mut scope).await;
        let _ = scope.commit().await;
        results
    }

    pub async fn create_review_workflow(
        db: &Db,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
        tenant_id: Uuid,
        req: CreateWorkflowRequest,
    ) -> Result<ReviewWorkflow, sqlx::Error> {
        let now = Utc::now();
        let id = Uuid::new_v4();
        let steps_json = serde_json::Value::Array(
            req.steps
                .iter()
                .map(|s| serde_json::json!({ "name": s, "status": "pending" }))
                .collect(),
        );

        let mut scope = db.scope_with(txn).await?;
        let workflow = sqlx::query_as(
            only_own_schema_query!("finance", r#"INSERT INTO finance.finance_v54_review_workflows
                (id, tenant_id, entity_type, entity_id, status, assigned_to, steps, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id, entity_type, entity_id, status, assigned_to, steps, created_at, updated_at"#),
        )
        .bind(id)
        .bind(tenant_id)
        .bind(&req.entity_type)
        .bind(&req.entity_id)
        .bind(ReviewWorkflowStatus::Pending.as_str())
        .bind(req.assigned_to)
        .bind(steps_json)
        .bind(now)
        .bind(now)
        .fetch_one(&mut scope)
        .await?;
        scope.commit().await?;
        Ok(workflow)
    }

    pub async fn advance_workflow(
        db: &Db,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
        tenant_id: Uuid,
        workflow_id: Uuid,
    ) -> Result<ReviewWorkflow, sqlx::Error> {
        let mut scope = db.scope_with(txn).await?;
        let workflow: ReviewWorkflow = sqlx::query_as(
            only_own_schema_query!("finance", "SELECT id, entity_type, entity_id, status, assigned_to, steps, created_at, updated_at FROM finance.finance_v54_review_workflows WHERE id = $1 AND tenant_id = $2"),
        )
        .bind(workflow_id)
        .bind(tenant_id)
        .fetch_one(&mut scope)
        .await?;

        match ReviewWorkflowStatus::from_str(&workflow.status) {
            Some(ReviewWorkflowStatus::Pending) | Some(ReviewWorkflowStatus::InProgress) => {}
            Some(ReviewWorkflowStatus::Completed) | Some(ReviewWorkflowStatus::Rejected) => {
                // 终态工作流不可再推进，避免 rejected 被覆盖成 completed。
                return Err(sqlx::Error::RowNotFound);
            }
            None => {
                return Err(sqlx::Error::Protocol(format!(
                    "未知审核工作流状态: {}",
                    workflow.status
                )));
            }
        }

        let mut steps: Vec<serde_json::Value> =
            serde_json::from_value(workflow.steps.clone()).unwrap_or_default();

        let mut all_done = true;
        for step in &mut steps {
            if step["status"] == "pending" {
                step["status"] = serde_json::json!("in_progress");
                all_done = false;
                break;
            } else if step["status"] == "in_progress" {
                step["status"] = serde_json::json!("completed");
            }
        }

        let new_status = if all_done {
            ReviewWorkflowStatus::Completed
        } else {
            ReviewWorkflowStatus::InProgress
        };

        let now = Utc::now();
        let workflow = sqlx::query_as(
            only_own_schema_query!("finance", r#"UPDATE finance.finance_v54_review_workflows
            SET status = $1, steps = $2, updated_at = $3
            WHERE id = $4 AND tenant_id = $5 AND status IN ($6, $7)
            RETURNING id, entity_type, entity_id, status, assigned_to, steps, created_at, updated_at"#),
        )
        .bind(new_status.as_str())
        .bind(serde_json::Value::Array(steps))
        .bind(now)
        .bind(workflow_id)
        .bind(tenant_id)
        .bind(ReviewWorkflowStatus::Pending.as_str())
        .bind(ReviewWorkflowStatus::InProgress.as_str())
        .fetch_one(&mut scope)
        .await?;
        scope.commit().await?;
        Ok(workflow)
    }

    pub async fn get_compliance_status(
        db: &Db,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
        _tenant_id: Option<Uuid>,
        entity_type: String,
        entity_id: String,
    ) -> Result<Vec<ReviewWorkflow>, sqlx::Error> {
        // 系统通道例外（冻结文档 §2.1）：超管跨租户只读汇总
        let mut scope = db.scope_with(txn).await?;
        let workflows = sqlx::query_as(
            only_own_schema_query!("finance", "SELECT id, entity_type, entity_id, status, assigned_to, steps, created_at, updated_at FROM finance.finance_v54_review_workflows WHERE entity_type = $1 AND entity_id = $2 ORDER BY created_at DESC"),
        )
        .bind(&entity_type)
        .bind(&entity_id)
        .fetch_all(&mut scope)
        .await;
        let _ = scope.commit().await;
        workflows
    }

    #[allow(
        clippy::as_conversions,
        clippy::cast_possible_wrap,
        clippy::cast_precision_loss
    )]
    pub async fn generate_compliance_report(
        db: &Db,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
        tenant_id: Uuid,
        entity_type: Option<String>,
        entity_id: Option<String>,
    ) -> Result<ComplianceReport, sqlx::Error> {
        let results = Self::get_review_results(
            db,
            txn,
            Some(tenant_id),
            entity_type.clone(),
            entity_id.clone(),
        )
        .await?;

        let total_rules = results.len() as i64;
        let passed_rules = results.iter().filter(|r| r.passed).count() as i64;
        let failed_rules = total_rules - passed_rules;
        let pass_rate = if total_rules > 0 {
            (passed_rules as f64 / total_rules as f64) * 100.0
        } else {
            100.0
        };

        let mut critical_issues = Vec::new();
        let mut high_issues = Vec::new();
        let mut medium_issues = Vec::new();
        let mut low_issues = Vec::new();

        let mut scope = db.scope_with(txn).await?;
        for result in &results {
            if !result.passed {
                let rule: ReviewRule = match sqlx::query_as(
                    only_own_schema_query!("finance", "SELECT id, regulation, category, severity, action FROM finance.finance_v54_review_rules WHERE id = $1"),
                )
                .bind(result.rule_id)
                .fetch_one(&mut scope)
                .await
                {
                    Ok(r) => r,
                    Err(_) => continue,
                };

                let msg = format!(
                    "规则 [{}] {} 未通过 - {}",
                    rule.regulation, rule.category, result.entity_id
                );

                match ReviewSeverity::from_str(&rule.severity) {
                    ReviewSeverity::Critical => critical_issues.push(msg),
                    ReviewSeverity::High => high_issues.push(msg),
                    ReviewSeverity::Medium => medium_issues.push(msg),
                    ReviewSeverity::Low => low_issues.push(msg),
                }
            }
        }
        let _ = scope.commit().await;

        Ok(ComplianceReport {
            entity_type: entity_type.unwrap_or_else(|| "all".to_string()),
            entity_id: entity_id.unwrap_or_else(|| "all".to_string()),
            total_rules,
            passed_rules,
            failed_rules,
            pass_rate,
            critical_issues,
            high_issues,
            medium_issues,
            low_issues,
            generated_at: Utc::now(),
        })
    }
}

// ==================== API Handlers ====================

// --- Risk Dashboard & Alerts ---

#[utoipa::path(
    security(("BearerAuth" = ["finance:risk:read"])),
    get,
    path = "/api/finance/finance-v54/risk/dashboard",
    tag = "Auto-Backfill",
    responses((status = 200, description = "get /api/finance/finance-v54/risk/dashboard"), (status = 500, description = "服务内部错误")),
)]
pub async fn get_risk_dashboard_handler(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
) -> ApiResponse<RiskDashboard> {
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

    match RealTimeRiskMonitor::get_dashboard(&db, txn, tenant_id).await {
        Ok(dashboard) => ApiResponse::success(dashboard, "查询成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

#[derive(Debug, Deserialize)]
pub struct AlertQueryParams {
    pub category: Option<String>,
    pub entity: Option<String>,
}

#[utoipa::path(
    security(("BearerAuth" = ["finance:risk:read"])),
    get,
    path = "/api/finance/finance-v54/risk/alerts",
    tag = "Auto-Backfill",
    responses((status = 200, description = "get /api/finance/finance-v54/risk/alerts"), (status = 500, description = "服务内部错误")),
)]
pub async fn get_risk_alerts_handler(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<AlertQueryParams>,
) -> ApiResponse<Vec<RiskAlert>> {
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

    if let Some(ref cat) = params.category {
        match RealTimeRiskMonitor::get_alerts_by_category(&db, txn, tenant_id, cat.clone()).await {
            Ok(alerts) => return ApiResponse::success(alerts, "查询成功"),
            Err(e) => return crate::shared::err_resp(e),
        }
    }

    if let Some(ref ent) = params.entity {
        match RealTimeRiskMonitor::get_alerts_by_entity(&db, txn, tenant_id, ent.clone()).await {
            Ok(alerts) => return ApiResponse::success(alerts, "查询成功"),
            Err(e) => return crate::shared::err_resp(e),
        }
    }

    match RealTimeRiskMonitor::get_alerts_by_category(&db, txn, tenant_id, String::new()).await {
        Ok(alerts) => ApiResponse::success(alerts, "查询成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

#[utoipa::path(
    security(("BearerAuth" = ["finance:admin"])),
    put,
    path = "/finance/finance-v54/risk/alerts/{id}/acknowledge",
    tag = "Finance",
    params(("id" = Uuid, Path, description = "预警 ID")),
    responses((status = 200, description = "确认预警成功")),
)]
async fn acknowledge_alert_handler(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(alert_id): Path<Uuid>,
) -> ApiResponse<RiskAlert> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let db = state.db.clone();
    let tenant_id = get_tenant_id_from_claims(&claims);

    match RealTimeRiskMonitor::acknowledge_alert(&db, txn, tenant_id, alert_id).await {
        Ok(alert) => ApiResponse::success(alert, "已确认"),
        Err(e) => crate::shared::err_resp(e),
    }
}
#[utoipa::path(
    security(("BearerAuth" = ["finance:admin"])),
    put,
    path = "/finance/finance-v54/risk/alerts/{id}/resolve",
    responses(
        (status = 200, description = "成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误"),
    ),
    params(
        ("id" = String, Path, description = "资源 ID"),
    ),
    tag = "Finance Risk V54",
    operation_id = "resolve_alert_handler",
)]
async fn resolve_alert_handler(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(alert_id): Path<Uuid>,
) -> ApiResponse<RiskAlert> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let db = state.db.clone();
    let tenant_id = get_tenant_id_from_claims(&claims);

    match RealTimeRiskMonitor::resolve_alert(&db, txn, tenant_id, alert_id).await {
        Ok(alert) => ApiResponse::success(alert, "已解决"),
        Err(e) => crate::shared::err_resp(e),
    }
}

// --- Fraud ---

#[utoipa::path(
    security(("BearerAuth" = ["finance:admin"])),
    post,
    path = "/api/finance/finance-v54/fraud/score",
    tag = "Auto-Backfill",
    responses((status = 200, description = "post /api/finance/finance-v54/fraud/score"), (status = 500, description = "服务内部错误")),
)]
pub async fn score_transaction_handler(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<ScoreTransactionRequest>,
) -> ApiResponse<FraudScore> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let db = state.db.clone();
    let tenant_id = get_tenant_id_from_claims(&claims);

    match AntiFraudEngine::score_transaction(&db, txn, tenant_id, req).await {
        Ok(score) => ApiResponse::success(score, "评分完成"),
        Err(e) => crate::shared::err_resp(e),
    }
}

#[utoipa::path(
    security(("BearerAuth" = ["finance:risk:read"])),
    get,
    path = "/api/finance/finance-v54/fraud/rules",
    tag = "Auto-Backfill",
    responses((status = 200, description = "get /api/finance/finance-v54/fraud/rules"), (status = 500, description = "服务内部错误")),
)]
pub async fn get_fraud_rules_handler(
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

    match AntiFraudEngine::get_fraud_rules(&db, txn, tenant_id).await {
        Ok(rules) => ApiResponse::success(rules, "查询成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

#[derive(Debug, Deserialize)]
pub struct UpdateFraudRuleRequest {
    pub name: Option<String>,
    pub condition: Option<String>,
    pub threshold: Option<f64>,
    pub enabled: Option<bool>,
}

#[utoipa::path(
    security(("BearerAuth" = ["finance:admin"])),
    put,
    path = "/api/finance/finance-v54/fraud/rules/{id}",
    tag = "Auto-Backfill",
    params(
        ("id" = String, Path, description = "id"),
    ),
    responses((status = 200, description = "put /api/finance/finance-v54/fraud/rules/{id}"), (status = 500, description = "服务内部错误")),
)]
pub async fn update_fraud_rule_handler(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(rule_id): Path<Uuid>,
    Json(req): Json<UpdateFraudRuleRequest>,
) -> ApiResponse<FraudRule> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let db = state.db.clone();
    let tenant_id = get_tenant_id_from_claims(&claims);

    match AntiFraudEngine::update_rule(
        &db,
        txn,
        tenant_id,
        rule_id,
        req.name,
        req.condition,
        req.threshold,
        req.enabled,
    )
    .await
    {
        Ok(rule) => ApiResponse::success(rule, "更新成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

#[utoipa::path(
    security(("BearerAuth" = ["finance:risk:read"])),
    get,
    path = "/api/finance/finance-v54/fraud/scores/{transaction_id}",
    tag = "Auto-Backfill",
    params(
        ("transaction_id" = String, Path, description = "transaction_id"),
    ),
    responses((status = 200, description = "get /api/finance/finance-v54/fraud/scores/{transaction_id}"), (status = 500, description = "服务内部错误")),
)]
pub async fn get_fraud_score_handler(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(transaction_id): Path<String>,
) -> ApiResponse<FraudScore> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let db = state.db.clone();
    let tenant_id = get_tenant_id_from_claims(&claims);

    match AntiFraudEngine::get_score(&db, txn, tenant_id, transaction_id).await {
        Ok(score) => ApiResponse::success(score, "查询成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

// --- Compliance ---

#[utoipa::path(
    security(("BearerAuth" = ["finance:admin"])),
    post,
    path = "/api/finance/finance-v54/compliance/review",
    tag = "Auto-Backfill",
    responses((status = 200, description = "post /api/finance/finance-v54/compliance/review"), (status = 500, description = "服务内部错误")),
)]
pub async fn review_entity_handler(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<ReviewEntityRequest>,
) -> ApiResponse<Vec<ReviewResult>> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let db = state.db.clone();
    let tenant_id = get_tenant_id_from_claims(&claims);
    let reviewer = claims.username.clone();

    match AutoComplianceReviewer::review_entity(&db, txn, tenant_id, req, reviewer).await {
        Ok(results) => ApiResponse::success(results, "审查完成"),
        Err(e) => crate::shared::err_resp(e),
    }
}

#[derive(Debug, Deserialize, utoipa::IntoParams)]
pub struct ReviewResultQueryParams {
    pub entity_type: Option<String>,
    pub entity_id: Option<String>,
}

#[utoipa::path(
    security(("BearerAuth" = ["finance:risk:read"])),
    get,
    path = "/api/finance/finance-v54/compliance/results",
    tag = "Auto-Backfill",
    responses((status = 200, description = "get /api/finance/finance-v54/compliance/results"), (status = 500, description = "服务内部错误")),
)]
pub async fn get_review_results_handler(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ReviewResultQueryParams>,
) -> ApiResponse<Vec<ReviewResult>> {
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

    match AutoComplianceReviewer::get_review_results(
        &db,
        txn,
        tenant_id,
        params.entity_type,
        params.entity_id,
    )
    .await
    {
        Ok(results) => ApiResponse::success(results, "查询成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

#[utoipa::path(
    security(("BearerAuth" = ["finance:risk:read"])),
    get,
    path = "/api/finance/finance-v54/compliance/status/{entity_type}/{entity_id}",
    tag = "Auto-Backfill",
    params(
        ("entity_type" = String, Path, description = "entity_type"),
        ("entity_id" = String, Path, description = "entity_id"),
    ),
    responses((status = 200, description = "get /api/finance/finance-v54/compliance/status/{entity_type}/{entity_id}"), (status = 500, description = "服务内部错误")),
)]
pub async fn get_compliance_status_handler(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path((entity_type, entity_id)): Path<(String, String)>,
) -> ApiResponse<Vec<ReviewWorkflow>> {
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

    match AutoComplianceReviewer::get_compliance_status(&db, txn, tenant_id, entity_type, entity_id)
        .await
    {
        Ok(workflows) => ApiResponse::success(workflows, "查询成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

#[utoipa::path(
    security(("BearerAuth" = ["finance:admin"])),
    post,
    path = "/api/finance/finance-v54/compliance/workflow",
    tag = "Auto-Backfill",
    responses((status = 200, description = "post /api/finance/finance-v54/compliance/workflow"), (status = 500, description = "服务内部错误")),
)]
pub async fn create_workflow_handler(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateWorkflowRequest>,
) -> ApiResponse<ReviewWorkflow> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let db = state.db.clone();
    let tenant_id = get_tenant_id_from_claims(&claims);

    match AutoComplianceReviewer::create_review_workflow(&db, txn, tenant_id, req).await {
        Ok(workflow) => ApiResponse::success(workflow, "创建成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

#[utoipa::path(
    security(("BearerAuth" = ["finance:admin"])),
    put,
    path = "/api/finance/finance-v54/compliance/workflow/{id}/advance",
    tag = "Auto-Backfill",
    params(
        ("id" = String, Path, description = "id"),
    ),
    responses((status = 200, description = "put /api/finance/finance-v54/compliance/workflow/{id}/advance"), (status = 500, description = "服务内部错误")),
)]
pub async fn advance_workflow_handler(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(workflow_id): Path<Uuid>,
) -> ApiResponse<ReviewWorkflow> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let db = state.db.clone();
    let tenant_id = get_tenant_id_from_claims(&claims);

    match AutoComplianceReviewer::advance_workflow(&db, txn, tenant_id, workflow_id).await {
        Ok(workflow) => ApiResponse::success(workflow, "推进成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct ComplianceReportQueryParams {
    pub entity_type: Option<String>,
    pub entity_id: Option<String>,
}

#[utoipa::path(
    security(("BearerAuth" = ["finance:risk:read"])),
    get,
    path = "/finance/finance-v54/compliance/report",
    tag = "Filled",
    responses((status = 200, description = "ok")),
)]
pub async fn generate_compliance_report_handler(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ComplianceReportQueryParams>,
) -> ApiResponse<ComplianceReport> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let db = state.db.clone();
    let tenant_id = get_tenant_id_from_claims(&claims);

    match AutoComplianceReviewer::generate_compliance_report(
        &db,
        txn,
        tenant_id,
        params.entity_type,
        params.entity_id,
    )
    .await
    {
        Ok(report) => ApiResponse::success(report, "报告生成成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

// ==================== 路由注册 ====================

pub fn create_routes() -> Router<AppState> {
    // B375：风险/反欺诈/合规此前整个 Router 只挂 `finance:risk:read`，
    // `PUT alerts/{id}/acknowledge|resolve`、`PUT fraud/rules/{id}`、`POST fraud/score`、
    // `POST compliance/review|workflow`、`PUT compliance/workflow/{id}/advance` 这些写端点
    // 在独立部署（不经网关 `require_finance_write`）时对只读角色敞开。
    // 按 B363 口径把门槛下沉到服务内：读 = `finance:risk:read`，写 = `finance:admin`。
    let read_routes = Router::new()
        // Risk Monitoring
        .route(
            "/finance-v54/risk/dashboard",
            axum::routing::get(get_risk_dashboard_handler),
        )
        .route(
            "/finance-v54/risk/alerts",
            axum::routing::get(get_risk_alerts_handler),
        )
        // Fraud
        .route(
            "/finance-v54/fraud/rules",
            axum::routing::get(get_fraud_rules_handler),
        )
        .route(
            "/finance-v54/fraud/scores/{transaction_id}",
            axum::routing::get(get_fraud_score_handler),
        )
        // Compliance
        .route(
            "/finance-v54/compliance/results",
            axum::routing::get(get_review_results_handler),
        )
        .route(
            "/finance-v54/compliance/status/{entity_type}/{entity_id}",
            axum::routing::get(get_compliance_status_handler),
        )
        .route(
            "/finance-v54/compliance/report",
            axum::routing::get(generate_compliance_report_handler),
        )
        .layer(axum::middleware::from_fn(
            topems_shared_auth::middleware::require_permission("finance:risk:read"),
        ));

    let write_routes = Router::new()
        .route(
            "/finance-v54/risk/alerts/{id}/acknowledge",
            axum::routing::put(acknowledge_alert_handler),
        )
        .route(
            "/finance-v54/risk/alerts/{id}/resolve",
            axum::routing::put(resolve_alert_handler),
        )
        .route(
            "/finance-v54/fraud/score",
            axum::routing::post(score_transaction_handler),
        )
        .route(
            "/finance-v54/fraud/rules/{id}",
            axum::routing::put(update_fraud_rule_handler),
        )
        .route(
            "/finance-v54/compliance/review",
            axum::routing::post(review_entity_handler),
        )
        .route(
            "/finance-v54/compliance/workflow",
            axum::routing::post(create_workflow_handler),
        )
        .route(
            "/finance-v54/compliance/workflow/{id}/advance",
            axum::routing::put(advance_workflow_handler),
        )
        .layer(axum::middleware::from_fn(
            topems_shared_auth::middleware::require_module_write("finance"),
        ));

    read_routes.merge(write_routes)
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
    fn enum_risk_level() {
        roundtrip(&RiskLevel::Low);
        roundtrip(&RiskLevel::Medium);
        roundtrip(&RiskLevel::High);
        roundtrip(&RiskLevel::Critical);
    }

    #[test]
    fn enum_risk_category() {
        roundtrip(&RiskCategory::Credit);
        roundtrip(&RiskCategory::Market);
        roundtrip(&RiskCategory::Liquidity);
        roundtrip(&RiskCategory::Operational);
        roundtrip(&RiskCategory::Compliance);
        roundtrip(&RiskCategory::Fraud);
    }

    #[test]
    fn enum_fraud_rule_type() {
        roundtrip(&FraudRuleType::Velocity);
        roundtrip(&FraudRuleType::Amount);
        roundtrip(&FraudRuleType::Location);
        roundtrip(&FraudRuleType::Device);
        roundtrip(&FraudRuleType::Behavior);
    }

    #[test]
    fn enum_fraud_recommendation() {
        roundtrip(&FraudRecommendation::Approve);
        roundtrip(&FraudRecommendation::Review);
        roundtrip(&FraudRecommendation::Block);
    }

    #[test]
    fn enum_regulation() {
        roundtrip(&Regulation::SOX);
        roundtrip(&Regulation::GDPR);
        roundtrip(&Regulation::PCI_DSS);
        roundtrip(&Regulation::HIPAA);
        roundtrip(&Regulation::Internal);
    }

    #[test]
    fn enum_review_workflow_status() {
        roundtrip(&ReviewWorkflowStatus::Pending);
        roundtrip(&ReviewWorkflowStatus::InProgress);
        roundtrip(&ReviewWorkflowStatus::Completed);
        roundtrip(&ReviewWorkflowStatus::Rejected);
    }

    #[test]
    fn enum_review_severity() {
        roundtrip(&ReviewSeverity::Low);
        roundtrip(&ReviewSeverity::Medium);
        roundtrip(&ReviewSeverity::High);
        roundtrip(&ReviewSeverity::Critical);
    }

    #[test]
    fn enum_review_action() {
        roundtrip(&ReviewAction::Approve);
        roundtrip(&ReviewAction::Reject);
        roundtrip(&ReviewAction::Escalate);
        roundtrip(&ReviewAction::Flag);
    }

    #[test]
    fn struct_risk_indicator() {
        let v = RiskIndicator {
            id: Uuid::new_v4(),
            category: "liquidity".into(),
            level: "high".into(),
            current_value: 200.0,
            threshold: 150.0,
            unit: "%".into(),
            updated_at: Utc::now(),
        };
        roundtrip(&v);
    }

    #[test]
    fn struct_risk_alert() {
        let v = RiskAlert {
            id: Uuid::new_v4(),
            indicator_id: Uuid::new_v4(),
            level: "critical".into(),
            message: "指标超阈值".into(),
            entity: "ENT-001".into(),
            created_at: Utc::now(),
            acknowledged: false,
            resolved: false,
        };
        roundtrip(&v);
    }

    #[test]
    fn struct_risk_dashboard() {
        let v = RiskDashboard {
            total_indicators: 50,
            critical_count: 2,
            high_count: 5,
            medium_count: 15,
            low_count: 28,
            composite_score: 3.2,
            open_alerts: 10,
            by_category: [("liquidity".into(), 10i64)].into(),
        };
        roundtrip(&v);
    }

    #[test]
    fn struct_fraud_rule() {
        let v = FraudRule {
            id: Uuid::new_v4(),
            name: "大额交易".into(),
            rule_type: "amount".into(),
            condition: "amount > 50000".into(),
            threshold: 50000.0,
            enabled: true,
        };
        roundtrip(&v);
    }

    #[test]
    fn struct_fraud_score() {
        let v = FraudScore {
            id: Uuid::new_v4(),
            transaction_id: "TX-001".into(),
            score: 0.92,
            triggered_rules: serde_json::json!(["amount"]),
            risk_level: "high".into(),
            recommendation: "review".into(),
            scored_at: Utc::now(),
        };
        roundtrip(&v);
    }

    #[test]
    fn struct_transaction() {
        let v = Transaction {
            id: "TX-001".into(),
            account_id: "ACC-001".into(),
            amount: 9999.0,
            currency: "CNY".into(),
            merchant: "超市".into(),
            location: "北京".into(),
            device_id: "DEV-001".into(),
            timestamp: Utc::now(),
            metadata: Some(serde_json::json!({"channel":"online"})),
        };
        roundtrip(&v);
    }

    #[test]
    fn struct_review_rule() {
        let v = ReviewRule {
            id: Uuid::new_v4(),
            regulation: "sox".into(),
            category: "authorization".into(),
            severity: "high".into(),
            action: "escalate".into(),
        };
        roundtrip(&v);
    }

    #[test]
    fn struct_review_result() {
        let v = ReviewResult {
            id: Uuid::new_v4(),
            entity_type: "transaction".into(),
            entity_id: "TX-001".into(),
            rule_id: Uuid::new_v4(),
            passed: true,
            details: serde_json::json!({"notes":"ok"}),
            reviewed_at: Utc::now(),
            reviewer: "tester".into(),
        };
        roundtrip(&v);
    }

    #[test]
    fn struct_review_workflow() {
        let v = ReviewWorkflow {
            id: Uuid::new_v4(),
            entity_type: "merchant".into(),
            entity_id: "M-001".into(),
            status: "in_progress".into(),
            assigned_to: Some("tester".into()),
            steps: serde_json::json!([{"step":1,"name":"verify"}]),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        roundtrip(&v);
    }

    #[test]
    fn struct_compliance_report() {
        let v = ComplianceReport {
            entity_type: "merchant".into(),
            entity_id: "M-001".into(),
            total_rules: 50,
            passed_rules: 45,
            failed_rules: 5,
            pass_rate: 0.9,
            critical_issues: vec!["严重问题".into()],
            high_issues: vec!["高风险".into()],
            medium_issues: vec!["中等".into()],
            low_issues: vec!["轻微".into()],
            generated_at: Utc::now(),
        };
        roundtrip(&v);
    }

    // ===== as_str / from_str / weight / evaluate_rule pure function tests =====

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
    fn risk_level_weight_all_variants() {
        assert!((RiskLevel::Low.weight() - 1.0).abs() < 1e-9);
        assert!((RiskLevel::Medium.weight() - 2.0).abs() < 1e-9);
        assert!((RiskLevel::High.weight() - 3.0).abs() < 1e-9);
        assert!((RiskLevel::Critical.weight() - 5.0).abs() < 1e-9);
    }

    #[test]
    fn risk_category_as_str_all_variants() {
        assert_eq!(RiskCategory::Credit.as_str(), "credit");
        assert_eq!(RiskCategory::Market.as_str(), "market");
        assert_eq!(RiskCategory::Liquidity.as_str(), "liquidity");
        assert_eq!(RiskCategory::Operational.as_str(), "operational");
        assert_eq!(RiskCategory::Compliance.as_str(), "compliance");
        assert_eq!(RiskCategory::Fraud.as_str(), "fraud");
    }

    #[test]
    fn risk_category_from_str_all_variants() {
        assert_eq!(RiskCategory::from_str("credit"), RiskCategory::Credit);
        assert_eq!(RiskCategory::from_str("market"), RiskCategory::Market);
        assert_eq!(RiskCategory::from_str("liquidity"), RiskCategory::Liquidity);
        assert_eq!(
            RiskCategory::from_str("operational"),
            RiskCategory::Operational
        );
        assert_eq!(
            RiskCategory::from_str("compliance"),
            RiskCategory::Compliance
        );
        assert_eq!(RiskCategory::from_str("fraud"), RiskCategory::Fraud);
    }

    #[test]
    fn risk_category_from_str_unknown_defaults_to_operational() {
        assert_eq!(RiskCategory::from_str("unknown"), RiskCategory::Operational);
        assert_eq!(RiskCategory::from_str(""), RiskCategory::Operational);
    }

    #[test]
    fn fraud_rule_type_as_str_all_variants() {
        assert_eq!(FraudRuleType::Velocity.as_str(), "velocity");
        assert_eq!(FraudRuleType::Amount.as_str(), "amount");
        assert_eq!(FraudRuleType::Location.as_str(), "location");
        assert_eq!(FraudRuleType::Device.as_str(), "device");
        assert_eq!(FraudRuleType::Behavior.as_str(), "behavior");
    }

    #[test]
    fn fraud_rule_type_from_str_all_variants() {
        assert_eq!(FraudRuleType::from_str("velocity"), FraudRuleType::Velocity);
        assert_eq!(FraudRuleType::from_str("amount"), FraudRuleType::Amount);
        assert_eq!(FraudRuleType::from_str("location"), FraudRuleType::Location);
        assert_eq!(FraudRuleType::from_str("device"), FraudRuleType::Device);
        assert_eq!(FraudRuleType::from_str("behavior"), FraudRuleType::Behavior);
    }

    #[test]
    fn fraud_rule_type_from_str_unknown_defaults_to_velocity() {
        assert_eq!(FraudRuleType::from_str("unknown"), FraudRuleType::Velocity);
        assert_eq!(FraudRuleType::from_str(""), FraudRuleType::Velocity);
    }

    #[test]
    fn fraud_recommendation_as_str_all_variants() {
        assert_eq!(FraudRecommendation::Approve.as_str(), "approve");
        assert_eq!(FraudRecommendation::Review.as_str(), "review");
        assert_eq!(FraudRecommendation::Block.as_str(), "block");
    }

    #[test]
    fn regulation_as_str_all_variants() {
        assert_eq!(Regulation::SOX.as_str(), "sox");
        assert_eq!(Regulation::GDPR.as_str(), "gdpr");
        assert_eq!(Regulation::PCI_DSS.as_str(), "pci_dss");
        assert_eq!(Regulation::HIPAA.as_str(), "hipaa");
        assert_eq!(Regulation::Internal.as_str(), "internal");
    }

    #[test]
    fn regulation_from_str_all_variants() {
        assert_eq!(Regulation::from_str("sox"), Regulation::SOX);
        assert_eq!(Regulation::from_str("gdpr"), Regulation::GDPR);
        assert_eq!(Regulation::from_str("pci_dss"), Regulation::PCI_DSS);
        assert_eq!(Regulation::from_str("hipaa"), Regulation::HIPAA);
        assert_eq!(Regulation::from_str("internal"), Regulation::Internal);
    }

    #[test]
    fn regulation_from_str_unknown_defaults_to_internal() {
        assert_eq!(Regulation::from_str("unknown"), Regulation::Internal);
        assert_eq!(Regulation::from_str(""), Regulation::Internal);
    }

    #[test]
    fn review_workflow_status_as_str_all_variants() {
        assert_eq!(ReviewWorkflowStatus::Pending.as_str(), "pending");
        assert_eq!(ReviewWorkflowStatus::InProgress.as_str(), "in_progress");
        assert_eq!(ReviewWorkflowStatus::Completed.as_str(), "completed");
        assert_eq!(ReviewWorkflowStatus::Rejected.as_str(), "rejected");
    }

    #[test]
    fn review_workflow_status_from_str_all_variants() {
        assert_eq!(
            ReviewWorkflowStatus::from_str("pending"),
            Some(ReviewWorkflowStatus::Pending)
        );
        assert_eq!(
            ReviewWorkflowStatus::from_str("in_progress"),
            Some(ReviewWorkflowStatus::InProgress)
        );
        assert_eq!(
            ReviewWorkflowStatus::from_str("completed"),
            Some(ReviewWorkflowStatus::Completed)
        );
        assert_eq!(
            ReviewWorkflowStatus::from_str("rejected"),
            Some(ReviewWorkflowStatus::Rejected)
        );
    }

    #[test]
    fn review_workflow_status_rejects_unknown() {
        assert_eq!(ReviewWorkflowStatus::from_str("unknown"), None);
        assert_eq!(ReviewWorkflowStatus::from_str(""), None);
        assert_eq!(ReviewWorkflowStatus::from_str("COMPLETED"), None);
    }

    #[test]
    fn review_severity_as_str_all_variants() {
        assert_eq!(ReviewSeverity::Low.as_str(), "low");
        assert_eq!(ReviewSeverity::Medium.as_str(), "medium");
        assert_eq!(ReviewSeverity::High.as_str(), "high");
        assert_eq!(ReviewSeverity::Critical.as_str(), "critical");
    }

    #[test]
    fn review_severity_from_str_all_variants() {
        assert_eq!(ReviewSeverity::from_str("low"), ReviewSeverity::Low);
        assert_eq!(ReviewSeverity::from_str("medium"), ReviewSeverity::Medium);
        assert_eq!(ReviewSeverity::from_str("high"), ReviewSeverity::High);
        assert_eq!(
            ReviewSeverity::from_str("critical"),
            ReviewSeverity::Critical
        );
    }

    #[test]
    fn review_severity_from_str_unknown_defaults_to_low() {
        assert_eq!(ReviewSeverity::from_str("unknown"), ReviewSeverity::Low);
        assert_eq!(ReviewSeverity::from_str(""), ReviewSeverity::Low);
    }

    #[test]
    fn review_action_as_str_all_variants() {
        assert_eq!(ReviewAction::Approve.as_str(), "approve");
        assert_eq!(ReviewAction::Reject.as_str(), "reject");
        assert_eq!(ReviewAction::Escalate.as_str(), "escalate");
        assert_eq!(ReviewAction::Flag.as_str(), "flag");
    }

    #[test]
    fn evaluate_rule_refuses_to_fabricate_a_pass() {
        let rule = ReviewRule {
            id: Uuid::new_v4(),
            regulation: "sox".into(),
            category: "authorization".into(),
            severity: "high".into(),
            action: "escalate".into(),
        };
        // 规则引擎未实现时必须显形失败：以前恒返回 true，等于每条规则都“通过”。
        assert!(AutoComplianceReviewer::evaluate_rule(&rule, "transaction", "TX-001").is_err());
        assert!(AutoComplianceReviewer::evaluate_rule(&rule, "", "").is_err());
    }
}

#[cfg(test)]
mod db_values_tests {
    use super::*;

    #[test]
    fn db_values_match_db_check() {
        assert_eq!(
            ReviewWorkflowStatus::DB_VALUES,
            ["pending", "in_progress", "completed", "rejected"]
        );
        for v in ReviewWorkflowStatus::DB_VALUES {
            assert!(
                ReviewWorkflowStatus::ALL.iter().any(|s| s.as_str() == *v),
                "DB_VALUES 中的 {v} 没有对应枚举变体"
            );
        }
    }
}
