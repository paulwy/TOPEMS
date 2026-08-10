//! Finance compatibility module - RC4a OpenAPI gap coverage
//!
//! This module provides utoipa path annotations for all frontend finance API calls
//! that are NOT already covered by the existing OpenAPI spec. Each function is a
//! stub that only exists to register the path in the OpenAPI documentation.
//!
//! Total compat endpoints: 83

// ========== Accounts ==========

// ========== Accounts ==========

#[utoipa::path(
    get,
    path = "/api/finance/accounts/opening-balances",
    tag = "Finance-Compat",
    responses((status = 200, description = "Finance compatibility endpoint"))
)]
pub async fn compat_get_api_finance_accounts_opening_balances() {}

#[utoipa::path(
    post,
    path = "/api/finance/accounts/opening-balances/carry-forward",
    tag = "Finance-Compat",
    responses((status = 200, description = "Finance compatibility endpoint"))
)]
pub async fn compat_post_api_finance_accounts_opening_balances_carry_forward() {}

#[utoipa::path(
    get,
    path = "/api/finance/accounts/tree",
    tag = "Finance-Compat",
    responses((status = 200, description = "Finance compatibility endpoint"))
)]
pub async fn compat_get_api_finance_accounts_tree() {}

#[utoipa::path(
    post,
    path = "/api/finance/accounts/{accountId}/opening-balance",
    tag = "Finance-Compat",
    params(("accountId" = String, Path, description = "accountId")),
    responses((status = 200, description = "Finance compatibility endpoint"))
)]
pub async fn compat_post_api_finance_accounts_accountid_opening_balance() {}

#[utoipa::path(
    delete,
    path = "/api/finance/accounts/{id}",
    tag = "Finance-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Finance compatibility endpoint"))
)]
pub async fn compat_delete_api_finance_accounts_id() {}

#[utoipa::path(
    put,
    path = "/api/finance/accounts/{id}",
    tag = "Finance-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Finance compatibility endpoint"))
)]
pub async fn compat_put_api_finance_accounts_id() {}

#[utoipa::path(
    post,
    path = "/api/finance/accounts/{parentId}/children-batch",
    tag = "Finance-Compat",
    params(("parentId" = String, Path, description = "parentId")),
    responses((status = 200, description = "Finance compatibility endpoint"))
)]
pub async fn compat_post_api_finance_accounts_parentid_children_batch() {}

// ========== AR/AP ==========

#[utoipa::path(
    get,
    path = "/api/finance/ap/aging",
    tag = "Finance-Compat",
    responses((status = 200, description = "Finance compatibility endpoint"))
)]
pub async fn compat_get_api_finance_ap_aging() {}

#[utoipa::path(
    get,
    path = "/api/finance/ar/aging",
    tag = "Finance-Compat",
    responses((status = 200, description = "Finance compatibility endpoint"))
)]
pub async fn compat_get_api_finance_ar_aging() {}

#[utoipa::path(
    get,
    path = "/api/finance/ar/collections",
    tag = "Finance-Compat",
    responses((status = 200, description = "Finance compatibility endpoint"))
)]
pub async fn compat_get_api_finance_ar_collections() {}

#[utoipa::path(
    post,
    path = "/api/finance/ar/collections",
    tag = "Finance-Compat",
    responses((status = 200, description = "Finance compatibility endpoint"))
)]
pub async fn compat_post_api_finance_ar_collections() {}

// ========== Counterparty ==========

#[utoipa::path(
    get,
    path = "/api/finance/counterparty/customers",
    tag = "Finance-Compat",
    responses((status = 200, description = "Finance compatibility endpoint"))
)]
pub async fn compat_get_api_finance_counterparty_customers() {}

#[utoipa::path(
    get,
    path = "/api/finance/counterparty/customers/{customerId}",
    tag = "Finance-Compat",
    params(("customerId" = String, Path, description = "customerId")),
    responses((status = 200, description = "Finance compatibility endpoint"))
)]
pub async fn compat_get_api_finance_counterparty_customers_customerid() {}

#[utoipa::path(
    put,
    path = "/api/finance/counterparty/customers/{customerId}",
    tag = "Finance-Compat",
    params(("customerId" = String, Path, description = "customerId")),
    responses((status = 200, description = "Finance compatibility endpoint"))
)]
pub async fn compat_put_api_finance_counterparty_customers_customerid() {}

#[utoipa::path(
    get,
    path = "/api/finance/counterparty/suppliers",
    tag = "Finance-Compat",
    responses((status = 200, description = "Finance compatibility endpoint"))
)]
pub async fn compat_get_api_finance_counterparty_suppliers() {}

