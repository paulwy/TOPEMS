-- RLS 覆盖率全面修复：为所有含 tenant_id/org_id 但未启用 RLS 的业务表启用 RLS
-- 生成时间：2026-09-10
-- 策略语义：无租户上下文→全放行；有上下文→仅本租户行；tenant_id IS NULL→共享行放行

-- ========== bi schema ==========

ALTER TABLE bi.report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE bi.report_templates FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON bi.report_templates;
CREATE POLICY rls_tenant_isolation ON bi.report_templates
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- ========== erp schema ==========

ALTER TABLE erp.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.assets FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON erp.assets;
CREATE POLICY rls_tenant_isolation ON erp.assets
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE erp.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.inventory FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON erp.inventory;
CREATE POLICY rls_tenant_isolation ON erp.inventory
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE erp.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.materials FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON erp.materials;
CREATE POLICY rls_tenant_isolation ON erp.materials
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- ========== finance schema ==========

ALTER TABLE finance.core_finance_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.core_finance_accounts FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON finance.core_finance_accounts;
CREATE POLICY rls_tenant_isolation ON finance.core_finance_accounts
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE finance.core_finance_approval_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.core_finance_approval_workflows FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON finance.core_finance_approval_workflows;
CREATE POLICY rls_tenant_isolation ON finance.core_finance_approval_workflows
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE finance.core_finance_aux_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.core_finance_aux_accounts FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON finance.core_finance_aux_accounts;
CREATE POLICY rls_tenant_isolation ON finance.core_finance_aux_accounts
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE finance.core_finance_aux_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.core_finance_aux_balances FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON finance.core_finance_aux_balances;
CREATE POLICY rls_tenant_isolation ON finance.core_finance_aux_balances
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE finance.core_finance_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.core_finance_ledger FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON finance.core_finance_ledger;
CREATE POLICY rls_tenant_isolation ON finance.core_finance_ledger
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE finance.core_finance_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.core_finance_periods FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON finance.core_finance_periods;
CREATE POLICY rls_tenant_isolation ON finance.core_finance_periods
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE finance.core_finance_reconciliation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.core_finance_reconciliation_items FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON finance.core_finance_reconciliation_items;
CREATE POLICY rls_tenant_isolation ON finance.core_finance_reconciliation_items
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE finance.core_finance_reconciliation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.core_finance_reconciliation_sessions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON finance.core_finance_reconciliation_sessions;
CREATE POLICY rls_tenant_isolation ON finance.core_finance_reconciliation_sessions
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE finance.core_finance_voucher_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.core_finance_voucher_lines FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON finance.core_finance_voucher_lines;
CREATE POLICY rls_tenant_isolation ON finance.core_finance_voucher_lines
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE finance.core_finance_vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.core_finance_vouchers FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON finance.core_finance_vouchers;
CREATE POLICY rls_tenant_isolation ON finance.core_finance_vouchers
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE finance.finance_v54_fraud_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v54_fraud_rules FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON finance.finance_v54_fraud_rules;
CREATE POLICY rls_tenant_isolation ON finance.finance_v54_fraud_rules
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE finance.finance_v54_fraud_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v54_fraud_scores FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON finance.finance_v54_fraud_scores;
CREATE POLICY rls_tenant_isolation ON finance.finance_v54_fraud_scores
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE finance.finance_v54_review_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v54_review_results FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON finance.finance_v54_review_results;
CREATE POLICY rls_tenant_isolation ON finance.finance_v54_review_results
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE finance.finance_v54_review_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v54_review_rules FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON finance.finance_v54_review_rules;
CREATE POLICY rls_tenant_isolation ON finance.finance_v54_review_rules
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE finance.finance_v54_review_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v54_review_workflows FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON finance.finance_v54_review_workflows;
CREATE POLICY rls_tenant_isolation ON finance.finance_v54_review_workflows
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE finance.finance_v54_risk_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v54_risk_alerts FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON finance.finance_v54_risk_alerts;
CREATE POLICY rls_tenant_isolation ON finance.finance_v54_risk_alerts
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE finance.finance_v54_risk_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v54_risk_indicators FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON finance.finance_v54_risk_indicators;
CREATE POLICY rls_tenant_isolation ON finance.finance_v54_risk_indicators
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE finance.finance_v55_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v55_invoice_items FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON finance.finance_v55_invoice_items;
CREATE POLICY rls_tenant_isolation ON finance.finance_v55_invoice_items
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE finance.finance_v55_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v55_invoices FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON finance.finance_v55_invoices;
CREATE POLICY rls_tenant_isolation ON finance.finance_v55_invoices
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE finance.finance_v55_payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v55_payment_requests FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON finance.finance_v55_payment_requests;
CREATE POLICY rls_tenant_isolation ON finance.finance_v55_payment_requests
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE finance.finance_v55_payment_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v55_payment_results FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON finance.finance_v55_payment_results;
CREATE POLICY rls_tenant_isolation ON finance.finance_v55_payment_results
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE finance.finance_v55_reconciliation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v55_reconciliation_results FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON finance.finance_v55_reconciliation_results;
CREATE POLICY rls_tenant_isolation ON finance.finance_v55_reconciliation_results
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE finance.finance_v55_reconciliation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v55_reconciliation_rules FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON finance.finance_v55_reconciliation_rules;
CREATE POLICY rls_tenant_isolation ON finance.finance_v55_reconciliation_rules
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE finance.finance_v56_tax_brackets ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v56_tax_brackets FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON finance.finance_v56_tax_brackets;
CREATE POLICY rls_tenant_isolation ON finance.finance_v56_tax_brackets
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE finance.finance_v56_tax_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v56_tax_forms FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON finance.finance_v56_tax_forms;
CREATE POLICY rls_tenant_isolation ON finance.finance_v56_tax_forms
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE finance.finance_v56_tax_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v56_tax_lines FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON finance.finance_v56_tax_lines;
CREATE POLICY rls_tenant_isolation ON finance.finance_v56_tax_lines
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE finance.finance_v56_tax_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v56_tax_plans FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON finance.finance_v56_tax_plans;
CREATE POLICY rls_tenant_isolation ON finance.finance_v56_tax_plans
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE finance.finance_v56_tax_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v56_tax_rates FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON finance.finance_v56_tax_rates;
CREATE POLICY rls_tenant_isolation ON finance.finance_v56_tax_rates
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE finance.finance_v56_tax_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v56_tax_suggestions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON finance.finance_v56_tax_suggestions;
CREATE POLICY rls_tenant_isolation ON finance.finance_v56_tax_suggestions
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE finance.finance_v57_analysis_dimensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v57_analysis_dimensions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON finance.finance_v57_analysis_dimensions;
CREATE POLICY rls_tenant_isolation ON finance.finance_v57_analysis_dimensions
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE finance.finance_v57_analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v57_analysis_results FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON finance.finance_v57_analysis_results;
CREATE POLICY rls_tenant_isolation ON finance.finance_v57_analysis_results
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE finance.finance_v57_forecast_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v57_forecast_models FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON finance.finance_v57_forecast_models;
CREATE POLICY rls_tenant_isolation ON finance.finance_v57_forecast_models
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE finance.finance_v57_generated_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v57_generated_reports FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON finance.finance_v57_generated_reports;
CREATE POLICY rls_tenant_isolation ON finance.finance_v57_generated_reports
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE finance.finance_v57_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v57_insights FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON finance.finance_v57_insights;
CREATE POLICY rls_tenant_isolation ON finance.finance_v57_insights
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE finance.finance_v57_report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v57_report_templates FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON finance.finance_v57_report_templates;
CREATE POLICY rls_tenant_isolation ON finance.finance_v57_report_templates
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE finance.finance_v58_cash_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v58_cash_pools FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON finance.finance_v58_cash_pools;
CREATE POLICY rls_tenant_isolation ON finance.finance_v58_cash_pools
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE finance.finance_v58_forecast_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v58_forecast_results FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON finance.finance_v58_forecast_results;
CREATE POLICY rls_tenant_isolation ON finance.finance_v58_forecast_results
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE finance.finance_v58_forecast_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v58_forecast_scenarios FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON finance.finance_v58_forecast_scenarios;
CREATE POLICY rls_tenant_isolation ON finance.finance_v58_forecast_scenarios
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE finance.finance_v58_liquidity_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v58_liquidity_targets FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON finance.finance_v58_liquidity_targets;
CREATE POLICY rls_tenant_isolation ON finance.finance_v58_liquidity_targets
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE finance.finance_v58_optimization_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v58_optimization_results FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON finance.finance_v58_optimization_results;
CREATE POLICY rls_tenant_isolation ON finance.finance_v58_optimization_results
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE finance.finance_v58_pool_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v58_pool_allocations FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON finance.finance_v58_pool_allocations;
CREATE POLICY rls_tenant_isolation ON finance.finance_v58_pool_allocations
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE finance.finance_v58_pool_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v58_pool_transfers FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON finance.finance_v58_pool_transfers;
CREATE POLICY rls_tenant_isolation ON finance.finance_v58_pool_transfers
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE finance.finance_v59_credit_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v59_credit_profiles FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON finance.finance_v59_credit_profiles;
CREATE POLICY rls_tenant_isolation ON finance.finance_v59_credit_profiles
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE finance.finance_v59_device_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v59_device_profiles FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON finance.finance_v59_device_profiles;
CREATE POLICY rls_tenant_isolation ON finance.finance_v59_device_profiles
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE finance.finance_v59_fraud_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v59_fraud_decisions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON finance.finance_v59_fraud_decisions;
CREATE POLICY rls_tenant_isolation ON finance.finance_v59_fraud_decisions
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE finance.finance_v59_fraud_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v59_fraud_rules FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON finance.finance_v59_fraud_rules;
CREATE POLICY rls_tenant_isolation ON finance.finance_v59_fraud_rules
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE finance.finance_v59_fraud_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v59_fraud_signals FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON finance.finance_v59_fraud_signals;
CREATE POLICY rls_tenant_isolation ON finance.finance_v59_fraud_signals
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE finance.finance_v59_scoring_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v59_scoring_models FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON finance.finance_v59_scoring_models;
CREATE POLICY rls_tenant_isolation ON finance.finance_v59_scoring_models
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE finance.finance_v59_stress_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v59_stress_results FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON finance.finance_v59_stress_results;
CREATE POLICY rls_tenant_isolation ON finance.finance_v59_stress_results
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE finance.finance_v59_stress_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v59_stress_scenarios FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON finance.finance_v59_stress_scenarios;
CREATE POLICY rls_tenant_isolation ON finance.finance_v59_stress_scenarios
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE finance.finance_v60_alert_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v60_alert_channels FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON finance.finance_v60_alert_channels;
CREATE POLICY rls_tenant_isolation ON finance.finance_v60_alert_channels
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE finance.finance_v60_alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v60_alert_rules FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON finance.finance_v60_alert_rules;
CREATE POLICY rls_tenant_isolation ON finance.finance_v60_alert_rules
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE finance.finance_v60_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v60_alerts FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON finance.finance_v60_alerts;
CREATE POLICY rls_tenant_isolation ON finance.finance_v60_alerts
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE finance.finance_v60_decision_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v60_decision_results FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON finance.finance_v60_decision_results;
CREATE POLICY rls_tenant_isolation ON finance.finance_v60_decision_results
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE finance.finance_v60_decision_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v60_decision_scenarios FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON finance.finance_v60_decision_scenarios;
CREATE POLICY rls_tenant_isolation ON finance.finance_v60_decision_scenarios
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE finance.finance_v60_schedule_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v60_schedule_dependencies FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON finance.finance_v60_schedule_dependencies;
CREATE POLICY rls_tenant_isolation ON finance.finance_v60_schedule_dependencies
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE finance.finance_v60_schedule_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v60_schedule_executions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON finance.finance_v60_schedule_executions;
CREATE POLICY rls_tenant_isolation ON finance.finance_v60_schedule_executions
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE finance.finance_v60_schedule_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_v60_schedule_tasks FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON finance.finance_v60_schedule_tasks;
CREATE POLICY rls_tenant_isolation ON finance.finance_v60_schedule_tasks
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- ========== flow schema ==========

