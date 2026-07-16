use axum::{routing::get, Router};

use super::ApiState;

mod analysis_reports;
mod budget_hr;
mod core_reports;
mod models;
mod project_department;
mod receivable_payable;
mod voucher_reports;

pub use models::*;

pub use core_reports::{balance_sheet, cash_flow, income_statement};

pub use voucher_reports::{voucher_details, voucher_summary, voucher_trend};

pub use receivable_payable::{aging_analysis, payables_report, receivables_report};

pub use budget_hr::{budget_summary, employee_summary};

pub use analysis_reports::{
    business_overview, cash_flow_analysis, category_summary, expense_analysis, financial_overview,
    monthly_trend, profit_analysis,
};

pub use project_department::{department_summary, project_summary};

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route("/api/erp/reports/balance-sheet", get(balance_sheet))
        .route("/api/erp/reports/income-statement", get(income_statement))
        .route("/api/erp/reports/cash-flow", get(cash_flow))
        .route("/api/erp/reports/voucher-summary", get(voucher_summary))
        .route("/api/erp/reports/voucher-details", get(voucher_details))
        .route("/api/erp/reports/receivables", get(receivables_report))
        .route("/api/erp/reports/payables", get(payables_report))
        .route("/api/erp/reports/budget-summary", get(budget_summary))
        .route("/api/erp/reports/employee-summary", get(employee_summary))
        .route("/api/erp/reports/voucher-trend", get(voucher_trend))
        .route("/api/erp/reports/category-summary", get(category_summary))
        .route("/api/erp/reports/aging-analysis", get(aging_analysis))
        .route("/api/erp/reports/monthly-trend", get(monthly_trend))
        .route("/api/erp/reports/business-overview", get(business_overview))
        .route("/api/erp/reports/project-summary", get(project_summary))
        .route(
            "/api/erp/reports/department-summary",
            get(department_summary),
        )
        .route(
            "/api/erp/reports/cash-flow-analysis",
            get(cash_flow_analysis),
        )
        .route("/api/erp/reports/expense-analysis", get(expense_analysis))
        .route("/api/erp/reports/profit-analysis", get(profit_analysis))
        .route(
            "/api/erp/reports/financial-overview",
            get(financial_overview),
        )
}
