-- ============================================================
-- DB-04-prod: prod 生产库剩余 naive timestamp → timestamptz 统一（174 列）
--
-- 背景：DB-04 5433 已完成 421 列；prod 剩余 174 列同步统一。
-- 关键实测（2026-11-03 17:15 CST）：172 列空表，2 列有数据共 32 行
--   finance.core_finance_currencies.{created_at,updated_at} (16+16)
-- 样本 2026-10-26 06:03 UTC = 北京 14:03，USING col AT TIME ZONE 'UTC' 正确。
-- 备份：/tmp/finance_currencies_backup_20261103.sql（pg_dump --data-only 51 行）
-- 执行结果：naive 174→0，timestamptz 3465→3639，date 210 不变。
-- ============================================================

SET lock_timeout = '5s';

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
-- finance.core_finance_currencies.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'finance'
      AND t.relname = 'core_finance_currencies'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE finance.core_finance_currencies
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- finance.core_finance_currencies.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'finance'
      AND t.relname = 'core_finance_currencies'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE finance.core_finance_currencies
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
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
-- mes.production_lines.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'mes'
      AND t.relname = 'production_lines'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE mes.production_lines
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- mes.production_lines.deleted_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'mes'
      AND t.relname = 'production_lines'
      AND a.attname = 'deleted_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE mes.production_lines
      ALTER COLUMN deleted_at TYPE timestamptz
      USING deleted_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- mes.production_lines.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'mes'
      AND t.relname = 'production_lines'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE mes.production_lines
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- mes.shifts.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'mes'
      AND t.relname = 'shifts'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE mes.shifts
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- mes.shifts.deleted_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'mes'
      AND t.relname = 'shifts'
      AND a.attname = 'deleted_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE mes.shifts
      ALTER COLUMN deleted_at TYPE timestamptz
      USING deleted_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- mes.shifts.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'mes'
      AND t.relname = 'shifts'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE mes.shifts
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
-- public.conversion_executions.completed_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'conversion_executions'
      AND a.attname = 'completed_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE public.conversion_executions
      ALTER COLUMN completed_at TYPE timestamptz
      USING completed_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- public.conversion_executions.started_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'conversion_executions'
      AND a.attname = 'started_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE public.conversion_executions
      ALTER COLUMN started_at TYPE timestamptz
      USING started_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- public.conversion_rules.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'conversion_rules'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE public.conversion_rules
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- public.conversion_rules.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'conversion_rules'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE public.conversion_rules
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
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
-- public.pdm_change_notices.approved_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'pdm_change_notices'
      AND a.attname = 'approved_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE public.pdm_change_notices
      ALTER COLUMN approved_at TYPE timestamptz
      USING approved_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- public.pdm_change_notices.effective_date
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'pdm_change_notices'
      AND a.attname = 'effective_date'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE public.pdm_change_notices
      ALTER COLUMN effective_date TYPE timestamptz
      USING effective_date AT TIME ZONE 'UTC';
  END IF;
END
$migration$;
-- public.qa_qms_sync_records.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'qa_qms_sync_records'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE public.qa_qms_sync_records
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
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
