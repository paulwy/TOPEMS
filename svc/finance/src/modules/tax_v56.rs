#![allow(dead_code)] // Reserved: V56 智能税务模块，待业务接入后启用

//! STATUS: WIRED | Routes registered + DB tables initialized + Handlers implemented
//! V56.0 Finance 智能税务
//!
//! 核心能力：
//! - 自动税务申报 (Auto Tax Filing): 多 jurisdiction 自动生成税务表单、计算税金、提交申报
//! - 税率计算 (Tax Rate Calculation): 渐进式税率档位、多税种计算、税务明细分解
//! - 税务筹划 (Tax Planning): 场景建模、策略推荐、方案对比、合规检查
//!
//! 路由：
//! - POST   /finance-v56/tax/generate
//! - GET    /finance-v56/tax/forms
//! - GET    /finance-v56/tax/forms/{id}
//! - POST   /finance-v56/tax/forms/{id}/submit
//! - POST   /finance-v56/tax/forms/{id}/amend
//! - GET    /finance-v56/tax/summary
//! - GET    /finance-v56/tax/schedule
//! - POST   /finance-v56/tax/calculate
//! - GET    /finance-v56/tax/rates
//! - GET    /finance-v56/tax/rates/lookup
//! - GET    /finance-v56/tax/breakdown
//! - GET    /finance-v56/tax/validate
//! - POST   /finance-v56/tax/plan
//! - POST   /finance-v56/tax/scenario
//! - GET    /finance-v56/tax/suggestions
//! - GET    /finance-v56/tax/comparison
//! - GET    /finance-v56/tax/plans
//! - PUT    /finance-v56/tax/plans/{id}/approve
//! - GET    /finance-v56/tax/compliance

use axum::{
    extract::{Extension, Json, Path, Query, State},
    Router,
};
use chrono::{DateTime, Utc};
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
pub enum TaxFormType {
    VAT,
    CIT,
    PIT,
    Withholding,
    Stamp,
}

