-- 2026-09-01 finance_v5x 影子表清理：public 残留 finance 历史版本表（代码经 search_path 用 finance schema 同名新表）
-- 已验证：40 张全部 0 行、仅 finance 服务引用（无跨服务 fallback）、无视图依赖
-- 备份：database/backup/topems_pre_finance_shadow_*.dump

DROP TABLE IF EXISTS public.finance_v54_review_workflows CASCADE;
DROP TABLE IF EXISTS public.finance_v55_reconciliation_results CASCADE;
DROP TABLE IF EXISTS public.finance_v56_tax_brackets CASCADE;
DROP TABLE IF EXISTS public.finance_v57_report_templates CASCADE;
DROP TABLE IF EXISTS public.finance_v54_risk_indicators CASCADE;
DROP TABLE IF EXISTS public.finance_v54_fraud_scores CASCADE;
DROP TABLE IF EXISTS public.finance_v55_payment_requests CASCADE;
DROP TABLE IF EXISTS public.finance_v56_tax_rates CASCADE;
DROP TABLE IF EXISTS public.finance_v54_review_results CASCADE;
DROP TABLE IF EXISTS public.finance_v56_tax_suggestions CASCADE;
DROP TABLE IF EXISTS public.finance_v54_fraud_rules CASCADE;
DROP TABLE IF EXISTS public.finance_v55_reconciliation_rules CASCADE;
DROP TABLE IF EXISTS public.finance_v55_invoice_items CASCADE;
DROP TABLE IF EXISTS public.finance_v56_tax_forms CASCADE;
DROP TABLE IF EXISTS public.finance_v56_tax_plans CASCADE;
DROP TABLE IF EXISTS public.finance_v56_tax_lines CASCADE;
DROP TABLE IF EXISTS public.finance_v54_risk_alerts CASCADE;
DROP TABLE IF EXISTS public.finance_v54_review_rules CASCADE;
DROP TABLE IF EXISTS public.finance_v55_invoices CASCADE;
DROP TABLE IF EXISTS public.finance_v55_payment_results CASCADE;
DROP TABLE IF EXISTS public.finance_v57_forecast_models CASCADE;
DROP TABLE IF EXISTS public.finance_v58_pool_allocations CASCADE;
DROP TABLE IF EXISTS public.finance_v58_liquidity_targets CASCADE;
DROP TABLE IF EXISTS public.finance_v57_analysis_dimensions CASCADE;
DROP TABLE IF EXISTS public.finance_v58_pool_transfers CASCADE;
DROP TABLE IF EXISTS public.finance_v57_generated_reports CASCADE;
DROP TABLE IF EXISTS public.finance_v57_analysis_results CASCADE;
DROP TABLE IF EXISTS public.finance_v58_cash_pools CASCADE;
DROP TABLE IF EXISTS public.finance_v59_fraud_signals CASCADE;
DROP TABLE IF EXISTS public.finance_v59_scoring_models CASCADE;
DROP TABLE IF EXISTS public.finance_v57_insights CASCADE;
DROP TABLE IF EXISTS public.finance_v58_forecast_scenarios CASCADE;
DROP TABLE IF EXISTS public.finance_v58_optimization_results CASCADE;
DROP TABLE IF EXISTS public.finance_v58_forecast_results CASCADE;
DROP TABLE IF EXISTS public.finance_v59_fraud_decisions CASCADE;
DROP TABLE IF EXISTS public.finance_v59_device_profiles CASCADE;
DROP TABLE IF EXISTS public.finance_v59_stress_scenarios CASCADE;
DROP TABLE IF EXISTS public.finance_v59_credit_profiles CASCADE;
DROP TABLE IF EXISTS public.finance_v59_stress_results CASCADE;
DROP TABLE IF EXISTS public.finance_v59_fraud_rules CASCADE;

-- 收尾：public 216 → 176（拆分阈值"最大 schema 表数"持续改善）
