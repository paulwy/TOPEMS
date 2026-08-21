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

#![allow(dead_code)]

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
#[derive(Debug, Deserialize, utoipa::IntoParams)]
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
#[derive(Debug, Deserialize, utoipa::IntoParams)]
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
pub async fn init_database(pool: &PgPool) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS finance_control_points (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            code VARCHAR(50) NOT NULL,
            name VARCHAR(200) NOT NULL,
            description TEXT NOT NULL,
            category VARCHAR(30) NOT NULL,
            risk_level VARCHAR(30) NOT NULL,
            control_type VARCHAR(30) NOT NULL,
            frequency VARCHAR(30) NOT NULL,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_by VARCHAR(100) NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                deleted_at TIMESTAMP
        )"#,
    )
    .execute(pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_fcp_tenant ON finance_control_points(tenant_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_fcp_code ON finance_control_points(code)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_fcp_active ON finance_control_points(is_active)")
        .execute(pool)
        .await?;

    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS finance_control_matrices (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            name VARCHAR(200) NOT NULL,
            period VARCHAR(20) NOT NULL,
            controls JSONB NOT NULL DEFAULT '[]'::jsonb,
            total_controls BIGINT NOT NULL DEFAULT 0,
            effective_controls BIGINT NOT NULL DEFAULT 0,
            compliance_rate DOUBLE PRECISION NOT NULL DEFAULT 0.0,
            created_by VARCHAR(100) NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )"#,
    )
    .execute(pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_fcm_tenant ON finance_control_matrices(tenant_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_fcm_period ON finance_control_matrices(period)")
        .execute(pool)
        .await?;

    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS finance_risk_assessments (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            control_point_id UUID NOT NULL REFERENCES finance_control_points(id),
            likelihood VARCHAR(20) NOT NULL,
            impact VARCHAR(20) NOT NULL,
            risk_score INT NOT NULL,
            risk_level VARCHAR(20) NOT NULL,
            mitigation_strategy TEXT NOT NULL,
            residual_risk VARCHAR(20) NOT NULL,
            assessed_by VARCHAR(100) NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )"#,
    )
    .execute(pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_fra_tenant ON finance_risk_assessments(tenant_id)")
        .execute(pool)
        .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_fra_control_point ON finance_risk_assessments(control_point_id)",
    )
    .execute(pool)
    .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_fra_risk_level ON finance_risk_assessments(risk_level)",
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS finance_compliance_reports (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            report_type VARCHAR(30) NOT NULL,
            period_start TIMESTAMPTZ NOT NULL,
            period_end TIMESTAMPTZ NOT NULL,
            generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            controls_checked BIGINT NOT NULL DEFAULT 0,
            issues_found BIGINT NOT NULL DEFAULT 0,
            risk_assessments JSONB NOT NULL DEFAULT '[]'::jsonb,
            executive_summary TEXT NOT NULL,
            recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
            created_by VARCHAR(100) NOT NULL
        )"#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_fcr_tenant ON finance_compliance_reports(tenant_id)",
    )
    .execute(pool)
    .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_fcr_type ON finance_compliance_reports(report_type)",
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS finance_compliance_issues (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            report_id UUID NOT NULL REFERENCES finance_compliance_reports(id),
            severity VARCHAR(20) NOT NULL,
            category VARCHAR(50) NOT NULL,
            control_point_code VARCHAR(50) NOT NULL,
            description TEXT NOT NULL,
            evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
            impact_assessment TEXT NOT NULL
        )"#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_fci_report ON finance_compliance_issues(report_id)",
    )
    .execute(pool)
    .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_fci_severity ON finance_compliance_issues(severity)",
    )
    .execute(pool)
    .await?;

    Ok(())
}

// ==================== 业务逻辑函数 ====================