impl TaxFormType {
    fn as_str(&self) -> &'static str {
        match self {
            TaxFormType::VAT => "vat",
            TaxFormType::CIT => "cit",
            TaxFormType::PIT => "pit",
            TaxFormType::Withholding => "withholding",
            TaxFormType::Stamp => "stamp",
        }
    }

    fn from_str(s: &str) -> Self {
        match s {
            "cit" => TaxFormType::CIT,
            "pit" => TaxFormType::PIT,
            "withholding" => TaxFormType::Withholding,
            "stamp" => TaxFormType::Stamp,
            _ => TaxFormType::VAT,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum TaxFormStatus {
    Draft,
    Calculated,
    Submitted,
    Accepted,
    Rejected,
}

impl TaxFormStatus {
    fn as_str(&self) -> &'static str {
        match self {
            TaxFormStatus::Draft => "draft",
            TaxFormStatus::Calculated => "calculated",
            TaxFormStatus::Submitted => "submitted",
            TaxFormStatus::Accepted => "accepted",
            TaxFormStatus::Rejected => "rejected",
        }
    }

    fn from_str(s: &str) -> Self {
        match s {
            "calculated" => TaxFormStatus::Calculated,
            "submitted" => TaxFormStatus::Submitted,
            "accepted" => TaxFormStatus::Accepted,
            "rejected" => TaxFormStatus::Rejected,
            _ => TaxFormStatus::Draft,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum TaxRateType {
    VAT,
    CIT,
    PIT,
    Withholding,
    Stamp,
}

impl TaxRateType {
    fn as_str(&self) -> &'static str {
        match self {
            TaxRateType::VAT => "vat",
            TaxRateType::CIT => "cit",
            TaxRateType::PIT => "pit",
            TaxRateType::Withholding => "withholding",
            TaxRateType::Stamp => "stamp",
        }
    }

    fn from_str(s: &str) -> Self {
        match s {
            "cit" => TaxRateType::CIT,
            "pit" => TaxRateType::PIT,
            "withholding" => TaxRateType::Withholding,
            "stamp" => TaxRateType::Stamp,
            _ => TaxRateType::VAT,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum TaxPlanStrategy {
    LegalOptimization,
    DeductionMaximization,
    TimingStrategy,
    HoldingOptimization,
}

impl TaxPlanStrategy {
    fn as_str(&self) -> &'static str {
        match self {
            TaxPlanStrategy::LegalOptimization => "legal_optimization",
            TaxPlanStrategy::DeductionMaximization => "deduction_maximization",
            TaxPlanStrategy::TimingStrategy => "timing_strategy",
            TaxPlanStrategy::HoldingOptimization => "holding_optimization",
        }
    }

    fn from_str(s: &str) -> Self {
        match s {
            "deduction_maximization" => TaxPlanStrategy::DeductionMaximization,
            "timing_strategy" => TaxPlanStrategy::TimingStrategy,
            "holding_optimization" => TaxPlanStrategy::HoldingOptimization,
            _ => TaxPlanStrategy::LegalOptimization,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum TaxPlanRiskLevel {
    Low,
    Medium,
    High,
}

impl TaxPlanRiskLevel {
    fn as_str(&self) -> &'static str {
        match self {
            TaxPlanRiskLevel::Low => "low",
            TaxPlanRiskLevel::Medium => "medium",
            TaxPlanRiskLevel::High => "high",
        }
    }

    fn from_str(s: &str) -> Self {
        match s {
            "medium" => TaxPlanRiskLevel::Medium,
            "high" => TaxPlanRiskLevel::High,
            _ => TaxPlanRiskLevel::Low,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum TaxPlanStatus {
    Draft,
    Proposed,
    UnderReview,
    Approved,
    Rejected,
    Executed,
}

impl TaxPlanStatus {
    fn as_str(&self) -> &'static str {
        match self {
            TaxPlanStatus::Draft => "draft",
            TaxPlanStatus::Proposed => "proposed",
            TaxPlanStatus::UnderReview => "under_review",
            TaxPlanStatus::Approved => "approved",
            TaxPlanStatus::Rejected => "rejected",
            TaxPlanStatus::Executed => "executed",
        }
    }

    fn from_str(s: &str) -> Self {
        match s {
            "proposed" => TaxPlanStatus::Proposed,
            "under_review" => TaxPlanStatus::UnderReview,
            "approved" => TaxPlanStatus::Approved,
            "rejected" => TaxPlanStatus::Rejected,
            "executed" => TaxPlanStatus::Executed,
            _ => TaxPlanStatus::Draft,
        }
    }
}

// ==================== 数据模型 ====================

// --- 自动税务申报 ---

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct TaxForm {
    pub id: Uuid,
    pub form_type: String,
    pub jurisdiction: String,
    pub period_start: DateTime<Utc>,
    pub period_end: DateTime<Utc>,
    pub status: String,
    pub total_tax_amount: f64,
    pub filed_at: Option<DateTime<Utc>>,
    pub accepted_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct TaxLine {
    pub id: Uuid,
    pub form_id: Uuid,
    pub line_no: i32,
    pub description: String,
    pub taxable_amount: f64,
    pub tax_rate: f64,
    pub tax_amount: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaxFormWithLines {
    #[serde(flatten)]
    pub form: TaxForm,
    pub lines: Vec<TaxLine>,
}

// --- 税率计算 ---

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct TaxRate {
    pub id: Uuid,
    pub jurisdiction: String,
    pub rate_type: String,
    pub rate: f64,
    pub effective_from: DateTime<Utc>,
    pub effective_to: Option<DateTime<Utc>>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct TaxBracket {
    pub id: Uuid,
    pub rate_id: Uuid,
    pub bracket_order: i32,
    pub threshold_from: f64,
    pub threshold_to: Option<f64>,
    pub rate: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaxResult {
    pub taxable_amount: f64,
    pub rate: f64,
    pub tax_amount: f64,
    pub breakdown: Vec<TaxBreakdown>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaxBreakdown {
    pub bracket_order: i32,
    pub threshold_from: f64,
    pub threshold_to: Option<f64>,
    pub rate: f64,
    pub taxable_in_bracket: f64,
    pub tax_in_bracket: f64,
}

// --- 税务筹划 ---

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct TaxPlan {
    pub id: Uuid,
    pub entity: String,
    pub period: String,
    pub strategy: String,
    pub projected_savings: f64,
    pub risk_level: String,
    pub status: String,
    pub approved_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct TaxSuggestion {
    pub id: Uuid,
    pub plan_id: Uuid,
    pub category: String,
    pub description: String,
    pub estimated_savings: f64,
    pub confidence: f64,
    pub action_items: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComplianceCheckResult {
    pub compliant: bool,
    pub issues: Vec<String>,
    pub warnings: Vec<String>,
    pub suggestions: Vec<String>,
}

// ==================== 数据库初始化 ====================

pub async fn init_tax_v56_tables(pool: &PgPool) -> Result<(), sqlx::Error> {
    let create_tables = vec![
        "CREATE TABLE IF NOT EXISTS finance_v56_tax_forms (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES core_tenants(id),
            form_type VARCHAR(30) NOT NULL DEFAULT 'vat',
            jurisdiction VARCHAR(100) NOT NULL DEFAULT 'CN',
            period_start TIMESTAMPTZ NOT NULL,
            period_end TIMESTAMPTZ NOT NULL,
            status VARCHAR(30) NOT NULL DEFAULT 'draft',
            total_tax_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
            filed_at TIMESTAMPTZ,
            accepted_at TIMESTAMPTZ,
            rejected_at TIMESTAMPTZ,
            rejection_reason TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        )",
        "CREATE INDEX IF NOT EXISTS idx_v56_tax_forms_tenant ON finance_v56_tax_forms(tenant_id)",
        "CREATE INDEX IF NOT EXISTS idx_v56_tax_forms_type ON finance_v56_tax_forms(form_type)",
        "CREATE INDEX IF NOT EXISTS idx_v56_tax_forms_status ON finance_v56_tax_forms(status)",
        "CREATE INDEX IF NOT EXISTS idx_v56_tax_forms_period ON finance_v56_tax_forms(period_start, period_end)",
        "CREATE TABLE IF NOT EXISTS finance_v56_tax_lines (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES core_tenants(id),
            form_id UUID NOT NULL,
            line_no INTEGER NOT NULL,
            description VARCHAR(500) NOT NULL,
            taxable_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
            tax_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
            tax_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
                deleted_at TIMESTAMP
        )",
        "CREATE INDEX IF NOT EXISTS idx_v56_tax_lines_tenant ON finance_v56_tax_lines(tenant_id)",
        "CREATE INDEX IF NOT EXISTS idx_v56_tax_lines_form ON finance_v56_tax_lines(form_id)",
        "CREATE TABLE IF NOT EXISTS finance_v56_tax_rates (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES core_tenants(id),
            jurisdiction VARCHAR(100) NOT NULL DEFAULT 'CN',
            rate_type VARCHAR(30) NOT NULL DEFAULT 'vat',
            rate DOUBLE PRECISION NOT NULL DEFAULT 0,
            effective_from TIMESTAMPTZ NOT NULL,
            effective_to TIMESTAMPTZ,
            description TEXT
        )",
        "CREATE INDEX IF NOT EXISTS idx_v56_tax_rates_tenant ON finance_v56_tax_rates(tenant_id)",
        "CREATE INDEX IF NOT EXISTS idx_v56_tax_rates_type ON finance_v56_tax_rates(rate_type)",
        "CREATE INDEX IF NOT EXISTS idx_v56_tax_rates_jurisdiction ON finance_v56_tax_rates(jurisdiction)",
        "CREATE TABLE IF NOT EXISTS finance_v56_tax_brackets (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES core_tenants(id),
            rate_id UUID NOT NULL,
            bracket_order INTEGER NOT NULL,
            threshold_from DOUBLE PRECISION NOT NULL DEFAULT 0,
            threshold_to DOUBLE PRECISION,
            rate DOUBLE PRECISION NOT NULL DEFAULT 0
        )",
        "CREATE INDEX IF NOT EXISTS idx_v56_tax_brackets_tenant ON finance_v56_tax_brackets(tenant_id)",
        "CREATE INDEX IF NOT EXISTS idx_v56_tax_brackets_rate ON finance_v56_tax_brackets(rate_id)",
        "CREATE TABLE IF NOT EXISTS finance_v56_tax_plans (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES core_tenants(id),
            entity VARCHAR(255) NOT NULL,
            period VARCHAR(50) NOT NULL,
            strategy VARCHAR(50) NOT NULL DEFAULT 'legal_optimization',
            projected_savings DOUBLE PRECISION NOT NULL DEFAULT 0,
            risk_level VARCHAR(20) NOT NULL DEFAULT 'low',
            status VARCHAR(30) NOT NULL DEFAULT 'draft',
            approved_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        )",
        "CREATE INDEX IF NOT EXISTS idx_v56_tax_plans_tenant ON finance_v56_tax_plans(tenant_id)",
        "CREATE INDEX IF NOT EXISTS idx_v56_tax_plans_entity ON finance_v56_tax_plans(entity)",
        "CREATE INDEX IF NOT EXISTS idx_v56_tax_plans_status ON finance_v56_tax_plans(status)",
        "CREATE TABLE IF NOT EXISTS finance_v56_tax_suggestions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES core_tenants(id),
            plan_id UUID NOT NULL,
            category VARCHAR(50) NOT NULL,
            description TEXT NOT NULL,
            estimated_savings DOUBLE PRECISION NOT NULL DEFAULT 0,
            confidence DOUBLE PRECISION NOT NULL DEFAULT 0,
            action_items TEXT[]
        )",
        "CREATE INDEX IF NOT EXISTS idx_v56_tax_suggestions_tenant ON finance_v56_tax_suggestions(tenant_id)",
        "CREATE INDEX IF NOT EXISTS idx_v56_tax_suggestions_plan ON finance_v56_tax_suggestions(plan_id)",
    ];

    for sql in create_tables {
        sqlx::query(sql).execute(pool).await?;
    }
    Ok(())
}

// ==================== 1. 自动税务申报 ====================

pub struct AutoTaxFiler;

#[derive(Debug, Deserialize)]
pub struct GenerateTaxFormRequest {
    pub form_type: Option<String>,
    pub jurisdiction: Option<String>,
    pub period_start: DateTime<Utc>,
    pub period_end: DateTime<Utc>,
    pub entity: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct AmendTaxFormRequest {
    pub lines: Vec<TaxLineInput>,
    pub reason: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaxLineInput {
    pub line_no: i32,
    pub description: String,
    pub taxable_amount: f64,
    pub tax_rate: f64,
}

impl AutoTaxFiler {
    pub async fn generate_tax_form(
        pool: &PgPool,
        tenant_id: Uuid,
        req: GenerateTaxFormRequest,
    ) -> Result<TaxFormWithLines, sqlx::Error> {
        let id = Uuid::new_v4();
        let form_type = req
            .form_type
            .unwrap_or_else(|| TaxFormType::VAT.as_str().to_string());
        let jurisdiction = req.jurisdiction.unwrap_or_else(|| "CN".to_string());

        sqlx::query(
            r#"INSERT INTO finance_v56_tax_forms
                (id, tenant_id, form_type, jurisdiction, period_start, period_end, status, total_tax_amount)
            VALUES ($1, $2, $3, $4, $5, $6, 'draft', 0)
            RETURNING id, form_type, jurisdiction, period_start, period_end, status, total_tax_amount, filed_at, accepted_at"#,
        )
        .bind(id)
        .bind(tenant_id)
        .bind(&form_type)
        .bind(&jurisdiction)
        .bind(req.period_start)
        .bind(req.period_end)
        .fetch_one(pool)
        .await?;

        let form = TaxForm {
            id,
            form_type,
            jurisdiction,
            period_start: req.period_start,
            period_end: req.period_end,
            status: TaxFormStatus::Draft.as_str().to_string(),
            total_tax_amount: 0.0,
            filed_at: None,
            accepted_at: None,
        };

        Ok(TaxFormWithLines {
            form,
            lines: vec![],
        })
    }

    pub async fn calculate_tax(
        pool: &PgPool,
        tenant_id: Uuid,
        form_id: Uuid,
        lines: Vec<TaxLineInput>,
    ) -> Result<TaxFormWithLines, sqlx::Error> {
        let mut total_tax: f64 = 0.0;
        let mut saved_lines: Vec<TaxLine> = Vec::new();

        for line_input in &lines {
            let tax_amount =
                (line_input.taxable_amount * line_input.tax_rate * 100.0).round() / 100.0;
            total_tax += tax_amount;

            let line_id = Uuid::new_v4();
            sqlx::query(
                r#"INSERT INTO finance_v56_tax_lines
                    (id, tenant_id, form_id, line_no, description, taxable_amount, tax_rate, tax_amount)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)"#,
            )
            .bind(line_id)
            .bind(tenant_id)
            .bind(form_id)
            .bind(line_input.line_no)
            .bind(&line_input.description)
            .bind(line_input.taxable_amount)
            .bind(line_input.tax_rate)
            .bind(tax_amount)
            .execute(pool)
            .await?;

            saved_lines.push(TaxLine {
                id: line_id,
                form_id,
                line_no: line_input.line_no,
                description: line_input.description.clone(),
                taxable_amount: line_input.taxable_amount,
                tax_rate: line_input.tax_rate,
                tax_amount,
            });
        }

        let updated_form: TaxForm = sqlx::query_as(
            r#"UPDATE finance_v56_tax_forms
            SET status = 'calculated', total_tax_amount = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2 AND tenant_id = $3
            RETURNING id, form_type, jurisdiction, period_start, period_end, status, total_tax_amount, filed_at, accepted_at"#,
        )
        .bind(total_tax)
        .bind(form_id)
        .bind(tenant_id)
        .fetch_one(pool)
        .await?;

        Ok(TaxFormWithLines {
            form: updated_form,
            lines: saved_lines,
        })
    }

    pub async fn submit_form(
        pool: &PgPool,
        tenant_id: Uuid,
        form_id: Uuid,
    ) -> Result<TaxFormWithLines, sqlx::Error> {
        let now = Utc::now();
        let updated_form: TaxForm = sqlx::query_as(
            r#"UPDATE finance_v56_tax_forms
            SET status = 'submitted', filed_at = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2 AND tenant_id = $3
            RETURNING id, form_type, jurisdiction, period_start, period_end, status, total_tax_amount, filed_at, accepted_at"#,
        )
        .bind(now)
        .bind(form_id)
        .bind(tenant_id)
        .fetch_one(pool)
        .await?;

        let lines = Self::get_form_lines(pool, tenant_id, form_id).await?;

        Ok(TaxFormWithLines {
            form: updated_form,
            lines,
        })
    }

    pub async fn get_forms(
        pool: &PgPool,
        tenant_id: Uuid,
        form_type: Option<String>,
        status: Option<String>,
    ) -> Result<Vec<TaxForm>, sqlx::Error> {
        let mut query = String::from(
            "SELECT id, form_type, jurisdiction, period_start, period_end, status, total_tax_amount, filed_at, accepted_at FROM finance_v56_tax_forms WHERE tenant_id = $1",
        );
        if form_type.is_some() {
            query.push_str(" AND form_type = $2");
        }
        if status.is_some() {
            if form_type.is_some() {
                query.push_str(" AND status = $3");
            } else {
                query.push_str(" AND status = $2");
            }
        }
        query.push_str(" ORDER BY period_end DESC LIMIT 500");

        let mut q = sqlx::query_as::<_, TaxForm>(&query);
        q = q.bind(tenant_id);
        if let Some(ref ft) = form_type {
            q = q.bind(ft);
        }
        if let Some(ref s) = status {
            q = q.bind(s);
        }
        q.fetch_all(pool).await
    }

    pub async fn get_form_by_id(
        pool: &PgPool,
        tenant_id: Uuid,
        form_id: Uuid,
    ) -> Result<TaxFormWithLines, sqlx::Error> {
        let form: TaxForm = sqlx::query_as(
            "SELECT id, form_type, jurisdiction, period_start, period_end, status, total_tax_amount, filed_at, accepted_at FROM finance_v56_tax_forms WHERE id = $1 AND tenant_id = $2",
        )
        .bind(form_id)
        .bind(tenant_id)
        .fetch_one(pool)
        .await?;

        let lines = Self::get_form_lines(pool, tenant_id, form_id).await?;

        Ok(TaxFormWithLines { form, lines })
    }

    pub async fn amend_form(
        pool: &PgPool,
        tenant_id: Uuid,
        form_id: Uuid,
        req: AmendTaxFormRequest,
    ) -> Result<TaxFormWithLines, sqlx::Error> {
        sqlx::query("UPDATE finance_v56_tax_lines SET deleted_at = NOW() WHERE form_id = $1 AND tenant_id = $2")
            .bind(form_id)
            .bind(tenant_id)
            .execute(pool)
            .await?;

        let mut total_tax: f64 = 0.0;
        let mut saved_lines: Vec<TaxLine> = Vec::new();

        for line_input in &req.lines {
            let tax_amount =
                (line_input.taxable_amount * line_input.tax_rate * 100.0).round() / 100.0;
            total_tax += tax_amount;

            let line_id = Uuid::new_v4();
            sqlx::query(
                r#"INSERT INTO finance_v56_tax_lines
                    (id, tenant_id, form_id, line_no, description, taxable_amount, tax_rate, tax_amount)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)"#,
            )
            .bind(line_id)
            .bind(tenant_id)
            .bind(form_id)
            .bind(line_input.line_no)
            .bind(&line_input.description)
            .bind(line_input.taxable_amount)
            .bind(line_input.tax_rate)
            .bind(tax_amount)
            .execute(pool)
            .await?;

            saved_lines.push(TaxLine {
                id: line_id,
                form_id,
                line_no: line_input.line_no,
                description: line_input.description.clone(),
                taxable_amount: line_input.taxable_amount,
                tax_rate: line_input.tax_rate,
                tax_amount,
            });
        }

        let updated_form: TaxForm = sqlx::query_as(
            r#"UPDATE finance_v56_tax_forms
            SET status = 'draft', total_tax_amount = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2 AND tenant_id = $3
            RETURNING id, form_type, jurisdiction, period_start, period_end, status, total_tax_amount, filed_at, accepted_at"#,
        )
        .bind(total_tax)
        .bind(form_id)
        .bind(tenant_id)
        .fetch_one(pool)
        .await?;

        Ok(TaxFormWithLines {
            form: updated_form,
            lines: saved_lines,
        })
    }

    pub async fn get_filing_schedule(
        pool: &PgPool,
        tenant_id: Uuid,
    ) -> Result<Vec<serde_json::Value>, sqlx::Error> {
        let upcoming_forms: Vec<TaxForm> = sqlx::query_as(
            r#"SELECT id, form_type, jurisdiction, period_start, period_end, status, total_tax_amount, filed_at, accepted_at
               FROM finance_v56_tax_forms
               WHERE tenant_id = $1 AND status IN ('draft', 'calculated')
               ORDER BY period_end ASC LIMIT 50"#,
        )
        .bind(tenant_id)
        .fetch_all(pool)
        .await?;

        let schedule: Vec<serde_json::Value> = upcoming_forms
            .iter()
            .map(|f| {
                let due_date = Self::calculate_due_date(&f.form_type, &f.period_end);
                serde_json::json!({
                    "form_id": f.id,
                    "form_type": f.form_type,
                    "jurisdiction": f.jurisdiction,
                    "period_end": f.period_end,
                    "status": f.status,
                    "total_tax_amount": f.total_tax_amount,
                    "due_date": due_date,
                })
            })
            .collect();

        Ok(schedule)
    }

    pub async fn get_tax_summary(
        pool: &PgPool,
        tenant_id: Uuid,
        year: Option<i32>,
    ) -> Result<serde_json::Value, sqlx::Error> {
        let mut sql = String::from(
            "SELECT form_type, COALESCE(SUM(total_tax_amount), 0) as total, COUNT(*) as cnt FROM finance_v56_tax_forms WHERE tenant_id = $1",
        );
        if let Some(y) = year {
            sql.push_str(&format!(" AND EXTRACT(YEAR FROM period_end) = {}", y));
        }
        sql.push_str(" GROUP BY form_type");

        let rows: Vec<(String, f64, i64)> =
            sqlx::query_as(&sql).bind(tenant_id).fetch_all(pool).await?;

        let mut summary = serde_json::json!({
            "total_tax_amount": 0.0,
            "total_forms": 0,
            "by_type": {},
        });

        let mut total_amount = 0.0f64;
        let mut total_forms: i64 = 0;
        let mut by_type = serde_json::Map::new();

        for (form_type, amount, cnt) in &rows {
            total_amount += amount;
            total_forms += cnt;
            by_type.insert(
                form_type.clone(),
                serde_json::json!({
                    "total_amount": amount,
                    "count": cnt,
                }),
            );
        }

        summary["total_tax_amount"] = serde_json::json!(total_amount);
        summary["total_forms"] = serde_json::json!(total_forms);
        summary["by_type"] = serde_json::json!(by_type);

        Ok(summary)
    }

    async fn get_form_lines(
        pool: &PgPool,
        tenant_id: Uuid,
        form_id: Uuid,
    ) -> Result<Vec<TaxLine>, sqlx::Error> {
        sqlx::query_as(
            "SELECT id, form_id, line_no, description, taxable_amount, tax_rate, tax_amount FROM finance_v56_tax_lines WHERE deleted_at IS NULL AND form_id = $1 AND tenant_id = $2 ORDER BY line_no",
        )
        .bind(form_id)
        .bind(tenant_id)
        .fetch_all(pool)
        .await
    }

    fn calculate_due_date(form_type: &str, period_end: &DateTime<Utc>) -> DateTime<Utc> {
        let days = match form_type {
            "vat" => 15i64,
            "cit" => 60i64,
            "pit" => 15i64,
            "withholding" => 7i64,
            "stamp" => 30i64,
            _ => 30i64,
        };
        *period_end + chrono::Duration::days(days)
    }
}

// ==================== 2. 税率计算 ====================

pub struct TaxRateCalculator;

#[derive(Debug, Deserialize)]
pub struct CalculateTaxRequest {
    pub amount: f64,
    pub tax_type: Option<String>,
    pub jurisdiction: Option<String>,
    pub period: Option<String>,
}

#[derive(Debug, Deserialize, utoipa::IntoParams)]
pub struct LookupRateParams {
    pub tax_type: Option<String>,
    pub jurisdiction: Option<String>,
    pub date: Option<DateTime<Utc>>,
}

#[derive(Debug, Deserialize, utoipa::IntoParams)]
pub struct BreakdownParams {
    pub amount: f64,
    pub tax_type: String,
    pub jurisdiction: Option<String>,
}

#[derive(Debug, Deserialize, utoipa::IntoParams)]
pub struct ValidateRateParams {
    pub rate: f64,
    pub tax_type: String,
}

impl TaxRateCalculator {
    pub async fn calculate_vat(
        pool: &PgPool,
        tenant_id: Uuid,
        amount: f64,
        jurisdiction: Option<String>,
    ) -> Result<TaxResult, sqlx::Error> {
        let jur = jurisdiction.unwrap_or_else(|| "CN".to_string());
        let rate = Self::lookup_rate_impl(pool, tenant_id, "vat", &jur, None).await?;
        let tax_amount = (amount * rate * 100.0).round() / 100.0;

        Ok(TaxResult {
            taxable_amount: amount,
            rate,
            tax_amount,
            breakdown: vec![TaxBreakdown {
                bracket_order: 1,
                threshold_from: 0.0,
                threshold_to: None,
                rate,
                taxable_in_bracket: amount,
                tax_in_bracket: tax_amount,
            }],
        })
    }

    pub async fn calculate_cit(
        pool: &PgPool,
        tenant_id: Uuid,
        amount: f64,
        jurisdiction: Option<String>,
    ) -> Result<TaxResult, sqlx::Error> {
        let jur = jurisdiction.unwrap_or_else(|| "CN".to_string());
        let brackets = Self::get_brackets_impl(pool, tenant_id, "cit", &jur).await?;
        let (tax, breakdown) = Self::apply_progressive_brackets(amount, &brackets);

        Ok(TaxResult {
            taxable_amount: amount,
            rate: if amount > 0.0 { tax / amount } else { 0.0 },
            tax_amount: tax,
            breakdown,
        })
    }

    pub async fn calculate_pit(
        pool: &PgPool,
        tenant_id: Uuid,
        amount: f64,
        jurisdiction: Option<String>,
    ) -> Result<TaxResult, sqlx::Error> {
        let jur = jurisdiction.unwrap_or_else(|| "CN".to_string());
        let brackets = Self::get_brackets_impl(pool, tenant_id, "pit", &jur).await?;
        let (tax, breakdown) = Self::apply_progressive_brackets(amount, &brackets);

        Ok(TaxResult {
            taxable_amount: amount,
            rate: if amount > 0.0 { tax / amount } else { 0.0 },
            tax_amount: tax,
            breakdown,
        })
    }

    pub async fn calculate_withholding(
        pool: &PgPool,
        tenant_id: Uuid,
        amount: f64,
        jurisdiction: Option<String>,
    ) -> Result<TaxResult, sqlx::Error> {
        let jur = jurisdiction.unwrap_or_else(|| "CN".to_string());
        let rate = Self::lookup_rate_impl(pool, tenant_id, "withholding", &jur, None).await?;
        let tax_amount = (amount * rate * 100.0).round() / 100.0;

        Ok(TaxResult {
            taxable_amount: amount,
            rate,
            tax_amount,
            breakdown: vec![TaxBreakdown {
                bracket_order: 1,
                threshold_from: 0.0,
                threshold_to: None,
                rate,
                taxable_in_bracket: amount,
                tax_in_bracket: tax_amount,
            }],
        })
    }

    pub async fn get_rate_schedule(
        pool: &PgPool,
        tenant_id: Uuid,
        tax_type: Option<String>,
        jurisdiction: Option<String>,
    ) -> Result<Vec<TaxRate>, sqlx::Error> {
        let mut query = String::from(
            "SELECT id, jurisdiction, rate_type, rate, effective_from, effective_to, description FROM finance_v56_tax_rates WHERE tenant_id = $1",
        );
        if tax_type.is_some() {
            query.push_str(" AND rate_type = $2");
        }
        if jurisdiction.is_some() {
            if tax_type.is_some() {
                query.push_str(" AND jurisdiction = $3");
            } else {
                query.push_str(" AND jurisdiction = $2");
            }
        }
        query.push_str(" ORDER BY effective_from DESC LIMIT 200");

        let mut q = sqlx::query_as::<_, TaxRate>(&query);
        q = q.bind(tenant_id);
        if let Some(ref tt) = tax_type {
            q = q.bind(tt);
        }
        if let Some(ref jur) = jurisdiction {
            q = q.bind(jur);
        }
        q.fetch_all(pool).await
    }

    pub async fn lookup_rate(
        pool: &PgPool,
        tenant_id: Uuid,
        tax_type: String,
        jurisdiction: Option<String>,
        date: Option<DateTime<Utc>>,
    ) -> Result<f64, sqlx::Error> {
        let jur = jurisdiction.unwrap_or_else(|| "CN".to_string());
        Self::lookup_rate_impl(pool, tenant_id, &tax_type, &jur, date).await
    }

    pub async fn get_tax_breakdown(
        pool: &PgPool,
        tenant_id: Uuid,
        amount: f64,
        tax_type: String,
        jurisdiction: Option<String>,
    ) -> Result<Vec<TaxBreakdown>, sqlx::Error> {
        let jur = jurisdiction.unwrap_or_else(|| "CN".to_string());
        let brackets = Self::get_brackets_impl(pool, tenant_id, &tax_type, &jur).await?;
        let (_, breakdown) = Self::apply_progressive_brackets(amount, &brackets);
        Ok(breakdown)
    }

    pub async fn validate_rate(
        _pool: &PgPool,
        rate: f64,
        tax_type: String,
    ) -> Result<serde_json::Value, sqlx::Error> {
        let valid = rate >= 0.0 && rate <= 1.0;
        let mut issues: Vec<String> = Vec::new();

        if !valid {
            issues.push("税率必须在 0 到 1 之间".to_string());
        }

        let max_rates: HashMap<&str, f64> = [
            ("vat", 0.5),
            ("cit", 0.5),
            ("pit", 0.45),
            ("withholding", 0.3),
            ("stamp", 0.1),
        ]
        .iter()
        .cloned()
        .collect();

        if let Some(max) = max_rates.get(tax_type.as_str()) {
            if rate > *max {
                issues.push(format!("{} 税率超过最大合理值 {}", tax_type, max));
            }
        }

        Ok(serde_json::json!({
            "valid": valid && issues.is_empty(),
            "rate": rate,
            "tax_type": tax_type,
            "issues": issues,
        }))
    }

    async fn lookup_rate_impl(
        pool: &PgPool,
        tenant_id: Uuid,
        tax_type: &str,
        jurisdiction: &str,
        date: Option<DateTime<Utc>>,
    ) -> Result<f64, sqlx::Error> {
        let effective_date = date.unwrap_or_else(Utc::now);

        let rate: Option<f64> = sqlx::query_scalar(
            r#"SELECT rate FROM finance_v56_tax_rates
               WHERE tenant_id = $1 AND rate_type = $2 AND jurisdiction = $3
               AND effective_from <= $4 AND (effective_to IS NULL OR effective_to >= $4)
               ORDER BY effective_from DESC LIMIT 1"#,
        )
        .bind(tenant_id)
        .bind(tax_type)
        .bind(jurisdiction)
        .bind(effective_date)
        .fetch_optional(pool)
        .await?;

        Ok(rate.unwrap_or_else(|| match tax_type {
            "vat" => 0.13,
            "cit" => 0.25,
            "pit" => 0.03,
            "withholding" => 0.2,
            "stamp" => 0.005,
            _ => 0.0,
        }))
    }

    async fn get_brackets_impl(
        pool: &PgPool,
        tenant_id: Uuid,
        tax_type: &str,
        jurisdiction: &str,
    ) -> Result<Vec<TaxBracket>, sqlx::Error> {
        let brackets: Vec<TaxBracket> = sqlx::query_as(
            r#"SELECT b.id, b.rate_id, b.bracket_order, b.threshold_from, b.threshold_to, b.rate
               FROM finance_v56_tax_brackets b
               JOIN finance_v56_tax_rates r ON b.rate_id = r.id
               WHERE r.tenant_id = $1 AND r.rate_type = $2 AND r.jurisdiction = $3
               ORDER BY b.bracket_order"#,
        )
        .bind(tenant_id)
        .bind(tax_type)
        .bind(jurisdiction)
        .fetch_all(pool)
        .await?;

        if !brackets.is_empty() {
            Ok(brackets)
        } else {
            Ok(Self::default_brackets(tax_type))
        }
    }

    fn default_brackets(tax_type: &str) -> Vec<TaxBracket> {
        match tax_type {
            "cit" => vec![
                TaxBracket {
                    id: Uuid::new_v4(),
                    rate_id: Uuid::new_v4(),
                    bracket_order: 1,
                    threshold_from: 0.0,
                    threshold_to: Some(1000000.0),
                    rate: 0.25,
                },
                TaxBracket {
                    id: Uuid::new_v4(),
                    rate_id: Uuid::new_v4(),
                    bracket_order: 2,
                    threshold_from: 1000000.0,
                    threshold_to: None,
                    rate: 0.25,
                },
            ],
            "pit" => vec![
                TaxBracket {
                    id: Uuid::new_v4(),
                    rate_id: Uuid::new_v4(),
                    bracket_order: 1,
                    threshold_from: 0.0,
                    threshold_to: Some(36000.0),
                    rate: 0.03,
                },
                TaxBracket {
                    id: Uuid::new_v4(),
                    rate_id: Uuid::new_v4(),
                    bracket_order: 2,
                    threshold_from: 36000.0,
                    threshold_to: Some(144000.0),
                    rate: 0.10,
                },
                TaxBracket {
                    id: Uuid::new_v4(),
                    rate_id: Uuid::new_v4(),
                    bracket_order: 3,
                    threshold_from: 144000.0,
                    threshold_to: Some(300000.0),
                    rate: 0.20,
                },
                TaxBracket {
                    id: Uuid::new_v4(),
                    rate_id: Uuid::new_v4(),
                    bracket_order: 4,
                    threshold_from: 300000.0,
                    threshold_to: Some(420000.0),
                    rate: 0.25,
                },
                TaxBracket {
                    id: Uuid::new_v4(),
                    rate_id: Uuid::new_v4(),
                    bracket_order: 5,
                    threshold_from: 420000.0,
                    threshold_to: Some(660000.0),
                    rate: 0.30,
                },
                TaxBracket {
                    id: Uuid::new_v4(),
                    rate_id: Uuid::new_v4(),
                    bracket_order: 6,
                    threshold_from: 660000.0,
                    threshold_to: None,
                    rate: 0.35,
                },
            ],
            _ => vec![TaxBracket {
                id: Uuid::new_v4(),
                rate_id: Uuid::new_v4(),
                bracket_order: 1,
                threshold_from: 0.0,
                threshold_to: None,
                rate: 0.0,
            }],
        }
    }

    fn apply_progressive_brackets(
        amount: f64,
        brackets: &[TaxBracket],
    ) -> (f64, Vec<TaxBreakdown>) {
        let mut remaining = amount;
        let mut total_tax = 0.0;
        let mut breakdown = Vec::new();

        for bracket in brackets {
            if remaining <= 0.0 {
                break;
            }

            let lower = bracket.threshold_from;
            let upper = bracket.threshold_to;

            let taxable_in_bracket = match upper {
                Some(u) => {
                    let span = u - lower;
                    if remaining <= span {
                        remaining
                    } else {
                        remaining = remaining - span;
                        span
                    }
                }
                None => remaining,
            };

            let tax_in_bracket = (taxable_in_bracket * bracket.rate * 100.0).round() / 100.0;
            total_tax += tax_in_bracket;

            breakdown.push(TaxBreakdown {
                bracket_order: bracket.bracket_order,
                threshold_from: lower,
                threshold_to: upper,
                rate: bracket.rate,
                taxable_in_bracket,
                tax_in_bracket,
            });

            if upper.is_some() {
                remaining = (remaining - taxable_in_bracket).max(0.0);
            } else {
                remaining = 0.0;
            }
        }

        (total_tax, breakdown)
    }
}

// ==================== 3. 税务筹划 ====================

pub struct TaxPlanner;

#[derive(Debug, Deserialize)]
pub struct CreatePlanRequest {
    pub entity: String,
    pub period: String,
    pub strategy: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct AnalyzeScenarioRequest {
    pub entity: String,
    pub period: String,
    pub income: f64,
    pub deductions: Option<f64>,
    pub strategy: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CompareScenarioRequest {
    pub scenarios: Vec<AnalyzeScenarioRequest>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScenarioAnalysis {
    pub scenario_name: String,
    pub projected_tax: f64,
    pub projected_savings: f64,
    pub risk_level: String,
    pub suggestions: Vec<String>,
}

impl TaxPlanner {
    pub async fn create_plan(
        pool: &PgPool,
        tenant_id: Uuid,
        req: CreatePlanRequest,
    ) -> Result<TaxPlan, sqlx::Error> {
        let id = Uuid::new_v4();
        let strategy = req
            .strategy
            .unwrap_or_else(|| TaxPlanStrategy::LegalOptimization.as_str().to_string());

        sqlx::query_as(
            r#"INSERT INTO finance_v56_tax_plans
                (id, tenant_id, entity, period, strategy, projected_savings, risk_level, status)
            VALUES ($1, $2, $3, $4, $5, 0, 'low', 'draft')
            RETURNING id, entity, period, strategy, projected_savings, risk_level, status, approved_at"#,
        )
        .bind(id)
        .bind(tenant_id)
        .bind(&req.entity)
        .bind(&req.period)
        .bind(&strategy)
        .fetch_one(pool)
        .await
    }

    pub async fn analyze_scenario(
        pool: &PgPool,
        tenant_id: Uuid,
        req: AnalyzeScenarioRequest,
    ) -> Result<ScenarioAnalysis, sqlx::Error> {
        let strategy = req
            .strategy
            .unwrap_or_else(|| TaxPlanStrategy::LegalOptimization.as_str().to_string());

        let base_tax = Self::estimate_tax(pool, tenant_id, req.income).await?;
        let deductions = req.deductions.unwrap_or(0.0);
        let taxable_after_deductions = (req.income - deductions).max(0.0);
        let reduced_tax = Self::estimate_tax(pool, tenant_id, taxable_after_deductions).await?;
        let savings = (base_tax - reduced_tax).max(0.0);

        let risk_level = Self::assess_risk(&strategy);
        let suggestions = Self::generate_suggestions(&strategy, savings);

        Ok(ScenarioAnalysis {
            scenario_name: format!("{}-{}", req.entity, req.period),
            projected_tax: reduced_tax,
            projected_savings: savings,
            risk_level,
            suggestions,
        })
    }

    pub async fn get_suggestions(
        pool: &PgPool,
        tenant_id: Uuid,
        plan_id: Uuid,
    ) -> Result<Vec<TaxSuggestion>, sqlx::Error> {
        sqlx::query_as(
            "SELECT id, plan_id, category, description, estimated_savings, confidence, action_items FROM finance_v56_tax_suggestions WHERE plan_id = $1 AND tenant_id = $2 ORDER BY estimated_savings DESC",
        )
        .bind(plan_id)
        .bind(tenant_id)
        .fetch_all(pool)
        .await
    }

    pub async fn compare_scenarios(
        pool: &PgPool,
        tenant_id: Uuid,
        scenarios: Vec<AnalyzeScenarioRequest>,
    ) -> Result<Vec<ScenarioAnalysis>, sqlx::Error> {
        let mut results = Vec::new();
        for scenario in scenarios {
            let analysis = Self::analyze_scenario(pool, tenant_id, scenario).await?;
            results.push(analysis);
        }
        Ok(results)
    }

    pub async fn get_plan_status(
        pool: &PgPool,
        tenant_id: Uuid,
        plan_id: Uuid,
    ) -> Result<TaxPlan, sqlx::Error> {
        sqlx::query_as(
            "SELECT id, entity, period, strategy, projected_savings, risk_level, status, approved_at FROM finance_v56_tax_plans WHERE id = $1 AND tenant_id = $2",
        )
        .bind(plan_id)
        .bind(tenant_id)
        .fetch_one(pool)
        .await
    }

    pub async fn list_plans(
        pool: &PgPool,
        tenant_id: Uuid,
        status: Option<String>,
    ) -> Result<Vec<TaxPlan>, sqlx::Error> {
        let mut query = String::from(
            "SELECT id, entity, period, strategy, projected_savings, risk_level, status, approved_at FROM finance_v56_tax_plans WHERE tenant_id = $1",
        );
        if status.is_some() {
            query.push_str(" AND status = $2");
        }
        query.push_str(" ORDER BY created_at DESC LIMIT 200");

        let mut q = sqlx::query_as::<_, TaxPlan>(&query);
        q = q.bind(tenant_id);
        if let Some(ref s) = status {
            q = q.bind(s);
        }
        q.fetch_all(pool).await
    }

    pub async fn approve_plan(
        pool: &PgPool,
        tenant_id: Uuid,
        plan_id: Uuid,
    ) -> Result<TaxPlan, sqlx::Error> {
        let now = Utc::now();
        sqlx::query_as(
            r#"UPDATE finance_v56_tax_plans
            SET status = 'approved', approved_at = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2 AND tenant_id = $3
            RETURNING id, entity, period, strategy, projected_savings, risk_level, status, approved_at"#,
        )
        .bind(now)
        .bind(plan_id)
        .bind(tenant_id)
        .fetch_one(pool)
        .await
    }

    pub async fn get_compliance_check(
        pool: &PgPool,
        tenant_id: Uuid,
        entity: Option<String>,
    ) -> Result<ComplianceCheckResult, sqlx::Error> {
        let mut issues: Vec<String> = Vec::new();
        let mut warnings: Vec<String> = Vec::new();
        let mut suggestions: Vec<String> = Vec::new();

        let mut query = String::from(
            "SELECT id, form_type, status FROM finance_v56_tax_forms WHERE tenant_id = $1 AND status = 'draft'",
        );
        if entity.is_some() {
            query.push_str(" AND jurisdiction = $2");
        }
        query.push_str(" ORDER BY period_end ASC LIMIT 100");

        let draft_forms: Vec<(Uuid, String, String)> = sqlx::query_as(&query)
            .bind(tenant_id)
            .fetch_all(pool)
            .await?;

        if !draft_forms.is_empty() {
            issues.push(format!(
                "存在 {} 份草稿状态的税务表单需要处理",
                draft_forms.len()
            ));
        }

        let submitted_forms: Vec<(Uuid, String, String)> = sqlx::query_as(
            "SELECT id, form_type, status FROM finance_v56_tax_forms WHERE tenant_id = $1 AND status = 'submitted' AND filed_at < NOW() - INTERVAL '30 days'",
        )
        .bind(tenant_id)
        .fetch_all(pool)
        .await?;

        if !submitted_forms.is_empty() {
            warnings.push(format!(
                "有 {} 份税务表单已提交超过 30 天未收到回复",
                submitted_forms.len()
            ));
        }

        let accepted_count: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM finance_v56_tax_forms WHERE tenant_id = $1 AND status = 'accepted'",
        )
        .bind(tenant_id)
        .fetch_one(pool)
        .await
        .unwrap_or(0);

        if accepted_count == 0 {
            warnings.push("尚未有任何税务申报被接受".to_string());
        }

        let rejected_forms: Vec<(Uuid, String)> = sqlx::query_as(
            "SELECT id, form_type FROM finance_v56_tax_forms WHERE tenant_id = $1 AND status = 'rejected'",
        )
        .bind(tenant_id)
        .fetch_all(pool)
        .await?;

        if !rejected_forms.is_empty() {
            issues.push(format!(
                "有 {} 份税务申报被拒绝，需要纠正",
                rejected_forms.len()
            ));
        }

        suggestions.push("建议每季度进行一次税务合规审查".to_string());
        suggestions.push("确保所有税务申报在截止日期前至少 15 天提交".to_string());
        if !draft_forms.is_empty() {
            suggestions.push("优先处理草稿状态的税务表单".to_string());
        }

        Ok(ComplianceCheckResult {
            compliant: issues.is_empty(),
            issues,
            warnings,
            suggestions,
        })
    }

    async fn estimate_tax(pool: &PgPool, tenant_id: Uuid, income: f64) -> Result<f64, sqlx::Error> {
        if income <= 0.0 {
            return Ok(0.0);
        }

        let brackets = TaxRateCalculator::get_brackets_impl(pool, tenant_id, "pit", "CN").await?;
        let (tax, _) = TaxRateCalculator::apply_progressive_brackets(income, &brackets);
        Ok(tax)
    }

    fn assess_risk(strategy: &str) -> String {
        match strategy {
            "legal_optimization" => TaxPlanRiskLevel::Low.as_str().to_string(),
            "deduction_maximization" => TaxPlanRiskLevel::Medium.as_str().to_string(),
            "timing_strategy" => TaxPlanRiskLevel::Medium.as_str().to_string(),
            "holding_optimization" => TaxPlanRiskLevel::High.as_str().to_string(),
            _ => TaxPlanRiskLevel::Medium.as_str().to_string(),
        }
    }

    fn generate_suggestions(strategy: &str, savings: f64) -> Vec<String> {
        let mut suggestions = Vec::new();

        if savings > 0.0 {
            suggestions.push(format!("预计可节省税款 {:.2}", savings));
        }

        match strategy {
            "legal_optimization" => {
                suggestions.push("利用合法途径优化税务结构".to_string());
                suggestions.push("确保所有操作符合当地税法规定".to_string());
            }
            "deduction_maximization" => {
                suggestions.push("最大化可抵扣项目".to_string());
                suggestions.push("保留完整的抵扣凭证和记录".to_string());
            }
            "timing_strategy" => {
                suggestions.push("合理规划收入和支出的确认时间".to_string());
                suggestions.push("注意季节性税率变化".to_string());
            }
            "holding_optimization" => {
                suggestions.push("优化资产持有周期以获得更优税率".to_string());
                suggestions.push("注意短期和长期资本利得的差异".to_string());
            }
            _ => {
                suggestions.push("咨询专业税务顾问".to_string());
            }
        }

        suggestions
    }
}

// ==================== API Handlers ====================

// --- Tax Filing ---

#[derive(Debug, Deserialize, utoipa::IntoParams)]
pub struct TaxFormsQueryParams {
    pub form_type: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize, utoipa::IntoParams)]
pub struct TaxSummaryQueryParams {
    pub year: Option<i32>,
}
#[utoipa::path(
    post,
    path = "/finance-v56/tax/generate",
    responses(
        (status = 200, description = "成功"),
        (status = 201, description = "创建成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误"),
    ),
    tag = "Finance Tax V56",
    operation_id = "generate_tax_form_handler",
)]

async fn generate_tax_form_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<GenerateTaxFormRequest>,
) -> Json<ApiResponse<TaxFormWithLines>> {
    let pool = state.pool.clone();
    let tenant_id = get_tenant_id(&claims);
    match AutoTaxFiler::generate_tax_form(&pool, tenant_id, req).await {
        Ok(form) => Json(ApiResponse::success(form, "税务表单生成成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    get,
    path = "/finance-v56/tax_forms",
    tag = "TaxV56",
    operation_id = "get_tax_forms_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn get_tax_forms_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<TaxFormsQueryParams>,
) -> Json<ApiResponse<Vec<TaxForm>>> {
    let pool = state.pool.clone();
    let tenant_id = get_tenant_id(&claims);
    match AutoTaxFiler::get_forms(&pool, tenant_id, params.form_type, params.status).await {
        Ok(forms) => Json(ApiResponse::success(forms, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    get,
    path = "/finance-v56/tax_form_by_id/{id}",
    tag = "TaxV56",
    operation_id = "get_tax_form_by_id_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn get_tax_form_by_id_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<TaxFormWithLines>> {
    let pool = state.pool.clone();
    let tenant_id = get_tenant_id(&claims);
    match AutoTaxFiler::get_form_by_id(&pool, tenant_id, id).await {
        Ok(form) => Json(ApiResponse::success(form, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    post,
    path = "/finance-v56/tax_form",
    tag = "TaxV56",
    operation_id = "submit_tax_form_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn submit_tax_form_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<TaxFormWithLines>> {
    let pool = state.pool.clone();
    let tenant_id = get_tenant_id(&claims);
    match AutoTaxFiler::submit_form(&pool, tenant_id, id).await {
        Ok(form) => Json(ApiResponse::success(form, "提交成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}
#[utoipa::path(
    post,
    path = "/finance-v56/tax/forms/{id}/amend",
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
    tag = "Finance Tax V56",
    operation_id = "amend_tax_form_handler",
)]

async fn amend_tax_form_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<AmendTaxFormRequest>,
) -> Json<ApiResponse<TaxFormWithLines>> {
    let pool = state.pool.clone();
    let tenant_id = get_tenant_id(&claims);
    match AutoTaxFiler::amend_form(&pool, tenant_id, id, req).await {
        Ok(form) => Json(ApiResponse::success(form, "修改成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    get,
    path = "/finance-v56/tax_summary",
    tag = "TaxV56",
    operation_id = "get_tax_summary_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn get_tax_summary_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<TaxSummaryQueryParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let pool = state.pool.clone();
    let tenant_id = get_tenant_id(&claims);
    match AutoTaxFiler::get_tax_summary(&pool, tenant_id, params.year).await {
        Ok(summary) => Json(ApiResponse::success(summary, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    post,
    path = "/finance-v56/tax_schedule",
    tag = "TaxV56",
    operation_id = "get_tax_schedule_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn get_tax_schedule_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<serde_json::Value>>> {
    let pool = state.pool.clone();
    let tenant_id = get_tenant_id(&claims);
    match AutoTaxFiler::get_filing_schedule(&pool, tenant_id).await {
        Ok(schedule) => Json(ApiResponse::success(schedule, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

// --- Tax Rate ---

#[derive(Debug, Deserialize, utoipa::IntoParams)]
pub struct RateScheduleQueryParams {
    pub tax_type: Option<String>,
    pub jurisdiction: Option<String>,
}

#[utoipa::path(
    post,
    path = "/finance-v56/calculate_tax",
    tag = "TaxV56",
    operation_id = "calculate_tax_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn calculate_tax_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CalculateTaxRequest>,
) -> Json<ApiResponse<TaxResult>> {
    let pool = state.pool.clone();
    let tenant_id = get_tenant_id(&claims);
    let tax_type = req.tax_type.unwrap_or_else(|| "vat".to_string());
    match tax_type.as_str() {
        "vat" => {
            match TaxRateCalculator::calculate_vat(&pool, tenant_id, req.amount, req.jurisdiction)
                .await
            {
                Ok(result) => Json(ApiResponse::success(result, "计算成功")),
                Err(e) => Json(ApiResponse::error(500, &e.to_string())),
            }
        }
        "cit" => {
            match TaxRateCalculator::calculate_cit(&pool, tenant_id, req.amount, req.jurisdiction)
                .await
            {
                Ok(result) => Json(ApiResponse::success(result, "计算成功")),
                Err(e) => Json(ApiResponse::error(500, &e.to_string())),
            }
        }
        "pit" => {
            match TaxRateCalculator::calculate_pit(&pool, tenant_id, req.amount, req.jurisdiction)
                .await
            {
                Ok(result) => Json(ApiResponse::success(result, "计算成功")),
                Err(e) => Json(ApiResponse::error(500, &e.to_string())),
            }
        }
        "withholding" => {
            match TaxRateCalculator::calculate_withholding(
                &pool,
                tenant_id,
                req.amount,
                req.jurisdiction,
            )
            .await
            {
                Ok(result) => Json(ApiResponse::success(result, "计算成功")),
                Err(e) => Json(ApiResponse::error(500, &e.to_string())),
            }
        }
        _ => Json(ApiResponse::error(400, "不支持的税种类型")),
    }
}
#[utoipa::path(
    get,
    path = "/finance-v56/tax/rates",
    responses(
        (status = 200, description = "成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误"),
    ),
    params(
        ("query" = RateScheduleQueryParams, Query, description = "查询参数"),
    ),
    tag = "Finance Tax V56",
    operation_id = "get_rate_schedule_handler",
)]

async fn get_rate_schedule_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<RateScheduleQueryParams>,
) -> Json<ApiResponse<Vec<TaxRate>>> {
    let pool = state.pool.clone();
    let tenant_id = get_tenant_id(&claims);
    match TaxRateCalculator::get_rate_schedule(
        &pool,
        tenant_id,
        params.tax_type,
        params.jurisdiction,
    )
    .await
    {
        Ok(rates) => Json(ApiResponse::success(rates, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    get,
    path = "/finance-v56/lookup_rate",
    tag = "TaxV56",
    operation_id = "lookup_rate_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn lookup_rate_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<LookupRateParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let pool = state.pool.clone();
    let tenant_id = get_tenant_id(&claims);
    let tax_type = params.tax_type.unwrap_or_else(|| "vat".to_string());
    match TaxRateCalculator::lookup_rate(
        &pool,
        tenant_id,
        tax_type,
        params.jurisdiction,
        params.date,
    )
    .await
    {
        Ok(rate) => Json(ApiResponse::success(
            serde_json::json!({ "rate": rate }),
            "查询成功",
        )),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    get,
    path = "/finance-v56/tax_breakdown/{id}",
    tag = "TaxV56",
    operation_id = "get_tax_breakdown_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn get_tax_breakdown_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<BreakdownParams>,
) -> Json<ApiResponse<Vec<TaxBreakdown>>> {
    let pool = state.pool.clone();
    let tenant_id = get_tenant_id(&claims);
    match TaxRateCalculator::get_tax_breakdown(
        &pool,
        tenant_id,
        params.amount,
        params.tax_type,
        params.jurisdiction,
    )
    .await
    {
        Ok(breakdown) => Json(ApiResponse::success(breakdown, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}
#[utoipa::path(
    get,
    path = "/finance-v56/tax/validate",
    responses(
        (status = 200, description = "成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误"),
    ),
    params(
        ("query" = ValidateRateParams, Query, description = "查询参数"),
    ),
    tag = "Finance Tax V56",
    operation_id = "validate_rate_handler",
)]

async fn validate_rate_handler(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Query(params): Query<ValidateRateParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let pool = state.pool.clone();
    match TaxRateCalculator::validate_rate(&pool, params.rate, params.tax_type).await {
        Ok(result) => Json(ApiResponse::success(result, "验证完成")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

// --- Tax Planning ---

#[derive(Debug, Deserialize, utoipa::IntoParams)]
pub struct SuggestionsQueryParams {
    pub plan_id: Option<Uuid>,
}

#[derive(Debug, Deserialize, utoipa::IntoParams)]
pub struct PlansQueryParams {
    pub status: Option<String>,
}

#[derive(Debug, Deserialize, utoipa::IntoParams)]
pub struct ComplianceQueryParams {
    pub entity: Option<String>,
}

#[utoipa::path(
    post,
    path = "/finance-v56/plan",
    tag = "TaxV56",
    operation_id = "create_plan_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn create_plan_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreatePlanRequest>,
) -> Json<ApiResponse<TaxPlan>> {
    let pool = state.pool.clone();
    let tenant_id = get_tenant_id(&claims);
    match TaxPlanner::create_plan(&pool, tenant_id, req).await {
        Ok(plan) => Json(ApiResponse::success(plan, "创建成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    post,
    path = "/finance-v56/scenario",
    tag = "TaxV56",
    operation_id = "analyze_scenario_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn analyze_scenario_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<AnalyzeScenarioRequest>,
) -> Json<ApiResponse<ScenarioAnalysis>> {
    let pool = state.pool.clone();
    let tenant_id = get_tenant_id(&claims);
    match TaxPlanner::analyze_scenario(&pool, tenant_id, req).await {
        Ok(analysis) => Json(ApiResponse::success(analysis, "分析完成")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}
#[utoipa::path(
    get,
    path = "/finance-v56/tax/suggestions",
    responses(
        (status = 200, description = "成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误"),
    ),
    params(
        ("query" = SuggestionsQueryParams, Query, description = "查询参数"),
    ),
    tag = "Finance Tax V56",
    operation_id = "get_suggestions_handler",
)]

async fn get_suggestions_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<SuggestionsQueryParams>,
) -> Json<ApiResponse<Vec<TaxSuggestion>>> {
    let pool = state.pool.clone();
    let tenant_id = get_tenant_id(&claims);
    let plan_id = match params.plan_id {
        Some(id) => id,
        None => return Json(ApiResponse::error(400, "plan_id 参数必填")),
    };
    match TaxPlanner::get_suggestions(&pool, tenant_id, plan_id).await {
        Ok(suggestions) => Json(ApiResponse::success(suggestions, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    post,
    path = "/finance-v56/scenarios",
    tag = "TaxV56",
    operation_id = "compare_scenarios_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn compare_scenarios_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CompareScenarioRequest>,
) -> Json<ApiResponse<Vec<ScenarioAnalysis>>> {
    let pool = state.pool.clone();
    let tenant_id = get_tenant_id(&claims);
    match TaxPlanner::compare_scenarios(&pool, tenant_id, req.scenarios).await {
        Ok(results) => Json(ApiResponse::success(results, "对比完成")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    get,
    path = "/finance-v56/plans",
    tag = "TaxV56",
    operation_id = "list_plans_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn list_plans_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<PlansQueryParams>,
) -> Json<ApiResponse<Vec<TaxPlan>>> {
    let pool = state.pool.clone();
    let tenant_id = get_tenant_id(&claims);
    match TaxPlanner::list_plans(&pool, tenant_id, params.status).await {
        Ok(plans) => Json(ApiResponse::success(plans, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    post,
    path = "/finance-v56/plan",
    tag = "TaxV56",
    operation_id = "approve_plan_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn approve_plan_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<TaxPlan>> {
    let pool = state.pool.clone();
    let tenant_id = get_tenant_id(&claims);
    match TaxPlanner::approve_plan(&pool, tenant_id, id).await {
        Ok(plan) => Json(ApiResponse::success(plan, "审批成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}
#[utoipa::path(
    get,
    path = "/finance-v56/tax/compliance",
    responses(
        (status = 200, description = "成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误"),
    ),
    params(
        ("query" = ComplianceQueryParams, Query, description = "查询参数"),
    ),
    tag = "Finance Tax V56",
    operation_id = "get_compliance_handler",
)]

async fn get_compliance_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ComplianceQueryParams>,
) -> Json<ApiResponse<ComplianceCheckResult>> {
    let pool = state.pool.clone();
    let tenant_id = get_tenant_id(&claims);
    match TaxPlanner::get_compliance_check(&pool, tenant_id, params.entity).await {
        Ok(result) => Json(ApiResponse::success(result, "合规检查完成")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

// ==================== 路由注册 ====================

pub fn create_routes() -> Router<AppState> {
    Router::new()
        // --- Tax Filing ---
        .route(
            "/finance-v56/tax/generate",
            axum::routing::post(generate_tax_form_handler),
        )
        .route(
            "/finance-v56/tax/forms",
            axum::routing::get(get_tax_forms_handler),
        )
        .route(
            "/finance-v56/tax/forms/{id}",
            axum::routing::get(get_tax_form_by_id_handler),
        )
        .route(
            "/finance-v56/tax/forms/{id}/submit",
            axum::routing::post(submit_tax_form_handler),
        )
        .route(
            "/finance-v56/tax/forms/{id}/amend",
            axum::routing::post(amend_tax_form_handler),
        )
        .route(
            "/finance-v56/tax/summary",
            axum::routing::get(get_tax_summary_handler),
        )
        .route(
            "/finance-v56/tax/schedule",
            axum::routing::get(get_tax_schedule_handler),
        )
        // --- Tax Rate ---
        .route(
            "/finance-v56/tax/calculate",
            axum::routing::post(calculate_tax_handler),
        )
        .route(
            "/finance-v56/tax/rates",
            axum::routing::get(get_rate_schedule_handler),
        )
        .route(
            "/finance-v56/tax/rates/lookup",
            axum::routing::get(lookup_rate_handler),
        )
        .route(
            "/finance-v56/tax/breakdown",
            axum::routing::get(get_tax_breakdown_handler),
        )
        .route(
            "/finance-v56/tax/validate",
            axum::routing::get(validate_rate_handler),
        )
        // --- Tax Planning ---
        .route(
            "/finance-v56/tax/plan",
            axum::routing::post(create_plan_handler),
        )
        .route(
            "/finance-v56/tax/scenario",
            axum::routing::post(analyze_scenario_handler),
        )
        .route(
            "/finance-v56/tax/suggestions",
            axum::routing::get(get_suggestions_handler),
        )
        .route(
            "/finance-v56/tax/comparison",
            axum::routing::post(compare_scenarios_handler),
        )
        .route(
            "/finance-v56/tax/plans",
            axum::routing::get(list_plans_handler),
        )
        .route(
            "/finance-v56/tax/plans/{id}/approve",
            axum::routing::put(approve_plan_handler),
        )
        .route(
            "/finance-v56/tax/compliance",
            axum::routing::get(get_compliance_handler),
        )
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

    #[test] fn enum_tax_form_type() {
        roundtrip(&TaxFormType::VAT);
        roundtrip(&TaxFormType::CIT);
        roundtrip(&TaxFormType::PIT);
        roundtrip(&TaxFormType::Withholding);
        roundtrip(&TaxFormType::Stamp);
    }

    #[test] fn enum_tax_form_status() {
        roundtrip(&TaxFormStatus::Draft);
        roundtrip(&TaxFormStatus::Calculated);
        roundtrip(&TaxFormStatus::Submitted);
        roundtrip(&TaxFormStatus::Accepted);
        roundtrip(&TaxFormStatus::Rejected);
    }

    #[test] fn enum_tax_rate_type() {
        roundtrip(&TaxRateType::VAT);
        roundtrip(&TaxRateType::CIT);
        roundtrip(&TaxRateType::PIT);
        roundtrip(&TaxRateType::Withholding);
        roundtrip(&TaxRateType::Stamp);
    }

    #[test] fn enum_tax_plan_strategy() {
        roundtrip(&TaxPlanStrategy::LegalOptimization);
        roundtrip(&TaxPlanStrategy::DeductionMaximization);
        roundtrip(&TaxPlanStrategy::TimingStrategy);
        roundtrip(&TaxPlanStrategy::HoldingOptimization);
    }

    #[test] fn enum_tax_plan_risk_level() {
        roundtrip(&TaxPlanRiskLevel::Low);
        roundtrip(&TaxPlanRiskLevel::Medium);
        roundtrip(&TaxPlanRiskLevel::High);
    }

    #[test] fn enum_tax_plan_status() {
        roundtrip(&TaxPlanStatus::Draft);
        roundtrip(&TaxPlanStatus::Proposed);
        roundtrip(&TaxPlanStatus::UnderReview);
        roundtrip(&TaxPlanStatus::Approved);
        roundtrip(&TaxPlanStatus::Rejected);
        roundtrip(&TaxPlanStatus::Executed);
    }

    #[test] fn struct_tax_form() {
        let v = TaxForm {
            id: Uuid::new_v4(), form_type: "vat".into(),
            jurisdiction: "CN".into(),
            period_start: Utc::now(), period_end: Utc::now(),
            status: "draft".into(), total_tax_amount: 1300.0,
            filed_at: None, accepted_at: None,
        };
        roundtrip(&v);
    }

    #[test] fn struct_tax_line() {
        let v = TaxLine {
            id: Uuid::new_v4(), form_id: Uuid::new_v4(),
            line_no: 1, description: "销项".into(),
            taxable_amount: 10000.0, tax_rate: 0.13,
            tax_amount: 1300.0,
        };
        roundtrip(&v);
    }

    #[test] fn struct_tax_form_with_lines() {
        let v = TaxFormWithLines {
            form: TaxForm {
                id: Uuid::new_v4(), form_type: "vat".into(),
                jurisdiction: "CN".into(),
                period_start: Utc::now(), period_end: Utc::now(),
                status: "calculated".into(), total_tax_amount: 0.0,
                filed_at: None, accepted_at: None,
            },
            lines: vec![TaxLine {
                id: Uuid::new_v4(), form_id: Uuid::new_v4(),
                line_no: 1, description: "进项".into(),
                taxable_amount: 5000.0, tax_rate: 0.13, tax_amount: 650.0,
            }],
        };
        roundtrip(&v);
    }

    #[test] fn struct_tax_rate() {
        let v = TaxRate {
            id: Uuid::new_v4(), jurisdiction: "CN".into(),
            rate_type: "vat".into(), rate: 0.13,
            effective_from: Utc::now(), effective_to: None,
            description: Some("标准税率".into()),
        };
        roundtrip(&v);
    }

    #[test] fn struct_tax_bracket() {
        let v = TaxBracket {
            id: Uuid::new_v4(), rate_id: Uuid::new_v4(),
            bracket_order: 1, threshold_from: 0.0,
            threshold_to: Some(3000.0), rate: 0.03,
        };
        roundtrip(&v);
    }

    #[test] fn struct_tax_breakdown() {
        let v = TaxBreakdown {
            bracket_order: 1, threshold_from: 0.0,
            threshold_to: Some(3000.0), rate: 0.03,
            taxable_in_bracket: 3000.0, tax_in_bracket: 90.0,
        };
        roundtrip(&v);
    }

    #[test] fn struct_tax_result() {
        let v = TaxResult {
            taxable_amount: 5000.0, rate: 0.1, tax_amount: 500.0,
            breakdown: vec![TaxBreakdown {
                bracket_order: 1, threshold_from: 0.0,
                threshold_to: Some(3000.0), rate: 0.03,
                taxable_in_bracket: 3000.0, tax_in_bracket: 90.0,
            }],
        };
        roundtrip(&v);
    }

    #[test] fn struct_tax_plan() {
        let v = TaxPlan {
            id: Uuid::new_v4(), entity: "Entity-A".into(),
            period: "2024".into(), strategy: "legal_optimization".into(),
            projected_savings: 50000.0,
            risk_level: "low".into(), status: "approved".into(),
            approved_at: Some(Utc::now()),
        };
        roundtrip(&v);
    }

    #[test] fn struct_tax_suggestion() {
        let v = TaxSuggestion {
            id: Uuid::new_v4(), plan_id: Uuid::new_v4(),
            category: "deduction".into(),
            description: "增加研发费用扣除".into(),
            estimated_savings: 20000.0, confidence: 0.85,
            action_items: Some(vec!["整理凭证".into()]),
        };
        roundtrip(&v);
    }

    #[test] fn struct_compliance_check_result() {
        let v = ComplianceCheckResult {
            compliant: true,
            issues: vec![],
            warnings: vec!["建议复核".into()],
            suggestions: vec!["保存发票".into()],
        };
        roundtrip(&v);
    }

    #[test] fn struct_tax_line_input() {
        let v = TaxLineInput {
            line_no: 1, description: "test".into(),
            taxable_amount: 100.0, tax_rate: 0.06,
        };
        roundtrip(&v);
    }

    #[test] fn struct_scenario_analysis() {
        let v = ScenarioAnalysis {
            scenario_name: "乐观".into(),
            projected_tax: 80000.0, projected_savings: 20000.0,
            risk_level: "low".into(),
            suggestions: vec!["可行".into()],
        };
        roundtrip(&v);
    }
}
