//! Finance（财务）服务 API trait 定义

use super::super::error::ServiceClientResult;
use super::super::trait_api::TypedServiceClient;
use crate::define_service_api;

define_service_api!(
    FinanceApi,
    "topems-finance",
    8011,
    Some("FINANCE_SERVICE_URL"),
    "/api/finance"
);

// ============ TypedServiceClient<FinanceApi> 业务方法 ============

impl TypedServiceClient<FinanceApi> {
    /// 列出科目
    pub async fn list_accounts(&self) -> ServiceClientResult<Vec<serde_json::Value>> {
        self.get(&self.build_path("/accounts")).await
    }

    /// 获取科目
    pub async fn get_account(&self, id: &str) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/accounts/{}", id);
        self.get(&self.build_path(&path)).await
    }

    /// 按编码获取会计科目（跨服务只读，供 erp 期初余额等消费）
    pub async fn get_accounting_subject_by_code(
        &self,
        code: &str,
    ) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/accounting-subjects/by-code/{}", code);
        self.get(&self.build_path(&path)).await
    }

    /// 列出凭证
    pub async fn list_vouchers(
        &self,
        status: &str,
        period: &str,
    ) -> ServiceClientResult<Vec<serde_json::Value>> {
        let mut query = String::new();
        if !status.is_empty() {
            query.push_str(&format!("status={}&", status));
        }
        if !period.is_empty() {
            query.push_str(&format!("period={}&", period));
        }
        let path = if query.is_empty() {
            "/vouchers".to_string()
        } else {
            format!("/vouchers?{}", query.trim_end_matches('&'))
        };
        self.get_items(&self.build_path(&path)).await
    }

    /// 创建凭证
    pub async fn create_voucher(
        &self,
        data: &serde_json::Value,
    ) -> ServiceClientResult<serde_json::Value> {
        self.post(&self.build_path("/vouchers"), data).await
    }

    /// 获取试算平衡表
    pub async fn get_trial_balance(&self, period: &str) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/trial-balance/{}", period);
        self.get(&self.build_path(&path)).await
    }

    /// 获取资产负债表
    pub async fn get_balance_sheet(&self, period: &str) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/balance-sheet/{}", period);
        self.get(&self.build_path(&path)).await
    }

    /// 获取利润表
    pub async fn get_income_statement(
        &self,
        period: &str,
    ) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/income-statement/{}", period);
        self.get(&self.build_path(&path)).await
    }

    /// 获取仪表盘统计
    pub async fn get_dashboard_stats(&self) -> ServiceClientResult<serde_json::Value> {
        self.get(&self.build_path("/dashboard")).await
    }

    /// 提交审批
    pub async fn submit_approval(
        &self,
        data: &serde_json::Value,
    ) -> ServiceClientResult<serde_json::Value> {
        self.post(&self.build_path("/approvals/submit"), data).await
    }

    /// 审批通过
    pub async fn approve_approval(
        &self,
        data: &serde_json::Value,
    ) -> ServiceClientResult<serde_json::Value> {
        self.post(&self.build_path("/approvals/approve"), data)
            .await
    }

    /// 审批驳回
    pub async fn reject_approval(
        &self,
        data: &serde_json::Value,
    ) -> ServiceClientResult<serde_json::Value> {
        self.post(&self.build_path("/approvals/reject"), data).await
    }

    /// 取消审批
    pub async fn cancel_approval(
        &self,
        data: &serde_json::Value,
    ) -> ServiceClientResult<serde_json::Value> {
        self.post(&self.build_path("/approvals/cancel"), data).await
    }

    // ========== 科目（Accounts）==========
    /// 创建科目
    pub async fn create_account(
        &self,
        data: &serde_json::Value,
    ) -> ServiceClientResult<serde_json::Value> {
        self.post(&self.build_path("/accounts"), data).await
    }

    /// 按编码获取科目
    pub async fn get_account_by_code(&self, code: &str) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/accounts/code/{}", code);
        self.get(&self.build_path(&path)).await
    }

    /// 获取科目余额
    pub async fn get_account_balances(
        &self,
        period: &str,
    ) -> ServiceClientResult<Vec<serde_json::Value>> {
        let path = format!("/accounts/balances?period={}", period);
        self.get(&self.build_path(&path)).await
    }

    // ========== 凭证（Vouchers）==========
    /// 获取凭证
    pub async fn get_voucher(&self, id: &str) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/vouchers/{}", id);
        self.get(&self.build_path(&path)).await
    }

    /// 更新凭证
    pub async fn update_voucher(
        &self,
        id: &str,
        data: &serde_json::Value,
    ) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/vouchers/{}", id);
        self.put(&self.build_path(&path), data).await
    }

    /// 删除凭证
    pub async fn delete_voucher(&self, id: &str) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/vouchers/{}", id);
        self.delete(&self.build_path(&path)).await
    }

    /// 提交凭证
    pub async fn submit_voucher(&self, id: &str) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/vouchers/{}/submit", id);
        self.post_without_body(&self.build_path(&path)).await
    }

    /// 审批凭证
    pub async fn approve_voucher(&self, id: &str) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/vouchers/{}/approve", id);
        self.post_without_body(&self.build_path(&path)).await
    }

    /// 过账凭证
    pub async fn post_voucher(&self, id: &str) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/vouchers/{}/post", id);
        self.post_without_body(&self.build_path(&path)).await
    }

    /// 反过账凭证
    pub async fn unpost_voucher(&self, id: &str) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/vouchers/{}/unpost", id);
        self.post_without_body(&self.build_path(&path)).await
    }

    /// 批量提交凭证
    pub async fn batch_submit_vouchers(
        &self,
        data: &serde_json::Value,
    ) -> ServiceClientResult<serde_json::Value> {
        self.post(&self.build_path("/vouchers/batch/submit"), data)
            .await
    }

    /// 批量审批凭证
    pub async fn batch_approve_vouchers(
        &self,
        data: &serde_json::Value,
    ) -> ServiceClientResult<serde_json::Value> {
        self.post(&self.build_path("/vouchers/batch/approve"), data)
            .await
    }

    /// 批量过账凭证
    pub async fn batch_post_vouchers(
        &self,
        data: &serde_json::Value,
    ) -> ServiceClientResult<serde_json::Value> {
        self.post(&self.build_path("/vouchers/batch/post"), data)
            .await
    }

    /// 导出凭证
    pub async fn export_vouchers(
        &self,
        data: &serde_json::Value,
    ) -> ServiceClientResult<serde_json::Value> {
        self.post(&self.build_path("/vouchers/export"), data).await
    }

    // ========== 期间（Periods）==========
    /// 开启期间
    pub async fn open_period(
        &self,
        year: i32,
        month: i32,
    ) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/periods/{}/{}/open", year, month);
        self.post_without_body(&self.build_path(&path)).await
    }

    /// 关闭期间
    pub async fn close_period(
        &self,
        year: i32,
        month: i32,
    ) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/periods/{}/{}/close", year, month);
        self.post_without_body(&self.build_path(&path)).await
    }

    /// 年终结账
    pub async fn year_end_close(
        &self,
        data: &serde_json::Value,
    ) -> ServiceClientResult<serde_json::Value> {
        self.post(&self.build_path("/year-end-close"), data).await
    }

    // ========== 总账（Ledger）==========
    /// 获取总账
    pub async fn get_ledger(
        &self,
        account_id: &str,
        period: &str,
    ) -> ServiceClientResult<Vec<serde_json::Value>> {
        let path = format!("/ledger?account_id={}&period={}", account_id, period);
        self.get(&self.build_path(&path)).await
    }

    /// 获取现金流量表
    pub async fn get_cash_flow(&self, period: &str) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/cash-flow/{}", period);
        self.get(&self.build_path(&path)).await
    }

    // ========== 付款（Payments）==========
    /// 列出付款
    pub async fn list_payments(
        &self,
        page: i32,
        page_size: i32,
    ) -> ServiceClientResult<Vec<serde_json::Value>> {
        let path = format!("/payments?page={}&pagesize={}", page, page_size);
        self.get(&self.build_path(&path)).await
    }

    /// 获取付款
    pub async fn get_payment(&self, id: &str) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/payments/{}", id);
        self.get(&self.build_path(&path)).await
    }

    /// 创建付款
    pub async fn create_payment(
        &self,
        data: &serde_json::Value,
    ) -> ServiceClientResult<serde_json::Value> {
        self.post(&self.build_path("/payments"), data).await
    }

    /// 更新付款
    pub async fn update_payment(
        &self,
        id: &str,
        data: &serde_json::Value,
    ) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/payments/{}", id);
        self.put(&self.build_path(&path), data).await
    }

    /// 删除付款
    pub async fn delete_payment(&self, id: &str) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/payments/{}", id);
        self.delete(&self.build_path(&path)).await
    }

    /// 执行付款
    pub async fn execute_payment(
        &self,
        id: &str,
        data: &serde_json::Value,
    ) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/payments/{}/execute", id);
        self.post(&self.build_path(&path), data).await
    }

    // ========== 发票（Invoices）==========
    /// 列出发票
    pub async fn list_invoices(
        &self,
        page: i32,
        page_size: i32,
    ) -> ServiceClientResult<Vec<serde_json::Value>> {
        let path = format!("/invoices?page={}&pagesize={}", page, page_size);
        self.get(&self.build_path(&path)).await
    }

    /// 获取发票
    pub async fn get_invoice(&self, id: &str) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/invoices/{}", id);
        self.get(&self.build_path(&path)).await
    }

    // ========== 对账（Reconciliation）==========
    /// 列出对账会话
    pub async fn list_reco_sessions(
        &self,
        reco_type: &str,
        status: &str,
        page: i32,
        page_size: i32,
    ) -> ServiceClientResult<serde_json::Value> {
        let path = format!(
            "/reconciliation/sessions?reco_type={}&status={}&page={}&page_size={}",
            reco_type, status, page, page_size
        );
        self.get(&self.build_path(&path)).await
    }

    /// 创建对账会话
    pub async fn create_reco_session(
        &self,
        data: &serde_json::Value,
    ) -> ServiceClientResult<serde_json::Value> {
        self.post(&self.build_path("/reconciliation/sessions"), data)
            .await
    }

    /// 获取对账会话
    pub async fn get_reco_session(
        &self,
        session_id: &str,
    ) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/reconciliation/sessions/{}", session_id);
        self.get(&self.build_path(&path)).await
    }

    /// 获取对账项
    pub async fn get_reco_items(
        &self,
        session_id: &str,
        source_type: &str,
        match_status: &str,
    ) -> ServiceClientResult<Vec<serde_json::Value>> {
        let path = format!(
            "/reconciliation/sessions/{}/items?source_type={}&match_status={}",
            session_id, source_type, match_status
        );
        self.get(&self.build_path(&path)).await
    }

    /// 导入对账项
    pub async fn import_reco_items(
        &self,
        session_id: &str,
        data: &serde_json::Value,
    ) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/reconciliation/sessions/{}/items/import", session_id);
        self.post(&self.build_path(&path), data).await
    }

    /// 自动匹配对账
    pub async fn auto_match_reco(
        &self,
        session_id: &str,
    ) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/reconciliation/sessions/{}/match", session_id);
        self.post_without_body(&self.build_path(&path)).await
    }

    /// 完成对账会话
    pub async fn complete_reco_session(
        &self,
        session_id: &str,
    ) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/reconciliation/sessions/{}/complete", session_id);
        self.post_without_body(&self.build_path(&path)).await
    }

    /// 获取对账汇总
    pub async fn get_reco_summary(
        &self,
        session_id: &str,
    ) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/reconciliation/sessions/{}/summary", session_id);
        self.get(&self.build_path(&path)).await
    }

    /// 获取对账报告
    pub async fn get_reco_report(
        &self,
        session_id: &str,
    ) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/reconciliation/sessions/{}/report", session_id);
        self.get(&self.build_path(&path)).await
    }

    /// 获取对账差异统计
    pub async fn get_reco_diff_stats(
        &self,
        session_id: &str,
    ) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/reconciliation/sessions/{}/diff-stats", session_id);
        self.get(&self.build_path(&path)).await
    }

    /// 更新对账差异
    pub async fn update_reco_diff(
        &self,
        item_id: &str,
        data: &serde_json::Value,
    ) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/reconciliation/items/{}/diff", item_id);
        self.put(&self.build_path(&path), data).await
    }

    /// 批量更新对账差异
    pub async fn batch_update_reco_diff(
        &self,
        data: &serde_json::Value,
    ) -> ServiceClientResult<serde_json::Value> {
        self.post(&self.build_path("/reconciliation/items/diff/batch"), data)
            .await
    }

    /// 获取对账账龄
    pub async fn get_reco_aging(
        &self,
        direction: &str,
        as_of_date: &str,
    ) -> ServiceClientResult<serde_json::Value> {
        let path = format!(
            "/reconciliation/aging?direction={}&as_of_date={}",
            direction, as_of_date
        );
        self.get(&self.build_path(&path)).await
    }

    // ========== 运营财务：费用（Expenses）==========
    /// 列出费用
    pub async fn list_expenses(
        &self,
        page: i32,
        page_size: i32,
    ) -> ServiceClientResult<Vec<serde_json::Value>> {
        let path = format!("/expenses?page={}&page_size={}", page, page_size);
        self.get(&self.build_path(&path)).await
    }

    /// 获取费用
    pub async fn get_expense(&self, id: &str) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/expenses/{}", id);
        self.get(&self.build_path(&path)).await
    }

    /// 创建费用
    pub async fn create_expense(
        &self,
        data: &serde_json::Value,
    ) -> ServiceClientResult<serde_json::Value> {
        self.post(&self.build_path("/expenses"), data).await
    }

    /// 更新费用
    pub async fn update_expense(
        &self,
        id: &str,
        data: &serde_json::Value,
    ) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/expenses/{}", id);
        self.put(&self.build_path(&path), data).await
    }

    /// 删除费用
    pub async fn delete_expense(&self, id: &str) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/expenses/{}", id);
        self.delete(&self.build_path(&path)).await
    }

    // ========== 运营财务：预算（Budgets）==========
    /// 列出预算
    pub async fn list_budgets(
        &self,
        page: i32,
        page_size: i32,
    ) -> ServiceClientResult<Vec<serde_json::Value>> {
        let path = format!("/budgets?page={}&page_size={}", page, page_size);
        self.get_items(&self.build_path(&path)).await
    }

    /// 获取预算
    pub async fn get_budget(&self, id: &str) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/budgets/{}", id);
        self.get(&self.build_path(&path)).await
    }

    /// 创建预算
    pub async fn create_budget(
        &self,
        data: &serde_json::Value,
    ) -> ServiceClientResult<serde_json::Value> {
        self.post(&self.build_path("/budgets"), data).await
    }

    /// 更新预算
    pub async fn update_budget(
        &self,
        id: &str,
        data: &serde_json::Value,
    ) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/budgets/{}", id);
        self.put(&self.build_path(&path), data).await
    }

    /// 删除预算
    pub async fn delete_budget(&self, id: &str) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/budgets/{}", id);
        self.delete(&self.build_path(&path)).await
    }

    // ========== 运营财务：应收账款（Receivables）==========
    /// 列出应收账款
    pub async fn list_receivables(
        &self,
        page: i32,
        page_size: i32,
    ) -> ServiceClientResult<Vec<serde_json::Value>> {
        let path = format!("/receivables?page={}&page_size={}", page, page_size);
        self.get(&self.build_path(&path)).await
    }

    /// 获取应收账款
    pub async fn get_receivable(&self, id: &str) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/receivables/{}", id);
        self.get(&self.build_path(&path)).await
    }

    /// 创建应收账款
    pub async fn create_receivable(
        &self,
        data: &serde_json::Value,
    ) -> ServiceClientResult<serde_json::Value> {
        self.post(&self.build_path("/receivables"), data).await
    }

    /// 更新应收账款
    pub async fn update_receivable(
        &self,
        id: &str,
        data: &serde_json::Value,
    ) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/receivables/{}", id);
        self.put(&self.build_path(&path), data).await
    }

    /// 删除应收账款
    pub async fn delete_receivable(&self, id: &str) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/receivables/{}", id);
        self.delete(&self.build_path(&path)).await
    }

    // ========== 运营财务：应付账款（Payables）==========
    /// 列出应付账款
    pub async fn list_payables(
        &self,
        page: i32,
        page_size: i32,
    ) -> ServiceClientResult<Vec<serde_json::Value>> {
        let path = format!("/payables?page={}&page_size={}", page, page_size);
        self.get(&self.build_path(&path)).await
    }

    /// 获取应付账款
    pub async fn get_payable(&self, id: &str) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/payables/{}", id);
        self.get(&self.build_path(&path)).await
    }

    /// 创建应付账款
    pub async fn create_payable(
        &self,
        data: &serde_json::Value,
    ) -> ServiceClientResult<serde_json::Value> {
        self.post(&self.build_path("/payables"), data).await
    }

    /// 更新应付账款
    pub async fn update_payable(
        &self,
        id: &str,
        data: &serde_json::Value,
    ) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/payables/{}", id);
        self.put(&self.build_path(&path), data).await
    }

    /// 删除应付账款
    pub async fn delete_payable(&self, id: &str) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/payables/{}", id);
        self.delete(&self.build_path(&path)).await
    }

    // ========== 凭证模板（Voucher Templates）==========
    /// 列出凭证模板
    pub async fn list_voucher_templates(
        &self,
        voucher_type: &str,
        status: &str,
    ) -> ServiceClientResult<Vec<serde_json::Value>> {
        let path = format!(
            "/voucher-templates?voucher_type={}&status={}",
            voucher_type, status
        );
        self.get(&self.build_path(&path)).await
    }

    /// 获取凭证模板
    pub async fn get_voucher_template(&self, id: &str) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/voucher-templates/{}", id);
        self.get(&self.build_path(&path)).await
    }

    /// 创建凭证模板
    pub async fn create_voucher_template(
        &self,
        data: &serde_json::Value,
    ) -> ServiceClientResult<serde_json::Value> {
        self.post(&self.build_path("/voucher-templates"), data)
            .await
    }

    /// 更新凭证模板
    pub async fn update_voucher_template(
        &self,
        id: &str,
        data: &serde_json::Value,
    ) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/voucher-templates/{}", id);
        self.put(&self.build_path(&path), data).await
    }

    /// 删除凭证模板
    pub async fn delete_voucher_template(
        &self,
        id: &str,
    ) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/voucher-templates/{}", id);
        self.delete(&self.build_path(&path)).await
    }

    /// 设为默认凭证模板
    pub async fn set_default_voucher_template(
        &self,
        id: &str,
    ) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/voucher-templates/{}/set-default", id);
        self.post_without_body(&self.build_path(&path)).await
    }

    /// 应用凭证模板
    pub async fn apply_voucher_template(
        &self,
        data: &serde_json::Value,
    ) -> ServiceClientResult<serde_json::Value> {
        self.post(&self.build_path("/voucher-templates/apply"), data)
            .await
    }

    // ========== 凭证生成规则（Voucher Generation Rules）==========
    /// 列出凭证生成规则
    pub async fn list_voucher_generation_rules(
        &self,
        source_type: &str,
        status: &str,
    ) -> ServiceClientResult<Vec<serde_json::Value>> {
        let path = format!(
            "/voucher-generation-rules?source_type={}&status={}",
            source_type, status
        );
        self.get(&self.build_path(&path)).await
    }

    /// 获取凭证生成规则
    pub async fn get_voucher_generation_rule(
        &self,
        id: &str,
    ) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/voucher-generation-rules/{}", id);
        self.get(&self.build_path(&path)).await
    }

    /// 创建凭证生成规则
    pub async fn create_voucher_generation_rule(
        &self,
        data: &serde_json::Value,
    ) -> ServiceClientResult<serde_json::Value> {
        self.post(&self.build_path("/voucher-generation-rules"), data)
            .await
    }

    /// 更新凭证生成规则
    pub async fn update_voucher_generation_rule(
        &self,
        id: &str,
        data: &serde_json::Value,
    ) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/voucher-generation-rules/{}", id);
        self.put(&self.build_path(&path), data).await
    }

    /// 删除凭证生成规则
    pub async fn delete_voucher_generation_rule(
        &self,
        id: &str,
    ) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/voucher-generation-rules/{}", id);
        self.delete(&self.build_path(&path)).await
    }

    /// 测试凭证生成规则
    pub async fn test_voucher_generation_rule(
        &self,
        data: &serde_json::Value,
    ) -> ServiceClientResult<serde_json::Value> {
        self.post(&self.build_path("/voucher-generation-rules/test"), data)
            .await
    }

    /// 按规则生成凭证
    pub async fn generate_vouchers_from_rule(
        &self,
        data: &serde_json::Value,
    ) -> ServiceClientResult<serde_json::Value> {
        self.post(&self.build_path("/voucher-generation-rules/generate"), data)
            .await
    }

    // ========== U8 导入（U8 Import）==========
    /// 导入 U8 凭证
    pub async fn import_u8_vouchers(
        &self,
        data: &serde_json::Value,
    ) -> ServiceClientResult<serde_json::Value> {
        self.post(&self.build_path("/u8-import/import"), data).await
    }

    /// 获取 U8 导入状态
    pub async fn get_u8_import_status(
        &self,
        import_id: &str,
    ) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/u8-import/{}/status", import_id);
        self.get(&self.build_path(&path)).await
    }

    /// 列出 U8 导入记录
    pub async fn list_u8_import_records(
        &self,
        status: &str,
        source_system: &str,
    ) -> ServiceClientResult<Vec<serde_json::Value>> {
        let path = format!(
            "/u8-import/records?status={}&source_system={}",
            status, source_system
        );
        self.get(&self.build_path(&path)).await
    }

    /// 获取 U8 导入记录
    pub async fn get_u8_import_record(
        &self,
        import_id: &str,
    ) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/u8-import/records/{}", import_id);
        self.get(&self.build_path(&path)).await
    }

    /// 回滚 U8 导入
    pub async fn rollback_u8_import(
        &self,
        import_id: &str,
    ) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/u8-import/{}/rollback", import_id);
        self.post_without_body(&self.build_path(&path)).await
    }

    // ========== 应收账款 V2（Receivables）==========
    /// 列出应收账款（V2）
    pub async fn list_receivables_v2(
        &self,
        page: i64,
        page_size: i64,
        status: &str,
        customer_id: &str,
    ) -> ServiceClientResult<serde_json::Value> {
        let path = format!(
            "/receivables?page={}&page_size={}&status={}&customer_id={}",
            page, page_size, status, customer_id
        );
        self.get(&self.build_path(&path)).await
    }

    /// 获取应收账款（V2）
    pub async fn get_receivable_v2(&self, id: &str) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/receivables/{}", id);
        self.get(&self.build_path(&path)).await
    }

    /// 创建应收账款（V2）
    pub async fn create_receivable_v2(
        &self,
        data: &serde_json::Value,
    ) -> ServiceClientResult<serde_json::Value> {
        self.post(&self.build_path("/receivables"), data).await
    }

    /// 更新应收账款（V2）
    pub async fn update_receivable_v2(
        &self,
        id: &str,
        data: &serde_json::Value,
    ) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/receivables/{}", id);
        self.put(&self.build_path(&path), data).await
    }

    /// 删除应收账款（V2）
    pub async fn delete_receivable_v2(&self, id: &str) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/receivables/{}", id);
        self.delete(&self.build_path(&path)).await
    }

    /// 获取应收账款账龄（V2）
    pub async fn get_receivable_aging_v2(&self) -> ServiceClientResult<serde_json::Value> {
        self.get(&self.build_path("/receivables/aging")).await
    }

    /// 批量创建应收账款（V2）
    pub async fn batch_create_receivables_v2(
        &self,
        data: &serde_json::Value,
    ) -> ServiceClientResult<serde_json::Value> {
        self.post(&self.build_path("/receivables/batch"), data)
            .await
    }

    // ========== 应付账款 V2（Payables）==========
    /// 列出应付账款（V2）
    pub async fn list_payables_v2(
        &self,
        page: i64,
        page_size: i64,
        status: &str,
        supplier_id: &str,
    ) -> ServiceClientResult<serde_json::Value> {
        let path = format!(
            "/payables?page={}&page_size={}&status={}&supplier_id={}",
            page, page_size, status, supplier_id
        );
        self.get(&self.build_path(&path)).await
    }

    /// 获取应付账款（V2）
    pub async fn get_payable_v2(&self, id: &str) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/payables/{}", id);
        self.get(&self.build_path(&path)).await
    }

    /// 创建应付账款（V2）
    pub async fn create_payable_v2(
        &self,
        data: &serde_json::Value,
    ) -> ServiceClientResult<serde_json::Value> {
        self.post(&self.build_path("/payables"), data).await
    }

    /// 更新应付账款（V2）
    pub async fn update_payable_v2(
        &self,
        id: &str,
        data: &serde_json::Value,
    ) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/payables/{}", id);
        self.put(&self.build_path(&path), data).await
    }

    /// 删除应付账款（V2）
    pub async fn delete_payable_v2(&self, id: &str) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/payables/{}", id);
        self.delete(&self.build_path(&path)).await
    }

    /// 获取应付账款账龄（V2）
    pub async fn get_payable_aging_v2(&self) -> ServiceClientResult<serde_json::Value> {
        self.get(&self.build_path("/payables/aging")).await
    }

    /// 批量创建应付账款（V2）
    pub async fn batch_create_payables_v2(
        &self,
        data: &serde_json::Value,
    ) -> ServiceClientResult<serde_json::Value> {
        self.post(&self.build_path("/payables/batch"), data).await
    }

    // ========== 收款管理（Collections）==========
    /// 列出收款
    pub async fn list_collections(
        &self,
        page: i64,
        page_size: i64,
        status: &str,
        customer_id: &str,
    ) -> ServiceClientResult<serde_json::Value> {
        let path = format!(
            "/collections?page={}&page_size={}&status={}&customer_id={}",
            page, page_size, status, customer_id
        );
        self.get(&self.build_path(&path)).await
    }

    /// 获取收款
    pub async fn get_collection(&self, id: &str) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/collections/{}", id);
        self.get(&self.build_path(&path)).await
    }

    /// 创建收款
    pub async fn create_collection(
        &self,
        data: &serde_json::Value,
    ) -> ServiceClientResult<serde_json::Value> {
        self.post(&self.build_path("/collections"), data).await
    }

    /// 更新收款
    pub async fn update_collection(
        &self,
        id: &str,
        data: &serde_json::Value,
    ) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/collections/{}", id);
        self.put(&self.build_path(&path), data).await
    }

    /// 删除收款
    pub async fn delete_collection(&self, id: &str) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/collections/{}", id);
        self.delete(&self.build_path(&path)).await
    }

    /// 核销收款
    pub async fn write_off_collection(
        &self,
        data: &serde_json::Value,
    ) -> ServiceClientResult<serde_json::Value> {
        self.post(&self.build_path("/collections/write-off"), data)
            .await
    }

    /// 批量核销收款
    pub async fn batch_write_off_collections(
        &self,
        data: &serde_json::Value,
    ) -> ServiceClientResult<serde_json::Value> {
        self.post(&self.build_path("/collections/batch-write-off"), data)
            .await
    }

    // ========== 付款管理（Payment Records）==========
    /// 列出付款记录
    pub async fn list_payment_records(
        &self,
        page: i64,
        page_size: i64,
        status: &str,
        supplier_id: &str,
    ) -> ServiceClientResult<serde_json::Value> {
        let path = format!(
            "/payment-records?page={}&page_size={}&status={}&supplier_id={}",
            page, page_size, status, supplier_id
        );
        self.get(&self.build_path(&path)).await
    }

    /// 获取付款记录
    pub async fn get_payment_record(&self, id: &str) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/payment-records/{}", id);
        self.get(&self.build_path(&path)).await
    }

    /// 创建付款记录
    pub async fn create_payment_record(
        &self,
        data: &serde_json::Value,
    ) -> ServiceClientResult<serde_json::Value> {
        self.post(&self.build_path("/payment-records"), data).await
    }

    /// 更新付款记录
    pub async fn update_payment_record(
        &self,
        id: &str,
        data: &serde_json::Value,
    ) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/payment-records/{}", id);
        self.put(&self.build_path(&path), data).await
    }

    /// 删除付款记录
    pub async fn delete_payment_record(&self, id: &str) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/payment-records/{}", id);
        self.delete(&self.build_path(&path)).await
    }

    /// 核销付款记录
    pub async fn write_off_payment_record(
        &self,
        data: &serde_json::Value,
    ) -> ServiceClientResult<serde_json::Value> {
        self.post(&self.build_path("/payment-records/write-off"), data)
            .await
    }

    /// 批量核销付款记录
    pub async fn batch_write_off_payment_records(
        &self,
        data: &serde_json::Value,
    ) -> ServiceClientResult<serde_json::Value> {
        self.post(&self.build_path("/payment-records/batch-write-off"), data)
            .await
    }

    // ========== 账龄分析（Aging）==========
    /// 计算应收账龄
    pub async fn calculate_receivable_aging(&self) -> ServiceClientResult<serde_json::Value> {
        self.get(&self.build_path("/aging/receivable")).await
    }

    /// 计算应付账龄
    pub async fn calculate_payable_aging(&self) -> ServiceClientResult<serde_json::Value> {
        self.get(&self.build_path("/aging/payable")).await
    }

    /// 获取账龄汇总
    pub async fn get_aging_summary(&self) -> ServiceClientResult<serde_json::Value> {
        self.get(&self.build_path("/aging/summary")).await
    }

    /// 获取账龄明细
    pub async fn get_aging_detail(
        &self,
        direction: &str,
        bucket: &str,
    ) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/aging/detail?direction={}&bucket={}", direction, bucket);
        self.get(&self.build_path(&path)).await
    }

    /// 获取账龄趋势
    pub async fn get_aging_trend(
        &self,
        direction: &str,
        months: i32,
    ) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/aging/trend?direction={}&months={}", direction, months);
        self.get(&self.build_path(&path)).await
    }

    /// 获取账户余额（按科目编码，不传则返回全部科目余额汇总）
    pub async fn get_account_balance(
        &self,
        subject_code: Option<&str>,
    ) -> ServiceClientResult<serde_json::Value> {
        let path = match subject_code {
            Some(code) => format!("/account-balance/{}", code),
            None => "/account-balance".to_string(),
        };
        self.get(&self.build_path(&path)).await
    }
}