ALTER TABLE flow.approval_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE flow.approval_records FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON flow.approval_records;
CREATE POLICY rls_tenant_isolation ON flow.approval_records
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE flow.approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE flow.approvals FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON flow.approvals;
CREATE POLICY rls_tenant_isolation ON flow.approvals
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE flow.core_workflow_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE flow.core_workflow_instances FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON flow.core_workflow_instances;
CREATE POLICY rls_tenant_isolation ON flow.core_workflow_instances
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE flow.core_workflow_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE flow.core_workflow_tasks FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON flow.core_workflow_tasks;
CREATE POLICY rls_tenant_isolation ON flow.core_workflow_tasks
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- ========== hrm schema ==========

ALTER TABLE hrm.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrm.employees FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON hrm.employees;
CREATE POLICY rls_tenant_isolation ON hrm.employees
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE hrm.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrm.employees FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON hrm.employees;
CREATE POLICY rls_tenant_isolation ON hrm.employees
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- ========== integration schema ==========

ALTER TABLE integration.erp_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration.erp_connections FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON integration.erp_connections;
CREATE POLICY rls_tenant_isolation ON integration.erp_connections
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), ''))
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), ''));

ALTER TABLE integration.erp_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration.erp_mappings FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON integration.erp_mappings;
CREATE POLICY rls_tenant_isolation ON integration.erp_mappings
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), ''))
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), ''));

