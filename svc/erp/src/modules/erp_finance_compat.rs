//! ERP finance compatibility OpenAPI paths.
//!
//! These paths are still called through `apiClient.erp` by the web layer while
//! the business implementation has been migrated out of the local ERP modules.
//! The functions are intentionally OpenAPI-only so the contract audit can match
//! the legacy ERP-facing paths without changing runtime routing behavior.

macro_rules! compat_path {
    ($name:ident, $method:ident, $path:literal, $tag:literal) => {
        #[utoipa::path(
            $method,
            path = $path,
            tag = $tag,
            responses((status = 200, description = "ERP finance compatibility endpoint"))
        )]
        pub async fn $name() {}
    };
    ($name:ident, $method:ident, $path:literal, $tag:literal, $param:literal) => {
        #[utoipa::path(
            $method,
            path = $path,
            tag = $tag,
            params(($param = String, Path, description = "路径参数")),
            responses((status = 200, description = "ERP finance compatibility endpoint"))
        )]
        pub async fn $name() {}
    };
}

compat_path!(
    list_accounting_subjects_compat,
    get,
    "/erp/accounting-subjects",
    "Finance"
);
compat_path!(
    get_accounting_subject_compat,
    get,
    "/erp/accounting-subjects/{id}",
    "Finance",
    "id"
);
compat_path!(
    create_accounting_subject_compat,
    post,
    "/erp/accounting-subjects",
    "Finance"
);
compat_path!(
    update_accounting_subject_compat,
    put,
    "/erp/accounting-subjects/{id}",
    "Finance",
    "id"
);
compat_path!(
    delete_accounting_subject_compat,
    delete,
    "/erp/accounting-subjects/{id}",
    "Finance",
    "id"
);

compat_path!(
    get_asset_category_compat,
    get,
    "/erp/asset-categories/{id}",
    "Assets",
    "id"
);
compat_path!(
    create_asset_category_compat,
    post,
    "/erp/asset-categories",
    "Assets"
);
compat_path!(
    update_asset_category_compat,
    put,
    "/erp/asset-categories/{id}",
    "Assets",
    "id"
);
compat_path!(
    delete_asset_category_compat,
    delete,
    "/erp/asset-categories/{id}",
    "Assets",
    "id"
);

compat_path!(list_bank_accounts_compat, get, "/erp/bank-accounts", "Finance");
compat_path!(
    get_bank_account_compat,
    get,
    "/erp/bank-accounts/{id}",
    "Finance",
    "id"
);
compat_path!(
    create_bank_account_compat,
    post,
    "/erp/bank-accounts",
    "Finance"
);
compat_path!(
    update_bank_account_compat,
    put,
    "/erp/bank-accounts/{id}",
    "Finance",
    "id"
);
compat_path!(
    delete_bank_account_compat,
    delete,
    "/erp/bank-accounts/{id}",
    "Finance",
    "id"
);

compat_path!(
    list_bank_transactions_compat,
    get,
    "/erp/bank-transactions",
    "Finance"
);
compat_path!(
    get_bank_transaction_compat,
    get,
    "/erp/bank-transactions/{id}",
    "Finance",
    "id"
);
compat_path!(
    create_bank_transaction_compat,
    post,
    "/erp/bank-transactions",
    "Finance"
);
compat_path!(
    delete_bank_transaction_compat,
    delete,
    "/erp/bank-transactions/{id}",
    "Finance",
    "id"
);

compat_path!(list_budgets_compat, get, "/erp/budgets", "Finance");
compat_path!(get_budget_compat, get, "/erp/budgets/{id}", "Finance", "id");
compat_path!(create_budget_compat, post, "/erp/budgets", "Finance");
compat_path!(
    update_budget_compat,
    put,
    "/erp/budgets/{id}",
    "Finance",
    "id"
);
compat_path!(
    delete_budget_compat,
    delete,
    "/erp/budgets/{id}",
    "Finance",
    "id"
);

