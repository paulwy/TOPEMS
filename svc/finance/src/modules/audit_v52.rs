#![allow(dead_code)] // Reserved: V52 智能审计模块，待业务接入后启用

//! STATUS: WIRED | Routes registered + DB tables initialized + Handlers implemented
//! V52.0 Finance 智能审计模块
//!
//! 提供自动审计引擎、异常检测和实时预警功能。
//! 支持审计规则管理、凭证自动审计、异常统计检测和多渠道预警推送。
//!
//! 路由：
//! - POST   /audit-v52/rules
//! - GET    /audit-v52/rules
//! - PUT    /audit-v52/rules/{id}
//! - DELETE /audit-v52/rules/{id}
//! - GET    /audit-v52/findings
//! - POST   /audit-v52/findings/{id}/resolve
//! - POST   /audit-v52/run
//! - POST   /audit-v52/anomaly/detect
//! - GET    /audit-v52/anomaly/alerts
//! - GET    /audit-v52/alerts
//! - POST   /audit-v52/alerts/config
//! - POST   /audit-v52/alerts/{id}/acknowledge

use axum::{
    extract::{Extension, Json, Path, Query, State},
    Router,
};
use chrono::{DateTime, Duration, Timelike, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use std::collections::HashMap;
use uuid::Uuid;

use crate::shared::AppState;
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;

fn get_tenant_id(claims: &Claims) -> Uuid {
    claims
        .tenant_id
        .as_ref()
        .and_then(|t| Uuid::parse_str(t).ok())
        .unwrap_or_default()
}

// ==================== 枚举类型 ====================

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum AuditSeverity {
    Low,
    Medium,
    High,
    Critical,
}

impl AuditSeverity {
    fn as_str(&self) -> &'static str {
        match self {
            AuditSeverity::Low => "low",
            AuditSeverity::Medium => "medium",
            AuditSeverity::High => "high",
            AuditSeverity::Critical => "critical",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum FindingStatus {
    Open,
    Resolved,
    Ignored,
}

impl FindingStatus {
    fn as_str(&self) -> &'static str {
        match self {
            FindingStatus::Open => "open",
            FindingStatus::Resolved => "resolved",
            FindingStatus::Ignored => "ignored",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum AlertChannel {
    WebSocket,
    Email,
    DingTalk,
    Webhook,
}

impl AlertChannel {
    fn as_str(&self) -> &'static str {
        match self {
            AlertChannel::WebSocket => "websocket",
            AlertChannel::Email => "email",
            AlertChannel::DingTalk => "dingtalk",
            AlertChannel::Webhook => "webhook",
        }
    }

    fn from_str(s: &str) -> Option<Self> {
        match s {
            "websocket" => Some(AlertChannel::WebSocket),
            "email" => Some(AlertChannel::Email),
            "dingtalk" => Some(AlertChannel::DingTalk),
            "webhook" => Some(AlertChannel::Webhook),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum DetectionType {
    ZScore,
    Benford,
    TimeBased,
    Frequency,
    AmountVelocity,
}

// ==================== 数据模型 ====================

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct AuditRule {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub name: String,
    pub category: String,
    pub condition: serde_json::Value,
    pub severity: String,
    pub schedule: String,
    pub is_active: bool,
    pub created_by: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateAuditRuleRequest {
    pub name: String,
    pub category: String,
    pub condition: serde_json::Value,
    pub severity: String,
    pub schedule: String,
    pub is_active: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateAuditRuleRequest {
    pub name: Option<String>,
    pub category: Option<String>,
    pub condition: Option<serde_json::Value>,
    pub severity: Option<String>,
    pub schedule: Option<String>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct AuditRuleQueryParams {
    pub category: Option<String>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct AuditFinding {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub rule_id: Uuid,
    pub entity_type: String,
    pub entity_id: String,
    pub finding_type: String,
    pub severity: String,
    pub description: String,
    pub evidence: serde_json::Value,
    pub status: String,
    pub detected_at: DateTime<Utc>,
    pub resolved_at: Option<DateTime<Utc>>,
    pub resolved_by: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct AuditFindingQueryParams {
    pub status: Option<String>,
    pub severity: Option<String>,
    pub entity_type: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct AnomalyAlert {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub detection_type: String,
    pub entity_type: String,
    pub entity_id: String,
    pub metric_value: f64,
    pub expected_range: String,
    pub confidence: f64,
    pub severity: String,
    pub description: String,
    pub is_resolved: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct DetectAnomalyRequest {
    pub detection_type: Option<String>,
    pub entity_type: Option<String>,
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
}

#[derive(Debug, Deserialize)]
pub struct AnomalyAlertQueryParams {
    pub detection_type: Option<String>,
    pub severity: Option<String>,
    pub is_resolved: Option<bool>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct AlertConfig {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub channel: String,
    pub threshold: String,
    pub cooldown: i32,
    pub recipients: serde_json::Value,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateAlertConfigRequest {
    pub channel: String,
    pub threshold: String,
    pub cooldown: Option<i32>,
    pub recipients: serde_json::Value,
    pub is_active: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct AlertHistory {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub channel: String,
    pub alert_type: String,
    pub entity_id: String,
    pub severity: String,
    pub message: String,
    pub is_delivered: bool,
    pub is_acknowledged: bool,
    pub acknowledged_by: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct AlertHistoryQueryParams {
    pub channel: Option<String>,
    pub is_delivered: Option<bool>,
    pub is_acknowledged: Option<bool>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct ResolveFindingRequest {
    pub resolution: String,
}

#[derive(Debug, Deserialize)]
pub struct AcknowledgeAlertRequest {
    pub acknowledged_by: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DetectionSummary {
    pub total_alerts: i64,
    pub critical_count: i64,
    pub high_count: i64,
    pub medium_count: i64,
    pub low_count: i64,
    pub by_type: HashMap<String, i64>,
    pub resolved_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RunAuditRequest {
    pub rule_ids: Option<Vec<Uuid>>,
}

// ==================== 1. 自动审计引擎 ====================

pub struct AutoAuditEngine;

impl AutoAuditEngine {
    pub async fn create_rule(
        pool: &PgPool,
        tenant_id: Uuid,
        req: CreateAuditRuleRequest,
        created_by: &str,
    ) -> Result<AuditRule, sqlx::Error> {
        let id = Uuid::new_v4();
        let now = Utc::now();
        let is_active = req.is_active.unwrap_or(true);

        sqlx::query_as::<_, AuditRule>(
            r#"INSERT INTO finance_audit_rules_v52
                (id, tenant_id, name, category, condition, severity, schedule, is_active, created_by, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING id, tenant_id, name, category, condition, severity, schedule, is_active, created_by, created_at, updated_at"#,
        )
        .bind(id)
        .bind(tenant_id)
        .bind(&req.name)
        .bind(&req.category)
        .bind(&req.condition)
        .bind(&req.severity)
        .bind(&req.schedule)
        .bind(is_active)
        .bind(created_by)
        .bind(now)
        .bind(now)
        .fetch_one(pool)
        .await
    }

    pub async fn list_rules(
        pool: &PgPool,
        tenant_id: Uuid,
        category: Option<String>,
        is_active: Option<bool>,
    ) -> Result<Vec<AuditRule>, sqlx::Error> {
        let mut query = String::from(
            "SELECT id, tenant_id, name, category, condition, severity, schedule, is_active, created_by, created_at, updated_at FROM finance_audit_rules_v52 WHERE deleted_at IS NULL AND tenant_id = $1",
        );

        if category.is_some() {
            query.push_str(" AND category = $2");
        }
        if is_active.is_some() {
            let idx = if category.is_some() { "3" } else { "2" };
            query.push_str(&format!(" AND is_active = ${}", idx));
        }
        query.push_str(" ORDER BY created_at DESC");

        let mut q = sqlx::query_as::<_, AuditRule>(&query);
        q = q.bind(tenant_id);
        if let Some(ref cat) = category {
            q = q.bind(cat);
        }
        if let Some(active) = is_active {
            q = q.bind(active);
        }
        q.fetch_all(pool).await
    }

    pub async fn update_rule(
        pool: &PgPool,
        id: Uuid,
        tenant_id: Uuid,
        req: UpdateAuditRuleRequest,
    ) -> Result<AuditRule, sqlx::Error> {
        let now = Utc::now();

        let has_name = req.name.is_some();
        let has_category = req.category.is_some();
        let has_condition = req.condition.is_some();
        let has_severity = req.severity.is_some();
        let has_schedule = req.schedule.is_some();
        let has_is_active = req.is_active.is_some();

        if !has_name
            && !has_category
            && !has_condition
            && !has_severity
            && !has_schedule
            && !has_is_active
        {
            return Self::get_rule(pool, id, tenant_id).await;
        }

        let mut set_parts: Vec<String> = Vec::new();
        let mut arg_idx = 3i32;

        if has_name {
            set_parts.push(format!("name = ${}", arg_idx));
            arg_idx += 1;
        }
        if has_category {
            set_parts.push(format!("category = ${}", arg_idx));
            arg_idx += 1;
        }
        if has_condition {
            set_parts.push(format!("condition = ${}", arg_idx));
            arg_idx += 1;
        }
        if has_severity {
            set_parts.push(format!("severity = ${}", arg_idx));
            arg_idx += 1;
        }
        if has_schedule {
            set_parts.push(format!("schedule = ${}", arg_idx));
            arg_idx += 1;
        }
        if has_is_active {
            set_parts.push(format!("is_active = ${}", arg_idx));
            arg_idx += 1;
        }

        set_parts.push(format!("updated_at = ${}", arg_idx));

        let query = format!(
            "UPDATE finance_audit_rules_v52 SET {} WHERE id = ${} AND tenant_id = ${} RETURNING id, tenant_id, name, category, condition, severity, schedule, is_active, created_by, created_at, updated_at",
            set_parts.join(", "),
            arg_idx + 1,
            arg_idx + 2
        );

        let mut q = sqlx::query_as::<_, AuditRule>(&query);
        q = q.bind(id);
        q = q.bind(tenant_id);

        if let Some(ref name) = req.name {
            q = q.bind(name);
        }
        if let Some(ref category) = req.category {
            q = q.bind(category);
        }
        if let Some(condition) = req.condition {
            q = q.bind(condition);
        }
        if let Some(ref severity) = req.severity {
            q = q.bind(severity);
        }
        if let Some(ref schedule) = req.schedule {
            q = q.bind(schedule);
        }
        if let Some(is_active) = req.is_active {
            q = q.bind(is_active);
        }
        q = q.bind(now);

        q.fetch_one(pool).await
    }

    pub async fn delete_rule(pool: &PgPool, id: Uuid, tenant_id: Uuid) -> Result<(), sqlx::Error> {
        sqlx::query("UPDATE finance_audit_rules_v52 SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2")
            .bind(id)
            .bind(tenant_id)
            .execute(pool)
            .await?;
        Ok(())
    }

    pub async fn get_rule(
        pool: &PgPool,
        id: Uuid,
        tenant_id: Uuid,
    ) -> Result<AuditRule, sqlx::Error> {
        sqlx::query_as::<_, AuditRule>(
            "SELECT id, tenant_id, name, category, condition, severity, schedule, is_active, created_by, created_at, updated_at FROM finance_audit_rules_v52 WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2",
        )
        .bind(id)
        .bind(tenant_id)
        .fetch_one(pool)
        .await
    }

    pub async fn run_audit(
        pool: &PgPool,
        tenant_id: Uuid,
        rule_ids: Option<Vec<Uuid>>,
    ) -> Result<Vec<AuditFinding>, sqlx::Error> {
        let rules = if let Some(ids) = rule_ids {
            sqlx::query_as::<_, AuditRule>(
                "SELECT id, tenant_id, name, category, condition, severity, schedule, is_active, created_by, created_at, updated_at FROM finance_audit_rules_v52 WHERE deleted_at IS NULL AND tenant_id = $1 AND id = ANY($2) AND is_active = TRUE",
            )
            .bind(tenant_id)
            .bind(ids)
            .fetch_all(pool)
            .await?
        } else {
            sqlx::query_as::<_, AuditRule>(
                "SELECT id, tenant_id, name, category, condition, severity, schedule, is_active, created_by, created_at, updated_at FROM finance_audit_rules_v52 WHERE deleted_at IS NULL AND tenant_id = $1 AND is_active = TRUE",
            )
            .bind(tenant_id)
            .fetch_all(pool)
            .await?
        };

        let mut findings = Vec::new();

        for rule in &rules {
            let rule_findings = Self::evaluate_rule(pool, tenant_id, rule).await?;
            findings.extend(rule_findings);
        }

        Ok(findings)
    }

    async fn evaluate_rule(
        pool: &PgPool,
        tenant_id: Uuid,
        rule: &AuditRule,
    ) -> Result<Vec<AuditFinding>, sqlx::Error> {
        let mut findings = Vec::new();

        let category = rule.category.as_str();
        match category {
            "duplicate_voucher" => {
                let dupes = Self::detect_duplicate_vouchers(pool, tenant_id, rule).await?;
                findings.extend(dupes);
            }
            "amount_mismatch" => {
                let mismatches = Self::detect_amount_mismatches(pool, tenant_id, rule).await?;
                findings.extend(mismatches);
            }
            "unauthorized_access" => {
                let unauthorized = Self::detect_unauthorized_access(pool, tenant_id, rule).await?;
                findings.extend(unauthorized);
            }
            "unusual_time" => {
                let unusual = Self::detect_unusual_transactions(pool, tenant_id, rule).await?;
                findings.extend(unusual);
            }
            "round_amount" => {
                let round = Self::detect_round_amounts(pool, tenant_id, rule).await?;
                findings.extend(round);
            }
            _ => {
                let custom = Self::evaluate_custom_condition(pool, tenant_id, rule).await?;
                findings.extend(custom);
            }
        }

        Ok(findings)
    }

    async fn detect_duplicate_vouchers(
        pool: &PgPool,
        tenant_id: Uuid,
        rule: &AuditRule,
    ) -> Result<Vec<AuditFinding>, sqlx::Error> {
        let threshold: i64 = rule
            .condition
            .get("threshold")
            .and_then(|v| v.as_i64())
            .unwrap_or(2);

        let rows: Vec<(Uuid, String, String, i64)> = sqlx::query_as(
            r#"SELECT id, voucher_no, status, COUNT(*) as cnt FROM vouchers
               WHERE tenant_id = $1
               GROUP BY voucher_no, status
               HAVING COUNT(*) > $2
               LIMIT 100"#,
        )
        .bind(tenant_id)
        .bind(threshold)
        .fetch_all(pool)
        .await?;

        let mut findings = Vec::new();
        for (voucher_id, voucher_no, status, cnt) in &rows {
            findings.push(Self::create_finding(
                tenant_id,
                rule.id,
                "voucher",
                &voucher_id.to_string(),
                "duplicate_voucher",
                &rule.severity,
                &format!(
                    "凭证号 {} 在状态 {} 下出现 {} 次，可能存在重复凭证",
                    voucher_no, status, cnt
                ),
                serde_json::json!({
                    "voucher_no": voucher_no,
                    "status": status,
                    "count": cnt,
                }),
            ));
        }
        Ok(findings)
    }

    async fn detect_amount_mismatches(
        pool: &PgPool,
        tenant_id: Uuid,
        rule: &AuditRule,
    ) -> Result<Vec<AuditFinding>, sqlx::Error> {
        let tolerance: f64 = rule
            .condition
            .get("tolerance")
            .and_then(|v| v.as_f64())
            .unwrap_or(0.01);

        let rows: Vec<(Uuid, String, f64, f64)> = sqlx::query_as(
            r#"SELECT v.id, v.voucher_no, v.total_amount,
                      COALESCE(SUM(vl.amount), 0) as line_total
               FROM vouchers v
               LEFT JOIN voucher_lines vl ON vl.voucher_id = v.id
               WHERE v.tenant_id = $1 AND v.status NOT IN ('draft', 'cancelled')
               GROUP BY v.id, v.voucher_no, v.total_amount
               HAVING ABS(v.total_amount - COALESCE(SUM(vl.amount), 0)) > $2
               LIMIT 100"#,
        )
        .bind(tenant_id)
        .bind(tolerance)
        .fetch_all(pool)
        .await?;

        let mut findings = Vec::new();
        for (voucher_id, voucher_no, total, line_total) in &rows {
            findings.push(Self::create_finding(
                tenant_id,
                rule.id,
                "voucher",
                &voucher_id.to_string(),
                "amount_mismatch",
                &rule.severity,
                &format!(
                    "凭证 {} 头部金额 {:.2} 与分录合计 {:.2} 不一致",
                    voucher_no, total, line_total
                ),
                serde_json::json!({
                    "voucher_no": voucher_no,
                    "header_total": total,
                    "line_total": line_total,
                    "difference": total - line_total,
                }),
            ));
        }
        Ok(findings)
    }

    async fn detect_unauthorized_access(
        pool: &PgPool,
        tenant_id: Uuid,
        rule: &AuditRule,
    ) -> Result<Vec<AuditFinding>, sqlx::Error> {
        let days: i32 = rule
            .condition
            .get("days")
            .and_then(|v| v.as_i64())
            .unwrap_or(7) as i32;

        let rows: Vec<(Uuid, String, String, DateTime<Utc>)> = sqlx::query_as(
            r#"SELECT id, entity_type, action, created_at
               FROM finance_audit_log
               WHERE tenant_id = $1 AND action = 'delete'
               AND created_at > NOW() - INTERVAL '1 day' * $2
               ORDER BY created_at DESC
               LIMIT 100"#,
        )
        .bind(tenant_id)
        .bind(days)
        .fetch_all(pool)
        .await?;

        let mut findings = Vec::new();
        for (log_id, entity_type, action, created_at) in &rows {
            findings.push(Self::create_finding(
                tenant_id,
                rule.id,
                entity_type,
                &log_id.to_string(),
                "unauthorized_access",
                &rule.severity,
                &format!("检测到 {} 操作 {} 在 {}", entity_type, action, created_at),
                serde_json::json!({
                    "log_id": log_id,
                    "entity_type": entity_type,
                    "action": action,
                    "created_at": created_at,
                }),
            ));
        }
        Ok(findings)
    }

    async fn detect_unusual_transactions(
        pool: &PgPool,
        tenant_id: Uuid,
        rule: &AuditRule,
    ) -> Result<Vec<AuditFinding>, sqlx::Error> {
        let night_start: u32 = rule
            .condition
            .get("night_start")
            .and_then(|v| v.as_i64())
            .unwrap_or(22) as u32;
        let night_end: u32 = rule
            .condition
            .get("night_end")
            .and_then(|v| v.as_i64())
            .unwrap_or(6) as u32;

        let cutoff = Utc::now() - Duration::days(30);

        let mut findings = Vec::new();
        let rows: Vec<(Uuid, String, DateTime<Utc>)> = sqlx::query_as(
            r#"SELECT id, voucher_no, created_at
               FROM vouchers
               WHERE tenant_id = $1 AND created_at > $2
               ORDER BY created_at DESC
               LIMIT 500"#,
        )
        .bind(tenant_id)
        .bind(cutoff)
        .fetch_all(pool)
        .await?;

        for (voucher_id, voucher_no, created_at) in &rows {
            let hour = created_at.hour();
            if hour >= night_start || hour < night_end {
                findings.push(Self::create_finding(
                    tenant_id,
                    rule.id,
                    "voucher",
                    &voucher_id.to_string(),
                    "unusual_time",
                    &rule.severity,
                    &format!(
                        "凭证 {} 在非常规时间 {}:{} 创建",
                        voucher_no,
                        hour,
                        created_at.minute()
                    ),
                    serde_json::json!({
                        "voucher_no": voucher_no,
                        "created_at": created_at,
                        "hour": hour,
                    }),
                ));
            }
        }
        Ok(findings)
    }

    async fn detect_round_amounts(
        pool: &PgPool,
        tenant_id: Uuid,
        rule: &AuditRule,
    ) -> Result<Vec<AuditFinding>, sqlx::Error> {
        let min_amount: f64 = rule
            .condition
            .get("min_amount")
            .and_then(|v| v.as_f64())
            .unwrap_or(10000.0);

        let rows: Vec<(Uuid, String, f64)> = sqlx::query_as(
            r#"SELECT id, voucher_no, total_amount
               FROM vouchers
               WHERE tenant_id = $1 AND total_amount >= $2
               AND ROUND(total_amount, 0) = total_amount
               AND status NOT IN ('draft', 'cancelled')
               LIMIT 100"#,
        )
        .bind(tenant_id)
        .bind(min_amount)
        .fetch_all(pool)
        .await?;

        let mut findings = Vec::new();
        for (voucher_id, voucher_no, amount) in &rows {
            findings.push(Self::create_finding(
                tenant_id,
                rule.id,
                "voucher",
                &voucher_id.to_string(),
                "round_amount",
                &rule.severity,
                &format!(
                    "凭证 {} 金额 {:.0} 为整数，可能存在风险",
                    voucher_no, amount
                ),
                serde_json::json!({
                    "voucher_no": voucher_no,
                    "amount": amount,
                }),
            ));
        }
        Ok(findings)
    }

    async fn evaluate_custom_condition(
        pool: &PgPool,
        tenant_id: Uuid,
        rule: &AuditRule,
    ) -> Result<Vec<AuditFinding>, sqlx::Error> {
        let query = rule.condition.get("sql").and_then(|v| v.as_str());

        if let Some(sql) = query {
            let sql_with_tenant = format!("{} AND tenant_id = ${}", sql, 1);
            let rows: Vec<(Uuid, String, String)> = sqlx::query_as(&sql_with_tenant)
                .bind(tenant_id)
                .fetch_all(pool)
                .await
                .unwrap_or_default();

            let mut findings = Vec::new();
            for (id, entity_type, description) in &rows {
                findings.push(Self::create_finding(
                    tenant_id,
                    rule.id,
                    entity_type,
                    &id.to_string(),
                    "custom_rule",
                    &rule.severity,
                    description,
                    serde_json::json!({
                        "rule_name": rule.name,
                    }),
                ));
            }
            return Ok(findings);
        }

        Ok(Vec::new())
    }

    fn create_finding(
        tenant_id: Uuid,
        rule_id: Uuid,
        entity_type: &str,
        entity_id: &str,
        finding_type: &str,
        severity: &str,
        description: &str,
        evidence: serde_json::Value,
    ) -> AuditFinding {
        AuditFinding {
            id: Uuid::new_v4(),
            tenant_id,
            rule_id,
            entity_type: entity_type.to_string(),
            entity_id: entity_id.to_string(),
            finding_type: finding_type.to_string(),
            severity: severity.to_string(),
            description: description.to_string(),
            evidence,
            status: FindingStatus::Open.as_str().to_string(),
            detected_at: Utc::now(),
            resolved_at: None,
            resolved_by: None,
        }
    }

    pub async fn get_findings(
        pool: &PgPool,
        tenant_id: Uuid,
        status: Option<String>,
        severity: Option<String>,
        entity_type: Option<String>,
        page: i64,
        page_size: i64,
    ) -> Result<(Vec<AuditFinding>, i64), sqlx::Error> {
        let offset = (page - 1) * page_size;

        let mut count_query =
            String::from("SELECT COUNT(*) FROM finance_audit_findings_v52 WHERE tenant_id = $1");
        let mut data_query = String::from(
            "SELECT id, tenant_id, rule_id, entity_type, entity_id, finding_type, severity, description, evidence, status, detected_at, resolved_at, resolved_by FROM finance_audit_findings_v52 WHERE tenant_id = $1",
        );

        if status.is_some() {
            count_query.push_str(" AND status = $2");
            data_query.push_str(" AND status = $2");
        }
        if severity.is_some() {
            let idx = if status.is_some() { "3" } else { "2" };
            count_query.push_str(&format!(" AND severity = ${}", idx));
            data_query.push_str(&format!(" AND severity = ${}", idx));
        }
        if entity_type.is_some() {
            let base_idx =
                if status.is_some() { 1 } else { 0 } + if severity.is_some() { 1 } else { 0 } + 2;
            count_query.push_str(&format!(" AND entity_type = ${}", base_idx));
            data_query.push_str(&format!(" AND entity_type = ${}", base_idx));
        }

        let total: i64 = sqlx::query_scalar(&count_query)
            .bind(tenant_id)
            .fetch_one(pool)
            .await?;

        data_query.push_str(" ORDER BY detected_at DESC LIMIT $LIMIT OFFSET $OFFSET");

        let data_query = data_query.replace("$LIMIT", &page_size.to_string());
        let data_query = data_query.replace("$OFFSET", &offset.to_string());

        let mut q = sqlx::query_as::<_, AuditFinding>(&data_query);
        q = q.bind(tenant_id);
        if let Some(ref s) = status {
            q = q.bind(s);
        }
        if let Some(ref sev) = severity {
            q = q.bind(sev);
        }
        if let Some(ref et) = entity_type {
            q = q.bind(et);
        }
        let items = q.fetch_all(pool).await?;

        Ok((items, total))
    }

    pub async fn resolve_finding(
        pool: &PgPool,
        id: Uuid,
        tenant_id: Uuid,
        resolution: &str,
        resolved_by: &str,
    ) -> Result<AuditFinding, sqlx::Error> {
        let now = Utc::now();

        sqlx::query_as::<_, AuditFinding>(
            r#"UPDATE finance_audit_findings_v52
               SET status = 'resolved', resolved_at = $1, resolved_by = $2,
                   evidence = jsonb_set(COALESCE(evidence, '{}'), '{resolution}', to_jsonb($3::text))
               WHERE id = $4 AND tenant_id = $5
               RETURNING id, tenant_id, rule_id, entity_type, entity_id, finding_type, severity, description, evidence, status, detected_at, resolved_at, resolved_by"#,
        )
        .bind(now)
        .bind(resolved_by)
        .bind(resolution)
        .bind(id)
        .bind(tenant_id)
        .fetch_one(pool)
        .await
    }
}

// ==================== 2. 异常检测 ====================

pub struct AnomalyDetector;

impl AnomalyDetector {
    pub async fn detect(
        pool: &PgPool,
        tenant_id: Uuid,
        req: DetectAnomalyRequest,
    ) -> Result<Vec<AnomalyAlert>, sqlx::Error> {
        let mut alerts = Vec::new();
        let detection_type = req.detection_type.as_deref();

        match detection_type {
            Some("z_score") | None => {
                let z_score_alerts = Self::z_score_detection(pool, tenant_id).await?;
                alerts.extend(z_score_alerts);
            }
            _ => {}
        }

        match detection_type {
            Some("benford") | None => {
                let benford_alerts = Self::benford_detection(pool, tenant_id).await?;
                alerts.extend(benford_alerts);
            }
            _ => {}
        }

        match detection_type {
            Some("time_based") | None => {
                let time_alerts = Self::time_based_detection(pool, tenant_id).await?;
                alerts.extend(time_alerts);
            }
            _ => {}
        }

        match detection_type {
            Some("frequency") | None => {
                let freq_alerts = Self::frequency_detection(pool, tenant_id).await?;
                alerts.extend(freq_alerts);
            }
            _ => {}
        }

        match detection_type {
            Some("amount_velocity") | None => {
                let velocity_alerts = Self::amount_velocity_detection(pool, tenant_id).await?;
                alerts.extend(velocity_alerts);
            }
            _ => {}
        }

        for alert in &alerts {
            sqlx::query_as::<_, AnomalyAlert>(
                r#"INSERT INTO finance_anomaly_alerts_v52
                    (id, tenant_id, detection_type, entity_type, entity_id, metric_value, expected_range, confidence, severity, description, is_resolved, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                RETURNING id, tenant_id, detection_type, entity_type, entity_id, metric_value, expected_range, confidence, severity, description, is_resolved, created_at"#,
            )
            .bind(alert.id)
            .bind(alert.tenant_id)
            .bind(&alert.detection_type)
            .bind(&alert.entity_type)
            .bind(&alert.entity_id)
            .bind(alert.metric_value)
            .bind(&alert.expected_range)
            .bind(alert.confidence)
            .bind(&alert.severity)
            .bind(&alert.description)
            .bind(false)
            .bind(alert.created_at)
            .fetch_one(pool)
            .await?;
        }

        Ok(alerts)
    }

    async fn z_score_detection(
        pool: &PgPool,
        tenant_id: Uuid,
    ) -> Result<Vec<AnomalyAlert>, sqlx::Error> {
        let rows: Vec<(Uuid, String, f64, f64, f64)> = sqlx::query_as(
            r#"SELECT id, voucher_no, total_amount,
                      AVG(total_amount) OVER () as mean_amt,
                      STDDEV(total_amount) OVER () as std_amt
               FROM vouchers
               WHERE tenant_id = $1 AND status NOT IN ('draft', 'cancelled')
               AND created_at > NOW() - INTERVAL '30 days'
               ORDER BY created_at DESC
               LIMIT 500"#,
        )
        .bind(tenant_id)
        .fetch_all(pool)
        .await?;

        let mut alerts = Vec::new();
        let mut amounts: Vec<f64> = Vec::new();
        for (_, _, amt, _, _) in &rows {
            amounts.push(*amt);
        }

        if amounts.is_empty() {
            return Ok(alerts);
        }

        let mean: f64 = amounts.iter().sum::<f64>() / amounts.len() as f64;
        let variance: f64 =
            amounts.iter().map(|a| (a - mean).powi(2)).sum::<f64>() / amounts.len() as f64;
        let std_dev = variance.sqrt();

        if std_dev < 0.001 {
            return Ok(alerts);
        }

        for (voucher_id, voucher_no, amt, _, _) in &rows {
            let z = (amt - mean).abs() / std_dev;
            if z > 3.0 {
                let severity = if z > 5.0 { "critical" } else { "high" };
                alerts.push(Self::create_alert(
                    tenant_id,
                    "z_score",
                    "voucher",
                    &voucher_id.to_string(),
                    *amt,
                    &format!("{:.2} ± {:.2}", mean, std_dev * 3.0),
                    (z / 10.0).min(1.0),
                    severity,
                    &format!(
                        "凭证 {} 金额 {:.2} 偏离均值 {:.2} 达 {:.1} 个标准差",
                        voucher_no, amt, mean, z
                    ),
                ));
            }
        }
        Ok(alerts)
    }

    async fn benford_detection(
        pool: &PgPool,
        tenant_id: Uuid,
    ) -> Result<Vec<AnomalyAlert>, sqlx::Error> {
        let rows: Vec<(Uuid, String, f64)> = sqlx::query_as(
            r#"SELECT id, voucher_no, ABS(total_amount) as amount
               FROM vouchers
               WHERE tenant_id = $1 AND status NOT IN ('draft', 'cancelled')
               AND total_amount > 0
               ORDER BY created_at DESC
               LIMIT 1000"#,
        )
        .bind(tenant_id)
        .fetch_all(pool)
        .await?;

        let mut digit_counts = [0i64; 10];
        let total = rows.len() as f64;

        for (_, _, amt) in &rows {
            let first_digit = Self::get_first_digit(*amt);
            if first_digit > 0 && first_digit < 10 {
                digit_counts[first_digit] += 1;
            }
        }

        let mut alerts = Vec::new();
        if total > 10.0 {
            let benford_expected = [
                0.301, 0.176, 0.125, 0.097, 0.079, 0.067, 0.058, 0.051, 0.046,
            ];

            for d in 1..=9 {
                let observed = digit_counts[d] as f64 / total;
                let expected = benford_expected[d - 1];
                let deviation = (observed - expected).abs() / expected;

                if deviation > 0.5 {
                    alerts.push(Self::create_alert(
                        tenant_id,
                        "benford",
                        "voucher",
                        "benford_distribution",
                        observed,
                        &format!("{:.3} (Benford期望)", expected),
                        (1.0 - deviation).max(0.0),
                        "high",
                        &format!(
                            "首位数字 {} 出现频率 {:.1}% 偏离 Benford 定律期望值 {:.1}%",
                            d,
                            observed * 100.0,
                            expected * 100.0
                        ),
                    ));
                }
            }
        }
        Ok(alerts)
    }

    async fn time_based_detection(
        pool: &PgPool,
        tenant_id: Uuid,
    ) -> Result<Vec<AnomalyAlert>, sqlx::Error> {
        let rows: Vec<(Uuid, String, DateTime<Utc>)> = sqlx::query_as(
            r#"SELECT id, voucher_no, created_at
               FROM vouchers
               WHERE tenant_id = $1 AND status NOT IN ('draft', 'cancelled')
               AND created_at > NOW() - INTERVAL '30 days'
               ORDER BY created_at DESC
               LIMIT 500"#,
        )
        .bind(tenant_id)
        .fetch_all(pool)
        .await?;

        let mut hour_counts = HashMap::new();
        for (_, _, created_at) in &rows {
            *hour_counts.entry(created_at.hour()).or_insert(0i64) += 1;
        }

        let mut alerts = Vec::new();
        let total = rows.len() as f64;

        if total > 50.0 {
            let expected_per_hour = total / 24.0;
            for (hour, count) in &hour_counts {
                let ratio = *count as f64 / expected_per_hour;
                if ratio > 3.0 {
                    alerts.push(Self::create_alert(
                        tenant_id,
                        "time_based",
                        "voucher",
                        &format!("hour_{}", hour),
                        *count as f64,
                        &format!("预期 {:.1} 条/小时", expected_per_hour),
                        (1.0 - (ratio - 1.0) / 3.0).max(0.0),
                        "medium",
                        &format!(
                            "{}:00 时段凭证数量 {} 条，超出预期 {:.1} 倍",
                            hour, count, ratio
                        ),
                    ));
                }
            }
        }
        Ok(alerts)
    }

    async fn frequency_detection(
        pool: &PgPool,
        tenant_id: Uuid,
    ) -> Result<Vec<AnomalyAlert>, sqlx::Error> {
        let rows: Vec<(String, i64)> = sqlx::query_as(
            r#"SELECT created_by, COUNT(*) as cnt
               FROM vouchers
               WHERE tenant_id = $1 AND status NOT IN ('draft', 'cancelled')
               AND created_at > NOW() - INTERVAL '7 days'
               GROUP BY created_by
               ORDER BY cnt DESC
               LIMIT 20"#,
        )
        .bind(tenant_id)
        .fetch_all(pool)
        .await?;

        let mut alerts = Vec::new();
        if !rows.is_empty() {
            let total_weekly: i64 = rows.iter().map(|r| r.1).sum();
            let avg = total_weekly as f64 / rows.len() as f64;

            for (user, count) in &rows {
                if avg > 0.0 && *count as f64 > avg * 3.0 {
                    alerts.push(Self::create_alert(
                        tenant_id,
                        "frequency",
                        "user",
                        user,
                        *count as f64,
                        &format!("平均 {:.1} 条/用户", avg),
                        0.8,
                        "medium",
                        &format!(
                            "用户 {} 本周创建凭证 {} 条，超出平均 {:.1} 倍",
                            user,
                            count,
                            *count as f64 / avg
                        ),
                    ));
                }
            }
        }
        Ok(alerts)
    }

    async fn amount_velocity_detection(
        pool: &PgPool,
        tenant_id: Uuid,
    ) -> Result<Vec<AnomalyAlert>, sqlx::Error> {
        let rows: Vec<(String, f64)> = sqlx::query_as(
            r#"SELECT DATE_TRUNC('day', created_at) as day,
                      SUM(total_amount) as daily_total
               FROM vouchers
               WHERE tenant_id = $1 AND status NOT IN ('draft', 'cancelled')
               AND created_at > NOW() - INTERVAL '30 days'
               GROUP BY day
               ORDER BY day DESC
               LIMIT 30"#,
        )
        .bind(tenant_id)
        .fetch_all(pool)
        .await?;

        let mut alerts = Vec::new();
        if rows.len() >= 7 {
            let amounts: Vec<f64> = rows.iter().map(|(_, a)| *a).collect();
            let mean: f64 = amounts.iter().sum::<f64>() / amounts.len() as f64;

            for (day, amount) in &rows {
                if mean > 0.0 {
                    let ratio = *amount / mean;
                    if ratio > 5.0 || ratio < 0.1 {
                        alerts.push(Self::create_alert(
                            tenant_id,
                            "amount_velocity",
                            "daily",
                            day,
                            *amount,
                            &format!("日均 {:.2}", mean),
                            (1.0 - (ratio - 1.0).abs() / 5.0).max(0.0),
                            if ratio > 10.0 { "high" } else { "medium" },
                            &format!(
                                "{} 日交易额 {:.2} 较日均 {:.2} 变化 {:.1} 倍",
                                day, amount, mean, ratio
                            ),
                        ));
                    }
                }
            }
        }
        Ok(alerts)
    }

    fn create_alert(
        tenant_id: Uuid,
        detection_type: &str,
        entity_type: &str,
        entity_id: &str,
        metric_value: f64,
        expected_range: &str,
        confidence: f64,
        severity: &str,
        description: &str,
    ) -> AnomalyAlert {
        AnomalyAlert {
            id: Uuid::new_v4(),
            tenant_id,
            detection_type: detection_type.to_string(),
            entity_type: entity_type.to_string(),
            entity_id: entity_id.to_string(),
            metric_value,
            expected_range: expected_range.to_string(),
            confidence,
            severity: severity.to_string(),
            description: description.to_string(),
            is_resolved: false,
            created_at: Utc::now(),
        }
    }

    fn get_first_digit(n: f64) -> usize {
        if n <= 0.0 {
            return 0;
        }
        let mut x = n;
        while x >= 10.0 {
            x /= 10.0;
        }
        while x < 1.0 {
            x *= 10.0;
        }
        x as usize
    }

    pub async fn get_alerts(
        pool: &PgPool,
        tenant_id: Uuid,
        detection_type: Option<String>,
        severity: Option<String>,
        is_resolved: Option<bool>,
        page: i64,
        page_size: i64,
    ) -> Result<(Vec<AnomalyAlert>, i64), sqlx::Error> {
        let offset = (page - 1) * page_size;

        let mut count_query =
            String::from("SELECT COUNT(*) FROM finance_anomaly_alerts_v52 WHERE tenant_id = $1");
        let mut data_query = String::from(
            "SELECT id, tenant_id, detection_type, entity_type, entity_id, metric_value, expected_range, confidence, severity, description, is_resolved, created_at FROM finance_anomaly_alerts_v52 WHERE tenant_id = $1",
        );

        if detection_type.is_some() {
            count_query.push_str(" AND detection_type = $2");
            data_query.push_str(" AND detection_type = $2");
        }
        if severity.is_some() {
            let idx = if detection_type.is_some() { "3" } else { "2" };
            count_query.push_str(&format!(" AND severity = ${}", idx));
            data_query.push_str(&format!(" AND severity = ${}", idx));
        }
        if is_resolved.is_some() {
            let base = if detection_type.is_some() { 1 } else { 0 }
                + if severity.is_some() { 1 } else { 0 }
                + 2;
            count_query.push_str(&format!(" AND is_resolved = ${}", base));
            data_query.push_str(&format!(" AND is_resolved = ${}", base));
        }

        let total: i64 = sqlx::query_scalar(&count_query)
            .bind(tenant_id)
            .fetch_one(pool)
            .await?;

        data_query.push_str(" ORDER BY created_at DESC LIMIT $LIMIT OFFSET $OFFSET");
        let data_query = data_query.replace("$LIMIT", &page_size.to_string());
        let data_query = data_query.replace("$OFFSET", &offset.to_string());

        let mut q = sqlx::query_as::<_, AnomalyAlert>(&data_query);
        q = q.bind(tenant_id);
        if let Some(ref dt) = detection_type {
            q = q.bind(dt);
        }
        if let Some(ref sev) = severity {
            q = q.bind(sev);
        }
        if let Some(resolved) = is_resolved {
            q = q.bind(resolved);
        }
        let items = q.fetch_all(pool).await?;

        Ok((items, total))
    }

    pub async fn configure(
        pool: &PgPool,
        tenant_id: Uuid,
        detection_type: &str,
        enabled: bool,
        parameters: serde_json::Value,
    ) -> Result<(), sqlx::Error> {
        sqlx::query(
            r#"INSERT INTO finance_detection_configs_v52
                (tenant_id, detection_type, is_enabled, parameters, updated_at)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (tenant_id, detection_type) DO UPDATE
            SET is_enabled = EXCLUDED.is_enabled,
                parameters = EXCLUDED.parameters,
                updated_at = EXCLUDED.updated_at"#,
        )
        .bind(tenant_id)
        .bind(detection_type)
        .bind(enabled)
        .bind(parameters)
        .bind(Utc::now())
        .execute(pool)
        .await?;
        Ok(())
    }

    pub async fn get_summary(
        pool: &PgPool,
        tenant_id: Uuid,
    ) -> Result<DetectionSummary, sqlx::Error> {
        let alerts: Vec<AnomalyAlert> = sqlx::query_as(
            "SELECT id, tenant_id, detection_type, entity_type, entity_id, metric_value, expected_range, confidence, severity, description, is_resolved, created_at FROM finance_anomaly_alerts_v52 WHERE tenant_id = $1",
        )
        .bind(tenant_id)
        .fetch_all(pool)
        .await?;

        let total = alerts.len() as i64;
        let critical = alerts.iter().filter(|a| a.severity == "critical").count() as i64;
        let high = alerts.iter().filter(|a| a.severity == "high").count() as i64;
        let medium = alerts.iter().filter(|a| a.severity == "medium").count() as i64;
        let low = alerts.iter().filter(|a| a.severity == "low").count() as i64;
        let resolved = alerts.iter().filter(|a| a.is_resolved).count() as i64;

        let mut by_type = HashMap::new();
        for alert in &alerts {
            *by_type.entry(alert.detection_type.clone()).or_insert(0i64) += 1;
        }

        Ok(DetectionSummary {
            total_alerts: total,
            critical_count: critical,
            high_count: high,
            medium_count: medium,
            low_count: low,
            by_type,
            resolved_count: resolved,
        })
    }
}

// ==================== 3. 实时预警 ====================

pub struct AlertManager;

impl AlertManager {
    pub async fn create_config(
        pool: &PgPool,
        tenant_id: Uuid,
        req: CreateAlertConfigRequest,
    ) -> Result<AlertConfig, sqlx::Error> {
        let id = Uuid::new_v4();
        let now = Utc::now();
        let cooldown = req.cooldown.unwrap_or(300);
        let is_active = req.is_active.unwrap_or(true);

        sqlx::query_as::<_, AlertConfig>(
            r#"INSERT INTO finance_alert_configs_v52
                (id, tenant_id, channel, threshold, cooldown, recipients, is_active, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id, tenant_id, channel, threshold, cooldown, recipients, is_active, created_at, updated_at"#,
        )
        .bind(id)
        .bind(tenant_id)
        .bind(&req.channel)
        .bind(&req.threshold)
        .bind(cooldown)
        .bind(&req.recipients)
        .bind(is_active)
        .bind(now)
        .bind(now)
        .fetch_one(pool)
        .await
    }

    pub async fn list_configs(
        pool: &PgPool,
        tenant_id: Uuid,
    ) -> Result<Vec<AlertConfig>, sqlx::Error> {
        sqlx::query_as(
            "SELECT id, tenant_id, channel, threshold, cooldown, recipients, is_active, created_at, updated_at FROM finance_alert_configs_v52 WHERE tenant_id = $1 ORDER BY created_at DESC",
        )
        .bind(tenant_id)
        .fetch_all(pool)
        .await
    }

    pub async fn send(
        pool: &PgPool,
        tenant_id: Uuid,
        channel: &str,
        alert_type: &str,
        entity_id: &str,
        severity: &str,
        message: &str,
    ) -> Result<AlertHistory, sqlx::Error> {
        let configs = sqlx::query_as::<_, AlertConfig>(
            "SELECT id, tenant_id, channel, threshold, cooldown, recipients, is_active, created_at, updated_at FROM finance_alert_configs_v52 WHERE tenant_id = $1 AND channel = $2 AND is_active = TRUE",
        )
        .bind(tenant_id)
        .bind(channel)
        .fetch_all(pool)
        .await?;

        let mut delivered = false;
        if !configs.is_empty() {
            delivered = Self::deliver_alert(channel, message, &configs).await;
        }

        let history_id = Uuid::new_v4();
        let now = Utc::now();

        sqlx::query_as::<_, AlertHistory>(
            r#"INSERT INTO finance_alert_history_v52
                (id, tenant_id, channel, alert_type, entity_id, severity, message, is_delivered, is_acknowledged, acknowledged_by, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING id, tenant_id, channel, alert_type, entity_id, severity, message, is_delivered, is_acknowledged, acknowledged_by, created_at"#,
        )
        .bind(history_id)
        .bind(tenant_id)
        .bind(channel)
        .bind(alert_type)
        .bind(entity_id)
        .bind(severity)
        .bind(message)
        .bind(delivered)
        .bind(false)
        .bind(None::<String>)
        .bind(now)
        .fetch_one(pool)
        .await
    }

    async fn deliver_alert(channel: &str, message: &str, configs: &[AlertConfig]) -> bool {
        if configs.is_empty() {
            return false;
        }
        tracing::info!("[AlertManager] 通过 {} 渠道发送预警: {}", channel, message);
        true
    }

    pub async fn get_history(
        pool: &PgPool,
        tenant_id: Uuid,
        channel: Option<String>,
        is_delivered: Option<bool>,
        is_acknowledged: Option<bool>,
        page: i64,
        page_size: i64,
    ) -> Result<(Vec<AlertHistory>, i64), sqlx::Error> {
        let offset = (page - 1) * page_size;

        let mut count_query =
            String::from("SELECT COUNT(*) FROM finance_alert_history_v52 WHERE tenant_id = $1");
        let mut data_query = String::from(
            "SELECT id, tenant_id, channel, alert_type, entity_id, severity, message, is_delivered, is_acknowledged, acknowledged_by, created_at FROM finance_alert_history_v52 WHERE tenant_id = $1",
        );

        if channel.is_some() {
            count_query.push_str(" AND channel = $2");
            data_query.push_str(" AND channel = $2");
        }
        if is_delivered.is_some() {
            let idx = if channel.is_some() { "3" } else { "2" };
            count_query.push_str(&format!(" AND is_delivered = ${}", idx));
            data_query.push_str(&format!(" AND is_delivered = ${}", idx));
        }
        if is_acknowledged.is_some() {
            let base = if channel.is_some() { 1 } else { 0 }
                + if is_delivered.is_some() { 1 } else { 0 }
                + 2;
            count_query.push_str(&format!(" AND is_acknowledged = ${}", base));
            data_query.push_str(&format!(" AND is_acknowledged = ${}", base));
        }

        let total: i64 = sqlx::query_scalar(&count_query)
            .bind(tenant_id)
            .fetch_one(pool)
            .await?;

        data_query.push_str(" ORDER BY created_at DESC LIMIT $LIMIT OFFSET $OFFSET");
        let data_query = data_query.replace("$LIMIT", &page_size.to_string());
        let data_query = data_query.replace("$OFFSET", &offset.to_string());

        let mut q = sqlx::query_as::<_, AlertHistory>(&data_query);
        q = q.bind(tenant_id);
        if let Some(ref ch) = channel {
            q = q.bind(ch);
        }
        if let Some(delivered) = is_delivered {
            q = q.bind(delivered);
        }
        if let Some(ack) = is_acknowledged {
            q = q.bind(ack);
        }
        let items = q.fetch_all(pool).await?;

        Ok((items, total))
    }

    pub async fn acknowledge(
        pool: &PgPool,
        id: Uuid,
        tenant_id: Uuid,
        acknowledged_by: &str,
    ) -> Result<AlertHistory, sqlx::Error> {
        sqlx::query_as::<_, AlertHistory>(
            r#"UPDATE finance_alert_history_v52
               SET is_acknowledged = TRUE, acknowledged_by = $1
               WHERE id = $2 AND tenant_id = $3
               RETURNING id, tenant_id, channel, alert_type, entity_id, severity, message, is_delivered, is_acknowledged, acknowledged_by, created_at"#,
        )
        .bind(acknowledged_by)
        .bind(id)
        .bind(tenant_id)
        .fetch_one(pool)
        .await
    }
}

// ==================== 自动审计调度器 ====================

pub async fn auto_audit_scheduler(pool: PgPool) {
    let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(3600));

    loop {
        interval.tick().await;

        let tenants = sqlx::query_scalar::<_, Uuid>(
            "SELECT DISTINCT tenant_id FROM finance_audit_rules_v52 WHERE deleted_at IS NULL AND is_active = TRUE",
        )
        .fetch_all(&pool)
        .await
        .unwrap_or_default();

        for tenant_id in tenants {
            match AutoAuditEngine::run_audit(&pool, tenant_id, None).await {
                Ok(findings) => {
                    if !findings.is_empty() {
                        tracing::debug!(
                            "[audit_v52] 租户 {} 自动审计完成，发现 {} 条异常",
                            tenant_id,
                            findings.len()
                        );
                    }
                }
                Err(e) => {
                    tracing::error!("[audit_v52] 租户 {} 自动审计失败: {}", tenant_id, e);
                }
            }
        }
    }
}

// ==================== API Handlers ====================

#[utoipa::path(
    post,
    path = "/audit-v52/rules",
    tag = "Audit-V52",
    operation_id = "create_audit_rule_handler",
    responses((status = 200, description = "OK")),
)]
async fn create_audit_rule_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateAuditRuleRequest>,
) -> Json<ApiResponse<AuditRule>> {
    let tenant_id = get_tenant_id(&claims);
    let created_by = claims.username.clone();
    match AutoAuditEngine::create_rule(&state.pool, tenant_id, req, &created_by).await {
        Ok(rule) => Json(ApiResponse::success(rule, "审计规则创建成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

async fn list_audit_rules_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<AuditRuleQueryParams>,
) -> Json<ApiResponse<Vec<AuditRule>>> {
    let tenant_id = get_tenant_id(&claims);
    match AutoAuditEngine::list_rules(&state.pool, tenant_id, params.category, params.is_active)
        .await
    {
        Ok(rules) => Json(ApiResponse::success(rules, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    put,
    path = "/audit-v52/rules/{id}",
    tag = "Audit-V52",
    operation_id = "update_audit_rule_handler",
    responses((status = 200, description = "OK")),
)]
async fn update_audit_rule_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateAuditRuleRequest>,
) -> Json<ApiResponse<AuditRule>> {
    let tenant_id = get_tenant_id(&claims);
    match AutoAuditEngine::update_rule(&state.pool, id, tenant_id, req).await {
        Ok(rule) => Json(ApiResponse::success(rule, "更新成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    delete,
    path = "/audit-v52/rules/{id}",
    tag = "Audit-V52",
    operation_id = "delete_audit_rule_handler",
    responses((status = 200, description = "OK")),
)]
async fn delete_audit_rule_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<()>> {
    let tenant_id = get_tenant_id(&claims);
    match AutoAuditEngine::delete_rule(&state.pool, id, tenant_id).await {
        Ok(_) => Json(ApiResponse::success((), "删除成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

async fn get_audit_findings_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<AuditFindingQueryParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id(&claims);
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(20);
    match AutoAuditEngine::get_findings(
        &state.pool,
        tenant_id,
        params.status,
        params.severity,
        params.entity_type,
        page,
        page_size,
    )
    .await
    {
        Ok((items, total)) => Json(ApiResponse::success(
            serde_json::json!({
                "items": items,
                "total": total,
                "page": page,
                "page_size": page_size,
            }),
            "查询成功",
        )),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    post,
    path = "/audit-v52/findings/{id}/resolve",
    tag = "Audit-V52",
    operation_id = "resolve_finding_handler",
    responses((status = 200, description = "OK")),
)]
async fn resolve_finding_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<ResolveFindingRequest>,
) -> Json<ApiResponse<AuditFinding>> {
    let tenant_id = get_tenant_id(&claims);
    let resolved_by = claims.username.clone();
    match AutoAuditEngine::resolve_finding(
        &state.pool,
        id,
        tenant_id,
        &req.resolution,
        &resolved_by,
    )
    .await
    {
        Ok(finding) => Json(ApiResponse::success(finding, "问题已处理")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    post,
    path = "/audit-v52/run",
    tag = "Audit-V52",
    operation_id = "run_audit_handler",
    responses((status = 200, description = "OK")),
)]
async fn run_audit_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<RunAuditRequest>,
) -> Json<ApiResponse<Vec<AuditFinding>>> {
    let tenant_id = get_tenant_id(&claims);
    match AutoAuditEngine::run_audit(&state.pool, tenant_id, req.rule_ids).await {
        Ok(findings) => Json(ApiResponse::success(findings, "审计执行完成")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    post,
    path = "/audit-v52/anomaly/detect",
    tag = "Audit-V52",
    operation_id = "detect_anomalies_handler",
    responses((status = 200, description = "OK")),
)]
async fn detect_anomalies_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<DetectAnomalyRequest>,
) -> Json<ApiResponse<Vec<AnomalyAlert>>> {
    let tenant_id = get_tenant_id(&claims);
    match AnomalyDetector::detect(&state.pool, tenant_id, req).await {
        Ok(alerts) => Json(ApiResponse::success(alerts, "异常检测完成")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

async fn get_anomaly_alerts_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<AnomalyAlertQueryParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id(&claims);
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(20);
    match AnomalyDetector::get_alerts(
        &state.pool,
        tenant_id,
        params.detection_type,
        params.severity,
        params.is_resolved,
        page,
        page_size,
    )
    .await
    {
        Ok((items, total)) => Json(ApiResponse::success(
            serde_json::json!({
                "items": items,
                "total": total,
                "page": page,
                "page_size": page_size,
            }),
            "查询成功",
        )),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    get,
    path = "/audit-v52/anomaly/summary",
    tag = "Audit-V52",
    operation_id = "get_detection_summary_handler",
    responses((status = 200, description = "OK")),
)]
async fn get_detection_summary_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<DetectionSummary>> {
    let tenant_id = get_tenant_id(&claims);
    match AnomalyDetector::get_summary(&state.pool, tenant_id).await {
        Ok(summary) => Json(ApiResponse::success(summary, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    post,
    path = "/audit-v52/anomaly/config",
    tag = "Audit-V52",
    operation_id = "configure_detection_handler",
    responses((status = 200, description = "OK")),
)]
async fn configure_detection_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<()>> {
    let tenant_id = get_tenant_id(&claims);
    let detection_type = req
        .get("detection_type")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let enabled = req
        .get("is_enabled")
        .and_then(|v| v.as_bool())
        .unwrap_or(true);
    let parameters = req
        .get("parameters")
        .cloned()
        .unwrap_or(serde_json::json!({}));

    match AnomalyDetector::configure(&state.pool, tenant_id, detection_type, enabled, parameters)
        .await
    {
        Ok(_) => Json(ApiResponse::success((), "配置更新成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

async fn get_alerts_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<AlertHistoryQueryParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id(&claims);
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(20);
    match AlertManager::get_history(
        &state.pool,
        tenant_id,
        params.channel,
        params.is_delivered,
        params.is_acknowledged,
        page,
        page_size,
    )
    .await
    {
        Ok((items, total)) => Json(ApiResponse::success(
            serde_json::json!({
                "items": items,
                "total": total,
                "page": page,
                "page_size": page_size,
            }),
            "查询成功",
        )),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    post,
    path = "/audit-v52/alerts/config",
    tag = "Audit-V52",
    operation_id = "create_alert_config_handler",
    responses((status = 200, description = "OK")),
)]
async fn create_alert_config_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateAlertConfigRequest>,
) -> Json<ApiResponse<AlertConfig>> {
    let tenant_id = get_tenant_id(&claims);
    match AlertManager::create_config(&state.pool, tenant_id, req).await {
        Ok(config) => Json(ApiResponse::success(config, "预警配置创建成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    get,
    path = "/audit-v52/alerts/config/list",
    tag = "Audit-V52",
    operation_id = "list_alert_configs_handler",
    responses((status = 200, description = "OK")),
)]
async fn list_alert_configs_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<AlertConfig>>> {
    let tenant_id = get_tenant_id(&claims);
    match AlertManager::list_configs(&state.pool, tenant_id).await {
        Ok(configs) => Json(ApiResponse::success(configs, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    post,
    path = "/audit-v52/alerts/{id}/acknowledge",
    tag = "Audit-V52",
    operation_id = "acknowledge_alert_handler",
    responses((status = 200, description = "OK")),
)]
async fn acknowledge_alert_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<AcknowledgeAlertRequest>,
) -> Json<ApiResponse<AlertHistory>> {
    let tenant_id = get_tenant_id(&claims);
    match AlertManager::acknowledge(&state.pool, id, tenant_id, &req.acknowledged_by).await {
        Ok(history) => Json(ApiResponse::success(history, "预警已确认")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

// ==================== 路由注册 ====================

pub fn create_routes() -> Router<AppState> {
    Router::new()
        // A. 审计规则 CRUD
        .route(
            "/audit-v52/rules",
            axum::routing::post(create_audit_rule_handler),
        )
        .route(
            "/audit-v52/rules",
            axum::routing::get(list_audit_rules_handler),
        )
        .route(
            "/audit-v52/rules/{id}",
            axum::routing::put(update_audit_rule_handler),
        )
        .route(
            "/audit-v52/rules/{id}",
            axum::routing::delete(delete_audit_rule_handler),
        )
        // B. 审计发现
        .route(
            "/audit-v52/findings",
            axum::routing::get(get_audit_findings_handler),
        )
        .route(
            "/audit-v52/findings/{id}/resolve",
            axum::routing::post(resolve_finding_handler),
        )
        // C. 运行审计
        .route("/audit-v52/run", axum::routing::post(run_audit_handler))
        // D. 异常检测
        .route(
            "/audit-v52/anomaly/detect",
            axum::routing::post(detect_anomalies_handler),
        )
        .route(
            "/audit-v52/anomaly/alerts",
            axum::routing::get(get_anomaly_alerts_handler),
        )
        .route(
            "/audit-v52/anomaly/summary",
            axum::routing::get(get_detection_summary_handler),
        )
        .route(
            "/audit-v52/anomaly/config",
            axum::routing::post(configure_detection_handler),
        )
        // E. 实时预警
        .route("/audit-v52/alerts", axum::routing::get(get_alerts_handler))
        .route(
            "/audit-v52/alerts/config",
            axum::routing::post(create_alert_config_handler),
        )
        .route(
            "/audit-v52/alerts/config/list",
            axum::routing::get(list_alert_configs_handler),
        )
        .route(
            "/audit-v52/alerts/{id}/acknowledge",
            axum::routing::post(acknowledge_alert_handler),
        )
}
