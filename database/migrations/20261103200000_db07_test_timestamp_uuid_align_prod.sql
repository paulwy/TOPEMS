-- ============================================================
-- DB-07: test（基准库）时间戳 7 列 + uuid 25 列对齐 5433/prod
--
-- 背景：类型批次——test（基准库）落后，改 test 对齐 5433/prod。
-- 方向：A（test → timestamptz + uuid，对齐现代类型）。
--
-- 关键实测（2026-11-03）：
--   * 时间戳 7 列：public.equipment_inspections 3 + equipment_maintenance_records 4，空表。
--   * uuid 25 列：空表或全 NULL（5 表有数据 created_by=test_admin/user-1 非合法 uuid，挂账不动）。
--   * flow.core_workflow_versions.created_by default='system' → 改零 uuid。
--
-- 挂账（未改）：
--   * iam.position_* id 4 项（bigint→uuid，主键+外键引用，风险极高）
--   * finance.erp_collection_records/erp_payment_records/core_finance_payments/user_settings/
--     core_finance_payment_approval_config 5 表 created_by 有数据（test_admin/user-1 非 uuid）
-- ============================================================

SET lock_timeout = '5s';

-- 时间戳 7 列 → timestamptz
ALTER TABLE public.equipment_inspections ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';
ALTER TABLE public.equipment_inspections ALTER COLUMN inspection_date TYPE timestamptz USING inspection_date AT TIME ZONE 'UTC';
ALTER TABLE public.equipment_inspections ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC';
ALTER TABLE public.equipment_maintenance_records ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';
ALTER TABLE public.equipment_maintenance_records ALTER COLUMN end_time TYPE timestamptz USING end_time AT TIME ZONE 'UTC';
ALTER TABLE public.equipment_maintenance_records ALTER COLUMN start_time TYPE timestamptz USING start_time AT TIME ZONE 'UTC';
ALTER TABLE public.equipment_maintenance_records ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC';

-- uuid 25 列 → varchar→uuid（空表）
ALTER TABLE finance.core_finance_payment_items ALTER COLUMN write_off_by TYPE uuid USING write_off_by::uuid;
ALTER TABLE finance.core_finance_payment_workflow ALTER COLUMN current_approver TYPE uuid USING current_approver::uuid;
ALTER TABLE finance.erp_payables ALTER COLUMN created_by TYPE uuid USING created_by::uuid;
ALTER TABLE finance.erp_receivables ALTER COLUMN created_by TYPE uuid USING created_by::uuid;
ALTER TABLE finance.finance_voucher_templates ALTER COLUMN created_by TYPE uuid USING created_by::uuid;
ALTER TABLE finance.reconciliation_snapshots ALTER COLUMN created_by TYPE uuid USING created_by::uuid;
ALTER TABLE finance.settlement_snapshots ALTER COLUMN created_by TYPE uuid USING created_by::uuid;
ALTER TABLE flow.core_workflow_versions ALTER COLUMN created_by DROP DEFAULT;
ALTER TABLE flow.core_workflow_versions ALTER COLUMN created_by TYPE uuid USING created_by::uuid;
ALTER TABLE flow.core_workflow_versions ALTER COLUMN created_by SET DEFAULT '00000000-0000-0000-0000-000000000000'::uuid;
ALTER TABLE lims.maintenance_records ALTER COLUMN performed_by TYPE uuid USING performed_by::uuid;
ALTER TABLE pm.acceptance_plans ALTER COLUMN created_by TYPE uuid USING created_by::uuid;
ALTER TABLE pm.acceptance_records ALTER COLUMN accepted_by TYPE uuid USING accepted_by::uuid;
ALTER TABLE pm.acceptance_records ALTER COLUMN created_by TYPE uuid USING created_by::uuid;
ALTER TABLE pm.contract_templates ALTER COLUMN created_by TYPE uuid USING created_by::uuid;
ALTER TABLE pm.defects ALTER COLUMN created_by TYPE uuid USING created_by::uuid;
ALTER TABLE pm.document_folders ALTER COLUMN created_by TYPE uuid USING created_by::uuid;
ALTER TABLE pm.document_versions ALTER COLUMN created_by TYPE uuid USING created_by::uuid;
ALTER TABLE pm.notification_settings ALTER COLUMN user_id TYPE uuid USING user_id::uuid;
ALTER TABLE pm.project_documents ALTER COLUMN created_by TYPE uuid USING created_by::uuid;
ALTER TABLE pm.report_templates ALTER COLUMN created_by TYPE uuid USING created_by::uuid;
ALTER TABLE pm.risk_events ALTER COLUMN reported_by TYPE uuid USING reported_by::uuid;
ALTER TABLE pm.settlement_adjustments ALTER COLUMN created_by TYPE uuid USING created_by::uuid;
ALTER TABLE pm.settlement_items ALTER COLUMN contract_ref_id TYPE uuid USING contract_ref_id::uuid;
ALTER TABLE pm.settlement_items ALTER COLUMN expense_ref_id TYPE uuid USING expense_ref_id::uuid;
ALTER TABLE rs.experiments ALTER COLUMN created_by TYPE uuid USING created_by::uuid;
ALTER TABLE rs.formulas ALTER COLUMN created_by TYPE uuid USING created_by::uuid;
