use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct ReportParams {
    pub period: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub project_id: Option<String>,
    pub department_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BalanceSheet {
    pub assets: Vec<BalanceItem>,
    pub liabilities: Vec<BalanceItem>,
    pub equity: Vec<BalanceItem>,
    pub total_assets: f64,
    pub total_liabilities: f64,
    pub total_equity: f64,
    pub period: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BalanceItem {
    pub code: String,
    pub name: String,
    pub amount: f64,
    pub percentage: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct IncomeStatement {
    pub revenues: Vec<IncomeItem>,
    pub expenses: Vec<IncomeItem>,
    pub gross_profit: f64,
    pub operating_profit: f64,
    pub net_profit: f64,
    pub period: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct IncomeItem {
    pub code: String,
    pub name: String,
    pub amount: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CashFlowStatement {
    pub operating: Vec<CashFlowItem>,
    pub investing: Vec<CashFlowItem>,
    pub financing: Vec<CashFlowItem>,
    pub net_cash_flow: f64,
    pub period: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CashFlowItem {
    pub description: String,
    pub amount: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct VoucherSummary {
    pub voucher_number: String,
    pub voucher_date: DateTime<Utc>,
    pub summary: Option<String>,
    pub status: String,
    pub total_debit: f64,
    pub total_credit: f64,
    pub maker_name: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct VoucherDetail {
    pub voucher_number: String,
    pub voucher_date: DateTime<Utc>,
    pub summary: Option<String>,
    pub subject_code: String,
    pub subject_name: Option<String>,
    pub debit_amount: f64,
    pub credit_amount: f64,
    pub maker_name: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ReceivableSummary {
    pub status: String,
    pub total: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PayableSummary {
    pub status: String,
    pub total: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BudgetSummary {
    pub department_name: Option<String>,
    pub total_budget: f64,
    pub used_amount: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct EmployeeSummary {
    pub department_name: Option<String>,
    pub employee_count: i64,
    pub avg_tenure: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct VoucherTrend {
    pub period: String,
    pub voucher_count: i64,
    pub total_amount: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CategorySummary {
    pub category: String,
    pub amount: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AgingAnalysisItem {
    pub period: String,
    pub receivables: f64,
    pub payables: f64,
    pub description: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MonthlyTrendItem {
    pub month: String,
    pub revenue: f64,
    pub expense: f64,
    pub profit: f64,
    pub voucher_count: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct KeyRatios {
    pub current_ratio: f64,
    pub debt_ratio: f64,
    pub return_on_equity: f64,
    pub profit_margin: f64,
    pub return_on_assets: f64,
    pub earnings_per_share: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BusinessOverview {
    pub total_assets: f64,
    pub total_liabilities: f64,
    pub total_equity: f64,
    pub total_revenue: f64,
    pub total_expenses: f64,
    pub net_profit: f64,
    pub cash_flow: f64,
    pub period: String,
    pub key_ratios: KeyRatios,
    pub receivable_turnover: f64,
    pub inventory_turnover: f64,
    pub asset_turnover: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProjectFinancialSummary {
    pub project_id: String,
    pub project_name: String,
    pub contract_amount: f64,
    pub received_amount: f64,
    pub payable_amount: f64,
    pub paid_amount: f64,
    pub profit: f64,
    pub margin: f64,
    pub status: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DepartmentFinancialSummary {
    pub department_id: Option<String>,
    pub department_name: String,
    pub total_expenses: f64,
    pub budget_amount: f64,
    pub budget_usage: f64,
    pub expense_count: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CashFlowAnalysis {
    pub period: String,
    pub operating_cash_flow: f64,
    pub investing_cash_flow: f64,
    pub financing_cash_flow: f64,
    pub net_cash_flow: f64,
    pub cash_flow_ratio: f64,
    pub operating_cash_flow_to_revenue: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CategoryExpense {
    pub category: String,
    pub amount: f64,
    pub percentage: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DepartmentExpense {
    pub department_id: Option<String>,
    pub department_name: String,
    pub amount: f64,
    pub percentage: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MonthlyExpense {
    pub month: String,
    pub amount: f64,
    pub growth_rate: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExpenseAnalysis {
    pub period: String,
    pub total_expenses: f64,
    pub department_expenses: Vec<DepartmentExpense>,
    pub category_expenses: Vec<CategoryExpense>,
    pub monthly_trend: Vec<MonthlyExpense>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MonthlyProfit {
    pub month: String,
    pub gross_profit: f64,
    pub operating_profit: f64,
    pub net_profit: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProfitAnalysis {
    pub period: String,
    pub gross_profit: f64,
    pub operating_profit: f64,
    pub net_profit: f64,
    pub gross_margin: f64,
    pub operating_margin: f64,
    pub net_margin: f64,
    pub profit_trend: Vec<MonthlyProfit>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FinancialOverview {
    pub total_assets: f64,
    pub total_liabilities: f64,
    pub total_equity: f64,
    pub total_revenue: f64,
    pub total_expenses: f64,
    pub net_profit: f64,
    pub operating_cash_flow: f64,
    pub key_ratios: KeyRatios,
    pub profit_margin: f64,
    pub return_on_assets: f64,
    pub return_on_equity: f64,
    pub debt_ratio: f64,
    pub current_ratio: f64,
}
