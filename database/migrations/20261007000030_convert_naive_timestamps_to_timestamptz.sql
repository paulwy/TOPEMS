-- ============================================================
-- DB-03: 将 31 列审计/事件时间戳由 timestamp without time zone
--        统一为 timestamptz（与项目主流 3583+ 列对齐）
--
-- 背景：
--   审计 artifacts/audit/TOPEMS审计报告.md DB-03（P2）。同逻辑列口径分裂，
--   典型 iam.core_tenant_users.created_at/deleted_at 为 timestamptz，
--   而相邻 last_login 却为 timestamp without time zone
--   （20261007000006_rebuild_orphan_tables.sql 手写无时区）。
--   Rust 契约：TenantUser.last_login: Option<DateTime<Utc>>、
--   TenantInvoice.period_start/period_end: DateTime<Utc>（应映射 timestamptz）。
--
-- 关键实测（2026-10-07）：
--   * 这 31 列所在 31 张表全部 0 行（空表），本 ALTER 翻译 0 行数据。
--   * 两库 TimeZone 均为 Asia/Shanghai；但因表空，USING 时区选择无数据影响。
--   * 有 Rust DateTime<Utc> 铁证的列（last_login/period_start/period_end）按 UTC 解释；
--     其余 SQL now()/软删标记列统一按任务默认 UTC（详见
--     artifacts/tier2-fixes/db03-timestamptz-decisions.md 逐列登记）。
--
-- 幂等设计：每列独立 DO 块，仅当「列存在 且 atttypid 仍为 timestamp(without tz)」
-- 才 ALTER。空库重放 / 重复执行 / 5433 上部分列已 timestamptz 时均自动跳过。
-- NOT NULL 与 DEFAULT 由 ALTER COLUMN TYPE 自动保留。
-- ============================================================

-- 避免长锁阻塞运行中的服务（5s 超时；应用方负责重试）
SET lock_timeout = '5s';

-- core.core_plugin_permissions.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'core'
      AND t.relname = 'core_plugin_permissions'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE core.core_plugin_permissions
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;

-- flow.core_flow_categories.deleted_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'flow'
      AND t.relname = 'core_flow_categories'
      AND a.attname = 'deleted_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE flow.core_flow_categories
      ALTER COLUMN deleted_at TYPE timestamptz
      USING deleted_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;

-- flow.core_flow_delegates.deleted_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'flow'
      AND t.relname = 'core_flow_delegates'
      AND a.attname = 'deleted_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE flow.core_flow_delegates
      ALTER COLUMN deleted_at TYPE timestamptz
      USING deleted_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;

-- flow.core_flow_rules.deleted_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'flow'
      AND t.relname = 'core_flow_rules'
      AND a.attname = 'deleted_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE flow.core_flow_rules
      ALTER COLUMN deleted_at TYPE timestamptz
      USING deleted_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;

-- flow.core_flow_variables.deleted_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'flow'
      AND t.relname = 'core_flow_variables'
      AND a.attname = 'deleted_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE flow.core_flow_variables
      ALTER COLUMN deleted_at TYPE timestamptz
      USING deleted_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;

-- flow.core_migration_history.applied_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'flow'
      AND t.relname = 'core_migration_history'
      AND a.attname = 'applied_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE flow.core_migration_history
      ALTER COLUMN applied_at TYPE timestamptz
      USING applied_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;

-- flow.core_migration_history.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'flow'
      AND t.relname = 'core_migration_history'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE flow.core_migration_history
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;

-- iam.core_plugin_instances.last_heartbeat
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'iam'
      AND t.relname = 'core_plugin_instances'
      AND a.attname = 'last_heartbeat'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE iam.core_plugin_instances
      ALTER COLUMN last_heartbeat TYPE timestamptz
      USING last_heartbeat AT TIME ZONE 'UTC';
  END IF;
END
$migration$;

-- iam.core_tenant_users.last_login
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'iam'
      AND t.relname = 'core_tenant_users'
      AND a.attname = 'last_login'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE iam.core_tenant_users
      ALTER COLUMN last_login TYPE timestamptz
      USING last_login AT TIME ZONE 'UTC';
  END IF;
END
$migration$;

-- iam.core_usage_records.period_end
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'iam'
      AND t.relname = 'core_usage_records'
      AND a.attname = 'period_end'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE iam.core_usage_records
      ALTER COLUMN period_end TYPE timestamptz
      USING period_end AT TIME ZONE 'UTC';
  END IF;
