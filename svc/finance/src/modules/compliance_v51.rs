#![allow(dead_code)]
//! STATUS: WIRED | Routes registered + DB tables initialized + Handlers implemented
//! V51.0 Finance 合规内控模块
//!
//! 提供内控矩阵管理、风险评估和合规报告功能。
//! 支持控制点CRUD、内控矩阵生成、5x5风险评估和合规报告导出。
//!
//! 路由：
//! - POST /compliance-v51/control-points
//! - GET  /compliance-v51/control-points
//! - GET  /compliance-v51/control-points/{id}
//! - PUT  /compliance-v51/control-points/{id}
//! - DELETE /compliance-v51/control-points/{id}
//! - POST /compliance-v51/control-matrices/generate
//! - GET  /compliance-v51/control-matrices
//! - GET  /compliance-v51/control-matrices/{id}
//! - POST /compliance-v51/risk-assessments
//! - GET  /compliance-v51/risk-assessments
//! - GET  /compliance-v51/risk-assessments/{id}
//! - GET  /compliance-v51/risk-assessments/summary
//! - POST /compliance-v51/reports/generate
//! - GET  /compliance-v51/reports
//! - GET  /compliance-v51/reports/{id}
//! - GET  /compliance-v51/reports/{id}/export
use utoipa::ToSchema;

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

// ==================== 辅助函数 ====================

// ==================== 数据模型 ====================

/// 控制点分类
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ControlCategory {
    Authorization,
    Segregation,
    Approval,
    Monitoring,
}

/// 风险等级
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
}

