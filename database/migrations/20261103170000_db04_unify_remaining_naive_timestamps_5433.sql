-- ============================================================
-- DB-04: 5433 恢复库剩余 naive timestamp → timestamptz 统一（421 列）
--
-- 背景：
--   DB-03（20261007000030）已统一 31 列；本批是 5433 恢复库剩余 421 列
--   （ehs 104 / lims 90 / qms 78 / public 52 / pdm 50 / finance 23 / rs 8 /
--    integration 6 / bi 5 / mobile 2 / erp 2 / flow 1）。
--
-- 关键实测（2026-11-03）：
--   * 421 列中 414 列空表（0 行），7 列有数据共 999 行：
--     public.core_login_logs.{login_time,created_at} (22+22)
--     public.core_roles.{created_at,updated_at} (14+14)
--     public.core_permissions.created_at (925)
--     qms.qa_eightd_reports.{created_at,updated_at} (1+1)
--   * 样本时间值 2026-10-08 04:55 UTC（北京 12:55）→ naive 值按 UTC 解释正确。
--
-- 幂等设计：每列独立 DO 块，仅当「列存在 且 atttypid 仍为 timestamp(without tz)」
-- 才 ALTER。空库重放 / 重复执行 / 部分列已 timestamptz 时均自动跳过。
-- NOT NULL 与 DEFAULT 由 ALTER COLUMN TYPE 自动保留。
-- ============================================================

SET lock_timeout = '5s';

