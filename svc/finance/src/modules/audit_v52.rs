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
use prometheus::{register_int_counter, IntCounter};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::OnceLock;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::error::TopemsError;
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

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum FindingStatus {
    Open,
    Resolved,
    Ignored,
}

impl FindingStatus {
    pub const DB_VALUES: [&'static str; 3] = ["open", "resolved", "ignored"];
    pub const DEFAULT: Self = Self::Open;

    pub fn as_str(&self) -> &'static str {
        match self {
            FindingStatus::Open => "open",
            FindingStatus::Resolved => "resolved",
            FindingStatus::Ignored => "ignored",
        }
    }

    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw.trim() {
            "open" => Some(Self::Open),
            "resolved" => Some(Self::Resolved),
            "ignored" => Some(Self::Ignored),
            _ => None,
        }
    }

    /// open → resolved / ignored；resolved、ignored 为终态；同态幂等。
    pub fn can_transition_to(self, target: Self) -> Result<(), String> {
        if self == target {
            return Ok(());
        }
        if self == Self::Open && matches!(target, Self::Resolved | Self::Ignored) {
            return Ok(());
        }
        Err(format!(
            "审计发现状态不允许从 {} 流转到 {}",
            self.as_str(),
            target.as_str()
        ))
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

#[derive(Debug, Deserialize, utoipa::IntoParams)]
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

#[derive(Debug, Deserialize, utoipa::IntoParams)]
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

#[derive(Debug, Deserialize, utoipa::IntoParams)]
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

#[derive(Debug, Deserialize, utoipa::IntoParams)]
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

/// amount_mismatch 规则的扫描计数：用于区分「比过了没有差异」与「源表为空/没有可比数据」。
/// 后者只返回空列表会被误读为审计通过，因此单独计数并配 warn 日志。
/// 计数走 Prometheus 默认 registry，由 `/metrics` 的 `prometheus::gather()` 导出。
fn amount_mismatch_scans() -> &'static IntCounter {
    static METRIC: OnceLock<IntCounter> = OnceLock::new();
    METRIC.get_or_init(|| {
        register_int_counter!(
            "finance_audit_amount_mismatch_scans_total",
            "amount_mismatch 规则执行次数（含源表为空的空扫描）"
        )
        .expect("failed to register finance_audit_amount_mismatch_scans_total")
    })
}

fn amount_mismatch_empty_source() -> &'static IntCounter {
    static METRIC: OnceLock<IntCounter> = OnceLock::new();
    METRIC.get_or_init(|| {
        register_int_counter!(
            "finance_audit_amount_mismatch_empty_source_total",
            "amount_mismatch 规则因源表无任何可比凭证而未执行金额勾稽的次数"
        )
        .expect("failed to register finance_audit_amount_mismatch_empty_source_total")
    })
}

fn amount_mismatch_findings() -> &'static IntCounter {
    static METRIC: OnceLock<IntCounter> = OnceLock::new();
    METRIC.get_or_init(|| {
        register_int_counter!(
            "finance_audit_amount_mismatch_findings_total",
            "amount_mismatch 规则检出的差异条数"
        )
        .expect("failed to register finance_audit_amount_mismatch_findings_total")
    })
}

pub struct AutoAuditEngine;

