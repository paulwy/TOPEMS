-- 清理 public schema 中的 finance 旧表（rehome 迁移遗留死表，全 0 行）
-- 这些表已在 20260901000007_rehome_finance 迁移中迁移到 finance schema
-- public schema 中的旧表未被清理，导致 RLS 覆盖率统计异常

-- ========== core_finance_* 系列（9张）==========
DROP TABLE IF EXISTS public.core_finance_accounts;
DROP TABLE IF EXISTS public.core_finance_approval_workflows;
DROP TABLE IF EXISTS public.core_finance_aux_accounts;
DROP TABLE IF EXISTS public.core_finance_aux_balances;
DROP TABLE IF EXISTS public.core_finance_ledger;
DROP TABLE IF EXISTS public.core_finance_periods;
DROP TABLE IF EXISTS public.core_finance_reconciliation_items;
DROP TABLE IF EXISTS public.core_finance_reconciliation_sessions;
DROP TABLE IF EXISTS public.core_finance_voucher_lines;
DROP TABLE IF EXISTS public.core_finance_vouchers;

-- ========== finance_v54_* 系列（8张）==========
DROP TABLE IF EXISTS public.finance_v54_fraud_rules;
DROP TABLE IF EXISTS public.finance_v54_fraud_scores;
DROP TABLE IF EXISTS public.finance_v54_review_results;
DROP TABLE IF EXISTS public.finance_v54_review_rules;
DROP TABLE IF EXISTS public.finance_v54_review_workflows;
DROP TABLE IF EXISTS public.finance_v54_risk_alerts;
DROP TABLE IF EXISTS public.finance_v54_risk_indicators;

-- ========== finance_v55_* 系列（8张）==========
DROP TABLE IF EXISTS public.finance_v55_invoice_items;
DROP TABLE IF EXISTS public.finance_v55_invoices;
DROP TABLE IF EXISTS public.finance_v55_payment_requests;
DROP TABLE IF EXISTS public.finance_v55_payment_results;
DROP TABLE IF EXISTS public.finance_v55_reconciliation_results;
DROP TABLE IF EXISTS public.finance_v55_reconciliation_rules;

-- ========== finance_v56_* 系列（7张）==========
DROP TABLE IF EXISTS public.finance_v56_tax_brackets;
DROP TABLE IF EXISTS public.finance_v56_tax_forms;
DROP TABLE IF EXISTS public.finance_v56_tax_lines;
DROP TABLE IF EXISTS public.finance_v56_tax_plans;
DROP TABLE IF EXISTS public.finance_v56_tax_rates;
DROP TABLE IF EXISTS public.finance_v56_tax_suggestions;

-- ========== finance_v57_* 系列（7张）==========
DROP TABLE IF EXISTS public.finance_v57_analysis_dimensions;
DROP TABLE IF EXISTS public.finance_v57_analysis_results;
DROP TABLE IF EXISTS public.finance_v57_forecast_models;
DROP TABLE IF EXISTS public.finance_v57_generated_reports;
DROP TABLE IF EXISTS public.finance_v57_insights;
DROP TABLE IF EXISTS public.finance_v57_report_templates;

-- ========== finance_v58_* 系列（6张）==========
DROP TABLE IF EXISTS public.finance_v58_cash_pools;
DROP TABLE IF EXISTS public.finance_v58_cash_forecasts;
DROP TABLE IF EXISTS public.finance_v58_cash_transactions;
DROP TABLE IF EXISTS public.finance_v58_fund_allocations;
DROP TABLE IF EXISTS public.finance_v58_liquidity_ratios;

-- ========== 验证 ==========
DO $$
DECLARE
    remaining INTEGER;
BEGIN
    SELECT count(*) INTO remaining
    FROM pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE c.relkind = 'r'
      AND n.nspname = 'public'
      AND (c.relname LIKE 'finance_%' OR c.relname LIKE 'core_finance_%');
    RAISE NOTICE 'public schema finance 旧表清理完成：剩余 % 张', remaining;
END $$;