-- bi.report_execution_records.completed_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'bi'
      AND t.relname = 'report_execution_records'
      AND a.attname = 'completed_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE bi.report_execution_records
      ALTER COLUMN completed_at TYPE timestamptz
      USING completed_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- bi.report_execution_records.started_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'bi'
      AND t.relname = 'report_execution_records'
      AND a.attname = 'started_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE bi.report_execution_records
      ALTER COLUMN started_at TYPE timestamptz
      USING started_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- bi.report_subscriptions.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'bi'
      AND t.relname = 'report_subscriptions'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE bi.report_subscriptions
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- bi.report_subscriptions.deleted_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'bi'
      AND t.relname = 'report_subscriptions'
      AND a.attname = 'deleted_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE bi.report_subscriptions
      ALTER COLUMN deleted_at TYPE timestamptz
      USING deleted_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- bi.reports.last_run_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'bi'
      AND t.relname = 'reports'
      AND a.attname = 'last_run_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE bi.reports
      ALTER COLUMN last_run_at TYPE timestamptz
      USING last_run_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_accident_investigations.completed_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_accident_investigations'
      AND a.attname = 'completed_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_accident_investigations
      ALTER COLUMN completed_at TYPE timestamptz
      USING completed_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_accident_investigations.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_accident_investigations'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_accident_investigations
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_accident_investigations.started_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_accident_investigations'
      AND a.attname = 'started_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_accident_investigations
      ALTER COLUMN started_at TYPE timestamptz
      USING started_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_accident_investigations.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_accident_investigations'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_accident_investigations
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_accident_reviews.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_accident_reviews'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_accident_reviews
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_accident_reviews.reviewed_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_accident_reviews'
      AND a.attname = 'reviewed_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_accident_reviews
      ALTER COLUMN reviewed_at TYPE timestamptz
      USING reviewed_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_accident_treatments.completed_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_accident_treatments'
      AND a.attname = 'completed_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_accident_treatments
      ALTER COLUMN completed_at TYPE timestamptz
      USING completed_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_accident_treatments.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_accident_treatments'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_accident_treatments
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_accident_treatments.started_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_accident_treatments'
      AND a.attname = 'started_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_accident_treatments
      ALTER COLUMN started_at TYPE timestamptz
      USING started_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_accident_treatments.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_accident_treatments'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_accident_treatments
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_accidents.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_accidents'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_accidents
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_accidents.occurred_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_accidents'
      AND a.attname = 'occurred_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_accidents
      ALTER COLUMN occurred_at TYPE timestamptz
      USING occurred_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_accidents.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_accidents'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_accidents
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_compliance_evaluations.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_compliance_evaluations'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_compliance_evaluations
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_compliance_evaluations.evaluated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_compliance_evaluations'
      AND a.attname = 'evaluated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_compliance_evaluations
      ALTER COLUMN evaluated_at TYPE timestamptz
      USING evaluated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_compliance_evaluations.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_compliance_evaluations'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_compliance_evaluations
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_compliance_items.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_compliance_items'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_compliance_items
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_contraindications.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_contraindications'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_contraindications
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_contraindications.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_contraindications'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_contraindications
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_detection_records.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_detection_records'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_detection_records
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_detection_records.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_detection_records'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_detection_records
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_discharge_permits.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_discharge_permits'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_discharge_permits
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_discharge_permits.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_discharge_permits'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_discharge_permits
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_disease_cases.closed_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_disease_cases'
      AND a.attname = 'closed_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_disease_cases
      ALTER COLUMN closed_at TYPE timestamptz
      USING closed_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_disease_cases.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_disease_cases'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_disease_cases
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_disease_cases.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_disease_cases'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_disease_cases
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_drill_evaluations.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_drill_evaluations'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_drill_evaluations
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_drill_evaluations.evaluated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_drill_evaluations'
      AND a.attname = 'evaluated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_drill_evaluations
      ALTER COLUMN evaluated_at TYPE timestamptz
      USING evaluated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_drill_plans.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_drill_plans'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_drill_plans
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_drill_plans.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_drill_plans'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_drill_plans
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_drill_problems.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_drill_problems'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_drill_problems
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_drill_problems.rectified_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_drill_problems'
      AND a.attname = 'rectified_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_drill_problems
      ALTER COLUMN rectified_at TYPE timestamptz
      USING rectified_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_drill_problems.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_drill_problems'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_drill_problems
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_drill_problems.verified_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_drill_problems'
      AND a.attname = 'verified_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_drill_problems
      ALTER COLUMN verified_at TYPE timestamptz
      USING verified_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_drill_records.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_drill_records'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_drill_records
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_drill_records.ended_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_drill_records'
      AND a.attname = 'ended_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_drill_records
      ALTER COLUMN ended_at TYPE timestamptz
      USING ended_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_drill_records.started_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_drill_records'
      AND a.attname = 'started_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_drill_records
      ALTER COLUMN started_at TYPE timestamptz
      USING started_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_drill_records.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_drill_records'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_drill_records
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_emergency_plan_approvals.approved_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_emergency_plan_approvals'
      AND a.attname = 'approved_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_emergency_plan_approvals
      ALTER COLUMN approved_at TYPE timestamptz
      USING approved_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_emergency_plan_approvals.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_emergency_plan_approvals'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_emergency_plan_approvals
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_emergency_plan_supplies.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_emergency_plan_supplies'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_emergency_plan_supplies
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_emergency_plan_versions.changed_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_emergency_plan_versions'
      AND a.attname = 'changed_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_emergency_plan_versions
      ALTER COLUMN changed_at TYPE timestamptz
      USING changed_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_emergency_plan_versions.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_emergency_plan_versions'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_emergency_plan_versions
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_emergency_plans.approved_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_emergency_plans'
      AND a.attname = 'approved_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_emergency_plans
      ALTER COLUMN approved_at TYPE timestamptz
      USING approved_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_emergency_plans.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_emergency_plans'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_emergency_plans
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_emergency_plans.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_emergency_plans'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_emergency_plans
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_employees.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_employees'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_employees
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_employees.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_employees'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_employees
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_env_monitor_records.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_env_monitor_records'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_env_monitor_records
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_env_monitor_records.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_env_monitor_records'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_env_monitor_records
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_environment.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_environment'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_environment
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_environment.monitored_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_environment'
      AND a.attname = 'monitored_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_environment
      ALTER COLUMN monitored_at TYPE timestamptz
      USING monitored_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_environment.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_environment'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_environment
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_environment_incidents.closed_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_environment_incidents'
      AND a.attname = 'closed_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_environment_incidents
      ALTER COLUMN closed_at TYPE timestamptz
      USING closed_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_environment_incidents.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_environment_incidents'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_environment_incidents
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_environment_incidents.occurred_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_environment_incidents'
      AND a.attname = 'occurred_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_environment_incidents
      ALTER COLUMN occurred_at TYPE timestamptz
      USING occurred_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_environment_incidents.reported_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_environment_incidents'
      AND a.attname = 'reported_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_environment_incidents
      ALTER COLUMN reported_at TYPE timestamptz
      USING reported_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_environment_incidents.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_environment_incidents'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_environment_incidents
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_environmental_regulations.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_environmental_regulations'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_environmental_regulations
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_environmental_regulations.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_environmental_regulations'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_environmental_regulations
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_hazard_factors.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_hazard_factors'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_hazard_factors
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_hazard_factors.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_hazard_factors'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_hazard_factors
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_hazard_rectifications.completed_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_hazard_rectifications'
      AND a.attname = 'completed_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_hazard_rectifications
      ALTER COLUMN completed_at TYPE timestamptz
      USING completed_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_hazard_rectifications.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_hazard_rectifications'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_hazard_rectifications
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_hazard_rectifications.started_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_hazard_rectifications'
      AND a.attname = 'started_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_hazard_rectifications
      ALTER COLUMN started_at TYPE timestamptz
      USING started_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_hazard_rectifications.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_hazard_rectifications'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_hazard_rectifications
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_hazard_verifications.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_hazard_verifications'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_hazard_verifications
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_hazard_verifications.verified_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_hazard_verifications'
      AND a.attname = 'verified_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_hazard_verifications
      ALTER COLUMN verified_at TYPE timestamptz
      USING verified_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_hazardous_materials.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_hazardous_materials'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_hazardous_materials
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_hazardous_materials.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_hazardous_materials'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_hazardous_materials
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_hazards.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_hazards'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_hazards
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_hazards.reported_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_hazards'
      AND a.attname = 'reported_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_hazards
      ALTER COLUMN reported_at TYPE timestamptz
      USING reported_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_hazards.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_hazards'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_hazards
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_health_abnormalities.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_health_abnormalities'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_health_abnormalities
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_health_abnormalities.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_health_abnormalities'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_health_abnormalities
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_health_exam_plans.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_health_exam_plans'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_health_exam_plans
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_health_exam_plans.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_health_exam_plans'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_health_exam_plans
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_health_exam_records.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_health_exam_records'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_health_exam_records
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_health_exam_records.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_health_exam_records'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_health_exam_records
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_health_trainings.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_health_trainings'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_health_trainings
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_health_trainings.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_health_trainings'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_health_trainings
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_inspection_items.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_inspection_items'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_inspection_items
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_inspection_items.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_inspection_items'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_inspection_items
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_inspection_plans.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_inspection_plans'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_inspection_plans
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_inspection_plans.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_inspection_plans'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_inspection_plans
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_inspection_record_items.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_inspection_record_items'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_inspection_record_items
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_inspection_records.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_inspection_records'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_inspection_records
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_inspection_records.inspected_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_inspection_records'
      AND a.attname = 'inspected_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_inspection_records
      ALTER COLUMN inspected_at TYPE timestamptz
      USING inspected_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_inspection_records.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_inspection_records'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_inspection_records
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_material_stocks.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_material_stocks'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_material_stocks
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_material_stocks.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_material_stocks'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_material_stocks
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_msds.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_msds'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_msds
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_protection_measures.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_protection_measures'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_protection_measures
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_protection_measures.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_protection_measures'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_protection_measures
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_risks.assessed_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_risks'
      AND a.attname = 'assessed_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_risks
      ALTER COLUMN assessed_at TYPE timestamptz
      USING assessed_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_risks.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_risks'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_risks
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_risks.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_risks'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_risks
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_stock_records.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_stock_records'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_stock_records
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_stock_records.operation_time
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_stock_records'
      AND a.attname = 'operation_time'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_stock_records
      ALTER COLUMN operation_time TYPE timestamptz
      USING operation_time AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_sync_records.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_sync_records'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_sync_records
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_sync_records.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_sync_records'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_sync_records
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_trainings.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_trainings'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_trainings
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_trainings.scheduled_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_trainings'
      AND a.attname = 'scheduled_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_trainings
      ALTER COLUMN scheduled_at TYPE timestamptz
      USING scheduled_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- ehs.qa_ehs_trainings.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs'
      AND t.relname = 'qa_ehs_trainings'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE ehs.qa_ehs_trainings
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- erp.leave_requests.deleted_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'erp'
      AND t.relname = 'leave_requests'
      AND a.attname = 'deleted_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE erp.leave_requests
      ALTER COLUMN deleted_at TYPE timestamptz
      USING deleted_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- erp.vehicles.last_service
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'erp'
      AND t.relname = 'vehicles'
      AND a.attname = 'last_service'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE erp.vehicles
      ALTER COLUMN last_service TYPE timestamptz
      USING last_service AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- finance.core_finance_approval_workflows.approved_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'finance'
      AND t.relname = 'core_finance_approval_workflows'
      AND a.attname = 'approved_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE finance.core_finance_approval_workflows
      ALTER COLUMN approved_at TYPE timestamptz
      USING approved_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- finance.core_finance_approval_workflows.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'finance'
      AND t.relname = 'core_finance_approval_workflows'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE finance.core_finance_approval_workflows
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- finance.core_finance_approval_workflows.rejected_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'finance'
      AND t.relname = 'core_finance_approval_workflows'
      AND a.attname = 'rejected_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE finance.core_finance_approval_workflows
      ALTER COLUMN rejected_at TYPE timestamptz
      USING rejected_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- finance.core_finance_approval_workflows.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'finance'
      AND t.relname = 'core_finance_approval_workflows'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE finance.core_finance_approval_workflows
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- finance.core_finance_ledger.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'finance'
      AND t.relname = 'core_finance_ledger'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE finance.core_finance_ledger
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- finance.core_finance_ledger.deleted_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'finance'
      AND t.relname = 'core_finance_ledger'
      AND a.attname = 'deleted_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE finance.core_finance_ledger
      ALTER COLUMN deleted_at TYPE timestamptz
      USING deleted_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- finance.core_finance_ledger.voucher_date
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'finance'
      AND t.relname = 'core_finance_ledger'
      AND a.attname = 'voucher_date'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE finance.core_finance_ledger
      ALTER COLUMN voucher_date TYPE timestamptz
      USING voucher_date AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- finance.core_finance_periods.closed_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'finance'
      AND t.relname = 'core_finance_periods'
      AND a.attname = 'closed_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE finance.core_finance_periods
      ALTER COLUMN closed_at TYPE timestamptz
      USING closed_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- finance.core_finance_periods.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'finance'
      AND t.relname = 'core_finance_periods'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE finance.core_finance_periods
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- finance.core_finance_periods.end_date
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'finance'
      AND t.relname = 'core_finance_periods'
      AND a.attname = 'end_date'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE finance.core_finance_periods
      ALTER COLUMN end_date TYPE timestamptz
      USING end_date AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- finance.core_finance_periods.start_date
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'finance'
      AND t.relname = 'core_finance_periods'
      AND a.attname = 'start_date'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE finance.core_finance_periods
      ALTER COLUMN start_date TYPE timestamptz
      USING start_date AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- finance.core_finance_periods.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'finance'
      AND t.relname = 'core_finance_periods'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE finance.core_finance_periods
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- finance.core_finance_reconciliation_items.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'finance'
      AND t.relname = 'core_finance_reconciliation_items'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE finance.core_finance_reconciliation_items
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- finance.core_finance_reconciliation_items.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'finance'
      AND t.relname = 'core_finance_reconciliation_items'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE finance.core_finance_reconciliation_items
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- finance.core_finance_reconciliation_sessions.completed_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'finance'
      AND t.relname = 'core_finance_reconciliation_sessions'
      AND a.attname = 'completed_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE finance.core_finance_reconciliation_sessions
      ALTER COLUMN completed_at TYPE timestamptz
      USING completed_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- finance.core_finance_reconciliation_sessions.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'finance'
      AND t.relname = 'core_finance_reconciliation_sessions'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE finance.core_finance_reconciliation_sessions
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- finance.core_finance_reconciliation_sessions.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'finance'
      AND t.relname = 'core_finance_reconciliation_sessions'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE finance.core_finance_reconciliation_sessions
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- finance.core_finance_voucher_lines.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'finance'
      AND t.relname = 'core_finance_voucher_lines'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE finance.core_finance_voucher_lines
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- finance.core_finance_vouchers.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'finance'
      AND t.relname = 'core_finance_vouchers'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE finance.core_finance_vouchers
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- finance.core_finance_vouchers.deleted_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'finance'
      AND t.relname = 'core_finance_vouchers'
      AND a.attname = 'deleted_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE finance.core_finance_vouchers
      ALTER COLUMN deleted_at TYPE timestamptz
      USING deleted_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- finance.core_finance_vouchers.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'finance'
      AND t.relname = 'core_finance_vouchers'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE finance.core_finance_vouchers
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- finance.core_finance_vouchers.voucher_date
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'finance'
      AND t.relname = 'core_finance_vouchers'
      AND a.attname = 'voucher_date'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE finance.core_finance_vouchers
      ALTER COLUMN voucher_date TYPE timestamptz
      USING voucher_date AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- finance.finance_control_points.deleted_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'finance'
      AND t.relname = 'finance_control_points'
      AND a.attname = 'deleted_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE finance.finance_control_points
      ALTER COLUMN deleted_at TYPE timestamptz
      USING deleted_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- flow.core_workflows.deleted_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'flow'
      AND t.relname = 'core_workflows'
      AND a.attname = 'deleted_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE flow.core_workflows
      ALTER COLUMN deleted_at TYPE timestamptz
      USING deleted_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- integration.conversion_executions.completed_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'integration'
      AND t.relname = 'conversion_executions'
      AND a.attname = 'completed_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE integration.conversion_executions
      ALTER COLUMN completed_at TYPE timestamptz
      USING completed_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- integration.conversion_executions.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'integration'
      AND t.relname = 'conversion_executions'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE integration.conversion_executions
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- integration.conversion_executions.started_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'integration'
      AND t.relname = 'conversion_executions'
      AND a.attname = 'started_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE integration.conversion_executions
      ALTER COLUMN started_at TYPE timestamptz
      USING started_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- integration.conversion_rules.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'integration'
      AND t.relname = 'conversion_rules'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE integration.conversion_rules
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- integration.conversion_rules.deleted_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'integration'
      AND t.relname = 'conversion_rules'
      AND a.attname = 'deleted_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE integration.conversion_rules
      ALTER COLUMN deleted_at TYPE timestamptz
      USING deleted_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- integration.conversion_rules.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'integration'
      AND t.relname = 'conversion_rules'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE integration.conversion_rules
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lab_calibration_records.calibration_date
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lab_calibration_records'
      AND a.attname = 'calibration_date'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lab_calibration_records
      ALTER COLUMN calibration_date TYPE timestamptz
      USING calibration_date AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lab_calibration_records.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lab_calibration_records'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lab_calibration_records
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lab_calibration_records.next_calibration_date
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lab_calibration_records'
      AND a.attname = 'next_calibration_date'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lab_calibration_records
      ALTER COLUMN next_calibration_date TYPE timestamptz
      USING next_calibration_date AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lab_inspection_reports.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lab_inspection_reports'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lab_inspection_reports
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lab_inspection_reports.inspection_date
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lab_inspection_reports'
      AND a.attname = 'inspection_date'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lab_inspection_reports
      ALTER COLUMN inspection_date TYPE timestamptz
      USING inspection_date AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lab_inspection_reports.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lab_inspection_reports'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lab_inspection_reports
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lab_instruments.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lab_instruments'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lab_instruments
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lab_instruments.deleted_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lab_instruments'
      AND a.attname = 'deleted_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lab_instruments
      ALTER COLUMN deleted_at TYPE timestamptz
      USING deleted_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lab_instruments.last_calibration_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lab_instruments'
      AND a.attname = 'last_calibration_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lab_instruments
      ALTER COLUMN last_calibration_at TYPE timestamptz
      USING last_calibration_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lab_instruments.next_calibration_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lab_instruments'
      AND a.attname = 'next_calibration_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lab_instruments
      ALTER COLUMN next_calibration_at TYPE timestamptz
      USING next_calibration_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lab_instruments.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lab_instruments'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lab_instruments
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lab_processes.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lab_processes'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lab_processes
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lab_processes.deleted_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lab_processes'
      AND a.attname = 'deleted_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lab_processes
      ALTER COLUMN deleted_at TYPE timestamptz
      USING deleted_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lab_processes.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lab_processes'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lab_processes
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lab_reagent_alerts.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lab_reagent_alerts'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lab_reagent_alerts
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lab_reagent_alerts.resolved_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lab_reagent_alerts'
      AND a.attname = 'resolved_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lab_reagent_alerts
      ALTER COLUMN resolved_at TYPE timestamptz
      USING resolved_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lab_reagent_history.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lab_reagent_history'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lab_reagent_history
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lab_reagents.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lab_reagents'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lab_reagents
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lab_reagents.deleted_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lab_reagents'
      AND a.attname = 'deleted_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lab_reagents
      ALTER COLUMN deleted_at TYPE timestamptz
      USING deleted_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lab_reagents.expired_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lab_reagents'
      AND a.attname = 'expired_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lab_reagents
      ALTER COLUMN expired_at TYPE timestamptz
      USING expired_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lab_reagents.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lab_reagents'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lab_reagents
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lab_records.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lab_records'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lab_records
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lab_records.deleted_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lab_records'
      AND a.attname = 'deleted_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lab_records
      ALTER COLUMN deleted_at TYPE timestamptz
      USING deleted_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lab_records.recorded_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lab_records'
      AND a.attname = 'recorded_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lab_records
      ALTER COLUMN recorded_at TYPE timestamptz
      USING recorded_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lab_sample_lifecycle.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lab_sample_lifecycle'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lab_sample_lifecycle
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lims_audit_logs.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lims_audit_logs'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lims_audit_logs
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lims_barcode_scan_records.scanned_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lims_barcode_scan_records'
      AND a.attname = 'scanned_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lims_barcode_scan_records
      ALTER COLUMN scanned_at TYPE timestamptz
      USING scanned_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lims_collection_tasks.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lims_collection_tasks'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lims_collection_tasks
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lims_collection_tasks.deleted_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lims_collection_tasks'
      AND a.attname = 'deleted_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lims_collection_tasks
      ALTER COLUMN deleted_at TYPE timestamptz
      USING deleted_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lims_collection_tasks.last_run_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lims_collection_tasks'
      AND a.attname = 'last_run_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lims_collection_tasks
      ALTER COLUMN last_run_at TYPE timestamptz
      USING last_run_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lims_collection_tasks.next_run_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lims_collection_tasks'
      AND a.attname = 'next_run_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lims_collection_tasks
      ALTER COLUMN next_run_at TYPE timestamptz
      USING next_run_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lims_collection_tasks.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lims_collection_tasks'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lims_collection_tasks
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lims_instrument_data.collected_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lims_instrument_data'
      AND a.attname = 'collected_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lims_instrument_data
      ALTER COLUMN collected_at TYPE timestamptz
      USING collected_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lims_instrument_data.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lims_instrument_data'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lims_instrument_data
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lims_instrument_data.deleted_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lims_instrument_data'
      AND a.attname = 'deleted_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lims_instrument_data
      ALTER COLUMN deleted_at TYPE timestamptz
      USING deleted_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lims_instrument_data.parsed_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lims_instrument_data'
      AND a.attname = 'parsed_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lims_instrument_data
      ALTER COLUMN parsed_at TYPE timestamptz
      USING parsed_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lims_instrument_data.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lims_instrument_data'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lims_instrument_data
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lims_method_categories.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lims_method_categories'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lims_method_categories
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lims_method_categories.deleted_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lims_method_categories'
      AND a.attname = 'deleted_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lims_method_categories
      ALTER COLUMN deleted_at TYPE timestamptz
      USING deleted_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lims_method_categories.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lims_method_categories'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lims_method_categories
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lims_method_validations.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lims_method_validations'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lims_method_validations
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lims_method_validations.validation_date
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lims_method_validations'
      AND a.attname = 'validation_date'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lims_method_validations
      ALTER COLUMN validation_date TYPE timestamptz
      USING validation_date AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lims_method_versions.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lims_method_versions'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lims_method_versions
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lims_parse_rules.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lims_parse_rules'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lims_parse_rules
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lims_parse_rules.deleted_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lims_parse_rules'
      AND a.attname = 'deleted_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lims_parse_rules
      ALTER COLUMN deleted_at TYPE timestamptz
      USING deleted_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lims_parse_rules.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lims_parse_rules'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lims_parse_rules
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lims_pt_corrective_actions.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lims_pt_corrective_actions'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lims_pt_corrective_actions
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lims_pt_corrective_actions.deadline
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lims_pt_corrective_actions'
      AND a.attname = 'deadline'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lims_pt_corrective_actions
      ALTER COLUMN deadline TYPE timestamptz
      USING deadline AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lims_pt_corrective_actions.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lims_pt_corrective_actions'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lims_pt_corrective_actions
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lims_pt_corrective_actions.verified_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lims_pt_corrective_actions'
      AND a.attname = 'verified_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lims_pt_corrective_actions
      ALTER COLUMN verified_at TYPE timestamptz
      USING verified_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lims_pt_evaluations.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lims_pt_evaluations'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lims_pt_evaluations
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lims_pt_evaluations.evaluated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lims_pt_evaluations'
      AND a.attname = 'evaluated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lims_pt_evaluations
      ALTER COLUMN evaluated_at TYPE timestamptz
      USING evaluated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lims_pt_plans.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lims_pt_plans'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lims_pt_plans
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lims_pt_plans.deleted_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lims_pt_plans'
      AND a.attname = 'deleted_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lims_pt_plans
      ALTER COLUMN deleted_at TYPE timestamptz
      USING deleted_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lims_pt_plans.registration_date
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lims_pt_plans'
      AND a.attname = 'registration_date'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lims_pt_plans
      ALTER COLUMN registration_date TYPE timestamptz
      USING registration_date AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lims_pt_plans.report_deadline
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lims_pt_plans'
      AND a.attname = 'report_deadline'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lims_pt_plans
      ALTER COLUMN report_deadline TYPE timestamptz
      USING report_deadline AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lims_pt_plans.test_deadline
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lims_pt_plans'
      AND a.attname = 'test_deadline'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lims_pt_plans
      ALTER COLUMN test_deadline TYPE timestamptz
      USING test_deadline AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lims_pt_plans.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lims_pt_plans'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lims_pt_plans
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lims_pt_results.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lims_pt_results'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lims_pt_results
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lims_pt_results.submitted_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lims_pt_results'
      AND a.attname = 'submitted_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lims_pt_results
      ALTER COLUMN submitted_at TYPE timestamptz
      USING submitted_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lims_pt_results.test_date
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lims_pt_results'
      AND a.attname = 'test_date'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lims_pt_results
      ALTER COLUMN test_date TYPE timestamptz
      USING test_date AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lims_pt_results.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lims_pt_results'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lims_pt_results
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lims_pt_samples.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lims_pt_samples'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lims_pt_samples
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lims_pt_samples.received_date
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lims_pt_samples'
      AND a.attname = 'received_date'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lims_pt_samples
      ALTER COLUMN received_date TYPE timestamptz
      USING received_date AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lims_rfid_tags.assigned_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lims_rfid_tags'
      AND a.attname = 'assigned_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lims_rfid_tags
      ALTER COLUMN assigned_at TYPE timestamptz
      USING assigned_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lims_rfid_tags.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lims_rfid_tags'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lims_rfid_tags
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lims_rfid_tags.deleted_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lims_rfid_tags'
      AND a.attname = 'deleted_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lims_rfid_tags
      ALTER COLUMN deleted_at TYPE timestamptz
      USING deleted_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lims_rfid_tags.last_read_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lims_rfid_tags'
      AND a.attname = 'last_read_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lims_rfid_tags
      ALTER COLUMN last_read_at TYPE timestamptz
      USING last_read_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lims_rfid_tags.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lims_rfid_tags'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lims_rfid_tags
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lims_sample_barcodes.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lims_sample_barcodes'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lims_sample_barcodes
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lims_sample_barcodes.deleted_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lims_sample_barcodes'
      AND a.attname = 'deleted_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lims_sample_barcodes
      ALTER COLUMN deleted_at TYPE timestamptz
      USING deleted_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lims_sample_barcodes.generated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lims_sample_barcodes'
      AND a.attname = 'generated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lims_sample_barcodes
      ALTER COLUMN generated_at TYPE timestamptz
      USING generated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lims_sample_barcodes.last_printed_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lims_sample_barcodes'
      AND a.attname = 'last_printed_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lims_sample_barcodes
      ALTER COLUMN last_printed_at TYPE timestamptz
      USING last_printed_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lims_sample_barcodes.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lims_sample_barcodes'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lims_sample_barcodes
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lims_sync_records.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lims_sync_records'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lims_sync_records
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lims_sync_records.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lims_sync_records'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lims_sync_records
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lims_test_methods.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lims_test_methods'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lims_test_methods
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lims_test_methods.deleted_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lims_test_methods'
      AND a.attname = 'deleted_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lims_test_methods
      ALTER COLUMN deleted_at TYPE timestamptz
      USING deleted_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lims_test_methods.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lims_test_methods'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lims_test_methods
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lims_test_methods.validated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lims_test_methods'
      AND a.attname = 'validated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lims_test_methods
      ALTER COLUMN validated_at TYPE timestamptz
      USING validated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lims_uncertainty_components.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lims_uncertainty_components'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lims_uncertainty_components
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lims_uncertainty_components.deleted_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lims_uncertainty_components'
      AND a.attname = 'deleted_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lims_uncertainty_components
      ALTER COLUMN deleted_at TYPE timestamptz
      USING deleted_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lims_uncertainty_components.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lims_uncertainty_components'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lims_uncertainty_components
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lims_uncertainty_projects.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lims_uncertainty_projects'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lims_uncertainty_projects
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lims_uncertainty_projects.deleted_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lims_uncertainty_projects'
      AND a.attname = 'deleted_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lims_uncertainty_projects
      ALTER COLUMN deleted_at TYPE timestamptz
      USING deleted_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lims_uncertainty_projects.evaluation_date
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lims_uncertainty_projects'
      AND a.attname = 'evaluation_date'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lims_uncertainty_projects
      ALTER COLUMN evaluation_date TYPE timestamptz
      USING evaluation_date AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lims_uncertainty_projects.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lims_uncertainty_projects'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lims_uncertainty_projects
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lims_uncertainty_sources.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lims_uncertainty_sources'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lims_uncertainty_sources
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lims_uncertainty_sources.deleted_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lims_uncertainty_sources'
      AND a.attname = 'deleted_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lims_uncertainty_sources
      ALTER COLUMN deleted_at TYPE timestamptz
      USING deleted_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- lims.qa_lims_uncertainty_sources.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lims'
      AND t.relname = 'qa_lims_uncertainty_sources'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE lims.qa_lims_uncertainty_sources
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- mobile.core_mobile_offline_records.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'mobile'
      AND t.relname = 'core_mobile_offline_records'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE mobile.core_mobile_offline_records
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- mobile.core_mobile_offline_records.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'mobile'
      AND t.relname = 'core_mobile_offline_records'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE mobile.core_mobile_offline_records
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- pdm.pdm_boms.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'pdm'
      AND t.relname = 'pdm_boms'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE pdm.pdm_boms
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- pdm.pdm_boms.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'pdm'
      AND t.relname = 'pdm_boms'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE pdm.pdm_boms
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- pdm.pdm_change_notices.approved_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'pdm'
      AND t.relname = 'pdm_change_notices'
      AND a.attname = 'approved_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE pdm.pdm_change_notices
      ALTER COLUMN approved_at TYPE timestamptz
      USING approved_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- pdm.pdm_change_notices.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'pdm'
      AND t.relname = 'pdm_change_notices'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE pdm.pdm_change_notices
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- pdm.pdm_change_notices.deleted_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'pdm'
      AND t.relname = 'pdm_change_notices'
      AND a.attname = 'deleted_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE pdm.pdm_change_notices
      ALTER COLUMN deleted_at TYPE timestamptz
      USING deleted_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- pdm.pdm_change_notices.effective_date
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'pdm'
      AND t.relname = 'pdm_change_notices'
      AND a.attname = 'effective_date'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE pdm.pdm_change_notices
      ALTER COLUMN effective_date TYPE timestamptz
      USING effective_date AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- pdm.pdm_change_notices.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'pdm'
      AND t.relname = 'pdm_change_notices'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE pdm.pdm_change_notices
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- pdm.pdm_configurations.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'pdm'
      AND t.relname = 'pdm_configurations'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE pdm.pdm_configurations
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- pdm.pdm_configurations.deleted_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'pdm'
      AND t.relname = 'pdm_configurations'
      AND a.attname = 'deleted_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE pdm.pdm_configurations
      ALTER COLUMN deleted_at TYPE timestamptz
      USING deleted_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- pdm.pdm_configurations.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'pdm'
      AND t.relname = 'pdm_configurations'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE pdm.pdm_configurations
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- pdm.pdm_document_versions.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'pdm'
      AND t.relname = 'pdm_document_versions'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE pdm.pdm_document_versions
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- pdm.pdm_document_versions.deleted_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'pdm'
      AND t.relname = 'pdm_document_versions'
      AND a.attname = 'deleted_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE pdm.pdm_document_versions
      ALTER COLUMN deleted_at TYPE timestamptz
      USING deleted_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- pdm.pdm_document_versions.published_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'pdm'
      AND t.relname = 'pdm_document_versions'
      AND a.attname = 'published_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE pdm.pdm_document_versions
      ALTER COLUMN published_at TYPE timestamptz
      USING published_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- pdm.pdm_document_versions.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'pdm'
      AND t.relname = 'pdm_document_versions'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE pdm.pdm_document_versions
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- pdm.pdm_documents.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'pdm'
      AND t.relname = 'pdm_documents'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE pdm.pdm_documents
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- pdm.pdm_documents.deleted_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'pdm'
      AND t.relname = 'pdm_documents'
      AND a.attname = 'deleted_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE pdm.pdm_documents
      ALTER COLUMN deleted_at TYPE timestamptz
      USING deleted_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- pdm.pdm_documents.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'pdm'
      AND t.relname = 'pdm_documents'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE pdm.pdm_documents
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- pdm.pdm_materials.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'pdm'
      AND t.relname = 'pdm_materials'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE pdm.pdm_materials
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- pdm.pdm_materials.deleted_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'pdm'
      AND t.relname = 'pdm_materials'
      AND a.attname = 'deleted_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE pdm.pdm_materials
      ALTER COLUMN deleted_at TYPE timestamptz
      USING deleted_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- pdm.pdm_materials.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'pdm'
      AND t.relname = 'pdm_materials'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE pdm.pdm_materials
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- pdm.pdm_production_batches.deleted_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'pdm'
      AND t.relname = 'pdm_production_batches'
      AND a.attname = 'deleted_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE pdm.pdm_production_batches
      ALTER COLUMN deleted_at TYPE timestamptz
      USING deleted_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- pdm.pdm_production_batches.end_date
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'pdm'
      AND t.relname = 'pdm_production_batches'
      AND a.attname = 'end_date'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE pdm.pdm_production_batches
      ALTER COLUMN end_date TYPE timestamptz
      USING end_date AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- pdm.pdm_production_batches.start_date
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'pdm'
      AND t.relname = 'pdm_production_batches'
      AND a.attname = 'start_date'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE pdm.pdm_production_batches
      ALTER COLUMN start_date TYPE timestamptz
      USING start_date AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- pdm.pdm_production_formulas.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'pdm'
      AND t.relname = 'pdm_production_formulas'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE pdm.pdm_production_formulas
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- pdm.pdm_production_formulas.deleted_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'pdm'
      AND t.relname = 'pdm_production_formulas'
      AND a.attname = 'deleted_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE pdm.pdm_production_formulas
      ALTER COLUMN deleted_at TYPE timestamptz
      USING deleted_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- pdm.pdm_production_formulas.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'pdm'
      AND t.relname = 'pdm_production_formulas'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE pdm.pdm_production_formulas
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- pdm.pdm_production_processes.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'pdm'
      AND t.relname = 'pdm_production_processes'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE pdm.pdm_production_processes
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- pdm.pdm_production_processes.deleted_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'pdm'
      AND t.relname = 'pdm_production_processes'
      AND a.attname = 'deleted_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE pdm.pdm_production_processes
      ALTER COLUMN deleted_at TYPE timestamptz
      USING deleted_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- pdm.pdm_production_processes.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'pdm'
      AND t.relname = 'pdm_production_processes'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE pdm.pdm_production_processes
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- pdm.pdm_production_steps.deleted_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'pdm'
      AND t.relname = 'pdm_production_steps'
      AND a.attname = 'deleted_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE pdm.pdm_production_steps
      ALTER COLUMN deleted_at TYPE timestamptz
      USING deleted_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- pdm.pdm_products.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'pdm'
      AND t.relname = 'pdm_products'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE pdm.pdm_products
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- pdm.pdm_products.deleted_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'pdm'
      AND t.relname = 'pdm_products'
      AND a.attname = 'deleted_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE pdm.pdm_products
      ALTER COLUMN deleted_at TYPE timestamptz
      USING deleted_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- pdm.pdm_products.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'pdm'
      AND t.relname = 'pdm_products'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE pdm.pdm_products
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- pdm.pdm_project_members.joined_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'pdm'
      AND t.relname = 'pdm_project_members'
      AND a.attname = 'joined_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE pdm.pdm_project_members
      ALTER COLUMN joined_at TYPE timestamptz
      USING joined_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- pdm.pdm_project_members.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'pdm'
      AND t.relname = 'pdm_project_members'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE pdm.pdm_project_members
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- pdm.pdm_project_phases.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'pdm'
      AND t.relname = 'pdm_project_phases'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE pdm.pdm_project_phases
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- pdm.pdm_project_phases.end_date
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'pdm'
      AND t.relname = 'pdm_project_phases'
      AND a.attname = 'end_date'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE pdm.pdm_project_phases
      ALTER COLUMN end_date TYPE timestamptz
      USING end_date AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- pdm.pdm_project_phases.start_date
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'pdm'
      AND t.relname = 'pdm_project_phases'
      AND a.attname = 'start_date'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE pdm.pdm_project_phases
      ALTER COLUMN start_date TYPE timestamptz
      USING start_date AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- pdm.pdm_project_phases.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'pdm'
      AND t.relname = 'pdm_project_phases'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE pdm.pdm_project_phases
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- pdm.pdm_projects.deleted_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'pdm'
      AND t.relname = 'pdm_projects'
      AND a.attname = 'deleted_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE pdm.pdm_projects
      ALTER COLUMN deleted_at TYPE timestamptz
      USING deleted_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- pdm.pdm_projects.end_date
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'pdm'
      AND t.relname = 'pdm_projects'
      AND a.attname = 'end_date'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE pdm.pdm_projects
      ALTER COLUMN end_date TYPE timestamptz
      USING end_date AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- pdm.pdm_projects.start_date
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'pdm'
      AND t.relname = 'pdm_projects'
      AND a.attname = 'start_date'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE pdm.pdm_projects
      ALTER COLUMN start_date TYPE timestamptz
      USING start_date AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- pdm.pdm_versions.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'pdm'
      AND t.relname = 'pdm_versions'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE pdm.pdm_versions
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- pdm.pdm_versions.deleted_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'pdm'
      AND t.relname = 'pdm_versions'
      AND a.attname = 'deleted_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE pdm.pdm_versions
      ALTER COLUMN deleted_at TYPE timestamptz
      USING deleted_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- pdm.pdm_versions.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'pdm'
      AND t.relname = 'pdm_versions'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE pdm.pdm_versions
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- pdm.pdm_workflow_instances.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'pdm'
      AND t.relname = 'pdm_workflow_instances'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE pdm.pdm_workflow_instances
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- pdm.pdm_workflow_instances.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'pdm'
      AND t.relname = 'pdm_workflow_instances'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE pdm.pdm_workflow_instances
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- pdm.pdm_workflows.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'pdm'
      AND t.relname = 'pdm_workflows'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE pdm.pdm_workflows
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- pdm.pdm_workflows.deleted_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'pdm'
      AND t.relname = 'pdm_workflows'
      AND a.attname = 'deleted_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE pdm.pdm_workflows
      ALTER COLUMN deleted_at TYPE timestamptz
      USING deleted_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- pdm.pdm_workflows.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'pdm'
      AND t.relname = 'pdm_workflows'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE pdm.pdm_workflows
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- public._archive_core_doc_documents.deleted_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = '_archive_core_doc_documents'
      AND a.attname = 'deleted_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE public._archive_core_doc_documents
      ALTER COLUMN deleted_at TYPE timestamptz
      USING deleted_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- public._archive_core_doc_folders.deleted_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = '_archive_core_doc_folders'
      AND a.attname = 'deleted_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE public._archive_core_doc_folders
      ALTER COLUMN deleted_at TYPE timestamptz
      USING deleted_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- public._archive_core_doc_templates.deleted_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = '_archive_core_doc_templates'
      AND a.attname = 'deleted_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE public._archive_core_doc_templates
      ALTER COLUMN deleted_at TYPE timestamptz
      USING deleted_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- public._archive_core_workflow_instances.completed_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = '_archive_core_workflow_instances'
      AND a.attname = 'completed_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE public._archive_core_workflow_instances
      ALTER COLUMN completed_at TYPE timestamptz
      USING completed_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- public._archive_core_workflow_instances.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = '_archive_core_workflow_instances'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE public._archive_core_workflow_instances
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- public._archive_core_workflow_instances.started_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = '_archive_core_workflow_instances'
      AND a.attname = 'started_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE public._archive_core_workflow_instances
      ALTER COLUMN started_at TYPE timestamptz
      USING started_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- public._archive_core_workflow_instances.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = '_archive_core_workflow_instances'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE public._archive_core_workflow_instances
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- public._archive_core_workflow_versions.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = '_archive_core_workflow_versions'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE public._archive_core_workflow_versions
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- public._archive_core_workflow_versions.deleted_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = '_archive_core_workflow_versions'
      AND a.attname = 'deleted_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE public._archive_core_workflow_versions
      ALTER COLUMN deleted_at TYPE timestamptz
      USING deleted_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- public.core_file_folders.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'core_file_folders'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE public.core_file_folders
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- public.core_file_folders.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'core_file_folders'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE public.core_file_folders
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- public.core_file_permissions.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'core_file_permissions'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE public.core_file_permissions
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- public.core_files.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'core_files'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE public.core_files
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- public.core_files.deleted_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'core_files'
      AND a.attname = 'deleted_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE public.core_files
      ALTER COLUMN deleted_at TYPE timestamptz
      USING deleted_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- public.core_files.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'core_files'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE public.core_files
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- public.core_login_logs.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'core_login_logs'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE public.core_login_logs
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- public.core_login_logs.login_time
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'core_login_logs'
      AND a.attname = 'login_time'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE public.core_login_logs
      ALTER COLUMN login_time TYPE timestamptz
      USING login_time AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- public.core_menu_groups.deleted_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'core_menu_groups'
      AND a.attname = 'deleted_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE public.core_menu_groups
      ALTER COLUMN deleted_at TYPE timestamptz
      USING deleted_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- public.core_menus.deleted_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'core_menus'
      AND a.attname = 'deleted_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE public.core_menus
      ALTER COLUMN deleted_at TYPE timestamptz
      USING deleted_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- public.core_permissions.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'core_permissions'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE public.core_permissions
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- public.core_role_permissions.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'core_role_permissions'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE public.core_role_permissions
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- public.core_roles.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'core_roles'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE public.core_roles
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- public.core_roles.deleted_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'core_roles'
      AND a.attname = 'deleted_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE public.core_roles
      ALTER COLUMN deleted_at TYPE timestamptz
      USING deleted_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- public.core_roles.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'core_roles'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE public.core_roles
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- public.core_tenant_users.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'core_tenant_users'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE public.core_tenant_users
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- public.core_tenant_users.deleted_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'core_tenant_users'
      AND a.attname = 'deleted_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE public.core_tenant_users
      ALTER COLUMN deleted_at TYPE timestamptz
      USING deleted_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- public.core_tenant_users.last_login
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'core_tenant_users'
      AND a.attname = 'last_login'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE public.core_tenant_users
      ALTER COLUMN last_login TYPE timestamptz
      USING last_login AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- public.core_tenants.activated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'core_tenants'
      AND a.attname = 'activated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE public.core_tenants
      ALTER COLUMN activated_at TYPE timestamptz
      USING activated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- public.core_tenants.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'core_tenants'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE public.core_tenants
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- public.core_tenants.deleted_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'core_tenants'
      AND a.attname = 'deleted_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE public.core_tenants
      ALTER COLUMN deleted_at TYPE timestamptz
      USING deleted_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- public.core_tenants.license_expires_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'core_tenants'
      AND a.attname = 'license_expires_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE public.core_tenants
      ALTER COLUMN license_expires_at TYPE timestamptz
      USING license_expires_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- public.core_tenants.suspended_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'core_tenants'
      AND a.attname = 'suspended_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE public.core_tenants
      ALTER COLUMN suspended_at TYPE timestamptz
      USING suspended_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- public.core_tenants.trial_expires_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'core_tenants'
      AND a.attname = 'trial_expires_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE public.core_tenants
      ALTER COLUMN trial_expires_at TYPE timestamptz
      USING trial_expires_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- public.core_tenants.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'core_tenants'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE public.core_tenants
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- public.core_user_roles.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'core_user_roles'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE public.core_user_roles
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- public.core_users.deleted_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'core_users'
      AND a.attname = 'deleted_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE public.core_users
      ALTER COLUMN deleted_at TYPE timestamptz
      USING deleted_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- public.core_users.last_login_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'core_users'
      AND a.attname = 'last_login_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE public.core_users
      ALTER COLUMN last_login_at TYPE timestamptz
      USING last_login_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- public.demand_forecasts.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'demand_forecasts'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE public.demand_forecasts
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- public.demand_forecasts.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'demand_forecasts'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE public.demand_forecasts
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- public.erp_connections.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'erp_connections'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE public.erp_connections
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- public.erp_connections.last_sync_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'erp_connections'
      AND a.attname = 'last_sync_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE public.erp_connections
      ALTER COLUMN last_sync_at TYPE timestamptz
      USING last_sync_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- public.erp_connections.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'erp_connections'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE public.erp_connections
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- public.erp_mappings.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'erp_mappings'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE public.erp_mappings
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- public.erp_mappings.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'erp_mappings'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE public.erp_mappings
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- public.external_erp_sync_logs.completed_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'external_erp_sync_logs'
      AND a.attname = 'completed_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE public.external_erp_sync_logs
      ALTER COLUMN completed_at TYPE timestamptz
      USING completed_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- public.external_erp_sync_logs.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'external_erp_sync_logs'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE public.external_erp_sync_logs
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- public.external_erp_sync_logs.started_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'external_erp_sync_logs'
      AND a.attname = 'started_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE public.external_erp_sync_logs
      ALTER COLUMN started_at TYPE timestamptz
      USING started_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- public.team_members.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'team_members'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE public.team_members
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- public.team_members.join_date
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'team_members'
      AND a.attname = 'join_date'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE public.team_members
      ALTER COLUMN join_date TYPE timestamptz
      USING join_date AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- public.teams.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'teams'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE public.teams
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- public.teams.deleted_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'teams'
      AND a.attname = 'deleted_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE public.teams
      ALTER COLUMN deleted_at TYPE timestamptz
      USING deleted_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- public.teams.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'teams'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE public.teams
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- qms.qa_alert_messages.acknowledged_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'qms'
      AND t.relname = 'qa_alert_messages'
      AND a.attname = 'acknowledged_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE qms.qa_alert_messages
      ALTER COLUMN acknowledged_at TYPE timestamptz
      USING acknowledged_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- qms.qa_alert_messages.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'qms'
      AND t.relname = 'qa_alert_messages'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE qms.qa_alert_messages
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- qms.qa_alert_rules.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'qms'
      AND t.relname = 'qa_alert_rules'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE qms.qa_alert_rules
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- qms.qa_alert_rules.deleted_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'qms'
      AND t.relname = 'qa_alert_rules'
      AND a.attname = 'deleted_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE qms.qa_alert_rules
      ALTER COLUMN deleted_at TYPE timestamptz
      USING deleted_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- qms.qa_alert_rules.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'qms'
      AND t.relname = 'qa_alert_rules'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE qms.qa_alert_rules
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- qms.qa_approval_events.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'qms'
      AND t.relname = 'qa_approval_events'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE qms.qa_approval_events
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- qms.qa_apqp_approvals.approved_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'qms'
      AND t.relname = 'qa_apqp_approvals'
      AND a.attname = 'approved_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE qms.qa_apqp_approvals
      ALTER COLUMN approved_at TYPE timestamptz
      USING approved_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- qms.qa_apqp_approvals.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'qms'
      AND t.relname = 'qa_apqp_approvals'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE qms.qa_apqp_approvals
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- qms.qa_apqp_approvals.submitted_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'qms'
      AND t.relname = 'qa_apqp_approvals'
      AND a.attname = 'submitted_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE qms.qa_apqp_approvals
      ALTER COLUMN submitted_at TYPE timestamptz
      USING submitted_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- qms.qa_apqp_phases.actual_end_date
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'qms'
      AND t.relname = 'qa_apqp_phases'
      AND a.attname = 'actual_end_date'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE qms.qa_apqp_phases
      ALTER COLUMN actual_end_date TYPE timestamptz
      USING actual_end_date AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- qms.qa_apqp_phases.actual_start_date
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'qms'
      AND t.relname = 'qa_apqp_phases'
      AND a.attname = 'actual_start_date'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE qms.qa_apqp_phases
      ALTER COLUMN actual_start_date TYPE timestamptz
      USING actual_start_date AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- qms.qa_apqp_phases.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'qms'
      AND t.relname = 'qa_apqp_phases'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE qms.qa_apqp_phases
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- qms.qa_apqp_phases.end_date
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'qms'
      AND t.relname = 'qa_apqp_phases'
      AND a.attname = 'end_date'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE qms.qa_apqp_phases
      ALTER COLUMN end_date TYPE timestamptz
      USING end_date AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- qms.qa_apqp_phases.start_date
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'qms'
      AND t.relname = 'qa_apqp_phases'
      AND a.attname = 'start_date'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE qms.qa_apqp_phases
      ALTER COLUMN start_date TYPE timestamptz
      USING start_date AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- qms.qa_apqp_phases.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'qms'
      AND t.relname = 'qa_apqp_phases'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE qms.qa_apqp_phases
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- qms.qa_apqp_projects.actual_end_date
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'qms'
      AND t.relname = 'qa_apqp_projects'
      AND a.attname = 'actual_end_date'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE qms.qa_apqp_projects
      ALTER COLUMN actual_end_date TYPE timestamptz
      USING actual_end_date AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- qms.qa_apqp_projects.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'qms'
      AND t.relname = 'qa_apqp_projects'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE qms.qa_apqp_projects
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- qms.qa_apqp_projects.deleted_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'qms'
      AND t.relname = 'qa_apqp_projects'
      AND a.attname = 'deleted_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE qms.qa_apqp_projects
      ALTER COLUMN deleted_at TYPE timestamptz
      USING deleted_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- qms.qa_apqp_projects.start_date
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'qms'
      AND t.relname = 'qa_apqp_projects'
      AND a.attname = 'start_date'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE qms.qa_apqp_projects
      ALTER COLUMN start_date TYPE timestamptz
      USING start_date AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- qms.qa_apqp_projects.target_date
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'qms'
      AND t.relname = 'qa_apqp_projects'
      AND a.attname = 'target_date'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE qms.qa_apqp_projects
      ALTER COLUMN target_date TYPE timestamptz
      USING target_date AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- qms.qa_apqp_projects.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'qms'
      AND t.relname = 'qa_apqp_projects'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE qms.qa_apqp_projects
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- qms.qa_apqp_risks.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'qms'
      AND t.relname = 'qa_apqp_risks'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE qms.qa_apqp_risks
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- qms.qa_apqp_risks.target_date
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'qms'
      AND t.relname = 'qa_apqp_risks'
      AND a.attname = 'target_date'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE qms.qa_apqp_risks
      ALTER COLUMN target_date TYPE timestamptz
      USING target_date AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- qms.qa_apqp_risks.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'qms'
      AND t.relname = 'qa_apqp_risks'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE qms.qa_apqp_risks
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- qms.qa_apqp_tasks.completed_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'qms'
      AND t.relname = 'qa_apqp_tasks'
      AND a.attname = 'completed_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE qms.qa_apqp_tasks
      ALTER COLUMN completed_at TYPE timestamptz
      USING completed_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- qms.qa_apqp_tasks.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'qms'
      AND t.relname = 'qa_apqp_tasks'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE qms.qa_apqp_tasks
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- qms.qa_apqp_tasks.due_date
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'qms'
      AND t.relname = 'qa_apqp_tasks'
      AND a.attname = 'due_date'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE qms.qa_apqp_tasks
      ALTER COLUMN due_date TYPE timestamptz
      USING due_date AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- qms.qa_apqp_tasks.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'qms'
      AND t.relname = 'qa_apqp_tasks'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE qms.qa_apqp_tasks
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- qms.qa_audit_findings.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'qms'
      AND t.relname = 'qa_audit_findings'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE qms.qa_audit_findings
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- qms.qa_audit_findings.target_date
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'qms'
      AND t.relname = 'qa_audit_findings'
      AND a.attname = 'target_date'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE qms.qa_audit_findings
      ALTER COLUMN target_date TYPE timestamptz
      USING target_date AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- qms.qa_audit_findings.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'qms'
      AND t.relname = 'qa_audit_findings'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE qms.qa_audit_findings
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- qms.qa_audit_findings.verified_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'qms'
      AND t.relname = 'qa_audit_findings'
      AND a.attname = 'verified_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE qms.qa_audit_findings
      ALTER COLUMN verified_at TYPE timestamptz
      USING verified_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- qms.qa_audit_tasks.completed_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'qms'
      AND t.relname = 'qa_audit_tasks'
      AND a.attname = 'completed_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE qms.qa_audit_tasks
      ALTER COLUMN completed_at TYPE timestamptz
      USING completed_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- qms.qa_audit_tasks.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'qms'
      AND t.relname = 'qa_audit_tasks'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE qms.qa_audit_tasks
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- qms.qa_audit_tasks.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'qms'
      AND t.relname = 'qa_audit_tasks'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE qms.qa_audit_tasks
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- qms.qa_corrective_action_items.completed_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'qms'
      AND t.relname = 'qa_corrective_action_items'
      AND a.attname = 'completed_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE qms.qa_corrective_action_items
      ALTER COLUMN completed_at TYPE timestamptz
      USING completed_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- qms.qa_corrective_action_items.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'qms'
      AND t.relname = 'qa_corrective_action_items'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE qms.qa_corrective_action_items
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- qms.qa_corrective_action_items.due_date
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'qms'
      AND t.relname = 'qa_corrective_action_items'
      AND a.attname = 'due_date'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE qms.qa_corrective_action_items
      ALTER COLUMN due_date TYPE timestamptz
      USING due_date AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- qms.qa_corrective_actions.deleted_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'qms'
      AND t.relname = 'qa_corrective_actions'
      AND a.attname = 'deleted_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE qms.qa_corrective_actions
      ALTER COLUMN deleted_at TYPE timestamptz
      USING deleted_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- qms.qa_eightd_audit_logs.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'qms'
      AND t.relname = 'qa_eightd_audit_logs'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE qms.qa_eightd_audit_logs
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- qms.qa_eightd_reports.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'qms'
      AND t.relname = 'qa_eightd_reports'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE qms.qa_eightd_reports
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- qms.qa_eightd_reports.d3_implemented_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'qms'
      AND t.relname = 'qa_eightd_reports'
      AND a.attname = 'd3_implemented_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE qms.qa_eightd_reports
      ALTER COLUMN d3_implemented_at TYPE timestamptz
      USING d3_implemented_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- qms.qa_eightd_reports.d6_verified_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'qms'
      AND t.relname = 'qa_eightd_reports'
      AND a.attname = 'd6_verified_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE qms.qa_eightd_reports
      ALTER COLUMN d6_verified_at TYPE timestamptz
      USING d6_verified_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- qms.qa_eightd_reports.d8_closed_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'qms'
      AND t.relname = 'qa_eightd_reports'
      AND a.attname = 'd8_closed_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE qms.qa_eightd_reports
      ALTER COLUMN d8_closed_at TYPE timestamptz
      USING d8_closed_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- qms.qa_eightd_reports.deleted_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'qms'
      AND t.relname = 'qa_eightd_reports'
      AND a.attname = 'deleted_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE qms.qa_eightd_reports
      ALTER COLUMN deleted_at TYPE timestamptz
      USING deleted_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- qms.qa_eightd_reports.due_date
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'qms'
      AND t.relname = 'qa_eightd_reports'
      AND a.attname = 'due_date'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE qms.qa_eightd_reports
      ALTER COLUMN due_date TYPE timestamptz
      USING due_date AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- qms.qa_eightd_reports.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'qms'
      AND t.relname = 'qa_eightd_reports'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE qms.qa_eightd_reports
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- qms.qa_fmea_analyses.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'qms'
      AND t.relname = 'qa_fmea_analyses'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE qms.qa_fmea_analyses
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- qms.qa_fmea_analyses.deleted_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'qms'
      AND t.relname = 'qa_fmea_analyses'
      AND a.attname = 'deleted_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE qms.qa_fmea_analyses
      ALTER COLUMN deleted_at TYPE timestamptz
      USING deleted_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- qms.qa_fmea_analyses.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'qms'
      AND t.relname = 'qa_fmea_analyses'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE qms.qa_fmea_analyses
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- qms.qa_fmea_items.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'qms'
      AND t.relname = 'qa_fmea_items'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE qms.qa_fmea_items
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- qms.qa_fmea_items.target_date
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'qms'
      AND t.relname = 'qa_fmea_items'
      AND a.attname = 'target_date'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE qms.qa_fmea_items
      ALTER COLUMN target_date TYPE timestamptz
      USING target_date AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- qms.qa_fmea_items.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'qms'
      AND t.relname = 'qa_fmea_items'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE qms.qa_fmea_items
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- qms.qa_inspection_audits.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'qms'
      AND t.relname = 'qa_inspection_audits'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE qms.qa_inspection_audits
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- qms.qa_inspection_results.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'qms'
      AND t.relname = 'qa_inspection_results'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE qms.qa_inspection_results
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- qms.qa_qms_sync_records.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'qms'
      AND t.relname = 'qa_qms_sync_records'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE qms.qa_qms_sync_records
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- qms.qa_qms_sync_records.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'qms'
      AND t.relname = 'qa_qms_sync_records'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE qms.qa_qms_sync_records
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- qms.qa_quality_costs.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'qms'
      AND t.relname = 'qa_quality_costs'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE qms.qa_quality_costs
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- qms.qa_quality_costs.deleted_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'qms'
      AND t.relname = 'qa_quality_costs'
      AND a.attname = 'deleted_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE qms.qa_quality_costs
      ALTER COLUMN deleted_at TYPE timestamptz
      USING deleted_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- qms.qa_quality_costs.incurred_date
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'qms'
      AND t.relname = 'qa_quality_costs'
      AND a.attname = 'incurred_date'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE qms.qa_quality_costs
      ALTER COLUMN incurred_date TYPE timestamptz
      USING incurred_date AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- qms.qa_quality_costs.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'qms'
      AND t.relname = 'qa_quality_costs'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE qms.qa_quality_costs
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- qms.qa_quality_inspections.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'qms'
      AND t.relname = 'qa_quality_inspections'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE qms.qa_quality_inspections
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- qms.qa_quality_inspections.deleted_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'qms'
      AND t.relname = 'qa_quality_inspections'
      AND a.attname = 'deleted_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE qms.qa_quality_inspections
      ALTER COLUMN deleted_at TYPE timestamptz
      USING deleted_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- qms.qa_quality_inspections.inspected_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'qms'
      AND t.relname = 'qa_quality_inspections'
      AND a.attname = 'inspected_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE qms.qa_quality_inspections
      ALTER COLUMN inspected_at TYPE timestamptz
      USING inspected_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- qms.qa_quality_inspections.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'qms'
      AND t.relname = 'qa_quality_inspections'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE qms.qa_quality_inspections
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- qms.qa_quality_issues.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'qms'
      AND t.relname = 'qa_quality_issues'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE qms.qa_quality_issues
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- qms.qa_quality_issues.deleted_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'qms'
      AND t.relname = 'qa_quality_issues'
      AND a.attname = 'deleted_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE qms.qa_quality_issues
      ALTER COLUMN deleted_at TYPE timestamptz
      USING deleted_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- qms.qa_quality_issues.resolved_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'qms'
      AND t.relname = 'qa_quality_issues'
      AND a.attname = 'resolved_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE qms.qa_quality_issues
      ALTER COLUMN resolved_at TYPE timestamptz
      USING resolved_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- qms.qa_quality_issues.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'qms'
      AND t.relname = 'qa_quality_issues'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE qms.qa_quality_issues
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- qms.qa_spc_charts.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'qms'
      AND t.relname = 'qa_spc_charts'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE qms.qa_spc_charts
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- qms.qa_spc_charts.deleted_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'qms'
      AND t.relname = 'qa_spc_charts'
      AND a.attname = 'deleted_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE qms.qa_spc_charts
      ALTER COLUMN deleted_at TYPE timestamptz
      USING deleted_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- qms.qa_spc_charts.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'qms'
      AND t.relname = 'qa_spc_charts'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE qms.qa_spc_charts
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- qms.qa_spc_data_points.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'qms'
      AND t.relname = 'qa_spc_data_points'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE qms.qa_spc_data_points
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- qms.qa_spc_data_points.measured_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'qms'
      AND t.relname = 'qa_spc_data_points'
      AND a.attname = 'measured_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE qms.qa_spc_data_points
      ALTER COLUMN measured_at TYPE timestamptz
      USING measured_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- qms.qa_standard_revisions.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'qms'
      AND t.relname = 'qa_standard_revisions'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE qms.qa_standard_revisions
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- qms.qa_standards.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'qms'
      AND t.relname = 'qa_standards'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE qms.qa_standards
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- qms.qa_standards.deleted_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'qms'
      AND t.relname = 'qa_standards'
      AND a.attname = 'deleted_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE qms.qa_standards
      ALTER COLUMN deleted_at TYPE timestamptz
      USING deleted_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- qms.qa_standards.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'qms'
      AND t.relname = 'qa_standards'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE qms.qa_standards
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- rs.equipment.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'rs'
      AND t.relname = 'equipment'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE rs.equipment
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- rs.equipment.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'rs'
      AND t.relname = 'equipment'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE rs.equipment
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- rs.equipment_inspections.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'rs'
      AND t.relname = 'equipment_inspections'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE rs.equipment_inspections
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- rs.equipment_inspections.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'rs'
      AND t.relname = 'equipment_inspections'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE rs.equipment_inspections
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- rs.equipment_maintenance_records.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'rs'
      AND t.relname = 'equipment_maintenance_records'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE rs.equipment_maintenance_records
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- rs.equipment_maintenance_records.end_time
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'rs'
      AND t.relname = 'equipment_maintenance_records'
      AND a.attname = 'end_time'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE rs.equipment_maintenance_records
      ALTER COLUMN end_time TYPE timestamptz
      USING end_time AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- rs.equipment_maintenance_records.start_time
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'rs'
      AND t.relname = 'equipment_maintenance_records'
      AND a.attname = 'start_time'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE rs.equipment_maintenance_records
      ALTER COLUMN start_time TYPE timestamptz
      USING start_time AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- rs.equipment_maintenance_records.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'rs'
      AND t.relname = 'equipment_maintenance_records'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE rs.equipment_maintenance_records
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