#[utoipa::path(
    get,
    path = "/api/finance/counterparty/suppliers/{supplierId}",
    tag = "Finance-Compat",
    params(("supplierId" = String, Path, description = "supplierId")),
    responses((status = 200, description = "Finance compatibility endpoint"))
)]
pub async fn compat_get_api_finance_counterparty_suppliers_supplierid() {}

#[utoipa::path(
    put,
    path = "/api/finance/counterparty/suppliers/{supplierId}",
    tag = "Finance-Compat",
    params(("supplierId" = String, Path, description = "supplierId")),
    responses((status = 200, description = "Finance compatibility endpoint"))
)]
pub async fn compat_put_api_finance_counterparty_suppliers_supplierid() {}

// ========== Expense Approvals ==========

#[utoipa::path(
    get,
    path = "/api/finance/expense-approvals",
    tag = "Finance-Compat",
    responses((status = 200, description = "Finance compatibility endpoint"))
)]
pub async fn compat_get_api_finance_expense_approvals() {}

#[utoipa::path(
    post,
    path = "/api/finance/expense-approvals",
    tag = "Finance-Compat",
    responses((status = 200, description = "Finance compatibility endpoint"))
)]
pub async fn compat_post_api_finance_expense_approvals() {}

#[utoipa::path(
    delete,
    path = "/api/finance/expense-approvals/{id}",
    tag = "Finance-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Finance compatibility endpoint"))
)]
pub async fn compat_delete_api_finance_expense_approvals_id() {}

#[utoipa::path(
    get,
    path = "/api/finance/expense-approvals/{id}",
    tag = "Finance-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Finance compatibility endpoint"))
)]
pub async fn compat_get_api_finance_expense_approvals_id() {}

#[utoipa::path(
    put,
    path = "/api/finance/expense-approvals/{id}",
    tag = "Finance-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Finance compatibility endpoint"))
)]
pub async fn compat_put_api_finance_expense_approvals_id() {}

#[utoipa::path(
    post,
    path = "/api/finance/expense-approvals/{id}/approve",
    tag = "Finance-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Finance compatibility endpoint"))
)]
pub async fn compat_post_api_finance_expense_approvals_id_approve() {}

#[utoipa::path(
    post,
    path = "/api/finance/expense-approvals/{id}/reject",
    tag = "Finance-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Finance compatibility endpoint"))
)]
pub async fn compat_post_api_finance_expense_approvals_id_reject() {}

#[utoipa::path(
    post,
    path = "/api/finance/expense-approvals/{id}/submit",
    tag = "Finance-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Finance compatibility endpoint"))
)]
pub async fn compat_post_api_finance_expense_approvals_id_submit() {}

// ========== AR/AP ==========

#[utoipa::path(
    post,
    path = "/api/finance/payables",
    tag = "Finance-Compat",
    responses((status = 200, description = "Finance compatibility endpoint"))
)]
pub async fn compat_post_api_finance_payables() {}

// ========== Periods ==========

#[utoipa::path(
    get,
    path = "/api/finance/period/current",
    tag = "Finance-Compat",
    responses((status = 200, description = "Finance compatibility endpoint"))
)]
pub async fn compat_get_api_finance_period_current() {}

#[utoipa::path(
    get,
    path = "/api/finance/periods",
    tag = "Finance-Compat",
    responses((status = 200, description = "Finance compatibility endpoint"))
)]
pub async fn compat_get_api_finance_periods() {}

#[utoipa::path(
    post,
    path = "/api/finance/periods/close",
    tag = "Finance-Compat",
    responses((status = 200, description = "Finance compatibility endpoint"))
)]
pub async fn compat_post_api_finance_periods_close() {}

#[utoipa::path(
    post,
    path = "/api/finance/periods/close-income",
    tag = "Finance-Compat",
    responses((status = 200, description = "Finance compatibility endpoint"))
)]
pub async fn compat_post_api_finance_periods_close_income() {}

#[utoipa::path(
    post,
    path = "/api/finance/periods/open",
    tag = "Finance-Compat",
    responses((status = 200, description = "Finance compatibility endpoint"))
)]
pub async fn compat_post_api_finance_periods_open() {}

#[utoipa::path(
    post,
    path = "/api/finance/periods/year-end-close",
    tag = "Finance-Compat",
    responses((status = 200, description = "Finance compatibility endpoint"))
)]
pub async fn compat_post_api_finance_periods_year_end_close() {}

// ========== AR/AP ==========

