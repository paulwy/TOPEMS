-- C 类 NOT VALID 状态约束批量 VALIDATE（断言式，2026-11-24）
-- 判定依据：docs/database/not-valid-triage-2026-11-24.md / .json
-- 规则：逐条断言
--   1) 约束存在且 convalidated = false
--   2) 约束字面值集 == 期望值集（期望源自代码 DB_VALUES / 迁移声明）
--   3) ALTER TABLE ... VALIDATE CONSTRAINT 成功
-- 任一不满足即跳过并计数，绝不"能通过就盖章"
-- 幂等：已 convalidated 的计入 skip，可重复执行
-- 用法：psql -h /tmp -U air -d topems -v ON_ERROR_STOP=1 \
--        -f database/maintenance/20261124_validate_c_class_status_checks.sql

CREATE TEMP TABLE _batch_targets (schema_name text, table_name text, constraint_name text, expected text[]);

INSERT INTO _batch_targets (schema_name, table_name, constraint_name, expected) VALUES
  ('finance', 'financial_reports', 'ck_financial_reports_status_pair', '{}'::text[]),
  ('analytics', 'report_schedules', 'ck_report_schedules_status_standard', ARRAY['active', 'completed', 'failed', 'paused']::text[]),
  ('wms', 'outbound_orders', 'ck_outbound_orders_packing_status_standard', ARRAY['completed', 'in_progress', 'pending']::text[]),
  ('wms', 'outbound_orders', 'ck_outbound_orders_shipping_status_standard', ARRAY['completed', 'in_progress', 'pending']::text[]),
  ('wms', 'stock_take_items', 'ck_stock_take_items_adjustment_status_standard', ARRAY['completed', 'pending']::text[]),
  ('master_data', 'mdm_sla_incidents', 'mdm_sla_incidents_type_check', ARRAY['data_loss', 'degraded_performance', 'downtime', 'security_breach']::text[]),
  ('master_data', 'mdm_sla_incidents', 'mdm_sla_incidents_severity_check', ARRAY['critical', 'high', 'low', 'medium']::text[]),
  ('master_data', 'mdm_sla_configs', 'mdm_sla_configs_metric_check', ARRAY['availability', 'error_rate', 'latency']::text[]),
  ('qms', 'quality_inspections', 'ck_quality_inspections_status_standard', ARRAY['cancelled', 'completed', 'in_progress', 'pending', 'pending_audit', 'rejected']::text[]),
  ('bi', 'audit_logs', 'ck_audit_logs_status_standard', ARRAY['active', 'archived', 'error', 'failed', 'failure', 'inactive', 'not_found', 'pending', 'success', 'unknown']::text[]),
  ('crm', 'audit_logs', 'ck_audit_logs_status_standard', ARRAY['active', 'archived', 'error', 'failed', 'failure', 'inactive', 'not_found', 'pending', 'success', 'unknown']::text[]),
  ('erp', 'audit_logs', 'ck_audit_logs_status_standard', ARRAY['active', 'archived', 'error', 'failed', 'failure', 'inactive', 'not_found', 'pending', 'success', 'unknown']::text[]),
  ('hrm', 'audit_logs', 'ck_audit_logs_status_standard', ARRAY['active', 'archived', 'error', 'failed', 'failure', 'inactive', 'not_found', 'pending', 'success', 'unknown']::text[]),
  ('iam', 'audit_logs', 'ck_audit_logs_status_standard', ARRAY['active', 'archived', 'error', 'failed', 'failure', 'inactive', 'not_found', 'pending', 'success', 'unknown']::text[]),
  ('mes', 'audit_logs', 'ck_audit_logs_status_standard', ARRAY['active', 'archived', 'error', 'failed', 'failure', 'inactive', 'not_found', 'pending', 'success', 'unknown']::text[]),
  ('plugin_mes', 'audit_logs', 'ck_audit_logs_status_standard', ARRAY['active', 'archived', 'error', 'failed', 'failure', 'inactive', 'not_found', 'pending', 'success', 'unknown']::text[]),
  ('rs', 'audit_logs', 'ck_audit_logs_status_standard', ARRAY['active', 'archived', 'error', 'failed', 'failure', 'inactive', 'not_found', 'pending', 'success', 'unknown']::text[]),
  ('scm', 'audit_logs', 'ck_audit_logs_status_standard', ARRAY['active', 'archived', 'error', 'failed', 'failure', 'inactive', 'not_found', 'pending', 'success', 'unknown']::text[]),
  ('shared', 'audit_logs', 'ck_audit_logs_status_standard', ARRAY['active', 'archived', 'error', 'failed', 'failure', 'inactive', 'not_found', 'pending', 'success', 'unknown']::text[]),
  ('srm', 'audit_logs', 'ck_audit_logs_status_standard', ARRAY['active', 'archived', 'error', 'failed', 'failure', 'inactive', 'not_found', 'pending', 'success', 'unknown']::text[]),
  ('wms', 'audit_logs', 'ck_audit_logs_status_standard', ARRAY['active', 'archived', 'error', 'failed', 'failure', 'inactive', 'not_found', 'pending', 'success', 'unknown']::text[]),
  ('erp', 'erp_production_orders', 'ck_erp_erp_production_orders_status_standard', ARRAY['approved', 'cancelled', 'completed', 'in_progress', 'pending', 'released']::text[]),
  ('hrm', 'job_openings', 'ck_hrm_job_openings_status_standard', ARRAY['closed', 'draft', 'filled', 'in_progress', 'published']::text[]),
  ('hrm', 'candidates', 'ck_hrm_candidates_status_standard', ARRAY['hired', 'interviewing', 'new', 'offered', 'rejected', 'screening', 'withdrawn']::text[]),
  ('hrm', 'interviews', 'ck_hrm_interviews_status_standard', ARRAY['cancelled', 'completed', 'in_progress', 'scheduled']::text[]),
  ('hrm', 'performance_reviews', 'ck_hrm_performance_reviews_status_standard', ARRAY['approved', 'archived', 'completed', 'draft', 'manager_reviewed', 'pending', 'self_reviewed', 'submitted']::text[]),
  ('hrm', 'performance_goals', 'ck_hrm_performance_goals_status_standard', ARRAY['cancelled', 'completed', 'in_progress', 'pending']::text[]),
  ('hrm', 'salary_adjustments', 'ck_hrm_salary_adjustments_status_standard', ARRAY['approved', 'pending', 'rejected']::text[]),
  ('hrm', 'salary_adjustments', 'ck_hrm_salary_adjustments_approval_status_standard', ARRAY['approved', 'pending', 'rejected']::text[]),
  ('hrm', 'attendance_records', 'ck_hrm_attendance_records_status_standard', ARRAY['active', 'early_leave', 'late', 'normal']::text[]),
  ('hrm', 'payroll_runs', 'ck_hrm_payroll_runs_status_standard', ARRAY['calculated', 'draft', 'paid']::text[]),
  ('hrm', 'payroll_items', 'ck_hrm_payroll_items_status_standard', ARRAY['paid', 'pending']::text[]),
  ('finance', 'receivables', 'ck_finance_receivables_status_standard', ARRAY['approved', 'cancelled', 'draft', 'posted']::text[]),
  ('finance', 'payables', 'ck_finance_payables_status_standard', ARRAY['approved', 'cancelled', 'draft', 'posted']::text[]),
  ('erp', 'fin_reconciliations', 'ck_erp_fin_reconciliations_status_standard', ARRAY['approved', 'draft', 'matched', 'pending']::text[]),
  ('erp', 'payables', 'ck_erp_payables_status_standard', ARRAY['paid', 'pending']::text[]),
  ('finance', 'core_finance_periods', 'ck_core_finance_periods_status_standard', ARRAY['closed', 'closing', 'open']::text[])
