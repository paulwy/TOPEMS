-- 2026-09-01 活跃表归位：public → finance（finance 服务 search_path 含 finance，仅 finance 引用，全 0 行）
-- 背景：阶段0 归位遗漏——finance 业务表仍在 public 被活跃查询（fallback public），归位后 search_path 正常解析
-- 已验证：仅 finance 服务 SQL 引用、无显式 public.* 引用、finance schema 无同名冲突、全 0 行
-- 备份：database/backup/topems_pre_finance_rehome_*.dump

DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='erp_collection_records' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='finance' AND c.relname='erp_collection_records' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."erp_collection_records" SET SCHEMA finance';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='erp_payables' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='finance' AND c.relname='erp_payables' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."erp_payables" SET SCHEMA finance';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='erp_payment_records' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='finance' AND c.relname='erp_payment_records' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."erp_payment_records" SET SCHEMA finance';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='erp_receivables' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='finance' AND c.relname='erp_receivables' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."erp_receivables" SET SCHEMA finance';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='expenses' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='finance' AND c.relname='expenses' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."expenses" SET SCHEMA finance';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='payables' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='finance' AND c.relname='payables' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."payables" SET SCHEMA finance';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='receivables' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='finance' AND c.relname='receivables' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."receivables" SET SCHEMA finance';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='financial_reports' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='finance' AND c.relname='financial_reports' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."financial_reports" SET SCHEMA finance';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='mv_receivable_aging' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='finance' AND c.relname='mv_receivable_aging' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."mv_receivable_aging" SET SCHEMA finance';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='mv_voucher_summary' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='finance' AND c.relname='mv_voucher_summary' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."mv_voucher_summary" SET SCHEMA finance';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='finance_alert_configs_v52' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='finance' AND c.relname='finance_alert_configs_v52' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."finance_alert_configs_v52" SET SCHEMA finance';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='finance_alert_history_v52' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='finance' AND c.relname='finance_alert_history_v52' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."finance_alert_history_v52" SET SCHEMA finance';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='finance_anomaly_alerts_v52' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='finance' AND c.relname='finance_anomaly_alerts_v52' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."finance_anomaly_alerts_v52" SET SCHEMA finance';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='finance_audit_findings_v52' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='finance' AND c.relname='finance_audit_findings_v52' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."finance_audit_findings_v52" SET SCHEMA finance';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='finance_audit_rules_v52' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='finance' AND c.relname='finance_audit_rules_v52' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."finance_audit_rules_v52" SET SCHEMA finance';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='finance_budget_variances_v53' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='finance' AND c.relname='finance_budget_variances_v53' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."finance_budget_variances_v53" SET SCHEMA finance';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='finance_cash_flow_predictions_v53' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='finance' AND c.relname='finance_cash_flow_predictions_v53' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."finance_cash_flow_predictions_v53" SET SCHEMA finance';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='finance_detection_configs_v52' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='finance' AND c.relname='finance_detection_configs_v52' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."finance_detection_configs_v52" SET SCHEMA finance';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='finance_prediction_models_v53' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='finance' AND c.relname='finance_prediction_models_v53' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."finance_prediction_models_v53" SET SCHEMA finance';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='finance_u8_import_records' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='finance' AND c.relname='finance_u8_import_records' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."finance_u8_import_records" SET SCHEMA finance';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='finance_voucher_generation_rules' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='finance' AND c.relname='finance_voucher_generation_rules' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."finance_voucher_generation_rules" SET SCHEMA finance';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='finance_voucher_template_lines' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='finance' AND c.relname='finance_voucher_template_lines' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."finance_voucher_template_lines" SET SCHEMA finance';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='finance_voucher_templates' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='finance' AND c.relname='finance_voucher_templates' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."finance_voucher_templates" SET SCHEMA finance';
  END IF;
END $rehome$;