END
$migration$;

-- iam.core_usage_records.period_start
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'iam'
      AND t.relname = 'core_usage_records'
      AND a.attname = 'period_start'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE iam.core_usage_records
      ALTER COLUMN period_start TYPE timestamptz
      USING period_start AT TIME ZONE 'UTC';
  END IF;
END
$migration$;

-- mobile.push_config.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'mobile'
      AND t.relname = 'push_config'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE mobile.push_config
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;

-- public.core_finance_accounts.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'core_finance_accounts'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE public.core_finance_accounts
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;

-- public.core_finance_accounts.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'core_finance_accounts'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE public.core_finance_accounts
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;

-- public.core_finance_vouchers.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'core_finance_vouchers'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE public.core_finance_vouchers
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;

-- public.core_finance_vouchers.deleted_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'core_finance_vouchers'
      AND a.attname = 'deleted_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE public.core_finance_vouchers
      ALTER COLUMN deleted_at TYPE timestamptz
      USING deleted_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;

-- public.core_finance_vouchers.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'core_finance_vouchers'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE public.core_finance_vouchers
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;

-- public.core_finance_vouchers.voucher_date
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'core_finance_vouchers'
      AND a.attname = 'voucher_date'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE public.core_finance_vouchers
      ALTER COLUMN voucher_date TYPE timestamptz
      USING voucher_date AT TIME ZONE 'UTC';
  END IF;
END
$migration$;

-- public.core_flow_categories.deleted_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'core_flow_categories'
      AND a.attname = 'deleted_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE public.core_flow_categories
      ALTER COLUMN deleted_at TYPE timestamptz
      USING deleted_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;

-- public.core_flow_delegates.deleted_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'core_flow_delegates'
      AND a.attname = 'deleted_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE public.core_flow_delegates
      ALTER COLUMN deleted_at TYPE timestamptz
      USING deleted_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;

-- public.core_flow_rules.deleted_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'core_flow_rules'
      AND a.attname = 'deleted_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE public.core_flow_rules
      ALTER COLUMN deleted_at TYPE timestamptz
      USING deleted_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;

-- public.core_flow_variables.deleted_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'core_flow_variables'
      AND a.attname = 'deleted_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE public.core_flow_variables
      ALTER COLUMN deleted_at TYPE timestamptz
      USING deleted_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;

-- public.core_migration_history.applied_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'core_migration_history'
      AND a.attname = 'applied_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE public.core_migration_history
      ALTER COLUMN applied_at TYPE timestamptz
      USING applied_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;

-- public.core_migration_history.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'core_migration_history'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE public.core_migration_history
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;

-- public.equipment_inspections.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'equipment_inspections'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE public.equipment_inspections
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;

-- public.equipment_inspections.inspection_date
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'equipment_inspections'
      AND a.attname = 'inspection_date'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE public.equipment_inspections
      ALTER COLUMN inspection_date TYPE timestamptz
      USING inspection_date AT TIME ZONE 'UTC';
  END IF;
END
$migration$;

-- public.equipment_inspections.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'equipment_inspections'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE public.equipment_inspections
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;

-- public.equipment_maintenance_records.created_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'equipment_maintenance_records'
      AND a.attname = 'created_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE public.equipment_maintenance_records
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;

-- public.equipment_maintenance_records.end_time
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'equipment_maintenance_records'
      AND a.attname = 'end_time'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE public.equipment_maintenance_records
      ALTER COLUMN end_time TYPE timestamptz
      USING end_time AT TIME ZONE 'UTC';
  END IF;
END
$migration$;

-- public.equipment_maintenance_records.start_time
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'equipment_maintenance_records'
      AND a.attname = 'start_time'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE public.equipment_maintenance_records
      ALTER COLUMN start_time TYPE timestamptz
      USING start_time AT TIME ZONE 'UTC';
  END IF;
END
$migration$;

-- public.equipment_maintenance_records.updated_at
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class t    ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'equipment_maintenance_records'
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.atttypid = 'timestamp without time zone'::regtype
  ) THEN
    ALTER TABLE public.equipment_maintenance_records
      ALTER COLUMN updated_at TYPE timestamptz
      USING updated_at AT TIME ZONE 'UTC';
  END IF;
END
$migration$;

