use axum::{routing::get, Router};

use super::ApiState;

mod models;
mod core_reports;
mod voucher_reports;
mod receivable_payable;
mod budget_hr;
mod analysis_reports;
mod project_department;

pub use models::*;

pub use core_reports::{balance_sheet, income_statement, cash_flow};

pub use voucher_reports::{voucher_summary, voucher_details, voucher_trend};

pub use receivable_payable::{receivables_report, payables_report, aging_analysis};

pub use budget_hr::{budget_summary, employee_summary};

pub use analysis_reports::{
    category_summary, monthly_trend, business_overview, cash_flow_analysis,
    expense_analysis, profit_analysis, financial_overview,
};

pub use project_department::{project_summary, department_summary};

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