ALTER TABLE integration.external_erp_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration.external_erp_sync_logs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON integration.external_erp_sync_logs;
CREATE POLICY rls_tenant_isolation ON integration.external_erp_sync_logs
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), ''))
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), ''));

-- ========== lims schema ==========

ALTER TABLE lims.ai_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE lims.ai_analyses FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON lims.ai_analyses;
CREATE POLICY rls_tenant_isolation ON lims.ai_analyses
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE lims.document_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE lims.document_relations FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON lims.document_relations;
CREATE POLICY rls_tenant_isolation ON lims.document_relations
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- ========== mobile schema ==========

ALTER TABLE mobile.oa_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE mobile.oa_announcements FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON mobile.oa_announcements;
CREATE POLICY rls_tenant_isolation ON mobile.oa_announcements
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), ''))
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), ''));

ALTER TABLE mobile.oa_calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE mobile.oa_calendar_events FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON mobile.oa_calendar_events;
CREATE POLICY rls_tenant_isolation ON mobile.oa_calendar_events
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), ''))
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), ''));

ALTER TABLE mobile.oa_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE mobile.oa_meetings FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON mobile.oa_meetings;
CREATE POLICY rls_tenant_isolation ON mobile.oa_meetings
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), ''))
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), ''));

