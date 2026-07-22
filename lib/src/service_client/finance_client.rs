use super::generic::ApiResponse;

crate::define_service_client!(
    FinanceServiceClient,
    "FINANCE_SERVICE_URL",
    "http://localhost:8011",
    {
        // ========== 科目（Accounts）==========
        list_accounts() -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/finance/accounts"
        }
        get_account(id: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/finance/accounts/{}"
        }
        create_account() -> ApiResponse<serde_json::Value> {
            post => "/api/finance/accounts"; body: data: &serde_json::Value
        }
        get_account_by_code(code: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/finance/accounts/code/{}"
        }
        get_account_balances(period: &str) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/finance/accounts/balances?period={}"
        }

        // ========== 凭证（Vouchers）==========
        list_vouchers(status: &str, period: &str) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/finance/vouchers?status={}&period={}"
        }
        get_voucher(id: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/finance/vouchers/{}"
        }
        create_voucher() -> ApiResponse<serde_json::Value> {
            post => "/api/finance/vouchers"; body: data: &serde_json::Value
        }
        submit_voucher(id: &str) -> ApiResponse<serde_json::Value> {
            post => "/api/finance/vouchers/{}/submit"
        }
        approve_voucher(id: &str) -> ApiResponse<serde_json::Value> {
            post => "/api/finance/vouchers/{}/approve"
        }
        post_voucher(id: &str) -> ApiResponse<serde_json::Value> {
            post => "/api/finance/vouchers/{}/post"
        }
        batch_submit_vouchers() -> ApiResponse<serde_json::Value> {
            post => "/api/finance/vouchers/batch/submit"; body: data: &serde_json::Value
        }
        batch_approve_vouchers() -> ApiResponse<serde_json::Value> {
            post => "/api/finance/vouchers/batch/approve"; body: data: &serde_json::Value
        }
        batch_post_vouchers() -> ApiResponse<serde_json::Value> {
            post => "/api/finance/vouchers/batch/post"; body: data: &serde_json::Value
        }
        export_vouchers() -> ApiResponse<serde_json::Value> {
            post => "/api/finance/vouchers/export"; body: data: &serde_json::Value
        }

        // ========== 期间（Periods）==========
        open_period(year: i32, month: i32) -> ApiResponse<serde_json::Value> {
            post => "/api/finance/periods/{}/{}/open"
        }
        close_period(year: i32, month: i32) -> ApiResponse<serde_json::Value> {
            post => "/api/finance/periods/{}/{}/close"
        }
        year_end_close() -> ApiResponse<serde_json::Value> {
            post => "/api/finance/year-end-close"; body: data: &serde_json::Value
        }

        // ========== 总账（Ledger）==========
        get_ledger(account_id: &str, period: &str) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/finance/ledger?account_id={}&period={}"
        }
        get_trial_balance(period: &str) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/finance/trial-balance/{}"
        }
        get_balance_sheet(period: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/finance/balance-sheet/{}"
        }
        get_income_statement(period: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/finance/income-statement/{}"
        }
        get_cash_flow(period: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/finance/cash-flow/{}"
        }

        // ========== 付款（Payments）==========
        list_payments(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/finance/payments?page={}&pagesize={}"
        }
        get_payment(id: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/finance/payments/{}"
        }
        create_payment() -> ApiResponse<serde_json::Value> {
            post => "/api/finance/payments"; body: data: &serde_json::Value
        }
        update_payment(id: &str) -> ApiResponse<serde_json::Value> {
            put => "/api/finance/payments/{}"; body: data: &serde_json::Value
        }
        delete_payment(id: &str) -> ApiResponse<serde_json::Value> {
            delete => "/api/finance/payments/{}"
        }
        execute_payment(id: &str) -> ApiResponse<serde_json::Value> {
            post => "/api/finance/payments/{}/execute"; body: data: &serde_json::Value
        }

        // ========== 发票（Invoices，V15 兼容旧名）==========
        list_invoices(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/finance/invoices?page={}&pagesize={}"
        }
        get_invoice(id: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/finance/invoices/{}"
        }

        // ========== 仪表盘 ==========
        get_dashboard_stats() -> ApiResponse<serde_json::Value> {
            get => "/api/finance/dashboard"
        }

        // ========== 对账（Reconciliation）==========
        list_reco_sessions(reco_type: &str) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/finance/reconciliation/sessions?reco_type={}"
        }
        get_reco_report(session_id: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/finance/reconciliation/sessions/{}/report"
        }
        get_reco_aging(direction: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/finance/reconciliation/aging?direction={}"
        }
    }
);
