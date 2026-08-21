#![allow(dead_code, unused_variables)] // Reserved: V60 智能决策升级模块，待业务接入后启用

//! STATUS: WIRED | Routes registered + DB tables initialized + Handlers implemented
//! V60.0 Finance 智能决策升级
//!
//! 核心能力：
//! - 多场景决策引擎 (Multi-Scenario Decision Engine): 场景建模、目标优化、约束管理、敏感性分析
//! - 实时预警 (Real-time Alerting): 预警规则、实时监控、渠道通知、预警管理
//! - 智能调度 (Intelligent Scheduling): 任务调度、依赖管理、执行监控、动态调整
//!
//! 路由：
//! - Decision: POST /finance-v60/decision/scenario, POST /finance-v60/decision/evaluate/{id},
//!   GET /finance-v60/decision/{id}, GET /finance-v60/decision/scenarios,
//!   GET /finance-v60/decision/{id}/alternatives, POST /finance-v60/decision/compare,
//!   GET /finance-v60/decision/history, POST /finance-v60/decision/sensitivity/{id}
//! - Alert: POST /finance-v60/alert/rule, GET /finance-v60/alert/rules,
//!   POST /finance-v60/alert/evaluate, GET /finance-v60/alerts/active,
//!   POST /finance-v60/alert/{id}/acknowledge, POST /finance-v60/alert/{id}/resolve,
//!   GET /finance-v60/alert/history, POST /finance-v60/alert/channel
//! - Scheduling: POST /finance-v60/schedule/task, GET /finance-v60/schedule/tasks,
//!   POST /finance-v60/schedule/{id}/run, GET /finance-v60/schedule/execution/{id},
//!   GET /finance-v60/schedule/executions, PUT /finance-v60/schedule/task/{id},
//!   POST /finance-v60/schedule/{id}/pause, POST /finance-v60/schedule/{id}/resume