impl AutoAuditEngine {
    pub async fn create_rule(
        db: &Db,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
        tenant_id: Uuid,
        req: CreateAuditRuleRequest,
        created_by: &str,
    ) -> Result<AuditRule, sqlx::Error> {
        let id = Uuid::new_v4();
        let now = Utc::now();
        let is_active = req.is_active.unwrap_or(true);

        let mut scope = db.scope_with(txn).await?;
        let rule = sqlx::query_as::<_, AuditRule>(
            only_own_schema_query!("finance", r#"INSERT INTO finance.finance_audit_rules_v52
                (id, tenant_id, name, category, condition, severity, schedule, is_active, created_by, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING id, tenant_id, name, category, condition, severity, schedule, is_active, created_by, created_at, updated_at"#),
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
        .fetch_one(&mut scope)
        .await?;
        scope.commit().await?;
        Ok(rule)
    }

    pub async fn list_rules(
        db: &Db,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
        _tenant_id: Option<Uuid>,
        category: Option<String>,
        is_active: Option<bool>,
    ) -> Result<Vec<AuditRule>, sqlx::Error> {
        let mut query = String::from(
            "SELECT id, tenant_id, name, category, condition, severity, schedule, is_active, created_by, created_at, updated_at FROM finance.finance_audit_rules_v52 WHERE deleted_at IS NULL",
        );

        if category.is_some() {
            query.push_str(" AND category = $1");
        }
        if is_active.is_some() {
            let idx = if category.is_some() { "2" } else { "1" };
            query.push_str(&format!(" AND is_active = ${}", idx));
        }
        query.push_str(" ORDER BY created_at DESC");

        let mut scope = db.scope_with(txn).await?;
        let mut q = sqlx::query_as::<_, AuditRule>(sqlx::AssertSqlSafe(query));
        if let Some(ref cat) = category {
            q = q.bind(cat);
        }
        if let Some(active) = is_active {
            q = q.bind(active);
        }
        let items = q.fetch_all(&mut scope).await?;
        scope.commit().await?;
        Ok(items)
    }

    pub async fn update_rule(
        db: &Db,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
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
            return Self::get_rule(db, txn, id, tenant_id).await;
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
            "UPDATE finance.finance_audit_rules_v52 SET {} WHERE id = ${} AND tenant_id = ${} RETURNING id, tenant_id, name, category, condition, severity, schedule, is_active, created_by, created_at, updated_at",
            set_parts.join(", "),
            arg_idx + 1,
            arg_idx + 2
        );

        let mut scope = db.scope_with(txn).await?;
        let mut q = sqlx::query_as::<_, AuditRule>(sqlx::AssertSqlSafe(query));
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

        let rule = q.fetch_one(&mut scope).await?;
        scope.commit().await?;
        Ok(rule)
    }

    pub async fn delete_rule(
        db: &Db,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
        id: Uuid,
        tenant_id: Uuid,
    ) -> Result<(), sqlx::Error> {
        let mut scope = db.scope_with(txn).await?;
        sqlx::query(only_own_schema_query!("finance", "UPDATE finance.finance_audit_rules_v52 SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2"))
            .bind(id)
            .bind(tenant_id)
            .execute(&mut scope)
            .await?;
        scope.commit().await?;
        Ok(())
    }

    pub async fn get_rule(
        db: &Db,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
        id: Uuid,
        tenant_id: Uuid,
    ) -> Result<AuditRule, sqlx::Error> {
        let mut scope = db.scope_with(txn).await?;
        let rule = sqlx::query_as::<_, AuditRule>(
            only_own_schema_query!("finance", "SELECT id, tenant_id, name, category, condition, severity, schedule, is_active, created_by, created_at, updated_at FROM finance.finance_audit_rules_v52 WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2"),
        )
        .bind(id)
        .bind(tenant_id)
        .fetch_one(&mut scope)
        .await?;
        scope.commit().await?;
        Ok(rule)
    }

    pub async fn run_audit(
        db: &Db,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
        tenant_id: Uuid,
        rule_ids: Option<Vec<Uuid>>,
    ) -> Result<Vec<AuditFinding>, sqlx::Error> {
        let mut scope = db.scope_with(txn).await?;
        let rules = if let Some(ids) = rule_ids {
            sqlx::query_as::<_, AuditRule>(
                only_own_schema_query!("finance", "SELECT id, tenant_id, name, category, condition, severity, schedule, is_active, created_by, created_at, updated_at FROM finance.finance_audit_rules_v52 WHERE deleted_at IS NULL AND tenant_id = $1 AND id = ANY($2) AND is_active = TRUE"),
            )
            .bind(tenant_id)
            .bind(ids)
            .fetch_all(&mut scope)
            .await?
        } else {
            sqlx::query_as::<_, AuditRule>(
                only_own_schema_query!("finance", "SELECT id, tenant_id, name, category, condition, severity, schedule, is_active, created_by, created_at, updated_at FROM finance.finance_audit_rules_v52 WHERE deleted_at IS NULL AND tenant_id = $1 AND is_active = TRUE"),
            )
            .bind(tenant_id)
            .fetch_all(&mut scope)
            .await?
        };
        scope.commit().await?;

        let mut findings = Vec::new();

        for rule in &rules {
            let rule_findings = Self::evaluate_rule(db, txn, tenant_id, rule).await?;
            findings.extend(rule_findings);
        }

        Ok(findings)
    }

    async fn evaluate_rule(
        db: &Db,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
        tenant_id: Uuid,
        rule: &AuditRule,
    ) -> Result<Vec<AuditFinding>, sqlx::Error> {
        let mut findings = Vec::new();

        let category = rule.category.as_str();
        match category {
            "duplicate_voucher" => {
                let dupes = Self::detect_duplicate_vouchers(db, txn, tenant_id, rule).await?;
                findings.extend(dupes);
            }
            "amount_mismatch" => {
                let mismatches = Self::detect_amount_mismatches(db, txn, tenant_id, rule).await?;
                findings.extend(mismatches);
            }
            "unauthorized_access" => {
                let unauthorized =
                    Self::detect_unauthorized_access(db, txn, tenant_id, rule).await?;
                findings.extend(unauthorized);
            }
            "unusual_time" => {
                let unusual = Self::detect_unusual_transactions(db, txn, tenant_id, rule).await?;
                findings.extend(unusual);
            }
            "round_amount" => {
                let round = Self::detect_round_amounts(db, txn, tenant_id, rule).await?;
                findings.extend(round);
            }
            _ => {
                let custom = Self::evaluate_custom_condition(db, txn, tenant_id, rule).await?;
                findings.extend(custom);
            }
        }

        Ok(findings)
    }

    async fn detect_duplicate_vouchers(
        db: &Db,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
        tenant_id: Uuid,
        rule: &AuditRule,
    ) -> Result<Vec<AuditFinding>, sqlx::Error> {
        let threshold: i64 = rule
            .condition
            .get("threshold")
            .and_then(|v| v.as_i64())
            .unwrap_or(2);

        let mut scope = db.scope_with(txn).await?;
        let rows: Vec<(Uuid, String, String, i64)> = sqlx::query_as(only_own_schema_query!(
            "finance",
            r#"SELECT (array_agg(id))[1] as id, voucher_no, status, COUNT(*) as cnt FROM finance.core_finance_vouchers
               WHERE tenant_id = $1
               GROUP BY voucher_no, status
               HAVING COUNT(*) > $2
               LIMIT 100"#
        ))
        .bind(tenant_id)
        .bind(threshold)
        .fetch_all(&mut scope)
        .await?;
        scope.commit().await?;

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
        db: &Db,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
        tenant_id: Uuid,
        rule: &AuditRule,
    ) -> Result<Vec<AuditFinding>, sqlx::Error> {
        let tolerance: f64 = rule
            .condition
            .get("tolerance")
            .and_then(|v| v.as_f64())
            .unwrap_or(0.01);
        let tolerance_dec = Decimal::from_f64_retain(tolerance).unwrap_or(Decimal::ZERO);

        let mut scope = db.scope_with(txn).await?;

        // 先确认源表是否有可比凭证：为 0 时「空结果」不代表勾稽通过。
        let scanned: i64 = sqlx::query_scalar(only_own_schema_query!(
            "finance",
            r#"SELECT COUNT(*)
               FROM finance.core_finance_vouchers
               WHERE tenant_id = $1 AND status NOT IN ('draft', 'cancelled')"#
        ))
        .bind(tenant_id)
        .fetch_one(&mut scope)
        .await?;

        amount_mismatch_scans().inc();
        if scanned == 0 {
            amount_mismatch_empty_source().inc();
            tracing::warn!(
                tenant_id = %tenant_id,
                rule_id = %rule.id,
                scanned,
                scans_total = amount_mismatch_scans().get(),
                empty_source_total = amount_mismatch_empty_source().get(),
                "amount_mismatch 规则没有可比凭证（源表为空），本次未执行金额勾稽，不能视为审计通过"
            );
            scope.commit().await?;
            return Ok(Vec::new());
        }

        // 借贷两侧分别与分录勾稽，另外校验分录自身借贷平衡：
        // - header_lines_debit/credit 抓「凭证头金额与分录不一致」（分录缺失、被改、串户）；
        // - line_balance 抓「分录自身借贷不平」（头部两边都错或两边都为空时也能暴露）。
        let rows: Vec<(Uuid, String, Decimal, Decimal, Decimal, Decimal)> =
            sqlx::query_as(only_own_schema_query!(
                "finance",
                r#"SELECT v.id, v.voucher_no, v.total_debit, v.total_credit,
                          COALESCE(SUM(vl.debit), 0) as line_debit,
                          COALESCE(SUM(vl.credit), 0) as line_credit
                   FROM finance.core_finance_vouchers v
                   LEFT JOIN finance.core_finance_voucher_lines vl
                          ON vl.voucher_id = v.id
                         AND vl.tenant_id = v.tenant_id
                         AND vl.deleted_at IS NULL
                   WHERE v.tenant_id = $1 AND v.status NOT IN ('draft', 'cancelled')
                   GROUP BY v.id, v.voucher_no, v.total_debit, v.total_credit
                   HAVING ABS(v.total_debit - COALESCE(SUM(vl.debit), 0)) > $2
                       OR ABS(v.total_credit - COALESCE(SUM(vl.credit), 0)) > $2
                       OR ABS(COALESCE(SUM(vl.debit), 0) - COALESCE(SUM(vl.credit), 0)) > $2
                   LIMIT 100"#
            ))
            .bind(tenant_id)
            .bind(tolerance)
            .fetch_all(&mut scope)
            .await?;
        scope.commit().await?;

        let mut findings = Vec::new();
        for (voucher_id, voucher_no, total_debit, total_credit, line_debit, line_credit) in &rows {
            let checks = [
                (
                    total_debit - line_debit,
                    format!(
                        "凭证 {} 头部借方合计 {:.2} 与分录借方合计 {:.2} 不一致",
                        voucher_no, total_debit, line_debit
                    ),
                    serde_json::json!({
                        "check": "header_lines_debit",
                        "voucher_no": voucher_no,
                        "header_total": total_debit,
                        "line_total": line_debit,
                        "difference": total_debit - line_debit,
                    }),
                ),
                (
                    total_credit - line_credit,
                    format!(
                        "凭证 {} 头部贷方合计 {:.2} 与分录贷方合计 {:.2} 不一致",
                        voucher_no, total_credit, line_credit
                    ),
                    serde_json::json!({
                        "check": "header_lines_credit",
                        "voucher_no": voucher_no,
                        "header_total": total_credit,
                        "line_total": line_credit,
                        "difference": total_credit - line_credit,
                    }),
                ),
                (
                    line_debit - line_credit,
                    format!(
                        "凭证 {} 分录借贷不平（借 {:.2} / 贷 {:.2}）",
                        voucher_no, line_debit, line_credit
                    ),
                    serde_json::json!({
                        "check": "line_balance",
                        "voucher_no": voucher_no,
                        "line_debit": line_debit,
                        "line_credit": line_credit,
                        "difference": line_debit - line_credit,
                    }),
                ),
            ];

            for (difference, description, evidence) in checks {
                if difference.abs() > tolerance_dec {
                    findings.push(Self::create_finding(
                        tenant_id,
                        rule.id,
                        "voucher",
                        &voucher_id.to_string(),
                        "amount_mismatch",
                        &rule.severity,
                        &description,
                        evidence,
                    ));
                }
            }
        }

        if !findings.is_empty() {
            amount_mismatch_findings().inc_by(u64::try_from(findings.len()).unwrap_or(0));
        }
        Ok(findings)
    }

    #[allow(clippy::as_conversions, clippy::cast_possible_truncation)]
    async fn detect_unauthorized_access(
        db: &Db,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
        tenant_id: Uuid,
        rule: &AuditRule,
    ) -> Result<Vec<AuditFinding>, sqlx::Error> {
        let days: i32 = rule
            .condition
            .get("days")
            .and_then(|v| v.as_i64())
            .unwrap_or(7) as i32;

        let mut scope = db.scope_with(txn).await?;
        let rows: Vec<(Uuid, String, String, DateTime<Utc>)> =
            sqlx::query_as(only_own_schema_query!(
                "finance",
                r#"SELECT id, entity_type, action, created_at
               FROM finance.finance_audit_log
               WHERE tenant_id = $1 AND action = 'delete'
               AND created_at > NOW() - INTERVAL '1 day' * $2
               ORDER BY created_at DESC
               LIMIT 100"#
            ))
            .bind(tenant_id)
            .bind(days)
            .fetch_all(&mut scope)
            .await?;
        scope.commit().await?;

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

    #[allow(
        clippy::as_conversions,
        clippy::cast_possible_truncation,
        clippy::cast_sign_loss
    )]
    async fn detect_unusual_transactions(
        db: &Db,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
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
        let mut scope = db.scope_with(txn).await?;
        let rows: Vec<(Uuid, String, DateTime<Utc>)> = sqlx::query_as(only_own_schema_query!(
            "finance",
            r#"SELECT id, voucher_no, created_at
               FROM finance.core_finance_vouchers
               WHERE tenant_id = $1 AND created_at > $2
               ORDER BY created_at DESC
               LIMIT 500"#
        ))
        .bind(tenant_id)
        .bind(cutoff)
        .fetch_all(&mut scope)
        .await?;
        scope.commit().await?;

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
        db: &Db,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
        tenant_id: Uuid,
        rule: &AuditRule,
    ) -> Result<Vec<AuditFinding>, sqlx::Error> {
        let min_amount: f64 = rule
            .condition
            .get("min_amount")
            .and_then(|v| v.as_f64())
            .unwrap_or(10000.0);

        let mut scope = db.scope_with(txn).await?;
        let rows: Vec<(Uuid, String, Decimal)> = sqlx::query_as(only_own_schema_query!(
            "finance",
            r#"SELECT id, voucher_no, total_amount
               FROM finance.core_finance_vouchers
               WHERE tenant_id = $1 AND total_amount >= $2
               AND ROUND(total_amount, 0) = total_amount
               AND status NOT IN ('draft', 'cancelled')
               LIMIT 100"#
        ))
        .bind(tenant_id)
        .bind(min_amount)
        .fetch_all(&mut scope)
        .await?;
        scope.commit().await?;

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
        db: &Db,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
        tenant_id: Uuid,
        rule: &AuditRule,
    ) -> Result<Vec<AuditFinding>, sqlx::Error> {
        let query = rule.condition.get("sql").and_then(|v| v.as_str());

        if let Some(sql) = query {
            let sql_with_tenant = format!("{} AND tenant_id = ${}", sql, 1);
            let mut scope = db.scope_with(txn).await?;
            let rows: Vec<(Uuid, String, String)> =
                sqlx::query_as(sqlx::AssertSqlSafe(sql_with_tenant))
                    .bind(tenant_id)
                    .fetch_all(&mut scope)
                    .await
                    .unwrap_or_default();
            let _ = scope.commit().await;

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
        db: &Db,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
        _tenant_id: Option<Uuid>,
        status: Option<String>,
        severity: Option<String>,
        entity_type: Option<String>,
        page: i64,
        page_size: i64,
    ) -> Result<(Vec<AuditFinding>, i64), sqlx::Error> {
        let offset = (page - 1) * page_size;

        let mut count_query =
            String::from("SELECT COUNT(*) FROM finance.finance_audit_findings_v52 WHERE TRUE");
        let mut data_query = String::from(
            "SELECT id, tenant_id, rule_id, entity_type, entity_id, finding_type, severity, description, evidence, status, detected_at, resolved_at, resolved_by FROM finance.finance_audit_findings_v52 WHERE TRUE",
        );

        if status.is_some() {
            count_query.push_str(" AND status = $1");
            data_query.push_str(" AND status = $1");
        }
        if severity.is_some() {
            let idx = if status.is_some() { "2" } else { "1" };
            count_query.push_str(&format!(" AND severity = ${}", idx));
            data_query.push_str(&format!(" AND severity = ${}", idx));
        }
        if entity_type.is_some() {
            let base_idx =
                if status.is_some() { 1 } else { 0 } + if severity.is_some() { 1 } else { 0 } + 1;
            count_query.push_str(&format!(" AND entity_type = ${}", base_idx));
            data_query.push_str(&format!(" AND entity_type = ${}", base_idx));
        }

        let mut scope = db.scope_with(txn).await?;
        let total: i64 = sqlx::query_scalar(sqlx::AssertSqlSafe(count_query))
            .fetch_one(&mut scope)
            .await?;

        data_query.push_str(" ORDER BY detected_at DESC LIMIT $LIMIT OFFSET $OFFSET");

        let data_query = data_query.replace("$LIMIT", &page_size.to_string());
        let data_query = data_query.replace("$OFFSET", &offset.to_string());

        let mut q = sqlx::query_as::<_, AuditFinding>(sqlx::AssertSqlSafe(data_query));
        if let Some(ref s) = status {
            q = q.bind(s);
        }
        if let Some(ref sev) = severity {
            q = q.bind(sev);
        }
        if let Some(ref et) = entity_type {
            q = q.bind(et);
        }
        let items = q.fetch_all(&mut scope).await?;
        scope.commit().await?;

        Ok((items, total))
    }

    pub async fn resolve_finding(
        db: &Db,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
        id: Uuid,
        tenant_id: Uuid,
        resolution: &str,
        resolved_by: &str,
    ) -> Result<AuditFinding, TopemsError> {
        let now = Utc::now();

        let mut scope = db.scope_with(txn).await?;
        let finding = sqlx::query_as::<_, AuditFinding>(only_own_schema_query!(
            "finance",
            r#"SELECT id, tenant_id, rule_id, entity_type, entity_id, finding_type, severity, description, evidence, status, detected_at, resolved_at, resolved_by
               FROM finance.finance_audit_findings_v52 WHERE id = $1 AND tenant_id = $2"#
        ))
        .bind(id)
        .bind(tenant_id)
        .fetch_optional(&mut scope)
        .await?
        .ok_or_else(|| TopemsError::NotFound("审计发现不存在".to_string()))?;

        let current = FindingStatus::from_db_str(&finding.status).ok_or_else(|| {
            TopemsError::ValidationFailed("审计发现当前状态不在规范集合内".to_string())
        })?;
        current
            .can_transition_to(FindingStatus::Resolved)
            .map_err(TopemsError::ValidationFailed)?;

        // 已解决：幂等返回原记录，不重复写 resolved_at / resolution
        if current == FindingStatus::Resolved {
            scope.commit().await?;
            return Ok(finding);
        }

        let resolved = sqlx::query_as::<_, AuditFinding>(only_own_schema_query!("finance", r#"UPDATE finance.finance_audit_findings_v52
               SET status = 'resolved', resolved_at = $1, resolved_by = $2,
                   evidence = jsonb_set(COALESCE(evidence, '{}')::jsonb, '{resolution}', to_jsonb($3::text))::text
               WHERE id = $4 AND tenant_id = $5 AND status = 'open'
               RETURNING id, tenant_id, rule_id, entity_type, entity_id, finding_type, severity, description, evidence, status, detected_at, resolved_at, resolved_by"#))
        .bind(now)
        .bind(resolved_by)
        .bind(resolution)
        .bind(id)
        .bind(tenant_id)
        .fetch_optional(&mut scope)
        .await?
        .ok_or_else(|| {
            TopemsError::ValidationFailed("审计发现状态已被并发修改，处理失败".to_string())
        })?;
        scope.commit().await?;
        Ok(resolved)
    }
}

// ==================== 2. 异常检测 ====================

pub struct AnomalyDetector;

impl AnomalyDetector {
    pub async fn detect(
        db: &Db,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
        tenant_id: Uuid,
        req: DetectAnomalyRequest,
    ) -> Result<Vec<AnomalyAlert>, sqlx::Error> {
        let mut alerts = Vec::new();
        let detection_type = req.detection_type.as_deref();

        match detection_type {
            Some("z_score") | None => {
                let z_score_alerts = Self::z_score_detection(db, txn, tenant_id).await?;
                alerts.extend(z_score_alerts);
            }
            _ => {}
        }

        match detection_type {
            Some("benford") | None => {
                let benford_alerts = Self::benford_detection(db, txn, tenant_id).await?;
                alerts.extend(benford_alerts);
            }
            _ => {}
        }

        match detection_type {
            Some("time_based") | None => {
                let time_alerts = Self::time_based_detection(db, txn, tenant_id).await?;
                alerts.extend(time_alerts);
            }
            _ => {}
        }

        match detection_type {
            Some("frequency") | None => {
                let freq_alerts = Self::frequency_detection(db, txn, tenant_id).await?;
                alerts.extend(freq_alerts);
            }
            _ => {}
        }

        match detection_type {
            Some("amount_velocity") | None => {
                let velocity_alerts = Self::amount_velocity_detection(db, txn, tenant_id).await?;
                alerts.extend(velocity_alerts);
            }
            _ => {}
        }

        let mut scope = db.scope_with(txn).await?;
        for alert in &alerts {
            sqlx::query_as::<_, AnomalyAlert>(
                only_own_schema_query!("finance", r#"INSERT INTO finance.finance_anomaly_alerts_v52
                    (id, tenant_id, detection_type, entity_type, entity_id, metric_value, expected_range, confidence, severity, description, is_resolved, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                RETURNING id, tenant_id, detection_type, entity_type, entity_id, metric_value, expected_range, confidence, severity, description, is_resolved, created_at"#),
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
            .fetch_one(&mut scope)
            .await?;
        }
        scope.commit().await?;

        Ok(alerts)
    }

    #[allow(clippy::as_conversions, clippy::cast_precision_loss)]
    async fn z_score_detection(
        db: &Db,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
        tenant_id: Uuid,
    ) -> Result<Vec<AnomalyAlert>, sqlx::Error> {
        let mut scope = db.scope_with(txn).await?;
        let rows: Vec<(Uuid, String, f64, f64, f64)> = sqlx::query_as(only_own_schema_query!(
            "finance",
            r#"SELECT id, voucher_no, total_amount,
                      AVG(total_amount) OVER () as mean_amt,
                      STDDEV(total_amount) OVER () as std_amt
               FROM finance.core_finance_vouchers
               WHERE tenant_id = $1 AND status NOT IN ('draft', 'cancelled')
               AND created_at > NOW() - INTERVAL '30 days'
               ORDER BY created_at DESC
               LIMIT 500"#
        ))
        .bind(tenant_id)
        .fetch_all(&mut scope)
        .await?;
        scope.commit().await?;

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

    #[allow(clippy::as_conversions, clippy::cast_precision_loss)]
    async fn benford_detection(
        db: &Db,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
        tenant_id: Uuid,
    ) -> Result<Vec<AnomalyAlert>, sqlx::Error> {
        let mut scope = db.scope_with(txn).await?;
        let rows: Vec<(Uuid, String, f64)> = sqlx::query_as(only_own_schema_query!(
            "finance",
            r#"SELECT id, voucher_no, ABS(total_amount) as amount
               FROM finance.core_finance_vouchers
               WHERE tenant_id = $1 AND status NOT IN ('draft', 'cancelled')
               AND total_amount > 0
               ORDER BY created_at DESC
               LIMIT 1000"#
        ))
        .bind(tenant_id)
        .fetch_all(&mut scope)
        .await?;
        scope.commit().await?;

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

    #[allow(clippy::as_conversions, clippy::cast_precision_loss)]
    async fn time_based_detection(
        db: &Db,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
        tenant_id: Uuid,
    ) -> Result<Vec<AnomalyAlert>, sqlx::Error> {
        let mut scope = db.scope_with(txn).await?;
        let rows: Vec<(Uuid, String, DateTime<Utc>)> = sqlx::query_as(only_own_schema_query!(
            "finance",
            r#"SELECT id, voucher_no, created_at
               FROM finance.core_finance_vouchers
               WHERE tenant_id = $1 AND status NOT IN ('draft', 'cancelled')
               AND created_at > NOW() - INTERVAL '30 days'
               ORDER BY created_at DESC
               LIMIT 500"#
        ))
        .bind(tenant_id)
        .fetch_all(&mut scope)
        .await?;
        scope.commit().await?;

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

    #[allow(clippy::as_conversions, clippy::cast_precision_loss)]
    async fn frequency_detection(
        db: &Db,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
        tenant_id: Uuid,
    ) -> Result<Vec<AnomalyAlert>, sqlx::Error> {
        let mut scope = db.scope_with(txn).await?;
        let rows: Vec<(String, i64)> = sqlx::query_as(only_own_schema_query!(
            "finance",
            r#"SELECT created_by, COUNT(*) as cnt
               FROM finance.core_finance_vouchers
               WHERE tenant_id = $1 AND status NOT IN ('draft', 'cancelled')
               AND created_at > NOW() - INTERVAL '7 days'
               GROUP BY created_by
               ORDER BY cnt DESC
               LIMIT 20"#
        ))
        .bind(tenant_id)
        .fetch_all(&mut scope)
        .await?;
        scope.commit().await?;

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

    #[allow(clippy::as_conversions, clippy::cast_precision_loss)]
    async fn amount_velocity_detection(
        db: &Db,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
        tenant_id: Uuid,
    ) -> Result<Vec<AnomalyAlert>, sqlx::Error> {
        let mut scope = db.scope_with(txn).await?;
        let rows: Vec<(String, f64)> = sqlx::query_as(only_own_schema_query!(
            "finance",
            r#"SELECT DATE_TRUNC('day', created_at) as day,
                      SUM(total_amount) as daily_total
               FROM finance.core_finance_vouchers
               WHERE tenant_id = $1 AND status NOT IN ('draft', 'cancelled')
               AND created_at > NOW() - INTERVAL '30 days'
               GROUP BY day
               ORDER BY day DESC
               LIMIT 30"#
        ))
        .bind(tenant_id)
        .fetch_all(&mut scope)
        .await?;
        scope.commit().await?;

        let mut alerts = Vec::new();
        if rows.len() >= 7 {
            let amounts: Vec<f64> = rows.iter().map(|(_, a)| *a).collect();
            let mean: f64 = amounts.iter().sum::<f64>() / amounts.len() as f64;

            for (day, amount) in &rows {
                if mean > 0.0 {
                    let ratio = *amount / mean;
                    if !(0.1..=5.0).contains(&ratio) {
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

    #[allow(
        clippy::as_conversions,
        clippy::cast_possible_truncation,
        clippy::cast_sign_loss
    )]
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
        db: &Db,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
        _tenant_id: Option<Uuid>,
        detection_type: Option<String>,
        severity: Option<String>,
        is_resolved: Option<bool>,
        page: i64,
        page_size: i64,
    ) -> Result<(Vec<AnomalyAlert>, i64), sqlx::Error> {
        let offset = (page - 1) * page_size;

        let mut count_query =
            String::from("SELECT COUNT(*) FROM finance.finance_anomaly_alerts_v52 WHERE TRUE");
        let mut data_query = String::from(
            "SELECT id, tenant_id, detection_type, entity_type, entity_id, metric_value, expected_range, confidence, severity, description, is_resolved, created_at FROM finance.finance_anomaly_alerts_v52 WHERE TRUE",
        );

        if detection_type.is_some() {
            count_query.push_str(" AND detection_type = $1");
            data_query.push_str(" AND detection_type = $1");
        }
        if severity.is_some() {
            let idx = if detection_type.is_some() { "2" } else { "1" };
            count_query.push_str(&format!(" AND severity = ${}", idx));
            data_query.push_str(&format!(" AND severity = ${}", idx));
        }
        if is_resolved.is_some() {
            let base = if detection_type.is_some() { 1 } else { 0 }
                + if severity.is_some() { 1 } else { 0 }
                + 1;
            count_query.push_str(&format!(" AND is_resolved = ${}", base));
            data_query.push_str(&format!(" AND is_resolved = ${}", base));
        }

        let mut scope = db.scope_with(txn).await?;
        let total: i64 = sqlx::query_scalar(sqlx::AssertSqlSafe(count_query))
            .fetch_one(&mut scope)
            .await?;

        data_query.push_str(" ORDER BY created_at DESC LIMIT $LIMIT OFFSET $OFFSET");
        let data_query = data_query.replace("$LIMIT", &page_size.to_string());
        let data_query = data_query.replace("$OFFSET", &offset.to_string());

        let mut q = sqlx::query_as::<_, AnomalyAlert>(sqlx::AssertSqlSafe(data_query));
        if let Some(ref dt) = detection_type {
            q = q.bind(dt);
        }
        if let Some(ref sev) = severity {
            q = q.bind(sev);
        }
        if let Some(resolved) = is_resolved {
            q = q.bind(resolved);
        }
        let items = q.fetch_all(&mut scope).await?;
        scope.commit().await?;

        Ok((items, total))
    }

    pub async fn configure(
        db: &Db,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
        tenant_id: Uuid,
        detection_type: &str,
        enabled: bool,
        parameters: serde_json::Value,
    ) -> Result<(), sqlx::Error> {
        let mut scope = db.scope_with(txn).await?;
        sqlx::query(only_own_schema_query!(
            "finance",
            r#"INSERT INTO finance.finance_detection_configs_v52
                (tenant_id, detection_type, is_enabled, parameters, updated_at)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (tenant_id, detection_type) DO UPDATE
            SET is_enabled = EXCLUDED.is_enabled,
                parameters = EXCLUDED.parameters,
                updated_at = EXCLUDED.updated_at"#
        ))
        .bind(tenant_id)
        .bind(detection_type)
        .bind(enabled)
        .bind(parameters)
        .bind(Utc::now())
        .execute(&mut scope)
        .await?;
        scope.commit().await?;
        Ok(())
    }

    #[allow(clippy::as_conversions, clippy::cast_possible_wrap)]
    pub async fn get_summary(
        db: &Db,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
        _tenant_id: Option<Uuid>,
    ) -> Result<DetectionSummary, sqlx::Error> {
        let mut scope = db.scope_with(txn).await?;
        let alerts: Vec<AnomalyAlert> = sqlx::query_as(
            only_own_schema_query!("finance", "SELECT id, tenant_id, detection_type, entity_type, entity_id, metric_value, expected_range, confidence, severity, description, is_resolved, created_at FROM finance.finance_anomaly_alerts_v52"),
        )
        .fetch_all(&mut scope)
        .await?;
        scope.commit().await?;

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
        db: &Db,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
        tenant_id: Uuid,
        req: CreateAlertConfigRequest,
    ) -> Result<AlertConfig, sqlx::Error> {
        let id = Uuid::new_v4();
        let now = Utc::now();
        let cooldown = req.cooldown.unwrap_or(300);
        let is_active = req.is_active.unwrap_or(true);

        let mut scope = db.scope_with(txn).await?;
        let config = sqlx::query_as::<_, AlertConfig>(
            only_own_schema_query!("finance", r#"INSERT INTO finance.finance_alert_configs_v52
                (id, tenant_id, channel, threshold, cooldown, recipients, is_active, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id, tenant_id, channel, threshold, cooldown, recipients, is_active, created_at, updated_at"#),
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
        .fetch_one(&mut scope)
        .await?;
        scope.commit().await?;
        Ok(config)
    }

    pub async fn list_configs(
        db: &Db,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
        _tenant_id: Option<Uuid>,
    ) -> Result<Vec<AlertConfig>, sqlx::Error> {
        let mut scope = db.scope_with(txn).await?;
        let configs = sqlx::query_as(
            only_own_schema_query!("finance", "SELECT id, tenant_id, channel, threshold, cooldown, recipients, is_active, created_at, updated_at FROM finance.finance_alert_configs_v52 ORDER BY created_at DESC"),
        )
        .fetch_all(&mut scope)
        .await?;
        scope.commit().await?;
        Ok(configs)
    }

    pub async fn send(
        db: &Db,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
        tenant_id: Uuid,
        channel: &str,
        alert_type: &str,
        entity_id: &str,
        severity: &str,
        message: &str,
    ) -> Result<AlertHistory, sqlx::Error> {
        let mut scope = db.scope_with(txn).await?;
        let configs = sqlx::query_as::<_, AlertConfig>(
            only_own_schema_query!("finance", "SELECT id, tenant_id, channel, threshold, cooldown, recipients, is_active, created_at, updated_at FROM finance.finance_alert_configs_v52 WHERE tenant_id = $1 AND channel = $2 AND is_active = TRUE"),
        )
        .bind(tenant_id)
        .bind(channel)
        .fetch_all(&mut scope)
        .await?;

        let mut delivered = false;
        if !configs.is_empty() {
            delivered = Self::deliver_alert(channel, message, &configs).await;
        }

        let history_id = Uuid::new_v4();
        let now = Utc::now();

        let history = sqlx::query_as::<_, AlertHistory>(
            only_own_schema_query!("finance", r#"INSERT INTO finance.finance_alert_history_v52
                (id, tenant_id, channel, alert_type, entity_id, severity, message, is_delivered, is_acknowledged, acknowledged_by, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING id, tenant_id, channel, alert_type, entity_id, severity, message, is_delivered, is_acknowledged, acknowledged_by, created_at"#),
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
        .fetch_one(&mut scope)
        .await?;
        scope.commit().await?;
        Ok(history)
    }

    async fn deliver_alert(channel: &str, message: &str, configs: &[AlertConfig]) -> bool {
        if configs.is_empty() {
            return false;
        }
        tracing::info!("[AlertManager] 通过 {} 渠道发送预警: {}", channel, message);
        true
    }

    pub async fn get_history(
        db: &Db,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
        _tenant_id: Option<Uuid>,
        channel: Option<String>,
        is_delivered: Option<bool>,
        is_acknowledged: Option<bool>,
        page: i64,
        page_size: i64,
    ) -> Result<(Vec<AlertHistory>, i64), sqlx::Error> {
        let offset = (page - 1) * page_size;

        let mut count_query =
            String::from("SELECT COUNT(*) FROM finance.finance_alert_history_v52 WHERE TRUE");
        let mut data_query = String::from(
            "SELECT id, tenant_id, channel, alert_type, entity_id, severity, message, is_delivered, is_acknowledged, acknowledged_by, created_at FROM finance.finance_alert_history_v52 WHERE TRUE",
        );

        if channel.is_some() {
            count_query.push_str(" AND channel = $1");
            data_query.push_str(" AND channel = $1");
        }
        if is_delivered.is_some() {
            let idx = if channel.is_some() { "2" } else { "1" };
            count_query.push_str(&format!(" AND is_delivered = ${}", idx));
            data_query.push_str(&format!(" AND is_delivered = ${}", idx));
        }
        if is_acknowledged.is_some() {
            let base = if channel.is_some() { 1 } else { 0 }
                + if is_delivered.is_some() { 1 } else { 0 }
                + 1;
            count_query.push_str(&format!(" AND is_acknowledged = ${}", base));
            data_query.push_str(&format!(" AND is_acknowledged = ${}", base));
        }

        let mut scope = db.scope_with(txn).await?;
        let total: i64 = sqlx::query_scalar(sqlx::AssertSqlSafe(count_query))
            .fetch_one(&mut scope)
            .await?;

        data_query.push_str(" ORDER BY created_at DESC LIMIT $LIMIT OFFSET $OFFSET");
        let data_query = data_query.replace("$LIMIT", &page_size.to_string());
        let data_query = data_query.replace("$OFFSET", &offset.to_string());

        let mut q = sqlx::query_as::<_, AlertHistory>(sqlx::AssertSqlSafe(data_query));
        if let Some(ref ch) = channel {
            q = q.bind(ch);
        }
        if let Some(delivered) = is_delivered {
            q = q.bind(delivered);
        }
        if let Some(ack) = is_acknowledged {
            q = q.bind(ack);
        }
        let items = q.fetch_all(&mut scope).await?;
        scope.commit().await?;

        Ok((items, total))
    }

    pub async fn acknowledge(
        db: &Db,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
        id: Uuid,
        tenant_id: Uuid,
        acknowledged_by: &str,
    ) -> Result<AlertHistory, sqlx::Error> {
        let mut scope = db.scope_with(txn).await?;
        let history = sqlx::query_as::<_, AlertHistory>(
            only_own_schema_query!("finance", r#"UPDATE finance.finance_alert_history_v52
               SET is_acknowledged = TRUE, acknowledged_by = $1
               WHERE id = $2 AND tenant_id = $3
               RETURNING id, tenant_id, channel, alert_type, entity_id, severity, message, is_delivered, is_acknowledged, acknowledged_by, created_at"#),
        )
        .bind(acknowledged_by)
        .bind(id)
        .bind(tenant_id)
        .fetch_one(&mut scope)
        .await?;
        scope.commit().await?;
        Ok(history)
    }
}

// ==================== 自动审计调度器 ====================

pub async fn auto_audit_scheduler(db: Db) {
    let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(3600));

    loop {
        interval.tick().await;

        // 系统通道：无请求上下文（启动/后台），登记 §2.1
        let tenants = match db.scope_read_system().await {
            Ok(mut scope) => {
                let rows = sqlx::query_scalar::<_, Uuid>(
                    only_own_schema_query!("finance", "SELECT DISTINCT tenant_id FROM finance.finance_audit_rules_v52 WHERE deleted_at IS NULL AND is_active = TRUE"),
                )
                .fetch_all(&mut scope)
                .await
                .unwrap_or_default();
                let _ = scope.commit().await;
                rows
            }
            Err(e) => {
                tracing::error!("[audit_v52] 系统通道创建失败: {}", e);
                Vec::new()
            }
        };

        for tenant_id in tenants {
            // 后台任务：非请求上下文。逐租户审计改为复用请求事务（Db::scope_with），
            // 后台无请求事务可复用，需等独立事务入口落地后再启用该调度。
            tracing::debug!(
                "[audit_v52] 租户 {} 后台自动审计跳过（无请求事务上下文）",
                tenant_id
            );
        }
    }
}

// ==================== API Handlers ====================

#[utoipa::path(
    security(("BearerAuth" = ["finance:admin"])),
    post,
    path = "/audit-v52/rules",
    tag = "Audit-V52",
    operation_id = "create_audit_rule_handler",
    responses((status = 200, description = "OK")),
)]
pub async fn create_audit_rule_handler(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateAuditRuleRequest>,
) -> ApiResponse<AuditRule> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let tenant_id = get_tenant_id_from_claims(&claims);
    let created_by = claims.username.clone();
    match AutoAuditEngine::create_rule(&state.db, txn, tenant_id, req, &created_by).await {
        Ok(rule) => ApiResponse::success(rule, "审计规则创建成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

#[utoipa::path(
    security(("BearerAuth" = ["finance:audit:read"])),
    get,
    path = "/api/finance/audit-v52/rules",
    tag = "Auto-Backfill",
    responses((status = 200, description = "get /api/finance/audit-v52/rules"), (status = 500, description = "服务内部错误")),
)]
pub async fn list_audit_rules_handler(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<AuditRuleQueryParams>,
) -> ApiResponse<Vec<AuditRule>> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(get_tenant_id_from_claims(&claims))
    };
    match AutoAuditEngine::list_rules(&state.db, txn, tenant_id, params.category, params.is_active)
        .await
    {
        Ok(rules) => ApiResponse::success(rules, "查询成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

#[utoipa::path(
    security(("BearerAuth" = ["finance:admin"])),
    put,
    path = "/api/finance/audit-v52/rules/{id}",
    tag = "Auto-Backfill",
    params(
        ("id" = String, Path, description = "id"),
    ),
    responses((status = 200, description = "put /api/finance/audit-v52/rules/{id}"), (status = 500, description = "服务内部错误")),
)]
pub async fn update_audit_rule_handler(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateAuditRuleRequest>,
) -> ApiResponse<AuditRule> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let tenant_id = get_tenant_id_from_claims(&claims);
    match AutoAuditEngine::update_rule(&state.db, txn, id, tenant_id, req).await {
        Ok(rule) => ApiResponse::success(rule, "更新成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

#[utoipa::path(
    security(("BearerAuth" = ["finance:admin"])),
    delete,
    path = "/api/finance/audit-v52/rules/{id}",
    tag = "Auto-Backfill",
    params(
        ("id" = String, Path, description = "id"),
    ),
    responses((status = 200, description = "delete /api/finance/audit-v52/rules/{id}"), (status = 500, description = "服务内部错误")),
)]
pub async fn delete_audit_rule_handler(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<()> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let tenant_id = get_tenant_id_from_claims(&claims);
    match AutoAuditEngine::delete_rule(&state.db, txn, id, tenant_id).await {
        Ok(_) => ApiResponse::success((), "删除成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

#[utoipa::path(
    security(("BearerAuth" = ["finance:audit:read"])),
    get,
    path = "/api/finance/audit-v52/findings",
    tag = "Auto-Backfill",
    responses((status = 200, description = "get /api/finance/audit-v52/findings"), (status = 500, description = "服务内部错误")),
)]
pub async fn get_audit_findings_handler(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<AuditFindingQueryParams>,
) -> ApiResponse<serde_json::Value> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(get_tenant_id_from_claims(&claims))
    };
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(20);
    let status_filter = match params.status {
        None => None,
        Some(ref raw) => match FindingStatus::from_db_str(raw) {
            Some(status) => Some(status.as_str().to_string()),
            None => return ApiResponse::bad_request("status 仅支持 open/resolved/ignored"),
        },
    };
    match AutoAuditEngine::get_findings(
        &state.db,
        txn,
        tenant_id,
        status_filter,
        params.severity,
        params.entity_type,
        page,
        page_size,
    )
    .await
    {
        Ok((items, total)) => ApiResponse::success(
            serde_json::json!({
                "items": items,
                "total": total,
                "page": page,
                "page_size": page_size,
            }),
            "查询成功",
        ),
        Err(e) => crate::shared::err_resp(e),
    }
}

#[utoipa::path(
    security(("BearerAuth" = ["finance:admin"])),
    post,
    path = "/audit-v52/findings/{id}/resolve",
    tag = "Audit-V52",
    operation_id = "resolve_finding_handler",
    responses((status = 200, description = "OK")),
)]
pub async fn resolve_finding_handler(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<ResolveFindingRequest>,
) -> ApiResponse<AuditFinding> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let tenant_id = get_tenant_id_from_claims(&claims);
    let resolved_by = claims.username.clone();
    match AutoAuditEngine::resolve_finding(
        &state.db,
        txn,
        id,
        tenant_id,
        &req.resolution,
        &resolved_by,
    )
    .await
    {
        Ok(finding) => ApiResponse::success(finding, "问题已处理"),
        Err(e) => crate::shared::err_resp(e),
    }
}

#[utoipa::path(
    security(("BearerAuth" = ["finance:admin"])),
    post,
    path = "/api/finance/audit-v52/run",
    tag = "Auto-Backfill",
    responses((status = 200, description = "post /api/finance/audit-v52/run"), (status = 500, description = "服务内部错误")),
)]
pub async fn run_audit_handler(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<RunAuditRequest>,
) -> ApiResponse<Vec<AuditFinding>> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let tenant_id = get_tenant_id_from_claims(&claims);
    match AutoAuditEngine::run_audit(&state.db, txn, tenant_id, req.rule_ids).await {
        Ok(findings) => ApiResponse::success(findings, "审计执行完成"),
        Err(e) => crate::shared::err_resp(e),
    }
}

async fn detect_anomalies_handler(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<DetectAnomalyRequest>,
) -> ApiResponse<Vec<AnomalyAlert>> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let tenant_id = get_tenant_id_from_claims(&claims);
    match AnomalyDetector::detect(&state.db, txn, tenant_id, req).await {
        Ok(alerts) => ApiResponse::success(alerts, "异常检测完成"),
        Err(e) => crate::shared::err_resp(e),
    }
}

#[utoipa::path(
    security(("BearerAuth" = ["finance:audit:read"])),
    get,
    path = "/api/finance/audit-v52/anomaly/alerts",
    tag = "Auto-Backfill",
    responses((status = 200, description = "get /api/finance/audit-v52/anomaly/alerts"), (status = 500, description = "服务内部错误")),
)]
pub async fn get_anomaly_alerts_handler(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<AnomalyAlertQueryParams>,
) -> ApiResponse<serde_json::Value> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(get_tenant_id_from_claims(&claims))
    };
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(20);
    match AnomalyDetector::get_alerts(
        &state.db,
        txn,
        tenant_id,
        params.detection_type,
        params.severity,
        params.is_resolved,
        page,
        page_size,
    )
    .await
    {
        Ok((items, total)) => ApiResponse::success(
            serde_json::json!({
                "items": items,
                "total": total,
                "page": page,
                "page_size": page_size,
            }),
            "查询成功",
        ),
        Err(e) => crate::shared::err_resp(e),
    }
}

#[utoipa::path(
    security(("BearerAuth" = ["finance:audit:read"])),
    get,
    path = "/audit-v52/anomaly/summary",
    tag = "Audit-V52",
    operation_id = "get_detection_summary_handler",
    responses((status = 200, description = "OK")),
)]
pub async fn get_detection_summary_handler(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
) -> ApiResponse<DetectionSummary> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(get_tenant_id_from_claims(&claims))
    };
    match AnomalyDetector::get_summary(&state.db, txn, tenant_id).await {
        Ok(summary) => ApiResponse::success(summary, "查询成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

#[utoipa::path(
    security(("BearerAuth" = ["finance:admin"])),
    post,
    path = "/api/finance/audit-v52/anomaly/config",
    tag = "Auto-Backfill",
    responses((status = 200, description = "post /api/finance/audit-v52/anomaly/config"), (status = 500, description = "服务内部错误")),
)]
pub async fn configure_detection_handler(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<serde_json::Value>,
) -> ApiResponse<()> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let tenant_id = get_tenant_id_from_claims(&claims);
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