/// 控制类型
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ControlType {
    Preventive,
    Detective,
    Corrective,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ReportType {
    Periodic,
    EventBased,
    AdHoc,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum Severity {
    Low,
    Medium,
    High,
    Critical,
}

impl Severity {
    fn as_str(&self) -> &'static str {
        match self {
            Severity::Low => "low",
            Severity::Medium => "medium",
            Severity::High => "high",
            Severity::Critical => "critical",
        }
    }
}

// ==================== 1. 内控矩阵 ====================

/// 控制点
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ControlPoint {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub code: String,
    pub name: String,
    pub description: String,
    pub category: String,
    pub risk_level: String,
    pub control_type: String,
    pub frequency: String,
    pub is_active: bool,
    pub created_by: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// 创建控制点请求
#[derive(Debug, Deserialize)]
pub struct CreateControlPointRequest {
    pub code: String,
    pub name: String,
    pub description: String,
    pub category: String,
    pub risk_level: String,
    pub control_type: String,
    pub frequency: String,
    pub is_active: Option<bool>,
}

/// 更新控制点请求
#[derive(Debug, Deserialize)]
pub struct UpdateControlPointRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub category: Option<String>,
    pub risk_level: Option<String>,
    pub control_type: Option<String>,
    pub frequency: Option<String>,
    pub is_active: Option<bool>,
}

/// 控制点查询参数
#[derive(Debug, Deserialize, utoipa::IntoParams)]
pub struct ControlPointQueryParams {
    pub category: Option<String>,
    pub is_active: Option<bool>,
    pub risk_level: Option<String>,
}

/// 内控矩阵
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ControlMatrix {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub name: String,
    pub period: String,
    pub controls: serde_json::Value,
    pub total_controls: i64,
    pub effective_controls: i64,
    pub compliance_rate: f64,
    pub created_by: String,
    pub created_at: DateTime<Utc>,
}

/// 生成内控矩阵请求
#[derive(Debug, Deserialize)]
pub struct GenerateControlMatrixRequest {
    pub name: String,
    pub period: String,
}

/// 内控矩阵查询参数
#[derive(Debug, Deserialize, utoipa::IntoParams)]
pub struct ControlMatrixQueryParams {
    pub period: Option<String>,
}

// ==================== 2. 风险评估 ====================

/// 风险评估
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct RiskAssessment {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub control_point_id: Uuid,
    pub likelihood: String,
    pub impact: String,
    pub risk_score: i32,
    pub risk_level: String,
    pub mitigation_strategy: String,
    pub residual_risk: String,
    pub assessed_by: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// 创建风险评估请求
#[derive(Debug, Deserialize)]
pub struct CreateRiskAssessmentRequest {
    pub control_point_id: Uuid,
    pub likelihood: String,
    pub impact: String,
    pub mitigation_strategy: String,
    pub residual_risk: String,
}

/// 风险评估查询参数
#[derive(Debug, Deserialize, utoipa::IntoParams, ToSchema)]
pub struct RiskAssessmentQueryParams {
    pub control_point_id: Option<Uuid>,
    pub risk_level: Option<String>,
}

/// 风险摘要
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RiskSummary {
    pub total_assessments: i64,
    pub critical_count: i64,
    pub high_count: i64,
    pub medium_count: i64,
    pub low_count: i64,
    pub average_score: f64,
}

// ==================== 3. 合规报告 ====================

/// 合规报告
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ComplianceReportV51 {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub report_type: String,
    pub period_start: DateTime<Utc>,
    pub period_end: DateTime<Utc>,
    pub generated_at: DateTime<Utc>,
    pub controls_checked: i64,
    pub issues_found: i64,
    pub risk_assessments: serde_json::Value,
    pub executive_summary: String,
    pub recommendations: serde_json::Value,
    pub created_by: String,
}

/// 合规问题
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ComplianceIssueV51 {
    pub id: Uuid,
    pub report_id: Uuid,
    pub severity: String,
    pub category: String,
    pub control_point_code: String,
    pub description: String,
    pub evidence: serde_json::Value,
    pub impact_assessment: String,
}

/// 生成合规报告请求
#[derive(Debug, Deserialize)]
pub struct GenerateComplianceReportRequest {
    pub report_type: String,
    pub period_start: DateTime<Utc>,
    pub period_end: DateTime<Utc>,
}

/// 合规报告查询参数
#[derive(Debug, Deserialize, utoipa::IntoParams, ToSchema)]
pub struct ComplianceReportQueryParams {
    pub report_type: Option<String>,
}

/// 导出的合规报告（包含完整数据）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportedComplianceReport {
    #[serde(flatten)]
    pub report: ComplianceReportV51,
    pub issues: Vec<ComplianceIssueV51>,
}

// ==================== 数据库初始化 ====================

/// 初始化合规内控数据库表

// ==================== 业务逻辑函数 ====================

impl ControlPoint {
    pub async fn create(
        db: &Db,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
        tenant_id: Uuid,
        req: CreateControlPointRequest,
        created_by: &str,
    ) -> Result<Self, sqlx::Error> {
        let id = Uuid::new_v4();
        let now = Utc::now();

        let mut scope = db.scope_with(txn).await?;
        let created = sqlx::query_as::<_, Self>(only_own_schema_query!(
            "finance",
            r#"INSERT INTO finance.finance_control_points
                (id, tenant_id, code, name, description, category, risk_level,
                 control_type, frequency, is_active, created_by, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING id, tenant_id, code, name, description, category, risk_level,
                      control_type, frequency, is_active, created_by, created_at, updated_at"#
        ))
        .bind(id)
        .bind(tenant_id)
        .bind(&req.code)
        .bind(&req.name)
        .bind(&req.description)
        .bind(&req.category)
        .bind(&req.risk_level)
        .bind(&req.control_type)
        .bind(&req.frequency)
        .bind(req.is_active.unwrap_or(true))
        .bind(created_by)
        .bind(now)
        .bind(now)
        .fetch_one(&mut scope)
        .await?;
        scope.commit().await?;
        Ok(created)
    }

    pub async fn list(
        db: &Db,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
        tenant_id: Option<Uuid>,
        category: Option<String>,
        is_active: Option<bool>,
        risk_level: Option<String>,
    ) -> Result<Vec<Self>, sqlx::Error> {
        let mut query = String::from(
            "SELECT id, tenant_id, code, name, description, category, risk_level, \
             control_type, frequency, is_active, created_by, created_at, updated_at \
             FROM finance.finance_control_points WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR tenant_id = $1)",
        );

        if category.is_some() {
            query.push_str(" AND category = $2");
        }
        if is_active.is_some() {
            let idx = if category.is_some() { 3 } else { 2 };
            query.push_str(&format!(" AND is_active = ${}", idx));
        }
        if risk_level.is_some() {
            let idx = match (category.is_some(), is_active.is_some()) {
                (true, true) => 4,
                (true, false) => 3,
                (false, true) => 3,
                (false, false) => 2,
            };
            query.push_str(&format!(" AND risk_level = ${}", idx));
        }

        query.push_str(" ORDER BY code, created_at DESC");

        // 系统通道例外（冻结文档 §2.1）：超管跨租户只读汇总
        let mut scope = db.scope_with(txn).await?;
        let mut q = sqlx::query_as::<_, Self>(sqlx::AssertSqlSafe(query));
        q = q.bind(tenant_id);
        if let Some(ref cat) = category {
            q = q.bind(cat);
        }
        if let Some(active) = is_active {
            q = q.bind(active);
        }
        if let Some(ref rl) = risk_level {
            q = q.bind(rl);
        }

        let items = q.fetch_all(&mut scope).await?;
        scope.commit().await?;
        Ok(items)
    }

    pub async fn get(
        db: &Db,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
        id: Uuid,
        tenant_id: Option<Uuid>,
    ) -> Result<Self, sqlx::Error> {
        // 系统通道例外（冻结文档 §2.1）：超管跨租户只读汇总
        let mut scope = db.scope_with(txn).await?;
        let control = sqlx::query_as::<_, Self>(
            only_own_schema_query!("finance", "SELECT id, tenant_id, code, name, description, category, risk_level, \
             control_type, frequency, is_active, created_by, created_at, updated_at \
             FROM finance.finance_control_points WHERE id = $1 AND ($2::uuid IS NULL OR tenant_id = $2) AND deleted_at IS NULL"),
        )
        .bind(id)
        .bind(tenant_id)
        .fetch_one(&mut scope)
        .await?;
        scope.commit().await?;
        Ok(control)
    }

    pub async fn update(
        db: &Db,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
        id: Uuid,
        tenant_id: Uuid,
        req: UpdateControlPointRequest,
    ) -> Result<Self, sqlx::Error> {
        let now = Utc::now();

        let mut scope = db.scope_with(txn).await?;
        let updated = sqlx::query_as::<_, Self>(only_own_schema_query!(
            "finance",
            r#"UPDATE finance.finance_control_points
            SET name = COALESCE($1, name),
                description = COALESCE($2, description),
                category = COALESCE($3, category),
                risk_level = COALESCE($4, risk_level),
                control_type = COALESCE($5, control_type),
                frequency = COALESCE($6, frequency),
                is_active = COALESCE($7, is_active),
                updated_at = $8
            WHERE id = $9 AND tenant_id = $10
            RETURNING id, tenant_id, code, name, description, category, risk_level,
                      control_type, frequency, is_active, created_by, created_at, updated_at"#
        ))
        .bind(req.name)
        .bind(req.description)
        .bind(req.category)
        .bind(req.risk_level)
        .bind(req.control_type)
        .bind(req.frequency)
        .bind(req.is_active)
        .bind(now)
        .bind(id)
        .bind(tenant_id)
        .fetch_one(&mut scope)
        .await?;
        scope.commit().await?;
        Ok(updated)
    }

    pub async fn delete(
        db: &Db,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
        id: Uuid,
        tenant_id: Uuid,
    ) -> Result<(), sqlx::Error> {
        let mut scope = db.scope_with(txn).await?;
        sqlx::query(
            only_own_schema_query!("finance", "UPDATE finance.finance_control_points SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2"),
        )
        .bind(id)
        .bind(tenant_id)
        .execute(&mut scope)
        .await?;
        scope.commit().await?;
        Ok(())
    }
}

impl ControlMatrix {
    #[allow(
        clippy::as_conversions,
        clippy::cast_possible_wrap,
        clippy::cast_precision_loss
    )]
    pub async fn generate(
        db: &Db,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
        tenant_id: Uuid,
        req: GenerateControlMatrixRequest,
        created_by: &str,
    ) -> Result<Self, sqlx::Error> {
        let mut scope = db.scope_with(txn).await?;
        let active_controls = sqlx::query_as::<_, ControlPoint>(
            only_own_schema_query!("finance", "SELECT id, tenant_id, code, name, description, category, risk_level, \
             control_type, frequency, is_active, created_by, created_at, updated_at \
             FROM finance.finance_control_points WHERE deleted_at IS NULL AND tenant_id = $1 AND is_active = TRUE"),
        )
        .bind(tenant_id)
        .fetch_all(&mut scope)
        .await?;

        let total = active_controls.len() as i64;
        let effective = active_controls
            .iter()
            .filter(|c| c.risk_level != "critical")
            .count() as i64;
        let rate = if total > 0 {
            (effective as f64 / total as f64) * 100.0
        } else {
            100.0
        };

        let controls_json = serde_json::json!(active_controls
            .iter()
            .map(|c| {
                serde_json::json!({
                    "id": c.id,
                    "code": c.code,
                    "name": c.name,
                    "category": c.category,
                    "risk_level": c.risk_level,
                    "control_type": c.control_type,
                    "frequency": c.frequency,
                })
            })
            .collect::<Vec<_>>());

        let id = Uuid::new_v4();

        let matrix = sqlx::query_as::<_, Self>(only_own_schema_query!(
            "finance",
            r#"INSERT INTO finance.finance_control_matrices
                (id, tenant_id, name, period, controls, total_controls,
                 effective_controls, compliance_rate, created_by, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id, tenant_id, name, period, controls, total_controls,
                      effective_controls, compliance_rate, created_by, created_at"#
        ))
        .bind(id)
        .bind(tenant_id)
        .bind(&req.name)
        .bind(&req.period)
        .bind(controls_json)
        .bind(total)
        .bind(effective)
        .bind(rate)
        .bind(created_by)
        .bind(Utc::now())
        .fetch_one(&mut scope)
        .await?;
        scope.commit().await?;
        Ok(matrix)
    }

    pub async fn get(
        db: &Db,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
        id: Uuid,
        tenant_id: Option<Uuid>,
    ) -> Result<Self, sqlx::Error> {
        // 系统通道例外（冻结文档 §2.1）：超管跨租户只读汇总
        let mut scope = db.scope_with(txn).await?;
        let matrix = sqlx::query_as::<_, Self>(only_own_schema_query!(
            "finance",
            "SELECT id, tenant_id, name, period, controls, total_controls, \
             effective_controls, compliance_rate, created_by, created_at \
             FROM finance.finance_control_matrices WHERE id = $1 AND ($2::uuid IS NULL OR tenant_id = $2)"
        ))
        .bind(id)
        .bind(tenant_id)
        .fetch_one(&mut scope)
        .await?;
        scope.commit().await?;
        Ok(matrix)
    }

    pub async fn list(
        db: &Db,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
        tenant_id: Option<Uuid>,
        period: Option<String>,
    ) -> Result<Vec<Self>, sqlx::Error> {
        // 系统通道例外（冻结文档 §2.1）：超管跨租户只读汇总
        let mut scope = db.scope_with(txn).await?;
        let items = if let Some(ref p) = period {
            sqlx::query_as::<_, Self>(only_own_schema_query!(
                "finance",
                "SELECT id, tenant_id, name, period, controls, total_controls, \
                 effective_controls, compliance_rate, created_by, created_at \
                 FROM finance.finance_control_matrices WHERE ($1::uuid IS NULL OR tenant_id = $1) AND period = $2 \
                 ORDER BY created_at DESC"
            ))
            .bind(tenant_id)
            .bind(p)
            .fetch_all(&mut scope)
            .await?
        } else {
            sqlx::query_as::<_, Self>(only_own_schema_query!(
                "finance",
                "SELECT id, tenant_id, name, period, controls, total_controls, \
                 effective_controls, compliance_rate, created_by, created_at \
                 FROM finance.finance_control_matrices WHERE ($1::uuid IS NULL OR tenant_id = $1) \
                 ORDER BY created_at DESC"
            ))
            .bind(tenant_id)
            .fetch_all(&mut scope)
            .await?
        };
        scope.commit().await?;
        Ok(items)
    }
}

impl RiskAssessment {
    fn calculate_score(likelihood: &str, impact: &str) -> i32 {
        let l: i32 = match likelihood {
            "low" => 1,
            "medium" => 2,
            "high" => 3,
            "critical" => 4,
            _ => 1,
        };
        let i: i32 = match impact {
            "low" => 1,
            "medium" => 2,
            "high" => 3,
            "critical" => 4,
            _ => 1,
        };
        l * i
    }

    fn determine_level(score: i32) -> String {
        if score >= 12 {
            "critical".to_string()
        } else if score >= 6 {
            "high".to_string()
        } else if score >= 3 {
            "medium".to_string()
        } else {
            "low".to_string()
        }
    }

    pub async fn assess(
        db: &Db,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
        tenant_id: Uuid,
        req: CreateRiskAssessmentRequest,
        assessed_by: &str,
    ) -> Result<Self, sqlx::Error> {
        let score = Self::calculate_score(&req.likelihood, &req.impact);
        let level = Self::determine_level(score);
        let id = Uuid::new_v4();
        let now = Utc::now();

        let mut scope = db.scope_with(txn).await?;
        let assessment = sqlx::query_as::<_, Self>(only_own_schema_query!(
            "finance",
            r#"INSERT INTO finance.finance_risk_assessments
                (id, tenant_id, control_point_id, likelihood, impact, risk_score,
                 risk_level, mitigation_strategy, residual_risk, assessed_by,
                 created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING id, tenant_id, control_point_id, likelihood, impact, risk_score,
                      risk_level, mitigation_strategy, residual_risk, assessed_by,
                      created_at, updated_at"#
        ))
        .bind(id)
        .bind(tenant_id)
        .bind(req.control_point_id)
        .bind(&req.likelihood)
        .bind(&req.impact)
        .bind(score)
        .bind(&level)
        .bind(&req.mitigation_strategy)
        .bind(&req.residual_risk)
        .bind(assessed_by)
        .bind(now)
        .bind(now)
        .fetch_one(&mut scope)
        .await?;
        scope.commit().await?;
        Ok(assessment)
    }

    pub async fn get(
        db: &Db,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
        id: Uuid,
        tenant_id: Option<Uuid>,
    ) -> Result<Self, sqlx::Error> {
        // 系统通道例外（冻结文档 §2.1）：超管跨租户只读汇总
        let mut scope = db.scope_with(txn).await?;
        let assessment = sqlx::query_as::<_, Self>(only_own_schema_query!(
            "finance",
            "SELECT id, tenant_id, control_point_id, likelihood, impact, risk_score, \
             risk_level, mitigation_strategy, residual_risk, assessed_by, \
             created_at, updated_at \
             FROM finance.finance_risk_assessments WHERE id = $1 AND ($2::uuid IS NULL OR tenant_id = $2)"
        ))
        .bind(id)
        .bind(tenant_id)
        .fetch_one(&mut scope)
        .await?;
        scope.commit().await?;
        Ok(assessment)
    }

    pub async fn list(
        db: &Db,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
        tenant_id: Option<Uuid>,
        control_point_id: Option<Uuid>,
        risk_level: Option<String>,
    ) -> Result<Vec<Self>, sqlx::Error> {
        let mut query = String::from(
            "SELECT id, tenant_id, control_point_id, likelihood, impact, risk_score, \
             risk_level, mitigation_strategy, residual_risk, assessed_by, \
             created_at, updated_at \
             FROM finance.finance_risk_assessments WHERE ($1::uuid IS NULL OR tenant_id = $1)",
        );

        if control_point_id.is_some() {
            query.push_str(" AND control_point_id = $2");
        }
        if risk_level.is_some() {
            let idx = if control_point_id.is_some() { "3" } else { "2" };
            query.push_str(&format!(" AND risk_level = ${}", idx));
        }
        query.push_str(" ORDER BY created_at DESC");

        // 系统通道例外（冻结文档 §2.1）：超管跨租户只读汇总
        let mut scope = db.scope_with(txn).await?;
        let mut q = sqlx::query_as::<_, Self>(sqlx::AssertSqlSafe(query));
        q = q.bind(tenant_id);
        if let Some(cp_id) = control_point_id {
            q = q.bind(cp_id);
        }
        if let Some(ref rl) = risk_level {
            q = q.bind(rl);
        }
        let items = q.fetch_all(&mut scope).await?;
        scope.commit().await?;
        Ok(items)
    }

    #[allow(
        clippy::as_conversions,
        clippy::cast_possible_wrap,
        clippy::cast_precision_loss
    )]
    pub async fn get_summary(
        db: &Db,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
        tenant_id: Option<Uuid>,
    ) -> Result<RiskSummary, sqlx::Error> {
        // 系统通道例外（冻结文档 §2.1）：超管跨租户只读汇总
        let mut scope = db.scope_with(txn).await?;
        let assessments = sqlx::query_as::<_, Self>(only_own_schema_query!(
            "finance",
            "SELECT id, tenant_id, control_point_id, likelihood, impact, risk_score, \
             risk_level, mitigation_strategy, residual_risk, assessed_by, \
             created_at, updated_at \
             FROM finance.finance_risk_assessments WHERE ($1::uuid IS NULL OR tenant_id = $1)"
        ))
        .bind(tenant_id)
        .fetch_all(&mut scope)
        .await?;
        scope.commit().await?;

        let total = assessments.len() as i64;
        let critical = assessments
            .iter()
            .filter(|a| a.risk_level == "critical")
            .count() as i64;
        let high = assessments
            .iter()
            .filter(|a| a.risk_level == "high")
            .count() as i64;
        let medium = assessments
            .iter()
            .filter(|a| a.risk_level == "medium")
            .count() as i64;
        let low = assessments.iter().filter(|a| a.risk_level == "low").count() as i64;
        let avg = if total > 0 {
            assessments.iter().map(|a| a.risk_score as f64).sum::<f64>() / total as f64
        } else {
            0.0
        };

        Ok(RiskSummary {
            total_assessments: total,
            critical_count: critical,
            high_count: high,
            medium_count: medium,
            low_count: low,
            average_score: avg,
        })
    }
}

