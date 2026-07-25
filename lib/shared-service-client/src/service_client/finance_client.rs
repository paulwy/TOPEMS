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
        update_voucher(id: &str) -> ApiResponse<serde_json::Value> {
            put => "/api/finance/vouchers/{}"; body: data: &serde_json::Value
        }
        delete_voucher(id: &str) -> ApiResponse<serde_json::Value> {
            delete => "/api/finance/vouchers/{}"
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
        unpost_voucher(id: &str) -> ApiResponse<serde_json::Value> {
            post => "/api/finance/vouchers/{}/unpost"
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
        list_reco_sessions(reco_type: &str, status: &str, page: i32, page_size: i32) -> ApiResponse<serde_json::Value> {
            get => "/api/finance/reconciliation/sessions?reco_type={}&status={}&page={}&page_size={}"
        }
        create_reco_session() -> ApiResponse<serde_json::Value> {
            post => "/api/finance/reconciliation/sessions"; body: data: &serde_json::Value
        }
        get_reco_session(session_id: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/finance/reconciliation/sessions/{}"
        }
        get_reco_items(session_id: &str, source_type: &str, match_status: &str) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/finance/reconciliation/sessions/{}/items?source_type={}&match_status={}"
        }
        import_reco_items(session_id: &str) -> ApiResponse<serde_json::Value> {
            post => "/api/finance/reconciliation/sessions/{}/items/import"; body: data: &serde_json::Value
        }
        auto_match_reco(session_id: &str) -> ApiResponse<serde_json::Value> {
            post => "/api/finance/reconciliation/sessions/{}/match"
        }
        complete_reco_session(session_id: &str) -> ApiResponse<serde_json::Value> {
            post => "/api/finance/reconciliation/sessions/{}/complete"
        }
        get_reco_summary(session_id: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/finance/reconciliation/sessions/{}/summary"
        }
        get_reco_report(session_id: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/finance/reconciliation/sessions/{}/report"
        }
        get_reco_diff_stats(session_id: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/finance/reconciliation/sessions/{}/diff-stats"
        }
        update_reco_diff(item_id: &str) -> ApiResponse<serde_json::Value> {
            put => "/api/finance/reconciliation/items/{}/diff"; body: data: &serde_json::Value
        }
        batch_update_reco_diff() -> ApiResponse<serde_json::Value> {
            post => "/api/finance/reconciliation/items/diff/batch"; body: data: &serde_json::Value
        }
        get_reco_aging(direction: &str, as_of_date: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/finance/reconciliation/aging?direction={}&as_of_date={}"
        }

        // ========== V35.0 Phase 3: 运营财务（Expenses/Budgets/Receivables/Payables）==========
        list_expenses(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/finance/expenses?page={}&page_size={}"
        }
        get_expense(id: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/finance/expenses/{}"
        }
        create_expense() -> ApiResponse<serde_json::Value> {
            post => "/api/finance/expenses"; body: data: &serde_json::Value
        }
        update_expense(id: &str) -> ApiResponse<serde_json::Value> {
            put => "/api/finance/expenses/{}"; body: data: &serde_json::Value
        }
        delete_expense(id: &str) -> ApiResponse<serde_json::Value> {
            delete => "/api/finance/expenses/{}"
        }

        list_budgets(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/finance/budgets?page={}&page_size={}"
        }
        get_budget(id: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/finance/budgets/{}"
        }
        create_budget() -> ApiResponse<serde_json::Value> {
            post => "/api/finance/budgets"; body: data: &serde_json::Value
        }
        update_budget(id: &str) -> ApiResponse<serde_json::Value> {
            put => "/api/finance/budgets/{}"; body: data: &serde_json::Value
        }
        delete_budget(id: &str) -> ApiResponse<serde_json::Value> {
            delete => "/api/finance/budgets/{}"
        }

        list_receivables(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/finance/receivables?page={}&page_size={}"
        }
        get_receivable(id: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/finance/receivables/{}"
        }
        create_receivable() -> ApiResponse<serde_json::Value> {
            post => "/api/finance/receivables"; body: data: &serde_json::Value
        }
        update_receivable(id: &str) -> ApiResponse<serde_json::Value> {
            put => "/api/finance/receivables/{}"; body: data: &serde_json::Value
        }
        delete_receivable(id: &str) -> ApiResponse<serde_json::Value> {
            delete => "/api/finance/receivables/{}"
        }

        list_payables(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/finance/payables?page={}&page_size={}"
        }
        get_payable(id: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/finance/payables/{}"
        }
        create_payable() -> ApiResponse<serde_json::Value> {
            post => "/api/finance/payables"; body: data: &serde_json::Value
        }
        update_payable(id: &str) -> ApiResponse<serde_json::Value> {
            put => "/api/finance/payables/{}"; body: data: &serde_json::Value
        }
        delete_payable(id: &str) -> ApiResponse<serde_json::Value> {
            delete => "/api/finance/payables/{}"
        }

        // ========== V40.0 Phase 8: 凭证模板（Voucher Templates）==========
        list_voucher_templates(voucher_type: &str, status: &str) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/finance/voucher-templates?voucher_type={}&status={}"
        }
        get_voucher_template(id: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/finance/voucher-templates/{}"
        }
        create_voucher_template() -> ApiResponse<serde_json::Value> {
            post => "/api/finance/voucher-templates"; body: data: &serde_json::Value
        }
        update_voucher_template(id: &str) -> ApiResponse<serde_json::Value> {
            put => "/api/finance/voucher-templates/{}"; body: data: &serde_json::Value
        }
        delete_voucher_template(id: &str) -> ApiResponse<serde_json::Value> {
            delete => "/api/finance/voucher-templates/{}"
        }
        set_default_voucher_template(id: &str) -> ApiResponse<serde_json::Value> {
            post => "/api/finance/voucher-templates/{}/set-default"
        }
        apply_voucher_template() -> ApiResponse<serde_json::Value> {
            post => "/api/finance/voucher-templates/apply"; body: data: &serde_json::Value
        }

        // ========== V40.0 Phase 8: 凭证生成规则（Voucher Generation Rules）==========
        list_voucher_generation_rules(source_type: &str, status: &str) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/finance/voucher-generation-rules?source_type={}&status={}"
        }
        get_voucher_generation_rule(id: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/finance/voucher-generation-rules/{}"
        }
        create_voucher_generation_rule() -> ApiResponse<serde_json::Value> {
            post => "/api/finance/voucher-generation-rules"; body: data: &serde_json::Value
        }
        update_voucher_generation_rule(id: &str) -> ApiResponse<serde_json::Value> {
            put => "/api/finance/voucher-generation-rules/{}"; body: data: &serde_json::Value
        }
        delete_voucher_generation_rule(id: &str) -> ApiResponse<serde_json::Value> {
            delete => "/api/finance/voucher-generation-rules/{}"
        }
        test_voucher_generation_rule() -> ApiResponse<serde_json::Value> {
            post => "/api/finance/voucher-generation-rules/test"; body: data: &serde_json::Value
        }
        generate_vouchers_from_rule() -> ApiResponse<serde_json::Value> {
            post => "/api/finance/voucher-generation-rules/generate"; body: data: &serde_json::Value
        }

        // ========== V40.0 Phase 8: U8 导入（U8 Import）==========
        import_u8_vouchers() -> ApiResponse<serde_json::Value> {
            post => "/api/finance/u8-import/import"; body: data: &serde_json::Value
        }
        get_u8_import_status(import_id: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/finance/u8-import/{}/status"
        }
        list_u8_import_records(status: &str, source_system: &str) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/finance/u8-import/records?status={}&source_system={}"
        }
        get_u8_import_record(import_id: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/finance/u8-import/records/{}"
        }
        rollback_u8_import(import_id: &str) -> ApiResponse<serde_json::Value> {
            post => "/api/finance/u8-import/{}/rollback"
        }

        // ========== V41.0 Phase 9: 应收账款（Receivables）==========
        list_receivables_v2(page: i64, page_size: i64, status: &str, customer_id: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/finance/receivables?page={}&page_size={}&status={}&customer_id={}"
        }
        get_receivable_v2(id: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/finance/receivables/{}"
        }
        create_receivable_v2() -> ApiResponse<serde_json::Value> {
            post => "/api/finance/receivables"; body: data: &serde_json::Value
        }
        update_receivable_v2(id: &str) -> ApiResponse<serde_json::Value> {
            put => "/api/finance/receivables/{}"; body: data: &serde_json::Value
        }
        delete_receivable_v2(id: &str) -> ApiResponse<serde_json::Value> {
            delete => "/api/finance/receivables/{}"
        }
        get_receivable_aging_v2() -> ApiResponse<serde_json::Value> {
            get => "/api/finance/receivables/aging"
        }
        batch_create_receivables_v2() -> ApiResponse<serde_json::Value> {
            post => "/api/finance/receivables/batch"; body: data: &serde_json::Value
        }

        // ========== V41.0 Phase 9: 应付账款（Payables）==========
        list_payables_v2(page: i64, page_size: i64, status: &str, supplier_id: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/finance/payables?page={}&page_size={}&status={}&supplier_id={}"
        }
        get_payable_v2(id: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/finance/payables/{}"
        }
        create_payable_v2() -> ApiResponse<serde_json::Value> {
            post => "/api/finance/payables"; body: data: &serde_json::Value
        }
        update_payable_v2(id: &str) -> ApiResponse<serde_json::Value> {
            put => "/api/finance/payables/{}"; body: data: &serde_json::Value
        }
        delete_payable_v2(id: &str) -> ApiResponse<serde_json::Value> {
            delete => "/api/finance/payables/{}"
        }
        get_payable_aging_v2() -> ApiResponse<serde_json::Value> {
            get => "/api/finance/payables/aging"
        }
        batch_create_payables_v2() -> ApiResponse<serde_json::Value> {
            post => "/api/finance/payables/batch"; body: data: &serde_json::Value
        }

        // ========== V41.0 Phase 9: 收款管理（Collections）==========
        list_collections(page: i64, page_size: i64, status: &str, customer_id: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/finance/collections?page={}&page_size={}&status={}&customer_id={}"
        }
        get_collection(id: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/finance/collections/{}"
        }
        create_collection() -> ApiResponse<serde_json::Value> {
            post => "/api/finance/collections"; body: data: &serde_json::Value
        }
        update_collection(id: &str) -> ApiResponse<serde_json::Value> {
            put => "/api/finance/collections/{}"; body: data: &serde_json::Value
        }
        delete_collection(id: &str) -> ApiResponse<serde_json::Value> {
            delete => "/api/finance/collections/{}"
        }
        write_off_collection() -> ApiResponse<serde_json::Value> {
            post => "/api/finance/collections/write-off"; body: data: &serde_json::Value
        }
        batch_write_off_collections() -> ApiResponse<serde_json::Value> {
            post => "/api/finance/collections/batch-write-off"; body: data: &serde_json::Value
        }

        // ========== V41.0 Phase 9: 付款管理（Payment Records）==========
        list_payment_records(page: i64, page_size: i64, status: &str, supplier_id: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/finance/payment-records?page={}&page_size={}&status={}&supplier_id={}"
        }
        get_payment_record(id: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/finance/payment-records/{}"
        }
        create_payment_record() -> ApiResponse<serde_json::Value> {
            post => "/api/finance/payment-records"; body: data: &serde_json::Value
        }
        update_payment_record(id: &str) -> ApiResponse<serde_json::Value> {
            put => "/api/finance/payment-records/{}"; body: data: &serde_json::Value
        }
        delete_payment_record(id: &str) -> ApiResponse<serde_json::Value> {
            delete => "/api/finance/payment-records/{}"
        }
        write_off_payment_record() -> ApiResponse<serde_json::Value> {
            post => "/api/finance/payment-records/write-off"; body: data: &serde_json::Value
        }
        batch_write_off_payment_records() -> ApiResponse<serde_json::Value> {
            post => "/api/finance/payment-records/batch-write-off"; body: data: &serde_json::Value
        }

        // ========== V41.0 Phase 9: 账龄分析（Aging）==========
        calculate_receivable_aging() -> ApiResponse<serde_json::Value> {
            get => "/api/finance/aging/receivable"
        }
        calculate_payable_aging() -> ApiResponse<serde_json::Value> {
            get => "/api/finance/aging/payable"
        }
        get_aging_summary() -> ApiResponse<serde_json::Value> {
            get => "/api/finance/aging/summary"
        }
        get_aging_detail(direction: &str, bucket: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/finance/aging/detail?direction={}&bucket={}"
        }
        get_aging_trend(direction: &str, months: i32) -> ApiResponse<serde_json::Value> {
            get => "/api/finance/aging/trend?direction={}&months={}"
        }

        // ========== 审批（Approvals）==========
        submit_approval() -> ApiResponse<serde_json::Value> {
            post => "/api/finance/approvals/submit"; body: data: &serde_json::Value
        }
        approve_approval() -> ApiResponse<serde_json::Value> {
            post => "/api/finance/approvals/approve"; body: data: &serde_json::Value
        }
        reject_approval() -> ApiResponse<serde_json::Value> {
            post => "/api/finance/approvals/reject"; body: data: &serde_json::Value
        }
        cancel_approval() -> ApiResponse<serde_json::Value> {
            post => "/api/finance/approvals/cancel"; body: data: &serde_json::Value
        }
    }
);
