-- 2026-09-03 运行库(5433)剩余 public 影子清理：对齐 5432 治理后结构
-- 5433 public 163 张 → 归位 123 张（finance/lims/pdm/report/bi/gis）+ DROP 冲突 4 张 + 保留 36 张（5432 同在 public）
-- 全部目标表已核验 0 行（无数据丢失）；5432 各服务 schema 有权威副本
-- 执行时机：停服后或在线（0 行表 SET SCHEMA 无锁竞争风险）

CREATE SCHEMA IF NOT EXISTS finance;
CREATE SCHEMA IF NOT EXISTS lims;
CREATE SCHEMA IF NOT EXISTS pdm;
CREATE SCHEMA IF NOT EXISTS report;

-- 1. 归位 finance 58 张
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='core_finance_accounts' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='finance' AND c.relname='core_finance_accounts' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."core_finance_accounts" SET SCHEMA finance';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='core_finance_approval_workflows' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='finance' AND c.relname='core_finance_approval_workflows' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."core_finance_approval_workflows" SET SCHEMA finance';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='core_finance_aux_accounts' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='finance' AND c.relname='core_finance_aux_accounts' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."core_finance_aux_accounts" SET SCHEMA finance';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='core_finance_aux_balances' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='finance' AND c.relname='core_finance_aux_balances' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."core_finance_aux_balances" SET SCHEMA finance';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='core_finance_ledger' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='finance' AND c.relname='core_finance_ledger' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."core_finance_ledger" SET SCHEMA finance';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='core_finance_periods' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='finance' AND c.relname='core_finance_periods' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."core_finance_periods" SET SCHEMA finance';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='core_finance_reconciliation_items' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='finance' AND c.relname='core_finance_reconciliation_items' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."core_finance_reconciliation_items" SET SCHEMA finance';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='core_finance_reconciliation_sessions' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='finance' AND c.relname='core_finance_reconciliation_sessions' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."core_finance_reconciliation_sessions" SET SCHEMA finance';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='core_finance_voucher_lines' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='finance' AND c.relname='core_finance_voucher_lines' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."core_finance_voucher_lines" SET SCHEMA finance';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='core_finance_vouchers' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='finance' AND c.relname='core_finance_vouchers' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."core_finance_vouchers" SET SCHEMA finance';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='finance_v54_fraud_rules' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='finance' AND c.relname='finance_v54_fraud_rules' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."finance_v54_fraud_rules" SET SCHEMA finance';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='finance_v54_fraud_scores' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='finance' AND c.relname='finance_v54_fraud_scores' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."finance_v54_fraud_scores" SET SCHEMA finance';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='finance_v54_review_results' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='finance' AND c.relname='finance_v54_review_results' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."finance_v54_review_results" SET SCHEMA finance';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='finance_v54_review_rules' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='finance' AND c.relname='finance_v54_review_rules' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."finance_v54_review_rules" SET SCHEMA finance';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='finance_v54_review_workflows' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='finance' AND c.relname='finance_v54_review_workflows' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."finance_v54_review_workflows" SET SCHEMA finance';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='finance_v54_risk_alerts' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='finance' AND c.relname='finance_v54_risk_alerts' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."finance_v54_risk_alerts" SET SCHEMA finance';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='finance_v54_risk_indicators' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='finance' AND c.relname='finance_v54_risk_indicators' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."finance_v54_risk_indicators" SET SCHEMA finance';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='finance_v55_invoice_items' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='finance' AND c.relname='finance_v55_invoice_items' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."finance_v55_invoice_items" SET SCHEMA finance';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='finance_v55_invoices' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='finance' AND c.relname='finance_v55_invoices' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."finance_v55_invoices" SET SCHEMA finance';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='finance_v55_payment_requests' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='finance' AND c.relname='finance_v55_payment_requests' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."finance_v55_payment_requests" SET SCHEMA finance';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='finance_v55_payment_results' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='finance' AND c.relname='finance_v55_payment_results' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."finance_v55_payment_results" SET SCHEMA finance';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='finance_v55_reconciliation_results' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='finance' AND c.relname='finance_v55_reconciliation_results' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."finance_v55_reconciliation_results" SET SCHEMA finance';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='finance_v55_reconciliation_rules' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='finance' AND c.relname='finance_v55_reconciliation_rules' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."finance_v55_reconciliation_rules" SET SCHEMA finance';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='finance_v56_tax_brackets' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='finance' AND c.relname='finance_v56_tax_brackets' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."finance_v56_tax_brackets" SET SCHEMA finance';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='finance_v56_tax_forms' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='finance' AND c.relname='finance_v56_tax_forms' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."finance_v56_tax_forms" SET SCHEMA finance';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='finance_v56_tax_lines' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='finance' AND c.relname='finance_v56_tax_lines' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."finance_v56_tax_lines" SET SCHEMA finance';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='finance_v56_tax_plans' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='finance' AND c.relname='finance_v56_tax_plans' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."finance_v56_tax_plans" SET SCHEMA finance';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='finance_v56_tax_rates' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='finance' AND c.relname='finance_v56_tax_rates' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."finance_v56_tax_rates" SET SCHEMA finance';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='finance_v56_tax_suggestions' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='finance' AND c.relname='finance_v56_tax_suggestions' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."finance_v56_tax_suggestions" SET SCHEMA finance';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='finance_v57_analysis_dimensions' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='finance' AND c.relname='finance_v57_analysis_dimensions' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."finance_v57_analysis_dimensions" SET SCHEMA finance';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='finance_v57_analysis_results' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='finance' AND c.relname='finance_v57_analysis_results' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."finance_v57_analysis_results" SET SCHEMA finance';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='finance_v57_forecast_models' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='finance' AND c.relname='finance_v57_forecast_models' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."finance_v57_forecast_models" SET SCHEMA finance';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='finance_v57_generated_reports' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='finance' AND c.relname='finance_v57_generated_reports' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."finance_v57_generated_reports" SET SCHEMA finance';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='finance_v57_insights' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='finance' AND c.relname='finance_v57_insights' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."finance_v57_insights" SET SCHEMA finance';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='finance_v57_report_templates' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='finance' AND c.relname='finance_v57_report_templates' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."finance_v57_report_templates" SET SCHEMA finance';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='finance_v58_cash_pools' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='finance' AND c.relname='finance_v58_cash_pools' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."finance_v58_cash_pools" SET SCHEMA finance';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='finance_v58_forecast_results' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='finance' AND c.relname='finance_v58_forecast_results' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."finance_v58_forecast_results" SET SCHEMA finance';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='finance_v58_forecast_scenarios' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='finance' AND c.relname='finance_v58_forecast_scenarios' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."finance_v58_forecast_scenarios" SET SCHEMA finance';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='finance_v58_liquidity_targets' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='finance' AND c.relname='finance_v58_liquidity_targets' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."finance_v58_liquidity_targets" SET SCHEMA finance';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='finance_v58_optimization_results' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='finance' AND c.relname='finance_v58_optimization_results' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."finance_v58_optimization_results" SET SCHEMA finance';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='finance_v58_pool_allocations' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='finance' AND c.relname='finance_v58_pool_allocations' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."finance_v58_pool_allocations" SET SCHEMA finance';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='finance_v58_pool_transfers' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='finance' AND c.relname='finance_v58_pool_transfers' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."finance_v58_pool_transfers" SET SCHEMA finance';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='finance_v59_credit_profiles' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='finance' AND c.relname='finance_v59_credit_profiles' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."finance_v59_credit_profiles" SET SCHEMA finance';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='finance_v59_device_profiles' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='finance' AND c.relname='finance_v59_device_profiles' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."finance_v59_device_profiles" SET SCHEMA finance';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='finance_v59_fraud_decisions' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='finance' AND c.relname='finance_v59_fraud_decisions' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."finance_v59_fraud_decisions" SET SCHEMA finance';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='finance_v59_fraud_rules' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='finance' AND c.relname='finance_v59_fraud_rules' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."finance_v59_fraud_rules" SET SCHEMA finance';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='finance_v59_fraud_signals' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='finance' AND c.relname='finance_v59_fraud_signals' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."finance_v59_fraud_signals" SET SCHEMA finance';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='finance_v59_scoring_models' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='finance' AND c.relname='finance_v59_scoring_models' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."finance_v59_scoring_models" SET SCHEMA finance';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='finance_v59_stress_results' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='finance' AND c.relname='finance_v59_stress_results' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."finance_v59_stress_results" SET SCHEMA finance';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='finance_v59_stress_scenarios' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='finance' AND c.relname='finance_v59_stress_scenarios' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."finance_v59_stress_scenarios" SET SCHEMA finance';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='finance_v60_alert_channels' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='finance' AND c.relname='finance_v60_alert_channels' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."finance_v60_alert_channels" SET SCHEMA finance';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='finance_v60_alert_rules' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='finance' AND c.relname='finance_v60_alert_rules' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."finance_v60_alert_rules" SET SCHEMA finance';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='finance_v60_alerts' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='finance' AND c.relname='finance_v60_alerts' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."finance_v60_alerts" SET SCHEMA finance';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='finance_v60_decision_results' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='finance' AND c.relname='finance_v60_decision_results' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."finance_v60_decision_results" SET SCHEMA finance';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='finance_v60_decision_scenarios' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='finance' AND c.relname='finance_v60_decision_scenarios' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."finance_v60_decision_scenarios" SET SCHEMA finance';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='finance_v60_schedule_dependencies' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='finance' AND c.relname='finance_v60_schedule_dependencies' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."finance_v60_schedule_dependencies" SET SCHEMA finance';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='finance_v60_schedule_executions' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='finance' AND c.relname='finance_v60_schedule_executions' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."finance_v60_schedule_executions" SET SCHEMA finance';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='finance_v60_schedule_tasks' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='finance' AND c.relname='finance_v60_schedule_tasks' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."finance_v60_schedule_tasks" SET SCHEMA finance';
  END IF;