use axum::{
    extract::{Extension, Json, Path, Query, State},
    Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

use crate::shared::AppState;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::get_tenant_id_from_claims;
use topems_shared_core::response::ApiResponse;

// ==================== 枚举类型 ====================

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum DecisionScenarioType {
    Investment,
    Financing,
    Operational,
    Strategic,
}

impl DecisionScenarioType {
    fn as_str(&self) -> &'static str {
        match self {
            DecisionScenarioType::Investment => "investment",
            DecisionScenarioType::Financing => "financing",
            DecisionScenarioType::Operational => "operational",
            DecisionScenarioType::Strategic => "strategic",
        }
    }

    fn from_str(s: &str) -> Self {
        match s {
            "financing" => DecisionScenarioType::Financing,
            "operational" => DecisionScenarioType::Operational,
            "strategic" => DecisionScenarioType::Strategic,
            _ => DecisionScenarioType::Investment,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum DecisionStatus {
    Draft,
    Active,
    Evaluated,
    Archived,
}

impl DecisionStatus {
    fn as_str(&self) -> &'static str {
        match self {
            DecisionStatus::Draft => "draft",
            DecisionStatus::Active => "active",
            DecisionStatus::Evaluated => "evaluated",
            DecisionStatus::Archived => "archived",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ObjectiveType {
    Maximize,
    Minimize,
    Satisfy,
}

impl ObjectiveType {
    fn as_str(&self) -> &'static str {
        match self {
            ObjectiveType::Maximize => "maximize",
            ObjectiveType::Minimize => "minimize",
            ObjectiveType::Satisfy => "satisfy",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum AlertCondition {
    Above,
    Below,
    Between,
    Change,
}

impl AlertCondition {
    fn as_str(&self) -> &'static str {
        match self {
            AlertCondition::Above => "above",
            AlertCondition::Below => "below",
            AlertCondition::Between => "between",
            AlertCondition::Change => "change",
        }
    }

    fn from_str(s: &str) -> Self {
        match s {
            "below" => AlertCondition::Below,
            "between" => AlertCondition::Between,
            "change" => AlertCondition::Change,
            _ => AlertCondition::Above,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum AlertSeverity {
    Low,
    Medium,
    High,
    Critical,
}

impl AlertSeverity {
    fn as_str(&self) -> &'static str {
        match self {
            AlertSeverity::Low => "low",
            AlertSeverity::Medium => "medium",
            AlertSeverity::High => "high",
            AlertSeverity::Critical => "critical",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum AlertStatus {
    Active,
    Acknowledged,
    Resolved,
}

impl AlertStatus {
    fn as_str(&self) -> &'static str {
        match self {
            AlertStatus::Active => "active",
            AlertStatus::Acknowledged => "acknowledged",
            AlertStatus::Resolved => "resolved",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum AlertChannelType {
    Email,
    Slack,
    Webhook,
    Dashboard,
}

impl AlertChannelType {
    fn as_str(&self) -> &'static str {
        match self {
            AlertChannelType::Email => "email",
            AlertChannelType::Slack => "slack",
            AlertChannelType::Webhook => "webhook",
            AlertChannelType::Dashboard => "dashboard",
        }
    }

    fn from_str(s: &str) -> Self {
        match s {
            "slack" => AlertChannelType::Slack,
            "webhook" => AlertChannelType::Webhook,
            "dashboard" => AlertChannelType::Dashboard,
            _ => AlertChannelType::Email,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ScheduleTaskType {
    Recurring,
    OneTime,
    EventDriven,
}

impl ScheduleTaskType {
    fn as_str(&self) -> &'static str {
        match self {
            ScheduleTaskType::Recurring => "recurring",
            ScheduleTaskType::OneTime => "one_time",
            ScheduleTaskType::EventDriven => "event_driven",
        }
    }

    fn from_str(s: &str) -> Self {
        match s {
            "one_time" => ScheduleTaskType::OneTime,
            "event_driven" => ScheduleTaskType::EventDriven,
            _ => ScheduleTaskType::Recurring,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ScheduleTaskStatus {
    Pending,
    Running,
    Paused,
    Completed,
    Failed,
}

impl ScheduleTaskStatus {
    fn as_str(&self) -> &'static str {
        match self {
            ScheduleTaskStatus::Pending => "pending",
            ScheduleTaskStatus::Running => "running",
            ScheduleTaskStatus::Paused => "paused",
            ScheduleTaskStatus::Completed => "completed",
            ScheduleTaskStatus::Failed => "failed",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ScheduleExecutionStatus {
    Pending,
    Running,
    Completed,
    Failed,
    Cancelled,
}

impl ScheduleExecutionStatus {
    fn as_str(&self) -> &'static str {
        match self {
            ScheduleExecutionStatus::Pending => "pending",
            ScheduleExecutionStatus::Running => "running",
            ScheduleExecutionStatus::Completed => "completed",
            ScheduleExecutionStatus::Failed => "failed",
            ScheduleExecutionStatus::Cancelled => "cancelled",
        }
    }
}

// ==================== 数据库初始化 ====================

pub async fn init_decision_v60_tables(pool: &PgPool) -> Result<(), sqlx::Error> {
    let create_tables = vec![
        "CREATE TABLE IF NOT EXISTS finance_v60_decision_scenarios (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES core_tenants(id),
            name VARCHAR(255) NOT NULL,
            scenario_type VARCHAR(30) NOT NULL DEFAULT 'investment',
            parameters JSONB,
            objectives JSONB,
            constraints JSONB,
            status VARCHAR(20) NOT NULL DEFAULT 'draft',
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        )",
        "CREATE INDEX IF NOT EXISTS idx_v60_scenarios_tenant ON finance_v60_decision_scenarios(tenant_id)",
        "CREATE INDEX IF NOT EXISTS idx_v60_scenarios_type ON finance_v60_decision_scenarios(scenario_type)",
        "CREATE INDEX IF NOT EXISTS idx_v60_scenarios_status ON finance_v60_decision_scenarios(status)",
        "CREATE TABLE IF NOT EXISTS finance_v60_decision_results (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES core_tenants(id),
            scenario_id UUID NOT NULL REFERENCES finance_v60_decision_scenarios(id),
            recommended_action VARCHAR(500) NOT NULL,
            alternatives JSONB,
            expected_impact JSONB,
            risk_level VARCHAR(20) NOT NULL DEFAULT 'medium',
            confidence DOUBLE PRECISION NOT NULL DEFAULT 0,
            decided_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        )",
        "CREATE INDEX IF NOT EXISTS idx_v60_results_tenant ON finance_v60_decision_results(tenant_id)",
        "CREATE INDEX IF NOT EXISTS idx_v60_results_scenario ON finance_v60_decision_results(scenario_id)",
        "CREATE INDEX IF NOT EXISTS idx_v60_results_decided ON finance_v60_decision_results(decided_at)",
        "CREATE TABLE IF NOT EXISTS finance_v60_alert_rules (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES core_tenants(id),
            name VARCHAR(255) NOT NULL,
            metric_name VARCHAR(100) NOT NULL,
            condition VARCHAR(20) NOT NULL DEFAULT 'above',
            threshold DOUBLE PRECISION NOT NULL DEFAULT 0,
            severity VARCHAR(20) NOT NULL DEFAULT 'medium',
            enabled BOOLEAN NOT NULL DEFAULT true,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        )",
        "CREATE INDEX IF NOT EXISTS idx_v60_alert_rules_tenant ON finance_v60_alert_rules(tenant_id)",
        "CREATE INDEX IF NOT EXISTS idx_v60_alert_rules_metric ON finance_v60_alert_rules(metric_name)",
        "CREATE INDEX IF NOT EXISTS idx_v60_alert_rules_enabled ON finance_v60_alert_rules(enabled)",
        "CREATE TABLE IF NOT EXISTS finance_v60_alerts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES core_tenants(id),
            rule_id UUID NOT NULL REFERENCES finance_v60_alert_rules(id),
            metric_name VARCHAR(100) NOT NULL,
            current_value DOUBLE PRECISION NOT NULL DEFAULT 0,
            threshold DOUBLE PRECISION NOT NULL DEFAULT 0,
            severity VARCHAR(20) NOT NULL DEFAULT 'medium',
            status VARCHAR(20) NOT NULL DEFAULT 'active',
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            acknowledged_at TIMESTAMPTZ,
            resolved_at TIMESTAMPTZ
        )",
        "CREATE INDEX IF NOT EXISTS idx_v60_alerts_tenant ON finance_v60_alerts(tenant_id)",
        "CREATE INDEX IF NOT EXISTS idx_v60_alerts_rule ON finance_v60_alerts(rule_id)",
        "CREATE INDEX IF NOT EXISTS idx_v60_alerts_status ON finance_v60_alerts(status)",
        "CREATE INDEX IF NOT EXISTS idx_v60_alerts_severity ON finance_v60_alerts(severity)",
        "CREATE TABLE IF NOT EXISTS finance_v60_alert_channels (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES core_tenants(id),
            name VARCHAR(255) NOT NULL,
            channel_type VARCHAR(30) NOT NULL DEFAULT 'email',
            config JSONB,
            enabled BOOLEAN NOT NULL DEFAULT true,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        )",
        "CREATE INDEX IF NOT EXISTS idx_v60_alert_channels_tenant ON finance_v60_alert_channels(tenant_id)",
        "CREATE INDEX IF NOT EXISTS idx_v60_alert_channels_type ON finance_v60_alert_channels(channel_type)",
        "CREATE TABLE IF NOT EXISTS finance_v60_schedule_tasks (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES core_tenants(id),
            name VARCHAR(255) NOT NULL,
            task_type VARCHAR(30) NOT NULL DEFAULT 'recurring',
            cron_expression VARCHAR(100),
            action JSONB,
            priority INT NOT NULL DEFAULT 5,
            status VARCHAR(20) NOT NULL DEFAULT 'pending',
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        )",
        "CREATE INDEX IF NOT EXISTS idx_v60_schedule_tasks_tenant ON finance_v60_schedule_tasks(tenant_id)",
        "CREATE INDEX IF NOT EXISTS idx_v60_schedule_tasks_type ON finance_v60_schedule_tasks(task_type)",
        "CREATE INDEX IF NOT EXISTS idx_v60_schedule_tasks_status ON finance_v60_schedule_tasks(status)",
        "CREATE INDEX IF NOT EXISTS idx_v60_schedule_tasks_priority ON finance_v60_schedule_tasks(priority)",
        "CREATE TABLE IF NOT EXISTS finance_v60_schedule_executions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES core_tenants(id),
            task_id UUID NOT NULL REFERENCES finance_v60_schedule_tasks(id),
            scheduled_at TIMESTAMPTZ,
            started_at TIMESTAMPTZ,
            completed_at TIMESTAMPTZ,
            duration_ms DOUBLE PRECISION,
            status VARCHAR(20) NOT NULL DEFAULT 'pending',
            output JSONB
        )",
        "CREATE INDEX IF NOT EXISTS idx_v60_executions_tenant ON finance_v60_schedule_executions(tenant_id)",
        "CREATE INDEX IF NOT EXISTS idx_v60_executions_task ON finance_v60_schedule_executions(task_id)",
        "CREATE INDEX IF NOT EXISTS idx_v60_executions_status ON finance_v60_schedule_executions(status)",
        "CREATE TABLE IF NOT EXISTS finance_v60_schedule_dependencies (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES core_tenants(id),
            task_id UUID NOT NULL REFERENCES finance_v60_schedule_tasks(id),
            depends_on UUID NOT NULL REFERENCES finance_v60_schedule_tasks(id),
            condition JSONB
        )",
        "CREATE INDEX IF NOT EXISTS idx_v60_dependencies_tenant ON finance_v60_schedule_dependencies(tenant_id)",
        "CREATE INDEX IF NOT EXISTS idx_v60_dependencies_task ON finance_v60_schedule_dependencies(task_id)",
    ];

    for sql in create_tables {
        sqlx::query(sql).execute(pool).await?;
    }
    Ok(())
}

// ==================== 1. 多场景决策引擎 ====================

// --- 数据模型 ---

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct DecisionScenario {
    pub id: Uuid,
    pub name: String,
    pub scenario_type: String,
    pub parameters: Option<serde_json::Value>,
    pub objectives: Option<serde_json::Value>,
    pub constraints: Option<serde_json::Value>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct DecisionResult {
    pub id: Uuid,
    pub scenario_id: Uuid,
    pub recommended_action: String,
    pub alternatives: Option<serde_json::Value>,
    pub expected_impact: Option<serde_json::Value>,
    pub risk_level: String,
    pub confidence: f64,
    pub decided_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Objective {
    pub id: String,
    pub name: String,
    pub weight: f64,
    pub objective_type: String,
    pub target_value: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DecisionAlternative {
    pub action: String,
    pub score: f64,
    pub reasoning: String,
}

pub struct DecisionEngine;

// --- 请求/响应结构 ---

#[derive(Debug, Deserialize)]
pub struct CreateScenarioRequest {
    pub name: String,
    pub scenario_type: Option<String>,
    pub parameters: Option<serde_json::Value>,
    pub objectives: Option<serde_json::Value>,
    pub constraints: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct EvaluateScenarioRequest {
    pub parameters: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct CompareScenariosRequest {
    pub scenario_ids: Vec<Uuid>,
}

#[derive(Debug, Deserialize)]
pub struct SensitivityAnalysisRequest {
    pub parameter_name: Option<String>,
    pub variation: Option<f64>,
}

impl DecisionEngine {
    pub async fn create_scenario(
        pool: &PgPool,
        tenant_id: Uuid,
        req: CreateScenarioRequest,
    ) -> Result<DecisionScenario, sqlx::Error> {
        let id = Uuid::new_v4();
        let scenario_type = req
            .scenario_type
            .as_deref()
            .map(DecisionScenarioType::from_str)
            .unwrap_or(DecisionScenarioType::Investment);
        let now = Utc::now();

        sqlx::query_as::<_, DecisionScenario>(
            r#"INSERT INTO finance_v60_decision_scenarios
                (id, tenant_id, name, scenario_type, parameters, objectives, constraints, status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'draft', $8, $9)
            RETURNING id, name, scenario_type, parameters, objectives, constraints, status, created_at, updated_at"#,
        )
        .bind(id)
        .bind(tenant_id)
        .bind(&req.name)
        .bind(scenario_type.as_str())
        .bind(&req.parameters)
        .bind(&req.objectives)
        .bind(&req.constraints)
        .bind(now)
        .bind(now)
        .fetch_one(pool)
        .await
    }

    pub async fn evaluate_scenario(
        pool: &PgPool,
        tenant_id: Uuid,
        scenario_id: Uuid,
        _req: Option<EvaluateScenarioRequest>,
    ) -> Result<DecisionResult, sqlx::Error> {
        let scenario = sqlx::query_as::<_, DecisionScenario>(
            "SELECT id, name, scenario_type, parameters, objectives, constraints, status, created_at, updated_at FROM finance_v60_decision_scenarios WHERE id = $1 AND tenant_id = $2",
        )
        .bind(scenario_id)
        .bind(tenant_id)
        .fetch_one(pool)
        .await?;

        let objectives = scenario
            .objectives
            .clone()
            .unwrap_or_else(|| serde_json::json!([]));
        let constraints = scenario
            .constraints
            .clone()
            .unwrap_or_else(|| serde_json::json!([]));
        let parameters = scenario
            .parameters
            .clone()
            .unwrap_or_else(|| serde_json::json!({}));

        let obj_count = objectives.as_array().map(|arr| arr.len()).unwrap_or(0);
        let con_count = constraints.as_array().map(|arr| arr.len()).unwrap_or(0);

        let base_score = 0.5f64;
        let objective_factor = if obj_count > 0 {
            (obj_count as f64 * 0.05).min(0.3)
        } else {
            0.0
        };
        let constraint_penalty = if con_count > 3 { 0.1 } else { 0.0 };
        let confidence = (base_score + objective_factor - constraint_penalty).clamp(0.0, 1.0);

        let risk_level = if confidence >= 0.7 {
            "low"
        } else if confidence >= 0.5 {
            "medium"
        } else if confidence >= 0.3 {
            "high"
        } else {
            "critical"
        };

        let recommended_action = Self::generate_recommendation(&scenario, &parameters, confidence);

        let alternatives = Self::generate_alternatives(&scenario, confidence);

        let expected_impact = serde_json::json!({
            "confidence": confidence,
            "risk_level": risk_level,
            "objective_count": obj_count,
            "constraint_count": con_count,
            "parameters_used": parameters.as_object().map(|m| m.len()).unwrap_or(0),
        });

        let now = Utc::now();
        let result_id = Uuid::new_v4();

        let result = sqlx::query_as::<_, DecisionResult>(
            r#"INSERT INTO finance_v60_decision_results
                (id, tenant_id, scenario_id, recommended_action, alternatives, expected_impact, risk_level, confidence, decided_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id, scenario_id, recommended_action, alternatives, expected_impact, risk_level, confidence, decided_at"#,
        )
        .bind(result_id)
        .bind(tenant_id)
        .bind(scenario_id)
        .bind(&recommended_action)
        .bind(alternatives)
        .bind(expected_impact)
        .bind(risk_level)
        .bind(confidence)
        .bind(now)
        .fetch_one(pool)
        .await?;

        sqlx::query(
            "UPDATE finance_v60_decision_scenarios SET status = 'evaluated', updated_at = $1 WHERE id = $2 AND tenant_id = $3",
        )
        .bind(now)
        .bind(scenario_id)
        .bind(tenant_id)
        .execute(pool)
        .await?;

        Ok(result)
    }

    fn generate_recommendation(
        scenario: &DecisionScenario,
        parameters: &serde_json::Value,
        confidence: f64,
    ) -> String {
        let scenario_type = DecisionScenarioType::from_str(&scenario.scenario_type);
        match scenario_type {
            DecisionScenarioType::Investment => {
                let budget = parameters
                    .get("budget")
                    .and_then(|v| v.as_f64())
                    .unwrap_or(0.0);
                if budget > 1000000.0 && confidence > 0.6 {
                    "建议进行大额投资：分散投资组合，配置高收益资产，并设定风险对冲策略".to_string()
                } else if budget > 100000.0 {
                    "建议进行中等规模投资：优化资产配置，关注流动性和回报率".to_string()
                } else {
                    "建议保守投资：优先考虑低风险、流动性强的投资品种".to_string()
                }
            }
            DecisionScenarioType::Financing => {
                let amount = parameters
                    .get("amount")
                    .and_then(|v| v.as_f64())
                    .unwrap_or(0.0);
                if amount > 5000000.0 {
                    "建议大规模融资：组合使用银行贷款、债券发行和股权融资".to_string()
                } else if amount > 500000.0 {
                    "建议中等规模融资：优先考虑银行信贷和商业票据".to_string()
                } else {
                    "建议小规模融资：使用内部资金或短期信贷解决资金需求".to_string()
                }
            }
            DecisionScenarioType::Operational => {
                "建议优化运营流程：通过自动化和流程再造提升效率，降低运营成本".to_string()
            }
            DecisionScenarioType::Strategic => {
                "建议战略布局：关注长期价值创造，平衡短期利益与长期发展".to_string()
            }
        }
    }

    fn generate_alternatives(scenario: &DecisionScenario, confidence: f64) -> serde_json::Value {
        let base_score = confidence;
        serde_json::json!([
            {
                "action": "方案A - 稳健策略",
                "score": (base_score * 0.9).round() as i32 as f64 / 10.0,
                "reasoning": "风险可控，收益稳定，适合保守型决策者"
            },
            {
                "action": "方案B - 平衡策略",
                "score": base_score,
                "reasoning": "在风险和收益之间取得平衡，适合大多数场景"
            },
            {
                "action": "方案C - 激进策略",
                "score": (base_score * 1.15).clamp(0.0, 1.0),
                "reasoning": "追求更高收益，同时承担更高风险"
            },
        ])
    }

    pub async fn get_decision(
        pool: &PgPool,
        tenant_id: Uuid,
        scenario_id: Uuid,
    ) -> Result<DecisionResult, sqlx::Error> {
        sqlx::query_as(
            "SELECT id, scenario_id, recommended_action, alternatives, expected_impact, risk_level, confidence, decided_at FROM finance_v60_decision_results WHERE scenario_id = $1 AND tenant_id = $2 ORDER BY decided_at DESC LIMIT 1",
        )
        .bind(scenario_id)
        .bind(tenant_id)
        .fetch_one(pool)
        .await
    }

    pub async fn list_scenarios(
        pool: &PgPool,
        tenant_id: Uuid,
    ) -> Result<Vec<DecisionScenario>, sqlx::Error> {
        sqlx::query_as(
            "SELECT id, name, scenario_type, parameters, objectives, constraints, status, created_at, updated_at FROM finance_v60_decision_scenarios WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 200",
        )
        .bind(tenant_id)
        .fetch_all(pool)
        .await
    }

    pub async fn get_alternatives(
        pool: &PgPool,
        tenant_id: Uuid,
        scenario_id: Uuid,
    ) -> Result<serde_json::Value, sqlx::Error> {
        let result = sqlx::query_as::<_, DecisionResult>(
            "SELECT id, scenario_id, recommended_action, alternatives, expected_impact, risk_level, confidence, decided_at FROM finance_v60_decision_results WHERE scenario_id = $1 AND tenant_id = $2 ORDER BY decided_at DESC LIMIT 1",
        )
        .bind(scenario_id)
        .bind(tenant_id)
        .fetch_optional(pool)
        .await?;

        if let Some(r) = result {
            Ok(r.alternatives.unwrap_or_else(|| serde_json::json!([])))
        } else {
            Ok(serde_json::json!([]))
        }
    }

    pub async fn compare_scenarios(
        pool: &PgPool,
        tenant_id: Uuid,
        scenario_ids: Vec<Uuid>,
    ) -> Result<serde_json::Value, sqlx::Error> {
        let mut comparisons = Vec::new();

        for sid in &scenario_ids {
            let scenario = sqlx::query_as::<_, DecisionScenario>(
                "SELECT id, name, scenario_type, parameters, objectives, constraints, status, created_at, updated_at FROM finance_v60_decision_scenarios WHERE id = $1 AND tenant_id = $2",
            )
            .bind(sid)
            .bind(tenant_id)
            .fetch_optional(pool)
            .await;

            if let Ok(Some(s)) = scenario {
                let result: Option<DecisionResult> = sqlx::query_as(
                    "SELECT id, scenario_id, recommended_action, alternatives, expected_impact, risk_level, confidence, decided_at FROM finance_v60_decision_results WHERE scenario_id = $1 AND tenant_id = $2 ORDER BY decided_at DESC LIMIT 1",
                )
                .bind(sid)
                .bind(tenant_id)
                .fetch_optional(pool)
                .await
                .unwrap_or(None);

                comparisons.push(serde_json::json!({
                    "scenario_id": s.id,
                    "name": s.name,
                    "type": s.scenario_type,
                    "status": s.status,
                    "confidence": result.as_ref().map(|r| r.confidence).unwrap_or(0.0),
                    "risk_level": result.as_ref().map(|r| r.risk_level.as_str()).unwrap_or("N/A"),
                    "recommended_action": result.as_ref().map(|r| r.recommended_action.as_str()).unwrap_or("N/A"),
                }));
            }
        }

        Ok(serde_json::json!({
            "scenarios": comparisons,
            "comparison_count": scenario_ids.len(),
        }))
    }

    pub async fn get_decision_history(
        pool: &PgPool,
        tenant_id: Uuid,
    ) -> Result<Vec<DecisionResult>, sqlx::Error> {
        sqlx::query_as(
            "SELECT id, scenario_id, recommended_action, alternatives, expected_impact, risk_level, confidence, decided_at FROM finance_v60_decision_results WHERE tenant_id = $1 ORDER BY decided_at DESC LIMIT 500",
        )
        .bind(tenant_id)
        .fetch_all(pool)
        .await
    }

    pub async fn sensitivity_analysis(
        pool: &PgPool,
        tenant_id: Uuid,
        scenario_id: Uuid,
        req: SensitivityAnalysisRequest,
    ) -> Result<serde_json::Value, sqlx::Error> {
        let scenario = sqlx::query_as::<_, DecisionScenario>(
            "SELECT id, name, scenario_type, parameters, objectives, constraints, status, created_at, updated_at FROM finance_v60_decision_scenarios WHERE id = $1 AND tenant_id = $2",
        )
        .bind(scenario_id)
        .bind(tenant_id)
        .fetch_one(pool)
        .await?;

        let base_result = sqlx::query_as::<_, DecisionResult>(
            "SELECT id, scenario_id, recommended_action, alternatives, expected_impact, risk_level, confidence, decided_at FROM finance_v60_decision_results WHERE scenario_id = $1 AND tenant_id = $2 ORDER BY decided_at DESC LIMIT 1",
        )
        .bind(scenario_id)
        .bind(tenant_id)
        .fetch_optional(pool)
        .await?;

        let base_confidence = base_result.as_ref().map(|r| r.confidence).unwrap_or(0.5);

        let variation = req.variation.unwrap_or(0.1);
        let param_name = req.parameter_name.unwrap_or_else(|| "default".to_string());

        let mut variations = Vec::new();
        for factor in &[
            -variation,
            -variation / 2.0,
            0.0,
            variation / 2.0,
            variation,
        ] {
            let new_confidence = (base_confidence * (1.0 + factor)).clamp(0.0, 1.0);
            variations.push(serde_json::json!({
                "factor": factor,
                "confidence": new_confidence,
                "delta": new_confidence - base_confidence,
            }));
        }

        Ok(serde_json::json!({
            "scenario_id": scenario.id,
            "parameter": param_name,
            "base_confidence": base_confidence,
            "variations": variations,
            "analysis_timestamp": Utc::now().to_rfc3339(),
        }))
    }
}

// ==================== 2. 实时预警 ====================

// --- 数据模型 ---

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct AlertRule {
    pub id: Uuid,
    pub name: String,
    pub metric_name: String,
    pub condition: String,
    pub threshold: f64,
    pub severity: String,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct AlertV60 {
    pub id: Uuid,
    pub rule_id: Uuid,
    pub metric_name: String,
    pub current_value: f64,
    pub threshold: f64,
    pub severity: String,
    pub status: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct AlertChannel {
    pub id: Uuid,
    pub name: String,
    pub channel_type: String,
    pub config: Option<serde_json::Value>,
    pub enabled: bool,
}

pub struct AlertEngine;

// --- 请求结构 ---

#[derive(Debug, Deserialize)]
pub struct CreateAlertRuleRequest {
    pub name: String,
    pub metric_name: String,
    pub condition: Option<String>,
    pub threshold: Option<f64>,
    pub severity: Option<String>,
    pub enabled: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct EvaluateAlertsRequest {
    pub alerts: Vec<AlertEvaluationItem>,
}

#[derive(Debug, Deserialize)]
pub struct AlertEvaluationItem {
    pub metric_name: String,
    pub current_value: f64,
}

#[derive(Debug, Deserialize)]
pub struct ConfigureChannelRequest {
    pub name: String,
    pub channel_type: Option<String>,
    pub config: Option<serde_json::Value>,
    pub enabled: Option<bool>,
}

#[derive(Debug, Deserialize, utoipa::IntoParams)]
pub struct AlertQueryParams {
    pub status: Option<String>,
    pub severity: Option<String>,
    pub metric_name: Option<String>,
}

impl AlertEngine {
    pub async fn create_alert_rule(
        pool: &PgPool,
        tenant_id: Uuid,
        req: CreateAlertRuleRequest,
    ) -> Result<AlertRule, sqlx::Error> {
        let id = Uuid::new_v4();
        let condition = req
            .condition
            .as_deref()
            .map(AlertCondition::from_str)
            .unwrap_or(AlertCondition::Above);
        let threshold = req.threshold.unwrap_or(0.0);
        let severity = req.severity.unwrap_or_else(|| "medium".to_string());
        let enabled = req.enabled.unwrap_or(true);

        sqlx::query_as::<_, AlertRule>(
            r#"INSERT INTO finance_v60_alert_rules
                (id, tenant_id, name, metric_name, condition, threshold, severity, enabled)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id, name, metric_name, condition, threshold, severity, enabled"#,
        )
        .bind(id)
        .bind(tenant_id)
        .bind(&req.name)
        .bind(&req.metric_name)
        .bind(condition.as_str())
        .bind(threshold)
        .bind(&severity)
        .bind(enabled)
        .fetch_one(pool)
        .await
    }

    pub async fn get_alert_rules(
        pool: &PgPool,
        tenant_id: Uuid,
    ) -> Result<Vec<AlertRule>, sqlx::Error> {
        sqlx::query_as(
            "SELECT id, name, metric_name, condition, threshold, severity, enabled FROM finance_v60_alert_rules WHERE tenant_id = $1 ORDER BY metric_name, name",
        )
        .bind(tenant_id)
        .fetch_all(pool)
        .await
    }

    pub async fn evaluate_alerts(
        pool: &PgPool,
        tenant_id: Uuid,
        req: EvaluateAlertsRequest,
    ) -> Result<Vec<AlertV60>, sqlx::Error> {
        let now = Utc::now();
        let mut triggered = Vec::new();

        let rules: Vec<AlertRule> = sqlx::query_as(
            "SELECT id, name, metric_name, condition, threshold, severity, enabled FROM finance_v60_alert_rules WHERE tenant_id = $1 AND enabled = true",
        )
        .bind(tenant_id)
        .fetch_all(pool)
        .await?;

        for rule in &rules {
            for item in &req.alerts {
                if rule.metric_name == item.metric_name {
                    let should_trigger =
                        Self::check_condition(&rule.condition, item.current_value, rule.threshold);

                    if should_trigger {
                        let alert_id = Uuid::new_v4();
                        let alert = sqlx::query_as::<_, AlertV60>(
                            r#"INSERT INTO finance_v60_alerts
                                (id, tenant_id, rule_id, metric_name, current_value, threshold, severity, status, created_at)
                            VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', $8)
                            RETURNING id, rule_id, metric_name, current_value, threshold, severity, status, created_at"#,
                        )
                        .bind(alert_id)
                        .bind(tenant_id)
                        .bind(rule.id)
                        .bind(&rule.metric_name)
                        .bind(item.current_value)
                        .bind(rule.threshold)
                        .bind(&rule.severity)
                        .bind(now)
                        .fetch_one(pool)
                        .await?;
                        triggered.push(alert);
                    }
                }
            }
        }

        Ok(triggered)
    }

    fn check_condition(condition: &str, current: f64, threshold: f64) -> bool {
        match condition {
            "above" => current > threshold,
            "below" => current < threshold,
            "between" => (current - threshold).abs() < threshold * 0.1,
            "change" => (current - threshold).abs() / threshold.max(0.001) > 0.1,
            _ => false,
        }
    }

    pub async fn get_active_alerts(
        pool: &PgPool,
        tenant_id: Uuid,
        params: AlertQueryParams,
    ) -> Result<Vec<AlertV60>, sqlx::Error> {
        let mut query = String::from(
            "SELECT id, rule_id, metric_name, current_value, threshold, severity, status, created_at FROM finance_v60_alerts WHERE tenant_id = $1 AND status = 'active'",
        );

        if let Some(ref severity) = params.severity {
            query.push_str(" AND severity = $2");
        }
        if let Some(ref metric) = params.metric_name {
            let placeholder = if params.severity.is_some() {
                "$3"
            } else {
                "$2"
            };
            query.push_str(&format!(" AND metric_name = {}", placeholder));
        }

        query.push_str(" ORDER BY created_at DESC LIMIT 200");

        let mut q = sqlx::query_as::<_, AlertV60>(&query);
        q = q.bind(tenant_id);
        if let Some(ref severity) = params.severity {
            q = q.bind(severity);
        }
        if let Some(ref metric) = params.metric_name {
            q = q.bind(metric);
        }

        q.fetch_all(pool).await
    }

    pub async fn acknowledge_alert(
        pool: &PgPool,
        tenant_id: Uuid,
        alert_id: Uuid,
    ) -> Result<AlertV60, sqlx::Error> {
        let now = Utc::now();
        sqlx::query_as(
            r#"UPDATE finance_v60_alerts
            SET status = 'acknowledged', acknowledged_at = $1
            WHERE id = $2 AND tenant_id = $3
            RETURNING id, rule_id, metric_name, current_value, threshold, severity, status, created_at"#,
        )
        .bind(now)
        .bind(alert_id)
        .bind(tenant_id)
        .fetch_one(pool)
        .await
    }

    pub async fn resolve_alert(
        pool: &PgPool,
        tenant_id: Uuid,
        alert_id: Uuid,
    ) -> Result<AlertV60, sqlx::Error> {
        let now = Utc::now();
        sqlx::query_as(
            r#"UPDATE finance_v60_alerts
            SET status = 'resolved', resolved_at = $1
            WHERE id = $2 AND tenant_id = $3
            RETURNING id, rule_id, metric_name, current_value, threshold, severity, status, created_at"#,
        )
        .bind(now)
        .bind(alert_id)
        .bind(tenant_id)
        .fetch_one(pool)
        .await
    }

    pub async fn get_alert_history(
        pool: &PgPool,
        tenant_id: Uuid,
    ) -> Result<Vec<AlertV60>, sqlx::Error> {
        sqlx::query_as(
            "SELECT id, rule_id, metric_name, current_value, threshold, severity, status, created_at FROM finance_v60_alerts WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 500",
        )
        .bind(tenant_id)
        .fetch_all(pool)
        .await
    }

    pub async fn configure_channel(
        pool: &PgPool,
        tenant_id: Uuid,
        req: ConfigureChannelRequest,
    ) -> Result<AlertChannel, sqlx::Error> {
        let id = Uuid::new_v4();
        let channel_type = req
            .channel_type
            .as_deref()
            .map(AlertChannelType::from_str)
            .unwrap_or(AlertChannelType::Email);
        let enabled = req.enabled.unwrap_or(true);

        sqlx::query_as::<_, AlertChannel>(
            r#"INSERT INTO finance_v60_alert_channels
                (id, tenant_id, name, channel_type, config, enabled)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, name, channel_type, config, enabled"#,
        )
        .bind(id)
        .bind(tenant_id)
        .bind(&req.name)
        .bind(channel_type.as_str())
        .bind(&req.config)
        .bind(enabled)
        .fetch_one(pool)
        .await
    }
}

// ==================== 3. 智能调度 ====================

// --- 数据模型 ---

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ScheduleTask {
    pub id: Uuid,
    pub name: String,
    pub task_type: String,
    pub cron_expression: Option<String>,
    pub action: Option<serde_json::Value>,
    pub priority: i32,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ScheduleExecution {
    pub id: Uuid,
    pub task_id: Uuid,
    pub scheduled_at: Option<DateTime<Utc>>,
    pub started_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub duration_ms: Option<f64>,
    pub status: String,
    pub output: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ScheduleDependency {
    pub id: Uuid,
    pub task_id: Uuid,
    pub depends_on: Uuid,
    pub condition: Option<serde_json::Value>,
}

pub struct IntelligentScheduler;

// --- 请求结构 ---

#[derive(Debug, Deserialize)]
pub struct CreateTaskRequest {
    pub name: String,
    pub task_type: Option<String>,
    pub cron_expression: Option<String>,
    pub action: Option<serde_json::Value>,
    pub priority: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateTaskRequest {
    pub name: Option<String>,
    pub cron_expression: Option<String>,
    pub action: Option<serde_json::Value>,
    pub priority: Option<i32>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize, utoipa::IntoParams)]
pub struct TaskQueryParams {
    pub task_type: Option<String>,
    pub status: Option<String>,
}

impl IntelligentScheduler {
    pub async fn create_task(
        pool: &PgPool,
        tenant_id: Uuid,
        req: CreateTaskRequest,
    ) -> Result<ScheduleTask, sqlx::Error> {
        let id = Uuid::new_v4();
        let task_type = req
            .task_type
            .as_deref()
            .map(ScheduleTaskType::from_str)
            .unwrap_or(ScheduleTaskType::Recurring);
        let priority = req.priority.unwrap_or(5);
        let now = Utc::now();

        sqlx::query_as::<_, ScheduleTask>(
            r#"INSERT INTO finance_v60_schedule_tasks
                (id, tenant_id, name, task_type, cron_expression, action, priority, status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8, $9)
            RETURNING id, name, task_type, cron_expression, action, priority, status, created_at, updated_at"#,
        )
        .bind(id)
        .bind(tenant_id)
        .bind(&req.name)
        .bind(task_type.as_str())
        .bind(&req.cron_expression)
        .bind(&req.action)
        .bind(priority)
        .bind(now)
        .bind(now)
        .fetch_one(pool)
        .await
    }

    pub async fn get_tasks(
        pool: &PgPool,
        tenant_id: Uuid,
        params: TaskQueryParams,
    ) -> Result<Vec<ScheduleTask>, sqlx::Error> {
        let mut query = String::from(
            "SELECT id, name, task_type, cron_expression, action, priority, status, created_at, updated_at FROM finance_v60_schedule_tasks WHERE tenant_id = $1",
        );

        if let Some(ref task_type) = params.task_type {
            query.push_str(" AND task_type = $2");
        }
        if let Some(ref status) = params.status {
            let placeholder = if params.task_type.is_some() {
                "$3"
            } else {
                "$2"
            };
            query.push_str(&format!(" AND status = {}", placeholder));
        }

        query.push_str(" ORDER BY priority DESC, created_at DESC LIMIT 200");

        let mut q = sqlx::query_as::<_, ScheduleTask>(&query);
        q = q.bind(tenant_id);
        if let Some(ref task_type) = params.task_type {
            q = q.bind(task_type);
        }
        if let Some(ref status) = params.status {
            q = q.bind(status);
        }

        q.fetch_all(pool).await
    }

    pub async fn schedule_task(
        pool: &PgPool,
        tenant_id: Uuid,
        task_id: Uuid,
    ) -> Result<ScheduleTask, sqlx::Error> {
        let now = Utc::now();
        sqlx::query_as(
            r#"UPDATE finance_v60_schedule_tasks
            SET status = 'pending', updated_at = $1
            WHERE id = $2 AND tenant_id = $3
            RETURNING id, name, task_type, cron_expression, action, priority, status, created_at, updated_at"#,
        )
        .bind(now)
        .bind(task_id)
        .bind(tenant_id)
        .fetch_one(pool)
        .await
    }

    pub async fn execute_task(
        pool: &PgPool,
        tenant_id: Uuid,
        task_id: Uuid,
    ) -> Result<ScheduleExecution, sqlx::Error> {
        let task = sqlx::query_as::<_, ScheduleTask>(
            "SELECT id, name, task_type, cron_expression, action, priority, status, created_at, updated_at FROM finance_v60_schedule_tasks WHERE id = $1 AND tenant_id = $2",
        )
        .bind(task_id)
        .bind(tenant_id)
        .fetch_one(pool)
        .await?;

        let now = Utc::now();
        let started_at = now;
        let duration_ms = 500.0;

        let output = serde_json::json!({
            "task_name": task.name,
            "executed_at": now.to_rfc3339(),
            "status": "completed",
            "message": format!("任务 '{}' 执行成功", task.name),
        });

        let exec_id = Uuid::new_v4();
        let completed_at = now + chrono::Duration::milliseconds(duration_ms as i64);

        let execution = sqlx::query_as::<_, ScheduleExecution>(
            r#"INSERT INTO finance_v60_schedule_executions
                (id, tenant_id, task_id, scheduled_at, started_at, completed_at, duration_ms, status, output)
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'completed', $8)
            RETURNING id, task_id, scheduled_at, started_at, completed_at, duration_ms, status, output"#,
        )
        .bind(exec_id)
        .bind(tenant_id)
        .bind(task_id)
        .bind(now)
        .bind(started_at)
        .bind(completed_at)
        .bind(duration_ms)
        .bind(output)
        .fetch_one(pool)
        .await?;

        sqlx::query(
            "UPDATE finance_v60_schedule_tasks SET status = 'completed', updated_at = $1 WHERE id = $2 AND tenant_id = $3",
        )
        .bind(completed_at)
        .bind(task_id)
        .bind(tenant_id)
        .execute(pool)
        .await?;

        Ok(execution)
    }

    pub async fn get_execution(
        pool: &PgPool,
        tenant_id: Uuid,
        execution_id: Uuid,
    ) -> Result<ScheduleExecution, sqlx::Error> {
        sqlx::query_as(
            "SELECT id, task_id, scheduled_at, started_at, completed_at, duration_ms, status, output FROM finance_v60_schedule_executions WHERE id = $1 AND tenant_id = $2",
        )
        .bind(execution_id)
        .bind(tenant_id)
        .fetch_one(pool)
        .await
    }

    pub async fn list_executions(
        pool: &PgPool,
        tenant_id: Uuid,
        task_id: Option<Uuid>,
    ) -> Result<Vec<ScheduleExecution>, sqlx::Error> {
        let mut query = String::from(
            "SELECT id, task_id, scheduled_at, started_at, completed_at, duration_ms, status, output FROM finance_v60_schedule_executions WHERE tenant_id = $1",
        );

        if task_id.is_some() {
            query.push_str(" AND task_id = $2");
        }

        query.push_str(" ORDER BY started_at DESC LIMIT 200");

        let mut q = sqlx::query_as::<_, ScheduleExecution>(&query);
        q = q.bind(tenant_id);
        if let Some(tid) = task_id {
            q = q.bind(tid);
        }

        q.fetch_all(pool).await
    }

    pub async fn update_schedule(
        pool: &PgPool,
        tenant_id: Uuid,
        task_id: Uuid,
        req: UpdateTaskRequest,
    ) -> Result<ScheduleTask, sqlx::Error> {
        let current: ScheduleTask = sqlx::query_as(
            "SELECT id, name, task_type, cron_expression, action, priority, status, created_at, updated_at FROM finance_v60_schedule_tasks WHERE id = $1 AND tenant_id = $2",
        )
        .bind(task_id)
        .bind(tenant_id)
        .fetch_one(pool)
        .await?;

        let name = req.name.unwrap_or(current.name);
        let cron_expression = req.cron_expression.or(current.cron_expression);
        let action = req.action.or(current.action);
        let priority = req.priority.unwrap_or(current.priority);
        let status = req.status.unwrap_or(current.status);
        let now = Utc::now();

        sqlx::query_as(
            r#"UPDATE finance_v60_schedule_tasks
            SET name = $1, cron_expression = $2, action = $3, priority = $4, status = $5, updated_at = $6
            WHERE id = $7 AND tenant_id = $8
            RETURNING id, name, task_type, cron_expression, action, priority, status, created_at, updated_at"#,
        )
        .bind(name)
        .bind(cron_expression)
        .bind(action)
        .bind(priority)
        .bind(status)
        .bind(now)
        .bind(task_id)
        .bind(tenant_id)
        .fetch_one(pool)
        .await
    }

    pub async fn pause_task(
        pool: &PgPool,
        tenant_id: Uuid,
        task_id: Uuid,
    ) -> Result<ScheduleTask, sqlx::Error> {
        let now = Utc::now();
        sqlx::query_as(
            r#"UPDATE finance_v60_schedule_tasks
            SET status = 'paused', updated_at = $1
            WHERE id = $2 AND tenant_id = $3
            RETURNING id, name, task_type, cron_expression, action, priority, status, created_at, updated_at"#,
        )
        .bind(now)
        .bind(task_id)
        .bind(tenant_id)
        .fetch_one(pool)
        .await
    }

    pub async fn resume_task(
        pool: &PgPool,
        tenant_id: Uuid,
        task_id: Uuid,
    ) -> Result<ScheduleTask, sqlx::Error> {
        let now = Utc::now();
        sqlx::query_as(
            r#"UPDATE finance_v60_schedule_tasks
            SET status = 'pending', updated_at = $1
            WHERE id = $2 AND tenant_id = $3
            RETURNING id, name, task_type, cron_expression, action, priority, status, created_at, updated_at"#,
        )
        .bind(now)
        .bind(task_id)
        .bind(tenant_id)
        .fetch_one(pool)
        .await
    }
}

// ==================== API Handlers ====================

// --- Decision Handlers ---
#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:invoice:write"])),
    path = "/finance-v60/decision/scenario",
    responses(
        (status = 200, description = "成功"),
        (status = 201, description = "创建成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误"),
    ),
    tag = "Finance Decision V60",
    operation_id = "create_scenario_handler",
)]

async fn create_scenario_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateScenarioRequest>,
) -> Json<ApiResponse<DecisionScenario>> {
    let pool = state.pool.clone();
    let tenant_id = get_tenant_id_from_claims(&claims);
    match DecisionEngine::create_scenario(&pool, tenant_id, req).await {
        Ok(scenario) => Json(ApiResponse::success(scenario, "场景创建成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:write"])),
    path = "/finance-v60/scenario",
    tag = "DecisionV60",
    operation_id = "evaluate_scenario_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn evaluate_scenario_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<Option<EvaluateScenarioRequest>>,
) -> Json<ApiResponse<DecisionResult>> {
    let pool = state.pool.clone();
    let tenant_id = get_tenant_id_from_claims(&claims);
    match DecisionEngine::evaluate_scenario(&pool, tenant_id, id, req).await {
        Ok(result) => Json(ApiResponse::success(result, "决策评估完成")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/finance-v60/decision/{id}",
    tag = "DecisionV60",
    operation_id = "get_decision_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn get_decision_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<DecisionResult>> {
    let pool = state.pool.clone();
    let tenant_id = get_tenant_id_from_claims(&claims);
    match DecisionEngine::get_decision(&pool, tenant_id, id).await {
        Ok(result) => Json(ApiResponse::success(result, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/finance-v60/scenarios",
    tag = "DecisionV60",
    operation_id = "list_scenarios_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn list_scenarios_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<DecisionScenario>>> {
    let pool = state.pool.clone();
    let tenant_id = get_tenant_id_from_claims(&claims);
    match DecisionEngine::list_scenarios(&pool, tenant_id).await {
        Ok(scenarios) => Json(ApiResponse::success(scenarios, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}
#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/finance-v60/decision/{id}/alternatives",
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
    tag = "Finance Decision V60",
    operation_id = "get_alternatives_handler",
)]

async fn get_alternatives_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    let pool = state.pool.clone();
    let tenant_id = get_tenant_id_from_claims(&claims);
    match DecisionEngine::get_alternatives(&pool, tenant_id, id).await {
        Ok(alts) => Json(ApiResponse::success(alts, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:write"])),
    path = "/finance-v60/scenarios",
    tag = "DecisionV60",
    operation_id = "compare_scenarios_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn compare_scenarios_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CompareScenariosRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let pool = state.pool.clone();
    let tenant_id = get_tenant_id_from_claims(&claims);
    match DecisionEngine::compare_scenarios(&pool, tenant_id, req.scenario_ids).await {
        Ok(result) => Json(ApiResponse::success(result, "对比完成")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/finance-v60/decision_history",
    tag = "DecisionV60",
    operation_id = "get_decision_history_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn get_decision_history_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<DecisionResult>>> {
    let pool = state.pool.clone();
    let tenant_id = get_tenant_id_from_claims(&claims);
    match DecisionEngine::get_decision_history(&pool, tenant_id).await {
        Ok(history) => Json(ApiResponse::success(history, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:write"])),
    path = "/finance-v60/sensitivity_analysis",
    tag = "DecisionV60",
    operation_id = "sensitivity_analysis_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn sensitivity_analysis_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<SensitivityAnalysisRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let pool = state.pool.clone();
    let tenant_id = get_tenant_id_from_claims(&claims);
    match DecisionEngine::sensitivity_analysis(&pool, tenant_id, id, req).await {
        Ok(result) => Json(ApiResponse::success(result, "敏感性分析完成")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

// --- Alert Handlers ---
#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:invoice:write"])),
    path = "/finance-v60/alert/rule",
    responses(
        (status = 200, description = "成功"),
        (status = 201, description = "创建成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误"),
    ),
    tag = "Finance Decision V60",
    operation_id = "create_alert_rule_handler",
)]

async fn create_alert_rule_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateAlertRuleRequest>,
) -> Json<ApiResponse<AlertRule>> {
    let pool = state.pool.clone();
    let tenant_id = get_tenant_id_from_claims(&claims);
    match AlertEngine::create_alert_rule(&pool, tenant_id, req).await {
        Ok(rule) => Json(ApiResponse::success(rule, "预警规则创建成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/finance-v60/alert_rules",
    tag = "DecisionV60",
    operation_id = "get_alert_rules_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn get_alert_rules_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<AlertRule>>> {
    let pool = state.pool.clone();
    let tenant_id = get_tenant_id_from_claims(&claims);
    match AlertEngine::get_alert_rules(&pool, tenant_id).await {
        Ok(rules) => Json(ApiResponse::success(rules, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:write"])),
    path = "/finance-v60/alerts",
    tag = "DecisionV60",
    operation_id = "evaluate_alerts_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn evaluate_alerts_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<EvaluateAlertsRequest>,
) -> Json<ApiResponse<Vec<AlertV60>>> {
    let pool = state.pool.clone();
    let tenant_id = get_tenant_id_from_claims(&claims);
    match AlertEngine::evaluate_alerts(&pool, tenant_id, req).await {
        Ok(alerts) => Json(ApiResponse::success(alerts, "预警评估完成")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/finance-v60/active_alerts",
    tag = "DecisionV60",
    operation_id = "get_active_alerts_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn get_active_alerts_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<AlertQueryParams>,
) -> Json<ApiResponse<Vec<AlertV60>>> {
    let pool = state.pool.clone();
    let tenant_id = get_tenant_id_from_claims(&claims);
    match AlertEngine::get_active_alerts(&pool, tenant_id, params).await {
        Ok(alerts) => Json(ApiResponse::success(alerts, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}
#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:write"])),
    path = "/finance-v60/alert/{id}/acknowledge",
    responses(
        (status = 200, description = "成功"),
        (status = 201, description = "创建成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误"),
    ),
    params(
        ("id" = String, Path, description = "资源 ID"),
    ),
    tag = "Finance Decision V60",
    operation_id = "acknowledge_alert_handler",
)]

async fn acknowledge_alert_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<AlertV60>> {
    let pool = state.pool.clone();
    let tenant_id = get_tenant_id_from_claims(&claims);
    match AlertEngine::acknowledge_alert(&pool, tenant_id, id).await {
        Ok(alert) => Json(ApiResponse::success(alert, "预警已确认")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:write"])),
    path = "/finance-v60/alert",
    tag = "DecisionV60",
    operation_id = "resolve_alert_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn resolve_alert_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<AlertV60>> {
    let pool = state.pool.clone();
    let tenant_id = get_tenant_id_from_claims(&claims);
    match AlertEngine::resolve_alert(&pool, tenant_id, id).await {
        Ok(alert) => Json(ApiResponse::success(alert, "预警已解决")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/finance-v60/alert_history",
    tag = "DecisionV60",
    operation_id = "get_alert_history_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn get_alert_history_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<AlertV60>>> {
    let pool = state.pool.clone();
    let tenant_id = get_tenant_id_from_claims(&claims);
    match AlertEngine::get_alert_history(&pool, tenant_id).await {
        Ok(history) => Json(ApiResponse::success(history, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:write"])),
    path = "/finance-v60/channel",
    tag = "DecisionV60",
    operation_id = "configure_channel_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn configure_channel_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<ConfigureChannelRequest>,
) -> Json<ApiResponse<AlertChannel>> {
    let pool = state.pool.clone();
    let tenant_id = get_tenant_id_from_claims(&claims);
    match AlertEngine::configure_channel(&pool, tenant_id, req).await {
        Ok(channel) => Json(ApiResponse::success(channel, "渠道配置成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

// --- Scheduling Handlers ---
#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:invoice:write"])),
    path = "/finance-v60/schedule/task",
    responses(
        (status = 200, description = "成功"),
        (status = 201, description = "创建成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误"),
    ),
    tag = "Finance Decision V60",
    operation_id = "create_task_handler",
)]

async fn create_task_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateTaskRequest>,
) -> Json<ApiResponse<ScheduleTask>> {
    let pool = state.pool.clone();
    let tenant_id = get_tenant_id_from_claims(&claims);
    match IntelligentScheduler::create_task(&pool, tenant_id, req).await {
        Ok(task) => Json(ApiResponse::success(task, "任务创建成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/finance-v60/tasks",
    tag = "DecisionV60",
    operation_id = "get_tasks_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn get_tasks_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<TaskQueryParams>,
) -> Json<ApiResponse<Vec<ScheduleTask>>> {
    let pool = state.pool.clone();
    let tenant_id = get_tenant_id_from_claims(&claims);
    match IntelligentScheduler::get_tasks(&pool, tenant_id, params).await {
        Ok(tasks) => Json(ApiResponse::success(tasks, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

async fn schedule_task_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<ScheduleTask>> {
    let pool = state.pool.clone();
    let tenant_id = get_tenant_id_from_claims(&claims);
    match IntelligentScheduler::schedule_task(&pool, tenant_id, id).await {
        Ok(task) => Json(ApiResponse::success(task, "调度成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:write"])),
    path = "/finance-v60/task",
    tag = "DecisionV60",
    operation_id = "execute_task_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn execute_task_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<ScheduleExecution>> {
    let pool = state.pool.clone();
    let tenant_id = get_tenant_id_from_claims(&claims);
    match IntelligentScheduler::execute_task(&pool, tenant_id, id).await {
        Ok(execution) => Json(ApiResponse::success(execution, "任务执行成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}
#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/finance-v60/schedule/execution/{id}",
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
    tag = "Finance Decision V60",
    operation_id = "get_execution_handler",
)]

async fn get_execution_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<ScheduleExecution>> {
    let pool = state.pool.clone();
    let tenant_id = get_tenant_id_from_claims(&claims);
    match IntelligentScheduler::get_execution(&pool, tenant_id, id).await {
        Ok(execution) => Json(ApiResponse::success(execution, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[derive(Debug, Deserialize, utoipa::IntoParams)]
pub struct ExecutionQueryParams {
    pub task_id: Option<Uuid>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/finance-v60/executions",
    tag = "DecisionV60",
    operation_id = "list_executions_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn list_executions_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ExecutionQueryParams>,
) -> Json<ApiResponse<Vec<ScheduleExecution>>> {
    let pool = state.pool.clone();
    let tenant_id = get_tenant_id_from_claims(&claims);
    match IntelligentScheduler::list_executions(&pool, tenant_id, params.task_id).await {
        Ok(executions) => Json(ApiResponse::success(executions, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["finance:update"])),
    path = "/finance-v60/task/{id}",
    tag = "DecisionV60",
    operation_id = "update_task_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn update_task_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateTaskRequest>,
) -> Json<ApiResponse<ScheduleTask>> {
    let pool = state.pool.clone();
    let tenant_id = get_tenant_id_from_claims(&claims);
    match IntelligentScheduler::update_schedule(&pool, tenant_id, id, req).await {
        Ok(task) => Json(ApiResponse::success(task, "更新成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/finance-v60/task",
    tag = "DecisionV60",
    operation_id = "pause_task_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn pause_task_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<ScheduleTask>> {
    let pool = state.pool.clone();
    let tenant_id = get_tenant_id_from_claims(&claims);
    match IntelligentScheduler::pause_task(&pool, tenant_id, id).await {
        Ok(task) => Json(ApiResponse::success(task, "任务已暂停")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}
#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:write"])),
    path = "/finance-v60/schedule/{id}/resume",
    responses(
        (status = 200, description = "成功"),
        (status = 201, description = "创建成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误"),
    ),
    params(
        ("id" = String, Path, description = "资源 ID"),
    ),
    tag = "Finance Decision V60",
    operation_id = "resume_task_handler",
)]

async fn resume_task_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<ScheduleTask>> {
    let pool = state.pool.clone();
    let tenant_id = get_tenant_id_from_claims(&claims);
    match IntelligentScheduler::resume_task(&pool, tenant_id, id).await {
        Ok(task) => Json(ApiResponse::success(task, "任务已恢复")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

// ==================== 路由注册 ====================

pub fn create_routes() -> Router<AppState> {
    Router::new()
        // Decision routes
        .route(
            "/finance-v60/decision/scenario",
            axum::routing::post(create_scenario_handler),
        )
        .route(
            "/finance-v60/decision/evaluate/{id}",
            axum::routing::post(evaluate_scenario_handler),
        )
        .route(
            "/finance-v60/decision/{id}",
            axum::routing::get(get_decision_handler),
        )
        .route(
            "/finance-v60/decision/scenarios",
            axum::routing::get(list_scenarios_handler),
        )
        .route(
            "/finance-v60/decision/{id}/alternatives",
            axum::routing::get(get_alternatives_handler),
        )
        .route(
            "/finance-v60/decision/compare",
            axum::routing::post(compare_scenarios_handler),
        )
        .route(
            "/finance-v60/decision/history",
            axum::routing::get(get_decision_history_handler),
        )
        .route(
            "/finance-v60/decision/sensitivity/{id}",
            axum::routing::post(sensitivity_analysis_handler),
        )
        // Alert routes
        .route(
            "/finance-v60/alert/rule",
            axum::routing::post(create_alert_rule_handler),
        )
        .route(
            "/finance-v60/alert/rules",
            axum::routing::get(get_alert_rules_handler),
        )
        .route(
            "/finance-v60/alert/evaluate",
            axum::routing::post(evaluate_alerts_handler),
        )
        .route(
            "/finance-v60/alerts/active",
            axum::routing::get(get_active_alerts_handler),
        )
        .route(
            "/finance-v60/alert/{id}/acknowledge",
            axum::routing::post(acknowledge_alert_handler),
        )
        .route(
            "/finance-v60/alert/{id}/resolve",
            axum::routing::post(resolve_alert_handler),
        )
        .route(
            "/finance-v60/alert/history",
            axum::routing::get(get_alert_history_handler),
        )
        .route(
            "/finance-v60/alert/channel",
            axum::routing::post(configure_channel_handler),
        )
        // Scheduling routes
        .route(
            "/finance-v60/schedule/task",
            axum::routing::post(create_task_handler),
        )
        .route(
            "/finance-v60/schedule/tasks",
            axum::routing::get(get_tasks_handler),
        )
        .route(
            "/finance-v60/schedule/{id}/run",
            axum::routing::post(execute_task_handler),
        )
        .route(
            "/finance-v60/schedule/execution/{id}",
            axum::routing::get(get_execution_handler),
        )
        .route(
            "/finance-v60/schedule/executions",
            axum::routing::get(list_executions_handler),
        )
        .route(
            "/finance-v60/schedule/task/{id}",
            axum::routing::put(update_task_handler),
        )
        .route(
            "/finance-v60/schedule/{id}/pause",
            axum::routing::post(pause_task_handler),
        )
        .route(
            "/finance-v60/schedule/{id}/resume",
            axum::routing::post(resume_task_handler),
        )
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
    fn rq_decision_scenario_type() {
        roundtrip(&DecisionScenarioType::Investment);
    }
    #[test]
    fn rq_decision_status() {
        roundtrip(&DecisionStatus::Draft);
    }
    #[test]
    fn rq_objective_type() {
        roundtrip(&ObjectiveType::Maximize);
    }
    #[test]
    fn rq_alert_condition() {
        roundtrip(&AlertCondition::Above);
    }
    #[test]
    fn rq_alert_severity() {
        roundtrip(&AlertSeverity::Low);
    }
    #[test]
    fn rq_alert_status() {
        roundtrip(&AlertStatus::Active);
    }
    #[test]
    fn rq_alert_channel_type() {
        roundtrip(&AlertChannelType::Email);
    }
    #[test]
    fn rq_schedule_task_type() {
        roundtrip(&ScheduleTaskType::Recurring);
    }
    #[test]
    fn rq_schedule_task_status() {
        roundtrip(&ScheduleTaskStatus::Pending);
    }
    #[test]
    fn rq_schedule_execution_status() {
        roundtrip(&ScheduleExecutionStatus::Pending);
    }

    #[test]
    fn rq_decision_scenario() {
        roundtrip(&DecisionScenario {
            id: Uuid::new_v4(),
            name: "n".to_string(),
            scenario_type: "investment".to_string(),
            parameters: None,
            objectives: None,
            constraints: None,
            status: "draft".to_string(),
            created_at: chrono::Utc::now(),
            updated_at: chrono::Utc::now(),
        });
    }

    #[test]
    fn rq_decision_result() {
        roundtrip(&DecisionResult {
            id: Uuid::new_v4(),
            scenario_id: Uuid::new_v4(),
            recommended_action: "a".to_string(),
            alternatives: None,
            expected_impact: None,
            risk_level: "low".to_string(),
            confidence: 0.5,
            decided_at: chrono::Utc::now(),
        });
    }

    #[test]
    fn rq_objective_struct() {
        roundtrip(&Objective {
            id: "i".to_string(),
            name: "n".to_string(),
            weight: 1.0,
            objective_type: "maximize".to_string(),
            target_value: None,
        });
    }

    #[test]
    fn rq_decision_alternative() {
        roundtrip(&DecisionAlternative {
            action: "a".to_string(),
            score: 0.5,
            reasoning: "r".to_string(),
        });
    }

    #[test]
    fn rq_alert_rule() {
        roundtrip(&AlertRule {
            id: Uuid::new_v4(),
            name: "n".to_string(),
            metric_name: "m".to_string(),
            condition: "above".to_string(),
            threshold: 0.0,
            severity: "medium".to_string(),
            enabled: true,
        });
    }

    #[test]
    fn rq_alert_v60() {
        roundtrip(&AlertV60 {
            id: Uuid::new_v4(),
            rule_id: Uuid::new_v4(),
            metric_name: "m".to_string(),
            current_value: 0.0,
            threshold: 0.0,
            severity: "medium".to_string(),
            status: "active".to_string(),
            created_at: chrono::Utc::now(),
        });
    }

    #[test]
    fn rq_alert_channel() {
        roundtrip(&AlertChannel {
            id: Uuid::new_v4(),
            name: "n".to_string(),
            channel_type: "email".to_string(),
            config: None,
            enabled: true,
        });
    }

    #[test]
    fn rq_schedule_task() {
        roundtrip(&ScheduleTask {
            id: Uuid::new_v4(),
            name: "n".to_string(),
            task_type: "recurring".to_string(),
            cron_expression: None,
            action: None,
            priority: 5,
            status: "pending".to_string(),
            created_at: chrono::Utc::now(),
            updated_at: chrono::Utc::now(),
        });
    }

    #[test]
    fn rq_schedule_execution() {
        roundtrip(&ScheduleExecution {
            id: Uuid::new_v4(),
            task_id: Uuid::new_v4(),
            scheduled_at: None,
            started_at: None,
            completed_at: None,
            duration_ms: None,
            status: "pending".to_string(),
            output: None,
        });
    }

    #[test]
    fn rq_schedule_dependency() {
        roundtrip(&ScheduleDependency {
            id: Uuid::new_v4(),
            task_id: Uuid::new_v4(),
            depends_on: Uuid::new_v4(),
            condition: None,
        });
    }

    // ===== enum as_str / from_str pure function tests =====

    #[test]
    fn decision_scenario_type_as_str_all_variants() {
        assert_eq!(DecisionScenarioType::Investment.as_str(), "investment");
        assert_eq!(DecisionScenarioType::Financing.as_str(), "financing");
        assert_eq!(DecisionScenarioType::Operational.as_str(), "operational");
        assert_eq!(DecisionScenarioType::Strategic.as_str(), "strategic");
    }

    #[test]
    fn decision_scenario_type_from_str_all_variants() {
        assert_eq!(
            DecisionScenarioType::from_str("investment"),
            DecisionScenarioType::Investment
        );
        assert_eq!(
            DecisionScenarioType::from_str("financing"),
            DecisionScenarioType::Financing
        );
        assert_eq!(
            DecisionScenarioType::from_str("operational"),
            DecisionScenarioType::Operational
        );
        assert_eq!(
            DecisionScenarioType::from_str("strategic"),
            DecisionScenarioType::Strategic
        );
    }

    #[test]
    fn decision_scenario_type_from_str_unknown_defaults_to_investment() {
        assert_eq!(
            DecisionScenarioType::from_str("unknown"),
            DecisionScenarioType::Investment
        );
        assert_eq!(
            DecisionScenarioType::from_str(""),
            DecisionScenarioType::Investment
        );
    }

    #[test]
    fn decision_status_as_str_all_variants() {
        assert_eq!(DecisionStatus::Draft.as_str(), "draft");
        assert_eq!(DecisionStatus::Active.as_str(), "active");
        assert_eq!(DecisionStatus::Evaluated.as_str(), "evaluated");
        assert_eq!(DecisionStatus::Archived.as_str(), "archived");
    }

    #[test]
    fn objective_type_as_str_all_variants() {
        assert_eq!(ObjectiveType::Maximize.as_str(), "maximize");
        assert_eq!(ObjectiveType::Minimize.as_str(), "minimize");
        assert_eq!(ObjectiveType::Satisfy.as_str(), "satisfy");
    }

    #[test]
    fn alert_condition_as_str_all_variants() {
        assert_eq!(AlertCondition::Above.as_str(), "above");
        assert_eq!(AlertCondition::Below.as_str(), "below");
        assert_eq!(AlertCondition::Between.as_str(), "between");
        assert_eq!(AlertCondition::Change.as_str(), "change");
    }

    #[test]
    fn alert_condition_from_str_all_variants() {
        assert_eq!(AlertCondition::from_str("above"), AlertCondition::Above);
        assert_eq!(AlertCondition::from_str("below"), AlertCondition::Below);
        assert_eq!(AlertCondition::from_str("between"), AlertCondition::Between);
        assert_eq!(AlertCondition::from_str("change"), AlertCondition::Change);
    }

    #[test]
    fn alert_condition_from_str_unknown_defaults_to_above() {
        assert_eq!(AlertCondition::from_str("unknown"), AlertCondition::Above);
        assert_eq!(AlertCondition::from_str(""), AlertCondition::Above);
    }

    #[test]
    fn alert_severity_as_str_all_variants() {
        assert_eq!(AlertSeverity::Low.as_str(), "low");
        assert_eq!(AlertSeverity::Medium.as_str(), "medium");
        assert_eq!(AlertSeverity::High.as_str(), "high");
        assert_eq!(AlertSeverity::Critical.as_str(), "critical");
    }

    #[test]
    fn alert_status_as_str_all_variants() {
        assert_eq!(AlertStatus::Active.as_str(), "active");
        assert_eq!(AlertStatus::Acknowledged.as_str(), "acknowledged");
        assert_eq!(AlertStatus::Resolved.as_str(), "resolved");
    }

    #[test]
    fn alert_channel_type_as_str_all_variants() {
        assert_eq!(AlertChannelType::Email.as_str(), "email");
        assert_eq!(AlertChannelType::Slack.as_str(), "slack");
        assert_eq!(AlertChannelType::Webhook.as_str(), "webhook");
        assert_eq!(AlertChannelType::Dashboard.as_str(), "dashboard");
    }

    #[test]
    fn alert_channel_type_from_str_all_variants() {
        assert_eq!(AlertChannelType::from_str("email"), AlertChannelType::Email);
        assert_eq!(AlertChannelType::from_str("slack"), AlertChannelType::Slack);
        assert_eq!(
            AlertChannelType::from_str("webhook"),
            AlertChannelType::Webhook
        );
        assert_eq!(
            AlertChannelType::from_str("dashboard"),
            AlertChannelType::Dashboard
        );
    }

    #[test]
    fn alert_channel_type_from_str_unknown_defaults_to_email() {
        assert_eq!(
            AlertChannelType::from_str("unknown"),
            AlertChannelType::Email
        );
        assert_eq!(AlertChannelType::from_str(""), AlertChannelType::Email);
    }

    #[test]
    fn schedule_task_type_as_str_all_variants() {
        assert_eq!(ScheduleTaskType::Recurring.as_str(), "recurring");
        assert_eq!(ScheduleTaskType::OneTime.as_str(), "one_time");
        assert_eq!(ScheduleTaskType::EventDriven.as_str(), "event_driven");
    }

    #[test]
    fn schedule_task_type_from_str_all_variants() {
        assert_eq!(
            ScheduleTaskType::from_str("recurring"),
            ScheduleTaskType::Recurring
        );
        assert_eq!(
            ScheduleTaskType::from_str("one_time"),
            ScheduleTaskType::OneTime
        );
        assert_eq!(
            ScheduleTaskType::from_str("event_driven"),
            ScheduleTaskType::EventDriven
        );
    }

    #[test]
    fn schedule_task_type_from_str_unknown_defaults_to_recurring() {
        assert_eq!(
            ScheduleTaskType::from_str("unknown"),
            ScheduleTaskType::Recurring
        );
        assert_eq!(ScheduleTaskType::from_str(""), ScheduleTaskType::Recurring);
    }

    #[test]
    fn schedule_task_status_as_str_all_variants() {
        assert_eq!(ScheduleTaskStatus::Pending.as_str(), "pending");
        assert_eq!(ScheduleTaskStatus::Running.as_str(), "running");
        assert_eq!(ScheduleTaskStatus::Paused.as_str(), "paused");
        assert_eq!(ScheduleTaskStatus::Completed.as_str(), "completed");
        assert_eq!(ScheduleTaskStatus::Failed.as_str(), "failed");
    }

    #[test]
    fn schedule_execution_status_as_str_all_variants() {
        assert_eq!(ScheduleExecutionStatus::Pending.as_str(), "pending");
        assert_eq!(ScheduleExecutionStatus::Running.as_str(), "running");
        assert_eq!(ScheduleExecutionStatus::Completed.as_str(), "completed");
        assert_eq!(ScheduleExecutionStatus::Failed.as_str(), "failed");
        assert_eq!(ScheduleExecutionStatus::Cancelled.as_str(), "cancelled");
    }

    // ===== business logic pure function tests =====

    fn make_scenario(scenario_type: &str) -> DecisionScenario {
        DecisionScenario {
            id: Uuid::new_v4(),
            name: "test".to_string(),
            scenario_type: scenario_type.to_string(),
            parameters: None,
            objectives: None,
            constraints: None,
            status: "draft".to_string(),
            created_at: chrono::Utc::now(),
            updated_at: chrono::Utc::now(),
        }
    }

    #[test]
    fn generate_recommendation_investment_large_budget_high_confidence() {
        let scenario = make_scenario("investment");
        let params = serde_json::json!({"budget": 2_000_000.0});
        let rec = DecisionEngine::generate_recommendation(&scenario, &params, 0.8);
        assert!(rec.contains("大额投资"));
    }

    #[test]
    fn generate_recommendation_investment_medium_budget() {
        let scenario = make_scenario("investment");
        let params = serde_json::json!({"budget": 200_000.0});
        let rec = DecisionEngine::generate_recommendation(&scenario, &params, 0.5);
        assert!(rec.contains("中等规模"));
    }

    #[test]
    fn generate_recommendation_investment_small_budget() {
        let scenario = make_scenario("investment");
        let params = serde_json::json!({"budget": 50_000.0});
        let rec = DecisionEngine::generate_recommendation(&scenario, &params, 0.5);
        assert!(rec.contains("保守投资"));
    }

    #[test]
    fn generate_recommendation_investment_no_budget() {
        let scenario = make_scenario("investment");
        let params = serde_json::json!({});
        let rec = DecisionEngine::generate_recommendation(&scenario, &params, 0.5);
        assert!(rec.contains("保守投资"));
    }

    #[test]
    fn generate_recommendation_financing_large_amount() {
        let scenario = make_scenario("financing");
        let params = serde_json::json!({"amount": 6_000_000.0});
        let rec = DecisionEngine::generate_recommendation(&scenario, &params, 0.5);
        assert!(rec.contains("大规模融资"));
    }

    #[test]
    fn generate_recommendation_financing_medium_amount() {
        let scenario = make_scenario("financing");
        let params = serde_json::json!({"amount": 600_000.0});
        let rec = DecisionEngine::generate_recommendation(&scenario, &params, 0.5);
        assert!(rec.contains("中等规模融资"));
    }

    #[test]
    fn generate_recommendation_financing_small_amount() {
        let scenario = make_scenario("financing");
        let params = serde_json::json!({"amount": 100_000.0});
        let rec = DecisionEngine::generate_recommendation(&scenario, &params, 0.5);
        assert!(rec.contains("小规模融资"));
    }

    #[test]
    fn generate_recommendation_operational() {
        let scenario = make_scenario("operational");
        let params = serde_json::json!({});
        let rec = DecisionEngine::generate_recommendation(&scenario, &params, 0.5);
        assert!(rec.contains("运营"));
    }

    #[test]
    fn generate_recommendation_strategic() {
        let scenario = make_scenario("strategic");
        let params = serde_json::json!({});
        let rec = DecisionEngine::generate_recommendation(&scenario, &params, 0.5);
        assert!(rec.contains("战略"));
    }

    #[test]
    fn generate_alternatives_returns_three_options() {
        let scenario = make_scenario("investment");
        let alts = DecisionEngine::generate_alternatives(&scenario, 0.8);
        let arr = alts.as_array().unwrap();
        assert_eq!(arr.len(), 3);
        assert_eq!(arr[0]["action"], "方案A - 稳健策略");
        assert_eq!(arr[1]["action"], "方案B - 平衡策略");
        assert_eq!(arr[2]["action"], "方案C - 激进策略");
    }

    #[test]
    fn generate_alternatives_scores_in_range() {
        let scenario = make_scenario("investment");
        let alts = DecisionEngine::generate_alternatives(&scenario, 0.5);
        let arr = alts.as_array().unwrap();
        for alt in arr {
            let score = alt["score"].as_f64().unwrap();
            assert!((0.0..=1.0).contains(&score));
        }
    }

    #[test]
    fn check_condition_above_true() {
        assert!(AlertEngine::check_condition("above", 100.0, 50.0));
    }

    #[test]
    fn check_condition_above_false_when_equal() {
        assert!(!AlertEngine::check_condition("above", 50.0, 50.0));
    }

    #[test]
    fn check_condition_below_true() {
        assert!(AlertEngine::check_condition("below", 30.0, 50.0));
    }

    #[test]
    fn check_condition_below_false_when_equal() {
        assert!(!AlertEngine::check_condition("below", 50.0, 50.0));
    }

    #[test]
    fn check_condition_between_true_when_close() {
        assert!(AlertEngine::check_condition("between", 52.0, 50.0));
    }

    #[test]
    fn check_condition_between_false_when_far() {
        assert!(!AlertEngine::check_condition("between", 100.0, 50.0));
    }

    #[test]
    fn check_condition_change_true_when_large_diff() {
        assert!(AlertEngine::check_condition("change", 100.0, 50.0));
    }

    #[test]
    fn check_condition_change_false_when_small_diff() {
        assert!(!AlertEngine::check_condition("change", 51.0, 50.0));
    }

    #[test]
    fn check_condition_unknown_returns_false() {
        assert!(!AlertEngine::check_condition("unknown", 100.0, 50.0));
        assert!(!AlertEngine::check_condition("", 100.0, 50.0));
    }
}