ALTER TABLE mobile.oa_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE mobile.oa_tasks FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON mobile.oa_tasks;
CREATE POLICY rls_tenant_isolation ON mobile.oa_tasks
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), ''))
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), ''));

-- ========== pm schema ==========

ALTER TABLE pm.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm.project_members FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON pm.project_members;
CREATE POLICY rls_tenant_isolation ON pm.project_members
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE pm.project_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm.project_milestones FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON pm.project_milestones;
CREATE POLICY rls_tenant_isolation ON pm.project_milestones
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE pm.project_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm.project_phases FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON pm.project_phases;
CREATE POLICY rls_tenant_isolation ON pm.project_phases
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE pm.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm.projects FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON pm.projects;
CREATE POLICY rls_tenant_isolation ON pm.projects
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE pm.report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm.report_templates FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON pm.report_templates;
CREATE POLICY rls_tenant_isolation ON pm.report_templates
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- ========== public schema ==========

ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_rules FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON public.automation_rules;
CREATE POLICY rls_tenant_isolation ON public.automation_rules
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE public.automation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_runs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON public.automation_runs;
CREATE POLICY rls_tenant_isolation ON public.automation_runs
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE public.automation_variables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_variables FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON public.automation_variables;
CREATE POLICY rls_tenant_isolation ON public.automation_variables
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE public.core_faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_faqs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON public.core_faqs;
CREATE POLICY rls_tenant_isolation ON public.core_faqs
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE public.core_faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_faqs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON public.core_faqs;
CREATE POLICY rls_tenant_isolation ON public.core_faqs
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE public.core_guide_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_guide_lessons FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON public.core_guide_lessons;
CREATE POLICY rls_tenant_isolation ON public.core_guide_lessons
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE public.core_guide_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_guide_lessons FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON public.core_guide_lessons;
CREATE POLICY rls_tenant_isolation ON public.core_guide_lessons
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE public.core_guide_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_guide_progress FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON public.core_guide_progress;
CREATE POLICY rls_tenant_isolation ON public.core_guide_progress
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE public.core_guide_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_guide_progress FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON public.core_guide_progress;
CREATE POLICY rls_tenant_isolation ON public.core_guide_progress
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE public.core_guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_guides FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON public.core_guides;
CREATE POLICY rls_tenant_isolation ON public.core_guides
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE public.core_guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_guides FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON public.core_guides;
CREATE POLICY rls_tenant_isolation ON public.core_guides
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE public.monitor_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monitor_settings FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON public.monitor_settings;
CREATE POLICY rls_tenant_isolation ON public.monitor_settings
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE public.search_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_logs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON public.search_logs;
CREATE POLICY rls_tenant_isolation ON public.search_logs
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON public.system_settings;
CREATE POLICY rls_tenant_isolation ON public.system_settings
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- ========== qms schema ==========