#[utoipa::path(
    post,
    path = "/api/finance/receivables",
    tag = "Finance-Compat",
    responses((status = 200, description = "Finance compatibility endpoint"))
)]
pub async fn compat_post_api_finance_receivables() {}

// ========== Reconciliation ==========

#[utoipa::path(
    post,
    path = "/api/finance/reconcile",
    tag = "Finance-Compat",
    responses((status = 200, description = "Finance compatibility endpoint"))
)]
pub async fn compat_post_api_finance_reconcile() {}

#[utoipa::path(
    post,
    path = "/api/finance/reconcile/auto",
    tag = "Finance-Compat",
    responses((status = 200, description = "Finance compatibility endpoint"))
)]
pub async fn compat_post_api_finance_reconcile_auto() {}

// ========== Reports ==========

#[utoipa::path(
    get,
    path = "/api/finance/reports/account-balance",
    tag = "Finance-Compat",
    responses((status = 200, description = "Finance compatibility endpoint"))
)]
pub async fn compat_get_api_finance_reports_account_balance() {}

#[utoipa::path(
    get,
    path = "/api/finance/reports/account-ledger",
    tag = "Finance-Compat",
    responses((status = 200, description = "Finance compatibility endpoint"))
)]
pub async fn compat_get_api_finance_reports_account_ledger() {}

#[utoipa::path(
    post,
    path = "/api/finance/reports/approve",
    tag = "Finance-Compat",
    responses((status = 200, description = "Finance compatibility endpoint"))
)]
pub async fn compat_post_api_finance_reports_approve() {}

#[utoipa::path(
    get,
    path = "/api/finance/reports/balance-sheet",
    tag = "Finance-Compat",
    responses((status = 200, description = "Finance compatibility endpoint"))
)]
pub async fn compat_get_api_finance_reports_balance_sheet() {}

#[utoipa::path(
    get,
    path = "/api/finance/reports/balance-sheet/export",
    tag = "Finance-Compat",
    responses((status = 200, description = "Finance compatibility endpoint"))
)]
pub async fn compat_get_api_finance_reports_balance_sheet_export() {}

#[utoipa::path(
    post,
    path = "/api/finance/reports/balance-sheet/generate",
    tag = "Finance-Compat",
    responses((status = 200, description = "Finance compatibility endpoint"))
)]
pub async fn compat_post_api_finance_reports_balance_sheet_generate() {}

#[utoipa::path(
    get,
    path = "/api/finance/reports/balance-sheet/history",
    tag = "Finance-Compat",
    responses((status = 200, description = "Finance compatibility endpoint"))
)]
pub async fn compat_get_api_finance_reports_balance_sheet_history() {}

#[utoipa::path(
    get,
    path = "/api/finance/reports/cash-flow",
    tag = "Finance-Compat",
    responses((status = 200, description = "Finance compatibility endpoint"))
)]
pub async fn compat_get_api_finance_reports_cash_flow() {}

#[utoipa::path(
    get,
    path = "/api/finance/reports/cash-flow/export",
    tag = "Finance-Compat",
    responses((status = 200, description = "Finance compatibility endpoint"))
)]
pub async fn compat_get_api_finance_reports_cash_flow_export() {}

#[utoipa::path(
    post,
    path = "/api/finance/reports/cash-flow/generate",
    tag = "Finance-Compat",
    responses((status = 200, description = "Finance compatibility endpoint"))
)]
pub async fn compat_post_api_finance_reports_cash_flow_generate() {}

#[utoipa::path(
    get,
    path = "/api/finance/reports/cash-flow/history",
    tag = "Finance-Compat",
    responses((status = 200, description = "Finance compatibility endpoint"))
)]
pub async fn compat_get_api_finance_reports_cash_flow_history() {}

#[utoipa::path(
    get,
    path = "/api/finance/reports/comparison",
    tag = "Finance-Compat",
    responses((status = 200, description = "Finance compatibility endpoint"))
)]
pub async fn compat_get_api_finance_reports_comparison() {}

#[utoipa::path(
    get,
    path = "/api/finance/reports/consolidated/elims",
    tag = "Finance-Compat",
    responses((status = 200, description = "Finance compatibility endpoint"))
)]
pub async fn compat_get_api_finance_reports_consolidated_elims() {}

#[utoipa::path(
    post,
    path = "/api/finance/reports/consolidated/elims",
    tag = "Finance-Compat",
    responses((status = 200, description = "Finance compatibility endpoint"))
)]
pub async fn compat_post_api_finance_reports_consolidated_elims() {}