;

DO $$
DECLARE
  r record;
  n_ok int := 0;
  n_skip int := 0;
  n_bad int := 0;
  def text;
  got text[];
  want text[];
  rel regclass;
BEGIN
  FOR r IN SELECT * FROM _batch_targets ORDER BY schema_name, table_name, constraint_name LOOP
    rel := format('%I.%I', r.schema_name, r.table_name)::regclass;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = r.constraint_name AND c.conrelid = rel) THEN
      RAISE NOTICE 'SKIP missing  %', r.constraint_name;
      n_skip := n_skip + 1;
      CONTINUE;
    END IF;

    IF (SELECT c.convalidated FROM pg_constraint c WHERE c.conname = r.constraint_name AND c.conrelid = rel) THEN
      RAISE NOTICE 'SKIP already  %', r.constraint_name;
      n_skip := n_skip + 1;
      CONTINUE;
    END IF;

    IF cardinality(r.expected) > 0 THEN
      SELECT pg_get_constraintdef(c.oid) INTO def FROM pg_constraint c WHERE c.conname = r.constraint_name AND c.conrelid = rel;
      SELECT array_agg(m[1] ORDER BY m[1]) INTO got FROM regexp_matches(def, '''([^'']+)''', 'g') AS m;
      SELECT array_agg(v ORDER BY v) INTO want FROM unnest(r.expected) AS v;
      IF got IS DISTINCT FROM want THEN
        RAISE NOTICE 'SKIP valueset  %  def=%', r.constraint_name, def;
        n_bad := n_bad + 1;
        CONTINUE;
      END IF;
    END IF;

    BEGIN
      EXECUTE format('ALTER TABLE %I.%I VALIDATE CONSTRAINT %I', r.schema_name, r.table_name, r.constraint_name);
      n_ok := n_ok + 1;
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'FAIL validate  %  err=%', r.constraint_name, SQLERRM;
      n_bad := n_bad + 1;
    END;
  END LOOP;

  RAISE NOTICE 'batch 完成: ok=%  skip=%  bad=%', n_ok, n_skip, n_bad;
END $$;

DROP TABLE _batch_targets;