END $rehome$;

-- 2. 归位 lims 31 张
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_lab_calibration_records' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='lims' AND c.relname='qa_lab_calibration_records' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_lab_calibration_records" SET SCHEMA lims';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_lab_inspection_reports' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='lims' AND c.relname='qa_lab_inspection_reports' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_lab_inspection_reports" SET SCHEMA lims';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_lab_instruments' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='lims' AND c.relname='qa_lab_instruments' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_lab_instruments" SET SCHEMA lims';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_lab_processes' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='lims' AND c.relname='qa_lab_processes' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_lab_processes" SET SCHEMA lims';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_lab_reagent_alerts' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='lims' AND c.relname='qa_lab_reagent_alerts' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_lab_reagent_alerts" SET SCHEMA lims';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_lab_reagent_history' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='lims' AND c.relname='qa_lab_reagent_history' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_lab_reagent_history" SET SCHEMA lims';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_lab_reagents' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='lims' AND c.relname='qa_lab_reagents' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_lab_reagents" SET SCHEMA lims';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_lab_records' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='lims' AND c.relname='qa_lab_records' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_lab_records" SET SCHEMA lims';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_lab_sample_lifecycle' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='lims' AND c.relname='qa_lab_sample_lifecycle' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_lab_sample_lifecycle" SET SCHEMA lims';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_lab_samples' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='lims' AND c.relname='qa_lab_samples' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_lab_samples" SET SCHEMA lims';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_lab_tasks' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='lims' AND c.relname='qa_lab_tasks' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_lab_tasks" SET SCHEMA lims';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_lims_audit_logs' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='lims' AND c.relname='qa_lims_audit_logs' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_lims_audit_logs" SET SCHEMA lims';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_lims_barcode_scan_records' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='lims' AND c.relname='qa_lims_barcode_scan_records' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_lims_barcode_scan_records" SET SCHEMA lims';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_lims_collection_tasks' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='lims' AND c.relname='qa_lims_collection_tasks' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_lims_collection_tasks" SET SCHEMA lims';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_lims_instrument_data' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='lims' AND c.relname='qa_lims_instrument_data' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_lims_instrument_data" SET SCHEMA lims';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_lims_method_categories' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='lims' AND c.relname='qa_lims_method_categories' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_lims_method_categories" SET SCHEMA lims';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_lims_method_validations' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='lims' AND c.relname='qa_lims_method_validations' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_lims_method_validations" SET SCHEMA lims';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_lims_method_versions' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='lims' AND c.relname='qa_lims_method_versions' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_lims_method_versions" SET SCHEMA lims';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_lims_parse_rules' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='lims' AND c.relname='qa_lims_parse_rules' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_lims_parse_rules" SET SCHEMA lims';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_lims_pt_corrective_actions' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='lims' AND c.relname='qa_lims_pt_corrective_actions' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_lims_pt_corrective_actions" SET SCHEMA lims';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_lims_pt_evaluations' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='lims' AND c.relname='qa_lims_pt_evaluations' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_lims_pt_evaluations" SET SCHEMA lims';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_lims_pt_plans' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='lims' AND c.relname='qa_lims_pt_plans' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_lims_pt_plans" SET SCHEMA lims';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_lims_pt_results' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='lims' AND c.relname='qa_lims_pt_results' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_lims_pt_results" SET SCHEMA lims';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_lims_pt_samples' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='lims' AND c.relname='qa_lims_pt_samples' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_lims_pt_samples" SET SCHEMA lims';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_lims_rfid_tags' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='lims' AND c.relname='qa_lims_rfid_tags' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_lims_rfid_tags" SET SCHEMA lims';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_lims_sample_barcodes' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='lims' AND c.relname='qa_lims_sample_barcodes' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_lims_sample_barcodes" SET SCHEMA lims';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_lims_sync_records' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='lims' AND c.relname='qa_lims_sync_records' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_lims_sync_records" SET SCHEMA lims';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_lims_test_methods' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='lims' AND c.relname='qa_lims_test_methods' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_lims_test_methods" SET SCHEMA lims';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_lims_uncertainty_components' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='lims' AND c.relname='qa_lims_uncertainty_components' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_lims_uncertainty_components" SET SCHEMA lims';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_lims_uncertainty_projects' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='lims' AND c.relname='qa_lims_uncertainty_projects' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_lims_uncertainty_projects" SET SCHEMA lims';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_lims_uncertainty_sources' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='lims' AND c.relname='qa_lims_uncertainty_sources' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_lims_uncertainty_sources" SET SCHEMA lims';
  END IF;