compat_path!(list_expenses_compat, get, "/erp/expenses", "Finance");
compat_path!(get_expense_compat, get, "/erp/expenses/{id}", "Finance", "id");
compat_path!(create_expense_compat, post, "/erp/expenses", "Finance");
compat_path!(
    update_expense_compat,
    put,
    "/erp/expenses/{id}",
    "Finance",
    "id"
);
compat_path!(
    delete_expense_compat,
    delete,
    "/erp/expenses/{id}",
    "Finance",
    "id"
);

compat_path!(list_receivables_compat, get, "/erp/receivables", "Finance");
compat_path!(
    get_receivable_compat,
    get,
    "/erp/receivables/{id}",
    "Finance",
    "id"
);
compat_path!(
    create_receivable_compat,
    post,
    "/erp/receivables",
    "Finance"
);
compat_path!(
    update_receivable_compat,
    put,
    "/erp/receivables/{id}",
    "Finance",
    "id"
);
compat_path!(
    delete_receivable_compat,
    delete,
    "/erp/receivables/{id}",
    "Finance",
    "id"
);

compat_path!(list_payables_compat, get, "/erp/payables", "Finance");
compat_path!(get_payable_compat, get, "/erp/payables/{id}", "Finance", "id");
compat_path!(create_payable_compat, post, "/erp/payables", "Finance");
compat_path!(
    update_payable_compat,
    put,
    "/erp/payables/{id}",
    "Finance",
    "id"
);
compat_path!(
    delete_payable_compat,
    delete,
    "/erp/payables/{id}",
    "Finance",
    "id"
);

compat_path!(
    get_balance_sheet_report_compat,
    get,
    "/erp/reports/balance-sheet",
    "Finance"
);
compat_path!(
    get_income_statement_report_compat,
    get,
    "/erp/reports/income-statement",
    "Finance"
);
compat_path!(
    get_cash_flow_report_compat,
    get,
    "/erp/reports/cash-flow",
    "Finance"
);
compat_path!(
    get_business_overview_report_compat,
    get,
    "/erp/reports/business-overview",
    "Finance"
);
compat_path!(
    get_project_summary_report_compat,
    get,
    "/erp/reports/project-summary",
    "Finance"
);
compat_path!(
    get_monthly_trend_report_compat,
    get,
    "/erp/reports/monthly-trend",
    "Finance"
);
compat_path!(
    get_department_summary_report_compat,
    get,
    "/erp/reports/department-summary",
    "Finance"
);
compat_path!(
    get_aging_analysis_report_compat,
    get,
    "/erp/reports/aging-analysis",
    "Finance"
);
compat_path!(
    get_voucher_statistics_report_compat,
    get,
    "/erp/reports/voucher-statistics",
    "Finance"
);
compat_path!(
    get_cash_flow_analysis_report_compat,
    get,
    "/erp/reports/cash-flow-analysis",
    "Finance"
);
compat_path!(
    get_expense_analysis_report_compat,
    get,
    "/erp/reports/expense-analysis",
    "Finance"
);
compat_path!(
    get_profit_analysis_report_compat,
    get,
    "/erp/reports/profit-analysis",
    "Finance"
);
compat_path!(
    get_financial_overview_report_compat,
    get,
    "/erp/reports/financial-overview",
    "Finance"
);

compat_path!(list_vouchers_compat, get, "/erp/vouchers", "Voucher");
compat_path!(get_voucher_compat, get, "/erp/vouchers/{id}", "Voucher", "id");
compat_path!(
    get_voucher_items_compat,
    get,
    "/erp/vouchers/{id}/items",
    "Voucher",
    "id"
);
compat_path!(create_voucher_compat, post, "/erp/vouchers", "Voucher");
compat_path!(
    update_voucher_compat,
    put,
    "/erp/vouchers/{id}",
    "Voucher",
    "id"
);
compat_path!(
    delete_voucher_compat,
    delete,
    "/erp/vouchers/{id}",
    "Voucher",
    "id"
);
compat_path!(
    import_u8_vouchers_compat,
    post,
    "/erp/vouchers/import/u8",
    "Voucher"
);