#[utoipa::path(
    get,
    path = "/api/finance/reports/consolidated/entities",
    tag = "Finance-Compat",
    responses((status = 200, description = "Finance compatibility endpoint"))
)]
pub async fn compat_get_api_finance_reports_consolidated_entities() {}

#[utoipa::path(
    post,
    path = "/api/finance/reports/consolidated/entities",
    tag = "Finance-Compat",
    responses((status = 200, description = "Finance compatibility endpoint"))
)]
pub async fn compat_post_api_finance_reports_consolidated_entities() {}

#[utoipa::path(
    delete,
    path = "/api/finance/reports/consolidated/entities/{entityId}",
    tag = "Finance-Compat",
    params(("entityId" = String, Path, description = "entityId")),
    responses((status = 200, description = "Finance compatibility endpoint"))
)]
pub async fn compat_delete_api_finance_reports_consolidated_entities_entityid() {}

#[utoipa::path(
    put,
    path = "/api/finance/reports/consolidated/entities/{entityId}",
    tag = "Finance-Compat",
    params(("entityId" = String, Path, description = "entityId")),
    responses((status = 200, description = "Finance compatibility endpoint"))
)]
pub async fn compat_put_api_finance_reports_consolidated_entities_entityid() {}

#[utoipa::path(
    post,
    path = "/api/finance/reports/consolidated/generate",
    tag = "Finance-Compat",
    responses((status = 200, description = "Finance compatibility endpoint"))
)]
pub async fn compat_post_api_finance_reports_consolidated_generate() {}

#[utoipa::path(
    get,
    path = "/api/finance/reports/consolidated/{consolidationId}",
    tag = "Finance-Compat",
    params(("consolidationId" = String, Path, description = "consolidationId")),
    responses((status = 200, description = "Finance compatibility endpoint"))
)]
pub async fn compat_get_api_finance_reports_consolidated_consolidationid() {}

#[utoipa::path(
    get,
    path = "/api/finance/reports/consolidated/{consolidation_id}/export",
    tag = "Finance-Compat",
    params(("consolidation_id" = String, Path, description = "consolidation_id")),
    responses((status = 200, description = "Finance compatibility endpoint"))
)]
pub async fn compat_get_api_finance_reports_consolidated_consolidation_id_export() {}

#[utoipa::path(
    get,
    path = "/api/finance/reports/dimension-detail",
    tag = "Finance-Compat",
    responses((status = 200, description = "Finance compatibility endpoint"))
)]
pub async fn compat_get_api_finance_reports_dimension_detail() {}

#[utoipa::path(
    get,
    path = "/api/finance/reports/export",
    tag = "Finance-Compat",
    responses((status = 200, description = "Finance compatibility endpoint"))
)]
pub async fn compat_get_api_finance_reports_export() {}

#[utoipa::path(
    post,
    path = "/api/finance/reports/export/batch",
    tag = "Finance-Compat",
    responses((status = 200, description = "Finance compatibility endpoint"))
)]
pub async fn compat_post_api_finance_reports_export_batch() {}

#[utoipa::path(
    get,
    path = "/api/finance/reports/income-statement",
    tag = "Finance-Compat",
    responses((status = 200, description = "Finance compatibility endpoint"))
)]
pub async fn compat_get_api_finance_reports_income_statement() {}

#[utoipa::path(
    get,
    path = "/api/finance/reports/income-statement/export",
    tag = "Finance-Compat",
    responses((status = 200, description = "Finance compatibility endpoint"))
)]
pub async fn compat_get_api_finance_reports_income_statement_export() {}

#[utoipa::path(
    post,
    path = "/api/finance/reports/income-statement/generate",
    tag = "Finance-Compat",
    responses((status = 200, description = "Finance compatibility endpoint"))
)]
pub async fn compat_post_api_finance_reports_income_statement_generate() {}

#[utoipa::path(
    get,
    path = "/api/finance/reports/income-statement/history",
    tag = "Finance-Compat",
    responses((status = 200, description = "Finance compatibility endpoint"))
)]
pub async fn compat_get_api_finance_reports_income_statement_history() {}

#[utoipa::path(
    get,
    path = "/api/finance/reports/item-details",
    tag = "Finance-Compat",
    responses((status = 200, description = "Finance compatibility endpoint"))
)]
pub async fn compat_get_api_finance_reports_item_details() {}

#[utoipa::path(
    get,
    path = "/api/finance/reports/item-vouchers",
    tag = "Finance-Compat",
    responses((status = 200, description = "Finance compatibility endpoint"))
)]
pub async fn compat_get_api_finance_reports_item_vouchers() {}