ALTER TABLE qms.qa_ehs_hazards ENABLE ROW LEVEL SECURITY;
ALTER TABLE qms.qa_ehs_hazards FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON qms.qa_ehs_hazards;
CREATE POLICY rls_tenant_isolation ON qms.qa_ehs_hazards
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- ========== wms schema ==========

ALTER TABLE wms.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE wms.inventory FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON wms.inventory;
CREATE POLICY rls_tenant_isolation ON wms.inventory
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE wms.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE wms.inventory FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON wms.inventory;
CREATE POLICY rls_tenant_isolation ON wms.inventory
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- ========== 验证 ==========
DO $$
DECLARE
    rls_count INTEGER;
BEGIN
    SELECT count(*) INTO rls_count
    FROM pg_tables t
    JOIN pg_class c ON t.tablename = c.relname
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE t.schemaname NOT IN ('pg_catalog','information_schema')
      AND c.relrowsecurity = false
      AND EXISTS (SELECT 1 FROM information_schema.columns col
                   WHERE col.table_schema = t.schemaname
                     AND col.table_name = t.tablename
                     AND col.column_name IN ('tenant_id','org_id'))
      AND NOT (t.schemaname = 'public' AND t.tablename LIKE 'finance_%')
      AND NOT (t.schemaname = 'public' AND t.tablename LIKE 'core_finance_%');
    RAISE NOTICE 'RLS 覆盖率全面修复完成：剩余含 tenant_id 但未启用 RLS 的业务表 = %', rls_count;
END $$;