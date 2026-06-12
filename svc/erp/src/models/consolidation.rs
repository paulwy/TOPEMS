use serde::{Deserialize, Serialize};
use sqlx::FromRow;

// ==================== 合并范围 ====================
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ConsolidationScope {
    pub id: uuid::Uuid,
    pub organization_id: uuid::Uuid,
    pub code: String,
    pub name: String,
    pub description: Option<String>,
    pub consolidation_method: String,
    pub status: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
    pub created_by: Option<uuid::Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateConsolidationScopeRequest {
    pub code: String,
    pub name: String,
    pub description: Option<String>,
    pub consolidation_method: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateConsolidationScopeRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub consolidation_method: Option<String>,
    pub status: Option<String>,
}

// ==================== 合并范围公司 ====================
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ConsolidationScopeCompany {
    pub id: uuid::Uuid,
    pub scope_id: uuid::Uuid,
    pub company_id: uuid::Uuid,
    pub company_code: Option<String>,
    pub company_name: Option<String>,
    pub is_parent: bool,
    pub control_type: String,
    pub ownership_percentage: rust_decimal::Decimal,
    pub consolidation_percentage: rust_decimal::Decimal,
    pub minority_interest: rust_decimal::Decimal,
    pub effective_date: Option<chrono::NaiveDate>,
    pub expiry_date: Option<chrono::NaiveDate>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AddScopeCompanyRequest {
    pub scope_id: uuid::Uuid,
    pub company_id: uuid::Uuid,
    pub is_parent: Option<bool>,
    pub control_type: String,
    pub ownership_percentage: f64,
    pub consolidation_percentage: Option<f64>,
    pub minority_interest: Option<f64>,
    pub effective_date: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateScopeCompanyRequest {
    pub control_type: Option<String>,
    pub ownership_percentage: Option<f64>,
    pub consolidation_percentage: Option<f64>,
    pub minority_interest: Option<f64>,
    pub expiry_date: Option<String>,
}

// ==================== 抵消规则 ====================
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct EliminationRule {
    pub id: uuid::Uuid,
    pub scope_id: uuid::Uuid,
    pub code: String,
    pub name: String,
    pub r#type: String,
    pub description: Option<String>,
    pub status: String,
    pub direction: String,
    pub debit_account_codes: Option<serde_json::Value>,
    pub credit_account_codes: Option<serde_json::Value>,
    pub company_pairs: Option<serde_json::Value>,
    pub auto_elimination: bool,
    pub priority: i32,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateEliminationRuleRequest {
    pub scope_id: uuid::Uuid,
    pub code: String,
    pub name: String,
    pub r#type: String,
    pub description: Option<String>,
    pub status: Option<String>,
    pub direction: Option<String>,
    pub debit_account_codes: Option<Vec<String>>,
    pub credit_account_codes: Option<Vec<String>>,
    pub company_pairs: Option<serde_json::Value>,
    pub auto_elimination: Option<bool>,
    pub priority: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateEliminationRuleRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub status: Option<String>,
    pub direction: Option<String>,
    pub debit_account_codes: Option<Vec<String>>,
    pub credit_account_codes: Option<Vec<String>>,
    pub company_pairs: Option<serde_json::Value>,
    pub auto_elimination: Option<bool>,
    pub priority: Option<i32>,
}

// ==================== 内部交易 ====================
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct InternalTransaction {
    pub id: uuid::Uuid,
    pub organization_id: uuid::Uuid,
    pub transaction_no: String,
    pub transaction_date: chrono::NaiveDate,
    pub period: String,
    pub from_company_id: uuid::Uuid,
    pub from_company_name: Option<String>,
    pub to_company_id: uuid::Uuid,
    pub to_company_name: Option<String>,
    pub transaction_type: String,
    pub description: Option<String>,
    pub amount: rust_decimal::Decimal,
    pub currency: String,
    pub elimination_status: String,
    pub eliminated_amount: rust_decimal::Decimal,
    pub remaining_amount: rust_decimal::Decimal,
    pub voucher_id: Option<uuid::Uuid>,
    pub elimination_voucher_id: Option<uuid::Uuid>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecuteEliminationRequest {
    pub scope_id: uuid::Uuid,
    pub period: String,
    pub rule_ids: Option<Vec<uuid::Uuid>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EliminationResult {
    pub eliminated_count: i64,
    pub total_eliminated: f64,
    pub results: Vec<RuleEliminationResult>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RuleEliminationResult {
    pub rule_id: uuid::Uuid,
    pub rule_name: String,
    pub rule_type: String,
    pub transaction_count: i64,
    pub total_eliminated: f64,
    pub success: bool,
    pub error_message: Option<String>,
}

// ==================== 合并报表 ====================
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ConsolidationReport {
    pub id: uuid::Uuid,
    pub organization_id: uuid::Uuid,
    pub report_no: String,
    pub report_type: String,
    pub scope_id: uuid::Uuid,
    pub scope_name: Option<String>,
    pub period: String,
    pub year: i32,
    pub quarter: Option<i32>,
    pub month: Option<i32>,
    pub status: String,
    pub company_count: i32,
    pub eliminated_company_count: i32,
    pub total_assets: Option<rust_decimal::Decimal>,
    pub total_liabilities: Option<rust_decimal::Decimal>,
    pub total_equity: Option<rust_decimal::Decimal>,
    pub total_revenue: Option<rust_decimal::Decimal>,
    pub total_profit: Option<rust_decimal::Decimal>,
    pub net_profit: Option<rust_decimal::Decimal>,
    pub minority_interest: Option<rust_decimal::Decimal>,
    pub parent_net_profit: Option<rust_decimal::Decimal>,
    pub approval_status: String,
    pub approved_by: Option<uuid::Uuid>,
    pub approved_at: Option<chrono::DateTime<chrono::Utc>>,
    pub published_by: Option<uuid::Uuid>,
    pub published_at: Option<chrono::DateTime<chrono::Utc>>,
    pub generated_by: Option<uuid::Uuid>,
    pub generated_at: Option<chrono::DateTime<chrono::Utc>>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenerateConsolidationReportRequest {
    pub scope_id: uuid::Uuid,
    pub report_type: String,
    pub period: String,
    pub include_prior_period: Option<bool>,
    pub auto_eliminate: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ConsolidationReportLine {
    pub id: uuid::Uuid,
    pub report_id: uuid::Uuid,
    pub line_no: i32,
    pub item_code: Option<String>,
    pub item_name: String,
    pub item_level: i32,
    pub current_period: rust_decimal::Decimal,
    pub prior_period: Option<rust_decimal::Decimal>,
    pub company_breakdown: Option<serde_json::Value>,
    pub elimination_breakdown: Option<serde_json::Value>,
    pub formula: Option<String>,
    pub notes: Option<String>,
}

// ==================== 公司关系 ====================
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct CompanyRelation {
    pub id: uuid::Uuid,
    pub organization_id: uuid::Uuid,
    pub parent_company_id: uuid::Uuid,
    pub parent_company_name: Option<String>,
    pub child_company_id: uuid::Uuid,
    pub child_company_name: Option<String>,
    pub relation_type: String,
    pub ownership_percentage: rust_decimal::Decimal,
    pub control_percentage: rust_decimal::Decimal,
    pub effective_date: chrono::NaiveDate,
    pub expiry_date: Option<chrono::NaiveDate>,
    pub status: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompanyTreeNode {
    pub id: uuid::Uuid,
    pub name: String,
    pub code: String,
    pub level: i32,
    pub is_parent: bool,
    pub relation_type: String,
    pub ownership_percentage: f64,
    pub children: Vec<CompanyTreeNode>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateCompanyRelationRequest {
    pub parent_company_id: uuid::Uuid,
    pub child_company_id: uuid::Uuid,
    pub relation_type: String,
    pub ownership_percentage: f64,
    pub control_percentage: Option<f64>,
    pub effective_date: String,
    pub expiry_date: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateCompanyRelationRequest {
    pub ownership_percentage: Option<f64>,
    pub control_percentage: Option<f64>,
    pub expiry_date: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompanyFinancialData {
    pub company_id: uuid::Uuid,
    pub company_name: String,
    pub period: String,
    pub current_assets: f64,
    pub non_current_assets: f64,
    pub total_assets: f64,
    pub current_liabilities: f64,
    pub non_current_liabilities: f64,
    pub total_liabilities: f64,
    pub paid_in_capital: f64,
    pub capital_reserve: f64,
    pub surplus_reserve: f64,
    pub undistributed_profit: f64,
    pub total_equity: f64,
    pub revenue: f64,
    pub cost_of_goods_sold: f64,
    pub gross_profit: f64,
    pub operating_profit: f64,
    pub profit_before_tax: f64,
    pub net_profit: f64,
    pub operating_cash_flow: f64,
    pub investing_cash_flow: f64,
    pub financing_cash_flow: f64,
    pub net_cash_flow: f64,
}