END $rehome$;

-- 3. 归位 pdm 19 张
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='pdm_bom_items' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='pdm' AND c.relname='pdm_bom_items' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."pdm_bom_items" SET SCHEMA pdm';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='pdm_boms' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='pdm' AND c.relname='pdm_boms' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."pdm_boms" SET SCHEMA pdm';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='pdm_change_notices' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='pdm' AND c.relname='pdm_change_notices' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."pdm_change_notices" SET SCHEMA pdm';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='pdm_configurations' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='pdm' AND c.relname='pdm_configurations' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."pdm_configurations" SET SCHEMA pdm';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='pdm_document_versions' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='pdm' AND c.relname='pdm_document_versions' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."pdm_document_versions" SET SCHEMA pdm';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='pdm_documents' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='pdm' AND c.relname='pdm_documents' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."pdm_documents" SET SCHEMA pdm';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='pdm_master_data_refs' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='pdm' AND c.relname='pdm_master_data_refs' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."pdm_master_data_refs" SET SCHEMA pdm';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='pdm_materials' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='pdm' AND c.relname='pdm_materials' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."pdm_materials" SET SCHEMA pdm';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='pdm_production_batches' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='pdm' AND c.relname='pdm_production_batches' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."pdm_production_batches" SET SCHEMA pdm';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='pdm_production_formulas' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='pdm' AND c.relname='pdm_production_formulas' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."pdm_production_formulas" SET SCHEMA pdm';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='pdm_production_processes' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='pdm' AND c.relname='pdm_production_processes' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."pdm_production_processes" SET SCHEMA pdm';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='pdm_production_steps' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='pdm' AND c.relname='pdm_production_steps' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."pdm_production_steps" SET SCHEMA pdm';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='pdm_products' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='pdm' AND c.relname='pdm_products' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."pdm_products" SET SCHEMA pdm';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='pdm_project_members' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='pdm' AND c.relname='pdm_project_members' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."pdm_project_members" SET SCHEMA pdm';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='pdm_project_phases' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='pdm' AND c.relname='pdm_project_phases' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."pdm_project_phases" SET SCHEMA pdm';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='pdm_projects' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='pdm' AND c.relname='pdm_projects' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."pdm_projects" SET SCHEMA pdm';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='pdm_versions' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='pdm' AND c.relname='pdm_versions' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."pdm_versions" SET SCHEMA pdm';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='pdm_workflow_instances' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='pdm' AND c.relname='pdm_workflow_instances' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."pdm_workflow_instances" SET SCHEMA pdm';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='pdm_workflows' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='pdm' AND c.relname='pdm_workflows' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."pdm_workflows" SET SCHEMA pdm';
  END IF;