impl ControlPoint {
    pub async fn create(
        pool: &PgPool,
        tenant_id: Uuid,
        req: CreateControlPointRequest,
        created_by: &str,
    ) -> Result<Self, sqlx::Error> {
        let id = Uuid::new_v4();
        let now = Utc::now();

        sqlx::query_as::<_, Self>(
            r#"INSERT INTO finance_control_points
                (id, tenant_id, code, name, description, category, risk_level,
                 control_type, frequency, is_active, created_by, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING id, tenant_id, code, name, description, category, risk_level,
                      control_type, frequency, is_active, created_by, created_at, updated_at"#,
        )
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
        .fetch_one(pool)
        .await
    }

    pub async fn list(
        pool: &PgPool,
        tenant_id: Uuid,
        category: Option<String>,
        is_active: Option<bool>,
        risk_level: Option<String>,
    ) -> Result<Vec<Self>, sqlx::Error> {
        let mut query = String::from(
            "SELECT id, tenant_id, code, name, description, category, risk_level, \
             control_type, frequency, is_active, created_by, created_at, updated_at \
             FROM finance_control_points WHERE deleted_at IS NULL AND tenant_id = $1",
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

        let mut q = sqlx::query_as::<_, Self>(&query);
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

        q.fetch_all(pool).await
    }

    pub async fn get(pool: &PgPool, id: Uuid, tenant_id: Uuid) -> Result<Self, sqlx::Error> {
        sqlx::query_as::<_, Self>(
            "SELECT id, tenant_id, code, name, description, category, risk_level, \
             control_type, frequency, is_active, created_by, created_at, updated_at \
             FROM finance_control_points WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL",
        )
        .bind(id)
        .bind(tenant_id)
        .fetch_one(pool)
        .await
    }

    pub async fn update(
        pool: &PgPool,
        id: Uuid,
        tenant_id: Uuid,
        req: UpdateControlPointRequest,
    ) -> Result<Self, sqlx::Error> {
        let now = Utc::now();

        sqlx::query_as::<_, Self>(
            r#"UPDATE finance_control_points
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
                      control_type, frequency, is_active, created_by, created_at, updated_at"#,
        )
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
        .fetch_one(pool)
        .await
    }

    pub async fn delete(pool: &PgPool, id: Uuid, tenant_id: Uuid) -> Result<(), sqlx::Error> {
        sqlx::query(
            "UPDATE finance_control_points SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2",
        )
        .bind(id)
        .bind(tenant_id)
        .execute(pool)
        .await?;
        Ok(())
    }
}

impl ControlMatrix {
    pub async fn generate(
        pool: &PgPool,
        tenant_id: Uuid,
        req: GenerateControlMatrixRequest,
        created_by: &str,
    ) -> Result<Self, sqlx::Error> {
        let active_controls = sqlx::query_as::<_, ControlPoint>(
            "SELECT id, tenant_id, code, name, description, category, risk_level, \
             control_type, frequency, is_active, created_by, created_at, updated_at \
             FROM finance_control_points WHERE deleted_at IS NULL AND tenant_id = $1 AND is_active = TRUE",
        )
        .bind(tenant_id)
        .fetch_all(pool)
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

        sqlx::query_as::<_, Self>(
            r#"INSERT INTO finance_control_matrices
                (id, tenant_id, name, period, controls, total_controls,
                 effective_controls, compliance_rate, created_by, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id, tenant_id, name, period, controls, total_controls,
                      effective_controls, compliance_rate, created_by, created_at"#,
        )
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
        .fetch_one(pool)
        .await
    }

    pub async fn get(pool: &PgPool, id: Uuid, tenant_id: Uuid) -> Result<Self, sqlx::Error> {
        sqlx::query_as::<_, Self>(
            "SELECT id, tenant_id, name, period, controls, total_controls, \
             effective_controls, compliance_rate, created_by, created_at \
             FROM finance_control_matrices WHERE id = $1 AND tenant_id = $2",
        )
        .bind(id)
        .bind(tenant_id)
        .fetch_one(pool)
        .await
    }

    pub async fn list(
        pool: &PgPool,
        tenant_id: Uuid,
        period: Option<String>,
    ) -> Result<Vec<Self>, sqlx::Error> {
        if let Some(ref p) = period {
            sqlx::query_as::<_, Self>(
                "SELECT id, tenant_id, name, period, controls, total_controls, \
                 effective_controls, compliance_rate, created_by, created_at \
                 FROM finance_control_matrices WHERE tenant_id = $1 AND period = $2 \
                 ORDER BY created_at DESC",
            )
            .bind(tenant_id)
            .bind(p)
            .fetch_all(pool)
            .await
        } else {
            sqlx::query_as::<_, Self>(
                "SELECT id, tenant_id, name, period, controls, total_controls, \
                 effective_controls, compliance_rate, created_by, created_at \
                 FROM finance_control_matrices WHERE tenant_id = $1 \
                 ORDER BY created_at DESC",
            )
            .bind(tenant_id)
            .fetch_all(pool)
            .await
        }
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
        pool: &PgPool,
        tenant_id: Uuid,
        req: CreateRiskAssessmentRequest,
        assessed_by: &str,
    ) -> Result<Self, sqlx::Error> {
        let score = Self::calculate_score(&req.likelihood, &req.impact);
        let level = Self::determine_level(score);
        let id = Uuid::new_v4();
        let now = Utc::now();

        sqlx::query_as::<_, Self>(
            r#"INSERT INTO finance_risk_assessments
                (id, tenant_id, control_point_id, likelihood, impact, risk_score,
                 risk_level, mitigation_strategy, residual_risk, assessed_by,
                 created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING id, tenant_id, control_point_id, likelihood, impact, risk_score,
                      risk_level, mitigation_strategy, residual_risk, assessed_by,
                      created_at, updated_at"#,
        )
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
        .fetch_one(pool)
        .await
    }

    pub async fn get(pool: &PgPool, id: Uuid, tenant_id: Uuid) -> Result<Self, sqlx::Error> {
        sqlx::query_as::<_, Self>(
            "SELECT id, tenant_id, control_point_id, likelihood, impact, risk_score, \
             risk_level, mitigation_strategy, residual_risk, assessed_by, \
             created_at, updated_at \
             FROM finance_risk_assessments WHERE id = $1 AND tenant_id = $2",
        )
        .bind(id)
        .bind(tenant_id)
        .fetch_one(pool)
        .await
    }

    pub async fn list(
        pool: &PgPool,
        tenant_id: Uuid,
        control_point_id: Option<Uuid>,
        risk_level: Option<String>,
    ) -> Result<Vec<Self>, sqlx::Error> {
        let mut query = String::from(
            "SELECT id, tenant_id, control_point_id, likelihood, impact, risk_score, \
             risk_level, mitigation_strategy, residual_risk, assessed_by, \
             created_at, updated_at \
             FROM finance_risk_assessments WHERE tenant_id = $1",
        );

        if control_point_id.is_some() {
            query.push_str(" AND control_point_id = $2");
        }
        if risk_level.is_some() {
            let idx = if control_point_id.is_some() { "3" } else { "2" };
            query.push_str(&format!(" AND risk_level = ${}", idx));
        }
        query.push_str(" ORDER BY created_at DESC");

        let mut q = sqlx::query_as::<_, Self>(&query);
        q = q.bind(tenant_id);
        if let Some(cp_id) = control_point_id {
            q = q.bind(cp_id);
        }
        if let Some(ref rl) = risk_level {
            q = q.bind(rl);
        }
        q.fetch_all(pool).await
    }

    pub async fn get_summary(pool: &PgPool, tenant_id: Uuid) -> Result<RiskSummary, sqlx::Error> {
        let assessments = sqlx::query_as::<_, Self>(
            "SELECT id, tenant_id, control_point_id, likelihood, impact, risk_score, \
             risk_level, mitigation_strategy, residual_risk, assessed_by, \
             created_at, updated_at \
             FROM finance_risk_assessments WHERE tenant_id = $1",
        )
        .bind(tenant_id)
        .fetch_all(pool)
        .await?;

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
    pub async fn generate(
        pool: &PgPool,
        tenant_id: Uuid,
        req: GenerateComplianceReportRequest,
        created_by: &str,
    ) -> Result<(Self, Vec<ComplianceIssueV51>), sqlx::Error> {
        let controls = sqlx::query_as::<_, ControlPoint>(
            "SELECT id, tenant_id, code, name, description, category, risk_level, \
             control_type, frequency, is_active, created_by, created_at, updated_at \
             FROM finance_control_points WHERE deleted_at IS NULL AND tenant_id = $1 AND is_active = TRUE",
        )
        .bind(tenant_id)
        .fetch_all(pool)
        .await?;

        let risk_assessments = sqlx::query_as::<_, RiskAssessment>(
            "SELECT id, tenant_id, control_point_id, likelihood, impact, risk_score, \
             risk_level, mitigation_strategy, residual_risk, assessed_by, \
             created_at, updated_at \
             FROM finance_risk_assessments WHERE tenant_id = $1 \
             ORDER BY created_at DESC",
        )
        .bind(tenant_id)
        .fetch_all(pool)
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

        let report = sqlx::query_as::<_, Self>(
            r#"INSERT INTO finance_compliance_reports
                (id, tenant_id, report_type, period_start, period_end, generated_at,
                 controls_checked, issues_found, risk_assessments, executive_summary,
                 recommendations, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING id, tenant_id, report_type, period_start, period_end, generated_at,
                      controls_checked, issues_found, risk_assessments, executive_summary,
                      recommendations, created_by"#,
        )
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
        .fetch_one(pool)
        .await?;

        let mut saved_issues = Vec::new();
        for issue in &issues {
            let saved = sqlx::query_as::<_, ComplianceIssueV51>(
                r#"INSERT INTO finance_compliance_issues
                    (id, report_id, severity, category, control_point_code,
                     description, evidence, impact_assessment)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id, report_id, severity, category, control_point_code,
                          description, evidence, impact_assessment"#,
            )
            .bind(issue.id)
            .bind(report_id)
            .bind(&issue.severity)
            .bind(&issue.category)
            .bind(&issue.control_point_code)
            .bind(&issue.description)
            .bind(&issue.evidence)
            .bind(&issue.impact_assessment)
            .fetch_one(pool)
            .await?;
            saved_issues.push(saved);
        }

        Ok((report, saved_issues))
    }

    pub async fn get(pool: &PgPool, id: Uuid, tenant_id: Uuid) -> Result<Self, sqlx::Error> {
        sqlx::query_as::<_, Self>(
            "SELECT id, tenant_id, report_type, period_start, period_end, generated_at, \
             controls_checked, issues_found, risk_assessments, executive_summary, \
             recommendations, created_by \
             FROM finance_compliance_reports WHERE id = $1 AND tenant_id = $2",
        )
        .bind(id)
        .bind(tenant_id)
        .fetch_one(pool)
        .await
    }

    pub async fn list(
        pool: &PgPool,
        tenant_id: Uuid,
        report_type: Option<String>,
    ) -> Result<Vec<Self>, sqlx::Error> {
        if let Some(ref rt) = report_type {
            sqlx::query_as::<_, Self>(
                "SELECT id, tenant_id, report_type, period_start, period_end, generated_at, \
                 controls_checked, issues_found, risk_assessments, executive_summary, \
                 recommendations, created_by \
                 FROM finance_compliance_reports WHERE tenant_id = $1 AND report_type = $2 \
                 ORDER BY generated_at DESC",
            )
            .bind(tenant_id)
            .bind(rt)
            .fetch_all(pool)
            .await
        } else {
            sqlx::query_as::<_, Self>(
                "SELECT id, tenant_id, report_type, period_start, period_end, generated_at, \
                 controls_checked, issues_found, risk_assessments, executive_summary, \
                 recommendations, created_by \
                 FROM finance_compliance_reports WHERE tenant_id = $1 \
                 ORDER BY generated_at DESC",
            )
            .bind(tenant_id)
            .fetch_all(pool)
            .await
        }
    }

    pub async fn export(
        pool: &PgPool,
        id: Uuid,
        tenant_id: Uuid,
    ) -> Result<ExportedComplianceReport, sqlx::Error> {
        let report = Self::get(pool, id, tenant_id).await?;
        let issues = sqlx::query_as::<_, ComplianceIssueV51>(
            "SELECT id, report_id, severity, category, control_point_code, \
             description, evidence, impact_assessment \
             FROM finance_compliance_issues WHERE report_id = $1 \
             ORDER BY severity, control_point_code",
        )
        .bind(id)
        .fetch_all(pool)
        .await?;

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
async fn create_control_point_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateControlPointRequest>,
) -> Json<ApiResponse<ControlPoint>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let created_by = claims.username.clone();
    match ControlPoint::create(&state.pool, tenant_id, req, &created_by).await {
        Ok(cp) => Json(ApiResponse::success(cp, "控制点创建成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/finance-v51/control_points",
    tag = "ComplianceV51",
    operation_id = "list_control_points_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn list_control_points_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ControlPointQueryParams>,
) -> Json<ApiResponse<Vec<ControlPoint>>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    match ControlPoint::list(
        &state.pool,
        tenant_id,
        params.category,
        params.is_active,
        params.risk_level,
    )
    .await
    {
        Ok(cps) => Json(ApiResponse::success(cps, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/finance-v51/control_point/{id}",
    tag = "ComplianceV51",
    operation_id = "get_control_point_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn get_control_point_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<ControlPoint>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    match ControlPoint::get(&state.pool, id, tenant_id).await {
        Ok(cp) => Json(ApiResponse::success(cp, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["finance:update"])),
    path = "/finance-v51/control_point/{id}",
    tag = "ComplianceV51",
    operation_id = "update_control_point_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn update_control_point_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateControlPointRequest>,
) -> Json<ApiResponse<ControlPoint>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    match ControlPoint::update(&state.pool, id, tenant_id, req).await {
        Ok(cp) => Json(ApiResponse::success(cp, "更新成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["finance:delete"])),
    path = "/finance-v51/control_point/{id}",
    tag = "ComplianceV51",
    operation_id = "delete_control_point_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn delete_control_point_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<()>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    match ControlPoint::delete(&state.pool, id, tenant_id).await {
        Ok(_) => Json(ApiResponse::success((), "删除成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
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
async fn generate_control_matrix_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<GenerateControlMatrixRequest>,
) -> Json<ApiResponse<ControlMatrix>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let created_by = claims.username.clone();
    match ControlMatrix::generate(&state.pool, tenant_id, req, &created_by).await {
        Ok(cm) => Json(ApiResponse::success(cm, "内控矩阵生成成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/finance-v51/control_matrix/{id}",
    tag = "ComplianceV51",
    operation_id = "get_control_matrix_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn get_control_matrix_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<ControlMatrix>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    match ControlMatrix::get(&state.pool, id, tenant_id).await {
        Ok(cm) => Json(ApiResponse::success(cm, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/finance-v51/control_matrices",
    tag = "ComplianceV51",
    operation_id = "list_control_matrices_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn list_control_matrices_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ControlMatrixQueryParams>,
) -> Json<ApiResponse<Vec<ControlMatrix>>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    match ControlMatrix::list(&state.pool, tenant_id, params.period).await {
        Ok(cms) => Json(ApiResponse::success(cms, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:write"])),
    path = "/finance-v51/risk",
    tag = "ComplianceV51",
    operation_id = "assess_risk_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn assess_risk_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateRiskAssessmentRequest>,
) -> Json<ApiResponse<RiskAssessment>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let assessed_by = claims.username.clone();
    match RiskAssessment::assess(&state.pool, tenant_id, req, &assessed_by).await {
        Ok(ra) => Json(ApiResponse::success(ra, "风险评估创建成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/finance-v51/risk_assessment/{id}",
    tag = "ComplianceV51",
    operation_id = "get_risk_assessment_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn get_risk_assessment_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<RiskAssessment>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    match RiskAssessment::get(&state.pool, id, tenant_id).await {
        Ok(ra) => Json(ApiResponse::success(ra, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
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

async fn list_risk_assessments_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<RiskAssessmentQueryParams>,
) -> Json<ApiResponse<Vec<RiskAssessment>>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    match RiskAssessment::list(
        &state.pool,
        tenant_id,
        params.control_point_id,
        params.risk_level,
    )
    .await
    {
        Ok(ras) => Json(ApiResponse::success(ras, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/finance-v51/risk_summary",
    tag = "ComplianceV51",
    operation_id = "get_risk_summary_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn get_risk_summary_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<RiskSummary>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    match RiskAssessment::get_summary(&state.pool, tenant_id).await {
        Ok(summary) => Json(ApiResponse::success(summary, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:report:read"])),
    path = "/finance-v51/compliance_report",
    tag = "ComplianceV51",
    operation_id = "generate_compliance_report_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn generate_compliance_report_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<GenerateComplianceReportRequest>,
) -> Json<ApiResponse<(ComplianceReportV51, Vec<ComplianceIssueV51>)>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let created_by = claims.username.clone();
    match ComplianceReportV51::generate(&state.pool, tenant_id, req, &created_by).await {
        Ok((report, issues)) => Json(ApiResponse::success((report, issues), "合规报告生成成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:report:read"])),
    path = "/finance-v51/compliance_report/{id}",
    tag = "ComplianceV51",
    operation_id = "get_compliance_report_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn get_compliance_report_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<ComplianceReportV51>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    match ComplianceReportV51::get(&state.pool, id, tenant_id).await {
        Ok(report) => Json(ApiResponse::success(report, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
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

async fn list_compliance_reports_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ComplianceReportQueryParams>,
) -> Json<ApiResponse<Vec<ComplianceReportV51>>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    match ComplianceReportV51::list(&state.pool, tenant_id, params.report_type).await {
        Ok(reports) => Json(ApiResponse::success(reports, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:report:read"])),
    path = "/finance-v51/compliance_report",
    tag = "ComplianceV51",
    operation_id = "export_compliance_report_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn export_compliance_report_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<ExportedComplianceReport>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    match ComplianceReportV51::export(&state.pool, id, tenant_id).await {
        Ok(exported) => Json(ApiResponse::success(exported, "导出成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
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
}