    match AnomalyDetector::configure(
        &state.db,
        txn,
        tenant_id,
        detection_type,
        enabled,
        parameters,
    )
    .await
    {
        Ok(_) => ApiResponse::success((), "配置更新成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

#[utoipa::path(
    security(("BearerAuth" = ["finance:audit:read"])),
    get,
    path = "/api/finance/audit-v52/alerts",
    tag = "Auto-Backfill",
    responses((status = 200, description = "get /api/finance/audit-v52/alerts"), (status = 500, description = "服务内部错误")),
)]
pub async fn get_alerts_handler(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<AlertHistoryQueryParams>,
) -> ApiResponse<serde_json::Value> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(get_tenant_id_from_claims(&claims))
    };
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(20);
    match AlertManager::get_history(
        &state.db,
        txn,
        tenant_id,
        params.channel,
        params.is_delivered,
        params.is_acknowledged,
        page,
        page_size,
    )
    .await
    {
        Ok((items, total)) => ApiResponse::success(
            serde_json::json!({
                "items": items,
                "total": total,
                "page": page,
                "page_size": page_size,
            }),
            "查询成功",
        ),
        Err(e) => crate::shared::err_resp(e),
    }
}

#[utoipa::path(
    security(("BearerAuth" = ["finance:admin"])),
    post,
    path = "/audit-v52/alerts/config",
    tag = "Audit-V52",
    operation_id = "create_alert_config_handler",
    responses((status = 200, description = "OK")),
)]
pub async fn create_alert_config_handler(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateAlertConfigRequest>,
) -> ApiResponse<AlertConfig> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let tenant_id = get_tenant_id_from_claims(&claims);
    match AlertManager::create_config(&state.db, txn, tenant_id, req).await {
        Ok(config) => ApiResponse::success(config, "预警配置创建成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

#[utoipa::path(
    security(("BearerAuth" = ["finance:audit:read"])),
    get,
    path = "/api/finance/audit-v52/alerts/config/list",
    tag = "Auto-Backfill",
    responses((status = 200, description = "get /api/finance/audit-v52/alerts/config/list"), (status = 500, description = "服务内部错误")),
)]
pub async fn list_alert_configs_handler(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
) -> ApiResponse<Vec<AlertConfig>> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(get_tenant_id_from_claims(&claims))
    };
    match AlertManager::list_configs(&state.db, txn, tenant_id).await {
        Ok(configs) => ApiResponse::success(configs, "查询成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

pub async fn acknowledge_alert_handler(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<AcknowledgeAlertRequest>,
) -> ApiResponse<AlertHistory> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let tenant_id = get_tenant_id_from_claims(&claims);
    match AlertManager::acknowledge(&state.db, txn, id, tenant_id, &req.acknowledged_by).await {
        Ok(history) => ApiResponse::success(history, "预警已确认"),
        Err(e) => crate::shared::err_resp(e),
    }
}

// ==================== 路由注册 ====================

pub fn create_routes() -> Router<AppState> {
    // B375：此前整个 Router 只挂 `finance:audit:read`，
    // `POST/PUT/DELETE audit-v52/rules*`、`POST findings/{id}/resolve`、`POST audit-v52/run`、
    // `POST anomaly/detect`、`POST anomaly/config`、`POST alerts/config`、
    // `POST alerts/{id}/acknowledge` 这些写端点在独立部署（不经网关 `require_finance_write`）时
    // 对只读角色敞开。按 B363 口径下沉：读 = `finance:audit:read`，写 = `finance:admin`。
    let read_routes = Router::new()
        // A. 审计规则（读）
        .route(
            "/audit-v52/rules",
            axum::routing::get(list_audit_rules_handler),
        )
        // B. 审计发现（读）
        .route(
            "/audit-v52/findings",
            axum::routing::get(get_audit_findings_handler),
        )
        // D. 异常检测（读）
        .route(
            "/audit-v52/anomaly/alerts",
            axum::routing::get(get_anomaly_alerts_handler),
        )
        .route(
            "/audit-v52/anomaly/summary",
            axum::routing::get(get_detection_summary_handler),
        )
        // E. 实时预警（读）
        .route("/audit-v52/alerts", axum::routing::get(get_alerts_handler))
        .route(
            "/audit-v52/alerts/config/list",
            axum::routing::get(list_alert_configs_handler),
        )
        .layer(axum::middleware::from_fn(
            topems_shared_auth::middleware::require_permission("finance:audit:read"),
        ));

    let write_routes = Router::new()
        // A. 审计规则 CRUD（写）
        .route(
            "/audit-v52/rules",
            axum::routing::post(create_audit_rule_handler),
        )
        .route(
            "/audit-v52/rules/{id}",
            axum::routing::put(update_audit_rule_handler),
        )
        .route(
            "/audit-v52/rules/{id}",
            axum::routing::delete(delete_audit_rule_handler),
        )
        // B. 审计发现处置（写）
        .route(
            "/audit-v52/findings/{id}/resolve",
            axum::routing::post(resolve_finding_handler),
        )
        // C. 运行审计（写）
        .route("/audit-v52/run", axum::routing::post(run_audit_handler))
        // D. 异常检测（写）
        .route(
            "/audit-v52/anomaly/detect",
            axum::routing::post(detect_anomalies_handler),
        )
        .route(
            "/audit-v52/anomaly/config",
            axum::routing::post(configure_detection_handler),
        )
        // E. 实时预警（写）
        .route(
            "/audit-v52/alerts/config",
            axum::routing::post(create_alert_config_handler),
        )
        .route(
            "/audit-v52/alerts/{id}/acknowledge",
            axum::routing::post(acknowledge_alert_handler),
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
    fn enum_audit_severity() {
        roundtrip(&AuditSeverity::Low);
        roundtrip(&AuditSeverity::Medium);
        roundtrip(&AuditSeverity::High);
        roundtrip(&AuditSeverity::Critical);
    }

    #[test]
    fn enum_finding_status() {
        roundtrip(&FindingStatus::Open);
        roundtrip(&FindingStatus::Resolved);
        roundtrip(&FindingStatus::Ignored);
    }

    #[test]
    fn enum_alert_channel() {
        roundtrip(&AlertChannel::WebSocket);
        roundtrip(&AlertChannel::Email);
        roundtrip(&AlertChannel::DingTalk);
        roundtrip(&AlertChannel::Webhook);
    }

    #[test]
    fn enum_detection_type() {
        roundtrip(&DetectionType::ZScore);
        roundtrip(&DetectionType::Benford);
        roundtrip(&DetectionType::TimeBased);
        roundtrip(&DetectionType::Frequency);
        roundtrip(&DetectionType::AmountVelocity);
    }

    #[test]
    fn struct_audit_rule() {
        let v = AuditRule {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            name: "rule-1".into(),
            category: "revenue".into(),
            condition: serde_json::json!({"op":">","val":10000}),
            severity: "high".into(),
            schedule: "daily".into(),
            is_active: true,
            created_by: "tester".into(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        roundtrip(&v);
    }

    #[test]
    fn struct_audit_finding() {
        let v = AuditFinding {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            rule_id: Uuid::new_v4(),
            entity_type: "invoice".into(),
            entity_id: "INV-001".into(),
            finding_type: "amount_anomaly".into(),
            severity: "medium".into(),
            description: "金额异常".into(),
            evidence: serde_json::json!({"expected":100,"actual":500}),
            status: "open".into(),
            detected_at: Utc::now(),
            resolved_at: None,
            resolved_by: None,
        };
        roundtrip(&v);
    }

    #[test]
    fn struct_anomaly_alert() {
        let v = AnomalyAlert {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            detection_type: "z_score".into(),
            entity_type: "transaction".into(),
            entity_id: "TX-001".into(),
            metric_value: 999.0,
            expected_range: "0-100".into(),
            confidence: 0.95,
            severity: "high".into(),
            description: "统计异常".into(),
            is_resolved: false,
            created_at: Utc::now(),
        };
        roundtrip(&v);
    }

    #[test]
    fn struct_alert_config() {
        let v = AlertConfig {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            channel: "email".into(),
            threshold: "high".into(),
            cooldown: 300,
            recipients: serde_json::json!(["a@b.com"]),
            is_active: true,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        roundtrip(&v);
    }

    #[test]
    fn struct_alert_history() {
        let v = AlertHistory {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            channel: "webhook".into(),
            alert_type: "anomaly".into(),
            entity_id: "ENT-001".into(),
            severity: "critical".into(),
            message: "test alert".into(),
            is_delivered: true,
            is_acknowledged: false,
            acknowledged_by: None,
            created_at: Utc::now(),
        };
        roundtrip(&v);
    }

    #[test]
    fn struct_detection_summary() {
        let v = DetectionSummary {
            total_alerts: 100,
            critical_count: 2,
            high_count: 10,
            medium_count: 30,
            low_count: 58,
            by_type: [("z_score".into(), 40i64)].into(),
            resolved_count: 50,
        };
        roundtrip(&v);
    }

    #[test]
    fn struct_run_audit_request() {
        roundtrip(&RunAuditRequest { rule_ids: None });
        roundtrip(&RunAuditRequest {
            rule_ids: Some(vec![Uuid::new_v4()]),
        });
    }

    // ===== as_str / from_str / create_finding / create_alert / get_first_digit tests =====

    #[test]
    fn audit_severity_as_str_all_variants() {
        assert_eq!(AuditSeverity::Low.as_str(), "low");
        assert_eq!(AuditSeverity::Medium.as_str(), "medium");
        assert_eq!(AuditSeverity::High.as_str(), "high");
        assert_eq!(AuditSeverity::Critical.as_str(), "critical");
    }

    #[test]
    fn finding_status_as_str_all_variants() {
        assert_eq!(FindingStatus::Open.as_str(), "open");
        assert_eq!(FindingStatus::Resolved.as_str(), "resolved");
        assert_eq!(FindingStatus::Ignored.as_str(), "ignored");
    }

    #[test]
    fn alert_channel_as_str_all_variants() {
        assert_eq!(AlertChannel::WebSocket.as_str(), "websocket");
        assert_eq!(AlertChannel::Email.as_str(), "email");
        assert_eq!(AlertChannel::DingTalk.as_str(), "dingtalk");
        assert_eq!(AlertChannel::Webhook.as_str(), "webhook");
    }

    #[test]
    fn alert_channel_from_str_all_variants() {
        assert_eq!(
            AlertChannel::from_str("websocket"),
            Some(AlertChannel::WebSocket)
        );
        assert_eq!(AlertChannel::from_str("email"), Some(AlertChannel::Email));
        assert_eq!(
            AlertChannel::from_str("dingtalk"),
            Some(AlertChannel::DingTalk)
        );
        assert_eq!(
            AlertChannel::from_str("webhook"),
            Some(AlertChannel::Webhook)
        );
    }

    #[test]
    fn alert_channel_from_str_unknown_returns_none() {
        assert_eq!(AlertChannel::from_str("unknown"), None);
        assert_eq!(AlertChannel::from_str(""), None);
    }

    #[test]
    fn create_finding_builds_correct_struct() {
        let tenant_id = Uuid::new_v4();
        let rule_id = Uuid::new_v4();
        let evidence = serde_json::json!({"key": "val"});
        let finding = AutoAuditEngine::create_finding(
            tenant_id,
            rule_id,
            "invoice",
            "INV-001",
            "amount_anomaly",
            "high",
            "金额异常",
            evidence.clone(),
        );
        assert_eq!(finding.tenant_id, tenant_id);
        assert_eq!(finding.rule_id, rule_id);
        assert_eq!(finding.entity_type, "invoice");
        assert_eq!(finding.entity_id, "INV-001");
        assert_eq!(finding.finding_type, "amount_anomaly");
        assert_eq!(finding.severity, "high");
        assert_eq!(finding.description, "金额异常");
        assert_eq!(finding.evidence, evidence);
        assert_eq!(finding.status, "open");
        assert!(finding.resolved_at.is_none());
        assert!(finding.resolved_by.is_none());
    }

    #[test]
    fn create_finding_with_empty_strings() {
        let finding = AutoAuditEngine::create_finding(
            Uuid::new_v4(),
            Uuid::new_v4(),
            "",
            "",
            "",
            "",
            "",
            serde_json::json!({}),
        );
        assert_eq!(finding.entity_type, "");
        assert_eq!(finding.entity_id, "");
        assert_eq!(finding.finding_type, "");
        assert_eq!(finding.severity, "");
        assert_eq!(finding.status, "open");
    }

    #[test]
    fn create_alert_builds_correct_struct() {
        let tenant_id = Uuid::new_v4();
        let alert = AnomalyDetector::create_alert(
            tenant_id,
            "z_score",
            "transaction",
            "TX-001",
            999.0,
            "0-100",
            0.95,
            "high",
            "统计异常",
        );
        assert_eq!(alert.tenant_id, tenant_id);
        assert_eq!(alert.detection_type, "z_score");
        assert_eq!(alert.entity_type, "transaction");
        assert_eq!(alert.entity_id, "TX-001");
        assert!((alert.metric_value - 999.0).abs() < 1e-9);
        assert_eq!(alert.expected_range, "0-100");
        assert!((alert.confidence - 0.95).abs() < 1e-9);
        assert_eq!(alert.severity, "high");
        assert_eq!(alert.description, "统计异常");
        assert!(!alert.is_resolved);
    }

    #[test]
    fn create_alert_with_zero_values() {
        let alert =
            AnomalyDetector::create_alert(Uuid::new_v4(), "benford", "", "", 0.0, "", 0.0, "", "");
        assert!((alert.metric_value - 0.0).abs() < 1e-9);
        assert!((alert.confidence - 0.0).abs() < 1e-9);
        assert!(!alert.is_resolved);
    }

    #[test]
    fn get_first_digit_single_digit() {
        assert_eq!(AnomalyDetector::get_first_digit(1.0), 1);
        assert_eq!(AnomalyDetector::get_first_digit(5.0), 5);
        assert_eq!(AnomalyDetector::get_first_digit(9.0), 9);
    }

    #[test]
    fn get_first_digit_multi_digit() {
        assert_eq!(AnomalyDetector::get_first_digit(10.0), 1);
        assert_eq!(AnomalyDetector::get_first_digit(25.0), 2);
        assert_eq!(AnomalyDetector::get_first_digit(99.0), 9);
        assert_eq!(AnomalyDetector::get_first_digit(100.0), 1);
        assert_eq!(AnomalyDetector::get_first_digit(999.0), 9);
    }

    #[test]
    fn get_first_digit_decimal() {
        assert_eq!(AnomalyDetector::get_first_digit(0.5), 5);
        assert_eq!(AnomalyDetector::get_first_digit(0.1), 1);
        assert_eq!(AnomalyDetector::get_first_digit(0.01), 1);
        assert_eq!(AnomalyDetector::get_first_digit(0.05), 5);
    }

    #[test]
    fn get_first_digit_zero_or_negative() {
        assert_eq!(AnomalyDetector::get_first_digit(0.0), 0);
        assert_eq!(AnomalyDetector::get_first_digit(-1.0), 0);
        assert_eq!(AnomalyDetector::get_first_digit(-100.0), 0);
    }

    #[test]
    fn get_first_digit_large_number() {
        assert_eq!(AnomalyDetector::get_first_digit(1_000_000.0), 1);
        assert_eq!(AnomalyDetector::get_first_digit(5_000_000.0), 5);
        assert_eq!(AnomalyDetector::get_first_digit(9_999_999.0), 9);
    }
    #[test]
    fn finding_status_roundtrips() {
        for raw in FindingStatus::DB_VALUES {
            assert_eq!(
                FindingStatus::from_db_str(raw).map(|s| s.as_str()),
                Some(raw)
            );
        }
        assert_eq!(FindingStatus::from_db_str("bogus"), None);
    }

    #[test]
    fn finding_status_transition_matrix() {
        assert!(FindingStatus::Open
            .can_transition_to(FindingStatus::Resolved)
            .is_ok());
        assert!(FindingStatus::Open
            .can_transition_to(FindingStatus::Ignored)
            .is_ok());
        assert!(FindingStatus::Resolved
            .can_transition_to(FindingStatus::Resolved)
            .is_ok());
        assert!(FindingStatus::Ignored
            .can_transition_to(FindingStatus::Resolved)
            .is_err());
        assert!(FindingStatus::Resolved
            .can_transition_to(FindingStatus::Ignored)
            .is_err());
    }
}