impl ComplianceReportV51 {
    #[allow(clippy::as_conversions, clippy::cast_possible_wrap)]
    pub async fn generate(
        db: &Db,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
        tenant_id: Uuid,
        req: GenerateComplianceReportRequest,
        created_by: &str,
    ) -> Result<(Self, Vec<ComplianceIssueV51>), sqlx::Error> {
        let mut scope = db.scope_with(txn).await?;
        let controls = sqlx::query_as::<_, ControlPoint>(
            only_own_schema_query!("finance", "SELECT id, tenant_id, code, name, description, category, risk_level, \
             control_type, frequency, is_active, created_by, created_at, updated_at \
             FROM finance.finance_control_points WHERE deleted_at IS NULL AND tenant_id = $1 AND is_active = TRUE"),
        )
        .bind(tenant_id)
        .fetch_all(&mut scope)
        .await?;

        let risk_assessments = sqlx::query_as::<_, RiskAssessment>(only_own_schema_query!(
            "finance",
            "SELECT id, tenant_id, control_point_id, likelihood, impact, risk_score, \
             risk_level, mitigation_strategy, residual_risk, assessed_by, \
             created_at, updated_at \
             FROM finance.finance_risk_assessments WHERE tenant_id = $1 \
             ORDER BY created_at DESC"
        ))
        .bind(tenant_id)
        .fetch_all(&mut scope)
        .await?;

        let risk_json = serde_json::json!(risk_assessments
            .iter()
            .map(|ra| {
                serde_json::json!({
                    "id": ra.id,
                    "control_point_id": ra.control_point_id,
                    "risk_score": ra.risk_score,
                    "risk_level": ra.risk_level,
                    "likelihood": ra.likelihood,
                    "impact": ra.impact,
                })
            })
            .collect::<Vec<_>>());

        let mut issues: Vec<ComplianceIssueV51> = Vec::new();
        let mut recommendations: Vec<String> = Vec::new();

        for ctrl in &controls {
            if ctrl.risk_level == "critical" {
                let issue_id = Uuid::new_v4();
                issues.push(ComplianceIssueV51 {
                    id: issue_id,
                    report_id: Uuid::nil(),
                    severity: "critical".to_string(),
                    category: ctrl.category.clone(),
                    control_point_code: ctrl.code.clone(),
                    description: format!(
                        "控制点 '{}' (代码: {}) 风险等级为 critical，需要立即处理",
                        ctrl.name, ctrl.code
                    ),
                    evidence: serde_json::json!({
                        "control_id": ctrl.id,
                        "risk_level": ctrl.risk_level,
                        "control_type": ctrl.control_type,
                    }),
                    impact_assessment: "可能导致重大财务风险或合规违规".to_string(),
                });
                recommendations.push(format!(
                    "立即修复控制点 {}: {}",
                    ctrl.code, ctrl.description
                ));
            } else if ctrl.risk_level == "high" {
                let issue_id = Uuid::new_v4();
                issues.push(ComplianceIssueV51 {
                    id: issue_id,
                    report_id: Uuid::nil(),
                    severity: "high".to_string(),
                    category: ctrl.category.clone(),
                    control_point_code: ctrl.code.clone(),
                    description: format!(
                        "控制点 '{}' (代码: {}) 风险等级为 high，需要优先关注",
                        ctrl.name, ctrl.code
                    ),
                    evidence: serde_json::json!({
                        "control_id": ctrl.id,
                        "risk_level": ctrl.risk_level,
                        "control_type": ctrl.control_type,
                    }),
                    impact_assessment: "可能导致财务数据异常".to_string(),
                });
                recommendations.push(format!(
                    "优先处理控制点 {}: {}",
                    ctrl.code, ctrl.description
                ));
            }
        }

        let checked = controls.len() as i64;
        let found = issues.len() as i64;

        let summary = if found == 0 {
            "合规检查通过，未发现重大问题。".to_string()
        } else {
            format!(
                "本次合规检查共检查 {} 个控制点，发现 {} 个问题，其中 {} 个严重、{} 个高危。",
                checked,
                found,
                issues.iter().filter(|i| i.severity == "critical").count(),
                issues.iter().filter(|i| i.severity == "high").count(),
            )
        };

        let report_id = Uuid::new_v4();
        let now = Utc::now();

        let report = sqlx::query_as::<_, Self>(only_own_schema_query!(
            "finance",
            r#"INSERT INTO finance.finance_compliance_reports
                (id, tenant_id, report_type, period_start, period_end, generated_at,
                 controls_checked, issues_found, risk_assessments, executive_summary,
                 recommendations, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING id, tenant_id, report_type, period_start, period_end, generated_at,
                      controls_checked, issues_found, risk_assessments, executive_summary,
                      recommendations, created_by"#
        ))
        .bind(report_id)
        .bind(tenant_id)
        .bind(&req.report_type)
        .bind(req.period_start)
        .bind(req.period_end)
        .bind(now)
        .bind(checked)
        .bind(found)
        .bind(risk_json)
        .bind(&summary)
        .bind(serde_json::json!(recommendations))
        .bind(created_by)
        .fetch_one(&mut scope)
        .await?;

        let mut saved_issues = Vec::new();
        for issue in &issues {
            let saved = sqlx::query_as::<_, ComplianceIssueV51>(only_own_schema_query!(
                "finance",
                r#"INSERT INTO finance.finance_compliance_issues
                    (id, report_id, severity, category, control_point_code,
                     description, evidence, impact_assessment, tenant_id)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING id, report_id, severity, category, control_point_code,
                          description, evidence, impact_assessment"#
            ))
            .bind(issue.id)
            .bind(report_id)
            .bind(&issue.severity)
            .bind(&issue.category)
            .bind(&issue.control_point_code)
            .bind(&issue.description)
            .bind(&issue.evidence)
            .bind(&issue.impact_assessment)
            .bind(tenant_id)
            .fetch_one(&mut scope)
            .await?;
            saved_issues.push(saved);
        }
        scope.commit().await?;

        Ok((report, saved_issues))
    }

    pub async fn get(
        db: &Db,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
        id: Uuid,
        tenant_id: Option<Uuid>,
    ) -> Result<Self, sqlx::Error> {
        // 系统通道例外（冻结文档 §2.1）：超管跨租户只读汇总
        let mut scope = db.scope_with(txn).await?;
        let report = sqlx::query_as::<_, Self>(only_own_schema_query!(
            "finance",
            "SELECT id, tenant_id, report_type, period_start, period_end, generated_at, \
             controls_checked, issues_found, risk_assessments, executive_summary, \
             recommendations, created_by \
             FROM finance.finance_compliance_reports WHERE id = $1 AND ($2::uuid IS NULL OR tenant_id = $2)"
        ))
        .bind(id)
        .bind(tenant_id)
        .fetch_one(&mut scope)
        .await?;
        scope.commit().await?;
        Ok(report)
    }

    pub async fn list(
        db: &Db,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
        tenant_id: Option<Uuid>,
        report_type: Option<String>,
    ) -> Result<Vec<Self>, sqlx::Error> {
        // 系统通道例外（冻结文档 §2.1）：超管跨租户只读汇总
        let mut scope = db.scope_with(txn).await?;
        let items = if let Some(ref rt) = report_type {
            sqlx::query_as::<_, Self>(only_own_schema_query!(
                "finance",
                "SELECT id, tenant_id, report_type, period_start, period_end, generated_at, \
                 controls_checked, issues_found, risk_assessments, executive_summary, \
                 recommendations, created_by \
                 FROM finance.finance_compliance_reports WHERE ($1::uuid IS NULL OR tenant_id = $1) AND report_type = $2 \
                 ORDER BY generated_at DESC"
            ))
            .bind(tenant_id)
            .bind(rt)
            .fetch_all(&mut scope)
            .await?
        } else {
            sqlx::query_as::<_, Self>(only_own_schema_query!(
                "finance",
                "SELECT id, tenant_id, report_type, period_start, period_end, generated_at, \
                 controls_checked, issues_found, risk_assessments, executive_summary, \
                 recommendations, created_by \
                 FROM finance.finance_compliance_reports WHERE ($1::uuid IS NULL OR tenant_id = $1) \
                 ORDER BY generated_at DESC"
            ))
            .bind(tenant_id)
            .fetch_all(&mut scope)
            .await?
        };
        scope.commit().await?;
        Ok(items)
    }

    pub async fn export(
        db: &Db,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
        id: Uuid,
        tenant_id: Uuid,
    ) -> Result<ExportedComplianceReport, sqlx::Error> {
        let report = Self::get(db, txn, id, Some(tenant_id)).await?;
        let mut scope = db.scope_with(txn).await?;
        let issues = sqlx::query_as::<_, ComplianceIssueV51>(only_own_schema_query!(
            "finance",
            "SELECT id, report_id, severity, category, control_point_code, \
             description, evidence, impact_assessment \
             FROM finance.finance_compliance_issues WHERE report_id = $1 \
             ORDER BY severity, control_point_code"
        ))
        .bind(id)
        .fetch_all(&mut scope)
        .await?;
        scope.commit().await?;

        Ok(ExportedComplianceReport { report, issues })
    }
}

// ==================== API Handlers ====================

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:invoice:write"])),
    path = "/compliance-v51/control-points",
    tag = "Compliance-V51",
    operation_id = "create_control_point_handler",
    responses((status = 200, description = "OK")),
)]
pub async fn create_control_point_handler(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateControlPointRequest>,
) -> ApiResponse<ControlPoint> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let tenant_id = get_tenant_id_from_claims(&claims);
    let created_by = claims.username.clone();
    match ControlPoint::create(&state.db, txn, tenant_id, req, &created_by).await {
        Ok(cp) => ApiResponse::success(cp, "控制点创建成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

pub async fn list_control_points_handler(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ControlPointQueryParams>,
) -> ApiResponse<Vec<ControlPoint>> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(get_tenant_id_from_claims(&claims))
    };
    match ControlPoint::list(
        &state.db,
        txn,
        tenant_id,
        params.category,
        params.is_active,
        params.risk_level,
    )
    .await
    {
        Ok(cps) => ApiResponse::success(cps, "查询成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

pub async fn get_control_point_handler(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<ControlPoint> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(get_tenant_id_from_claims(&claims))
    };
    match ControlPoint::get(&state.db, txn, id, tenant_id).await {
        Ok(cp) => ApiResponse::success(cp, "查询成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

pub async fn update_control_point_handler(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateControlPointRequest>,
) -> ApiResponse<ControlPoint> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let tenant_id = get_tenant_id_from_claims(&claims);
    match ControlPoint::update(&state.db, txn, id, tenant_id, req).await {
        Ok(cp) => ApiResponse::success(cp, "更新成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

pub async fn delete_control_point_handler(
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
    match ControlPoint::delete(&state.db, txn, id, tenant_id).await {
        Ok(_) => ApiResponse::success((), "删除成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:write"])),
    path = "/compliance-v51/control-matrices/generate",
    tag = "Compliance-V51",
    operation_id = "generate_control_matrix_handler",
    responses((status = 200, description = "OK")),
)]
pub async fn generate_control_matrix_handler(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<GenerateControlMatrixRequest>,
) -> ApiResponse<ControlMatrix> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let tenant_id = get_tenant_id_from_claims(&claims);
    let created_by = claims.username.clone();
    match ControlMatrix::generate(&state.db, txn, tenant_id, req, &created_by).await {
        Ok(cm) => ApiResponse::success(cm, "内控矩阵生成成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

pub async fn get_control_matrix_handler(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<ControlMatrix> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(get_tenant_id_from_claims(&claims))
    };
    match ControlMatrix::get(&state.db, txn, id, tenant_id).await {
        Ok(cm) => ApiResponse::success(cm, "查询成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

pub async fn list_control_matrices_handler(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ControlMatrixQueryParams>,
) -> ApiResponse<Vec<ControlMatrix>> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(get_tenant_id_from_claims(&claims))
    };
    match ControlMatrix::list(&state.db, txn, tenant_id, params.period).await {
        Ok(cms) => ApiResponse::success(cms, "查询成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

pub async fn assess_risk_handler(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateRiskAssessmentRequest>,
) -> ApiResponse<RiskAssessment> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let tenant_id = get_tenant_id_from_claims(&claims);
    let assessed_by = claims.username.clone();
    match RiskAssessment::assess(&state.db, txn, tenant_id, req, &assessed_by).await {
        Ok(ra) => ApiResponse::success(ra, "风险评估创建成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

pub async fn get_risk_assessment_handler(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<RiskAssessment> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(get_tenant_id_from_claims(&claims))
    };
    match RiskAssessment::get(&state.db, txn, id, tenant_id).await {
        Ok(ra) => ApiResponse::success(ra, "查询成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}
#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/compliance-v51/risk-assessments",
    responses(
        (status = 200, description = "成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误"),
    ),
    params(
        ("query" = RiskAssessmentQueryParams, Query, description = "查询参数"),
    ),
    tag = "Compliance-V51",
    operation_id = "list_risk_assessments_handler",
)]

pub async fn list_risk_assessments_handler(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<RiskAssessmentQueryParams>,
) -> ApiResponse<Vec<RiskAssessment>> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(get_tenant_id_from_claims(&claims))
    };
    match RiskAssessment::list(
        &state.db,
        txn,
        tenant_id,
        params.control_point_id,
        params.risk_level,
    )
    .await
    {
        Ok(ras) => ApiResponse::success(ras, "查询成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

pub async fn get_risk_summary_handler(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
) -> ApiResponse<RiskSummary> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(get_tenant_id_from_claims(&claims))
    };
    match RiskAssessment::get_summary(&state.db, txn, tenant_id).await {
        Ok(summary) => ApiResponse::success(summary, "查询成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

async fn generate_compliance_report_handler(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<GenerateComplianceReportRequest>,
) -> ApiResponse<(ComplianceReportV51, Vec<ComplianceIssueV51>)> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let tenant_id = get_tenant_id_from_claims(&claims);
    let created_by = claims.username.clone();
    match ComplianceReportV51::generate(&state.db, txn, tenant_id, req, &created_by).await {
        Ok((report, issues)) => ApiResponse::success((report, issues), "合规报告生成成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

pub async fn get_compliance_report_handler(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<ComplianceReportV51> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(get_tenant_id_from_claims(&claims))
    };
    match ComplianceReportV51::get(&state.db, txn, id, tenant_id).await {
        Ok(report) => ApiResponse::success(report, "查询成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}
#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:report:read"])),
    path = "/compliance-v51/reports",
    responses(
        (status = 200, description = "成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误"),
    ),
    params(
        ("query" = ComplianceReportQueryParams, Query, description = "查询参数"),
    ),
    tag = "Compliance-V51",
    operation_id = "list_compliance_reports_handler",
)]

pub async fn list_compliance_reports_handler(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ComplianceReportQueryParams>,
) -> ApiResponse<Vec<ComplianceReportV51>> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(get_tenant_id_from_claims(&claims))
    };
    match ComplianceReportV51::list(&state.db, txn, tenant_id, params.report_type).await {
        Ok(reports) => ApiResponse::success(reports, "查询成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

pub async fn export_compliance_report_handler(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<ExportedComplianceReport> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let tenant_id = get_tenant_id_from_claims(&claims);
    match ComplianceReportV51::export(&state.db, txn, id, tenant_id).await {
        Ok(exported) => ApiResponse::success(exported, "导出成功"),
        Err(e) => crate::shared::err_resp(e),
    }
}

// ==================== 路由注册 ====================

pub fn create_routes() -> Router<AppState> {
    Router::new()
        // A. 控制点 CRUD
        .route(
            "/compliance-v51/control-points",
            axum::routing::post(create_control_point_handler),
        )
        .route(
            "/compliance-v51/control-points",
            axum::routing::get(list_control_points_handler),
        )
        .route(
            "/compliance-v51/control-points/{id}",
            axum::routing::get(get_control_point_handler),
        )
        .route(
            "/compliance-v51/control-points/{id}",
            axum::routing::put(update_control_point_handler),
        )
        .route(
            "/compliance-v51/control-points/{id}",
            axum::routing::delete(delete_control_point_handler),
        )
        // B. 内控矩阵
        .route(
            "/compliance-v51/control-matrices/generate",
            axum::routing::post(generate_control_matrix_handler),
        )
        .route(
            "/compliance-v51/control-matrices",
            axum::routing::get(list_control_matrices_handler),
        )
        .route(
            "/compliance-v51/control-matrices/{id}",
            axum::routing::get(get_control_matrix_handler),
        )
        // C. 风险评估
        .route(
            "/compliance-v51/risk-assessments",
            axum::routing::post(assess_risk_handler),
        )
        .route(
            "/compliance-v51/risk-assessments",
            axum::routing::get(list_risk_assessments_handler),
        )
        .route(
            "/compliance-v51/risk-assessments/summary",
            axum::routing::get(get_risk_summary_handler),
        )
        .route(
            "/compliance-v51/risk-assessments/{id}",
            axum::routing::get(get_risk_assessment_handler),
        )
        // D. 合规报告
        .route(
            "/compliance-v51/reports/generate",
            axum::routing::post(generate_compliance_report_handler),
        )
        .route(
            "/compliance-v51/reports",
            axum::routing::get(list_compliance_reports_handler),
        )
        .route(
            "/compliance-v51/reports/{id}",
            axum::routing::get(get_compliance_report_handler),
        )
        .route(
            "/compliance-v51/reports/{id}/export",
            axum::routing::get(export_compliance_report_handler),
        )
        // 批 41：内控合规路由统一挂 finance:compliance:read 细码（纵深防御；
        // 写端点在网关层 require_finance_write 已要求 finance:admin）
        .layer(axum::middleware::from_fn(
            topems_shared_auth::middleware::require_permission("finance:compliance:read"),
        ))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn rt<T: Serialize + for<'de> Deserialize<'de>>(val: &T) {
        let json = serde_json::to_value(val).unwrap();
        let back: T = serde_json::from_value(json.clone()).unwrap();
        let back_json = serde_json::to_value(&back).unwrap();
        assert_eq!(json, back_json, "roundtrip Value mismatch");
    }

    #[test]
    fn enum_control_category() {
        rt(&ControlCategory::Authorization);
        rt(&ControlCategory::Segregation);
        rt(&ControlCategory::Approval);
        rt(&ControlCategory::Monitoring);
    }

    #[test]
    fn enum_risk_level() {
        rt(&RiskLevel::Low);
        rt(&RiskLevel::Medium);
        rt(&RiskLevel::High);
        rt(&RiskLevel::Critical);
    }

    #[test]
    fn enum_control_type() {
        rt(&ControlType::Preventive);
        rt(&ControlType::Detective);
        rt(&ControlType::Corrective);
    }

    #[test]
    fn enum_report_type() {
        rt(&ReportType::Periodic);
        rt(&ReportType::EventBased);
        rt(&ReportType::AdHoc);
    }

    #[test]
    fn enum_severity() {
        rt(&Severity::Low);
        rt(&Severity::Medium);
        rt(&Severity::High);
        rt(&Severity::Critical);
    }

    #[test]
    fn struct_control_point() {
        let v = ControlPoint {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            code: "C-001".into(),
            name: "审批控制".into(),
            description: "描述".into(),
            category: "authorization".into(),
            risk_level: "medium".into(),
            control_type: "preventive".into(),
            frequency: "daily".into(),
            is_active: true,
            created_by: "tester".into(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        rt(&v);
    }

    #[test]
    fn struct_control_matrix() {
        let v = ControlMatrix {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            name: "Q1矩阵".into(),
            period: "2024-Q1".into(),
            controls: serde_json::json!([{"code":"C-001","status":"effective"}]),
            total_controls: 10,
            effective_controls: 8,
            compliance_rate: 0.8,
            created_by: "tester".into(),
            created_at: Utc::now(),
        };
        rt(&v);
    }

    #[test]
    fn struct_risk_assessment() {
        let v = RiskAssessment {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            control_point_id: Uuid::new_v4(),
            likelihood: "medium".into(),
            impact: "high".into(),
            risk_score: 12,
            risk_level: "high".into(),
            mitigation_strategy: "加强审批".into(),
            residual_risk: "low".into(),
            assessed_by: "tester".into(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        rt(&v);
    }

    #[test]
    fn struct_risk_summary() {
        let v = RiskSummary {
            total_assessments: 100,
            critical_count: 2,
            high_count: 10,
            medium_count: 30,
            low_count: 58,
            average_score: 5.5,
        };
        rt(&v);
    }

    #[test]
    fn struct_compliance_report_v51() {
        let v = ComplianceReportV51 {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            report_type: "periodic".into(),
            period_start: Utc::now(),
            period_end: Utc::now(),
            generated_at: Utc::now(),
            controls_checked: 50,
            issues_found: 3,
            risk_assessments: serde_json::json!([{"level":"high","count":2}]),
            executive_summary: "整体良好".into(),
            recommendations: serde_json::json!(["加强监控"]),
            created_by: "tester".into(),
        };
        rt(&v);
    }

    #[test]
    fn struct_compliance_issue_v51() {
        let v = ComplianceIssueV51 {
            id: Uuid::new_v4(),
            report_id: Uuid::new_v4(),
            severity: "high".into(),
            category: "authorization".into(),
            control_point_code: "C-001".into(),
            description: "缺少审批".into(),
            evidence: serde_json::json!({"doc":"ref-001"}),
            impact_assessment: "中等影响".into(),
        };
        rt(&v);
    }

    #[test]
    fn struct_exported_compliance_report() {
        let v = ExportedComplianceReport {
            report: ComplianceReportV51 {
                id: Uuid::new_v4(),
                tenant_id: Uuid::new_v4(),
                report_type: "periodic".into(),
                period_start: Utc::now(),
                period_end: Utc::now(),
                generated_at: Utc::now(),
                controls_checked: 10,
                issues_found: 0,
                risk_assessments: serde_json::json!([]),
                executive_summary: "ok".into(),
                recommendations: serde_json::json!([]),
                created_by: "tester".into(),
            },
            issues: vec![ComplianceIssueV51 {
                id: Uuid::new_v4(),
                report_id: Uuid::new_v4(),
                severity: "low".into(),
                category: "monitoring".into(),
                control_point_code: "C-002".into(),
                description: "ok".into(),
                evidence: serde_json::Value::Null,
                impact_assessment: "none".into(),
            }],
        };
        rt(&v);
    }

    // ─── P0 补测：纯逻辑函数（2026-10-07，盲区 compliance_v51 0/223）───

    #[test]
    fn calculate_score_multiplication() {
        assert_eq!(RiskAssessment::calculate_score("low", "low"), 1);
        assert_eq!(RiskAssessment::calculate_score("medium", "medium"), 4);
        assert_eq!(RiskAssessment::calculate_score("high", "high"), 9);
        assert_eq!(RiskAssessment::calculate_score("critical", "critical"), 16);
        assert_eq!(RiskAssessment::calculate_score("high", "low"), 3);
        assert_eq!(RiskAssessment::calculate_score("critical", "medium"), 8);
    }

    #[test]
    fn calculate_score_unknown_defaults_to_low() {
        assert_eq!(RiskAssessment::calculate_score("unknown", "high"), 3);
        assert_eq!(RiskAssessment::calculate_score("high", ""), 3);
        assert_eq!(RiskAssessment::calculate_score("", ""), 1);
    }

    #[test]
    fn determine_level_boundaries() {
        assert_eq!(RiskAssessment::determine_level(16), "critical");
        assert_eq!(RiskAssessment::determine_level(12), "critical");
        assert_eq!(RiskAssessment::determine_level(11), "high");
        assert_eq!(RiskAssessment::determine_level(6), "high");
        assert_eq!(RiskAssessment::determine_level(5), "medium");
        assert_eq!(RiskAssessment::determine_level(3), "medium");
        assert_eq!(RiskAssessment::determine_level(2), "low");
        assert_eq!(RiskAssessment::determine_level(0), "low");
    }

    #[test]
    fn severity_as_str_maps_variants() {
        assert_eq!(Severity::Low.as_str(), "low");
        assert_eq!(Severity::Medium.as_str(), "medium");
        assert_eq!(Severity::High.as_str(), "high");
        assert_eq!(Severity::Critical.as_str(), "critical");
    }
}
