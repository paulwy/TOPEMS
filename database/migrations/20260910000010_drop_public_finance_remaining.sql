-- 清理 public schema 中剩余的 finance 旧表（补充迁移）
-- 使用 CASCADE 处理外键依赖

DROP TABLE IF EXISTS public.core_finance_accounts CASCADE;
DROP TABLE IF EXISTS public.core_finance_voucher_lines CASCADE;

-- finance_v58 系列
DROP TABLE IF EXISTS public.finance_v58_cash_pools CASCADE;
DROP TABLE IF EXISTS public.finance_v58_forecast_results CASCADE;
DROP TABLE IF EXISTS public.finance_v58_forecast_scenarios CASCADE;
DROP TABLE IF EXISTS public.finance_v58_liquidity_targets CASCADE;
DROP TABLE IF EXISTS public.finance_v58_optimization_results CASCADE;
DROP TABLE IF EXISTS public.finance_v58_pool_allocations CASCADE;
DROP TABLE IF EXISTS public.finance_v58_pool_transfers CASCADE;

-- finance_v59 系列
DROP TABLE IF EXISTS public.finance_v59_credit_profiles CASCADE;
DROP TABLE IF EXISTS public.finance_v59_device_profiles CASCADE;
DROP TABLE IF EXISTS public.finance_v59_fraud_decisions CASCADE;
DROP TABLE IF EXISTS public.finance_v59_fraud_rules CASCADE;
DROP TABLE IF EXISTS public.finance_v59_fraud_signals CASCADE;
DROP TABLE IF EXISTS public.finance_v59_scoring_models CASCADE;
DROP TABLE IF EXISTS public.finance_v59_stress_results CASCADE;
DROP TABLE IF EXISTS public.finance_v59_stress_scenarios CASCADE;

-- finance_v60 系列
DROP TABLE IF EXISTS public.finance_v60_alert_channels CASCADE;
DROP TABLE IF EXISTS public.finance_v60_alert_rules CASCADE;
DROP TABLE IF EXISTS public.finance_v60_alerts CASCADE;
DROP TABLE IF EXISTS public.finance_v60_decision_results CASCADE;
DROP TABLE IF EXISTS public.finance_v60_decision_scenarios CASCADE;
DROP TABLE IF EXISTS public.finance_v60_schedule_dependencies CASCADE;
DROP TABLE IF EXISTS public.finance_v60_schedule_executions CASCADE;
DROP TABLE IF EXISTS public.finance_v60_schedule_tasks CASCADE;

-- 验证
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