#[utoipa::path(
    post,
    path = "/api/finance/reports/lock",
    tag = "Finance-Compat",
    responses((status = 200, description = "Finance compatibility endpoint"))
)]
pub async fn compat_post_api_finance_reports_lock() {}

#[utoipa::path(
    get,
    path = "/api/finance/reports/period-over-period",
    tag = "Finance-Compat",
    responses((status = 200, description = "Finance compatibility endpoint"))
)]
pub async fn compat_get_api_finance_reports_period_over_period() {}

#[utoipa::path(
    post,
    path = "/api/finance/reports/reject",
    tag = "Finance-Compat",
    responses((status = 200, description = "Finance compatibility endpoint"))
)]
pub async fn compat_post_api_finance_reports_reject() {}

#[utoipa::path(
    post,
    path = "/api/finance/reports/submit-approval",
    tag = "Finance-Compat",
    responses((status = 200, description = "Finance compatibility endpoint"))
)]
pub async fn compat_post_api_finance_reports_submit_approval() {}

#[utoipa::path(
    get,
    path = "/api/finance/reports/trend",
    tag = "Finance-Compat",
    responses((status = 200, description = "Finance compatibility endpoint"))
)]
pub async fn compat_get_api_finance_reports_trend() {}

#[utoipa::path(
    post,
    path = "/api/finance/reports/unlock",
    tag = "Finance-Compat",
    responses((status = 200, description = "Finance compatibility endpoint"))
)]
pub async fn compat_post_api_finance_reports_unlock() {}

#[utoipa::path(
    get,
    path = "/api/finance/reports/year-over-year",
    tag = "Finance-Compat",
    responses((status = 200, description = "Finance compatibility endpoint"))
)]
pub async fn compat_get_api_finance_reports_year_over_year() {}

// ========== Vouchers ==========

#[utoipa::path(
    post,
    path = "/api/finance/vouchers/batch",
    tag = "Finance-Compat",
    responses((status = 200, description = "Finance compatibility endpoint"))
)]
pub async fn compat_post_api_finance_vouchers_batch() {}

#[utoipa::path(
    post,
    path = "/api/finance/vouchers/batch-delete",
    tag = "Finance-Compat",
    responses((status = 200, description = "Finance compatibility endpoint"))
)]
pub async fn compat_post_api_finance_vouchers_batch_delete() {}

#[utoipa::path(
    get,
    path = "/api/finance/vouchers/export",
    tag = "Finance-Compat",
    responses((status = 200, description = "Finance compatibility endpoint"))
)]
pub async fn compat_get_api_finance_vouchers_export() {}

#[utoipa::path(
    post,
    path = "/api/finance/vouchers/generate",
    tag = "Finance-Compat",
    responses((status = 200, description = "Finance compatibility endpoint"))
)]
pub async fn compat_post_api_finance_vouchers_generate() {}

#[utoipa::path(
    post,
    path = "/api/finance/vouchers/import",
    tag = "Finance-Compat",
    responses((status = 200, description = "Finance compatibility endpoint"))
)]
pub async fn compat_post_api_finance_vouchers_import() {}

#[utoipa::path(
    post,
    path = "/api/finance/vouchers/import/u8",
    tag = "Finance-Compat",
    responses((status = 200, description = "Finance compatibility endpoint"))
)]
pub async fn compat_post_api_finance_vouchers_import_u8() {}

#[utoipa::path(
    get,
    path = "/api/finance/vouchers/next-no",
    tag = "Finance-Compat",
    responses((status = 200, description = "Finance compatibility endpoint"))
)]
pub async fn compat_get_api_finance_vouchers_next_no() {}

#[utoipa::path(
    get,
    path = "/api/finance/vouchers/{id}/entries",
    tag = "Finance-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Finance compatibility endpoint"))
)]
pub async fn compat_get_api_finance_vouchers_id_entries() {}

#[utoipa::path(
    get,
    path = "/api/finance/vouchers/{id}/items",
    tag = "Finance-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Finance compatibility endpoint"))
)]
pub async fn compat_get_api_finance_vouchers_id_items() {}

#[utoipa::path(
    post,
    path = "/api/finance/vouchers/{id}/reverse",
    tag = "Finance-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Finance compatibility endpoint"))
)]
pub async fn compat_post_api_finance_vouchers_id_reverse() {}

#[utoipa::path(
    post,
    path = "/api/finance/vouchers/{id}/unapprove",
    tag = "Finance-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Finance compatibility endpoint"))
)]
pub async fn compat_post_api_finance_vouchers_id_unapprove() {}