END $rehome$;

-- 4. 归位 report 1 张
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='report_templates' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='report' AND c.relname='report_templates' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."report_templates" SET SCHEMA report';
  END IF;
END $rehome$;

-- 5. 归位 bi 13 张（analytics_*，bi schema 无同名）
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='analytics_comparison_analyses' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='bi' AND c.relname='analytics_comparison_analyses' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."analytics_comparison_analyses" SET SCHEMA bi';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='analytics_comparison_results' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='bi' AND c.relname='analytics_comparison_results' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."analytics_comparison_results" SET SCHEMA bi';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='analytics_dashboard_shares' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='bi' AND c.relname='analytics_dashboard_shares' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."analytics_dashboard_shares" SET SCHEMA bi';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='analytics_dashboard_templates' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='bi' AND c.relname='analytics_dashboard_templates' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."analytics_dashboard_templates" SET SCHEMA bi';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='analytics_dashboards' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='bi' AND c.relname='analytics_dashboards' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."analytics_dashboards" SET SCHEMA bi';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='analytics_datasets' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='bi' AND c.relname='analytics_datasets' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."analytics_datasets" SET SCHEMA bi';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='analytics_datasources' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='bi' AND c.relname='analytics_datasources' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."analytics_datasources" SET SCHEMA bi';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='analytics_drilldown_history' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='bi' AND c.relname='analytics_drilldown_history' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."analytics_drilldown_history" SET SCHEMA bi';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='analytics_drilldown_paths' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='bi' AND c.relname='analytics_drilldown_paths' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."analytics_drilldown_paths" SET SCHEMA bi';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='analytics_row_level_permissions' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='bi' AND c.relname='analytics_row_level_permissions' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."analytics_row_level_permissions" SET SCHEMA bi';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='analytics_self_service_reports' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='bi' AND c.relname='analytics_self_service_reports' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."analytics_self_service_reports" SET SCHEMA bi';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='analytics_sync_records' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='bi' AND c.relname='analytics_sync_records' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."analytics_sync_records" SET SCHEMA bi';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='analytics_widgets' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='bi' AND c.relname='analytics_widgets' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."analytics_widgets" SET SCHEMA bi';
  END IF;
END $rehome$;

-- 6. 归位 gis 1 张
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='audit_logs' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='gis' AND c.relname='audit_logs' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."audit_logs" SET SCHEMA gis';
  END IF;
END $rehome$;

-- 7. DROP public 冲突残留 4 张（bi schema 已有权威副本）
DROP TABLE IF EXISTS public."report_execution_records";
DROP TABLE IF EXISTS public."report_schedules";
DROP TABLE IF EXISTS public."report_subscriptions";
DROP TABLE IF EXISTS public."reports";
