-- ============================================================
-- DB-17: 5433 零星类型对齐 test（12 列）
--
-- 背景：类型批次收尾——剩余零星差异。
-- 方向：对齐 test（基准）。
-- ============================================================

SET lock_timeout = '5s';

-- uuid→varchar 8 列（5433 改 uuid）
ALTER TABLE finance.core_finance_payment_approval_config ALTER COLUMN created_by TYPE uuid USING created_by::uuid;
ALTER TABLE finance.core_finance_payments ALTER COLUMN approved_by TYPE uuid USING approved_by::uuid;
ALTER TABLE finance.core_finance_payments ALTER COLUMN created_by TYPE uuid USING created_by::uuid;
ALTER TABLE finance.core_finance_payments ALTER COLUMN executed_by TYPE uuid USING executed_by::uuid;
ALTER TABLE finance.erp_collection_records ALTER COLUMN created_by TYPE uuid USING created_by::uuid;
ALTER TABLE finance.erp_payment_records ALTER COLUMN created_by TYPE uuid USING created_by::uuid;
ALTER TABLE wms.batches ALTER COLUMN location_id TYPE uuid USING location_id::uuid;
ALTER TABLE wms.batches ALTER COLUMN supplier_id TYPE uuid USING supplier_id::uuid;

-- rs.formulas 2 列
ALTER TABLE rs.formulas ALTER COLUMN approved_by TYPE text USING approved_by::text;
ALTER TABLE rs.formulas ALTER COLUMN version TYPE character varying USING version::character varying;

-- rs.audit_logs.ip_address（5433 改 varchar 对齐 test）
ALTER TABLE rs.audit_logs ALTER COLUMN ip_address TYPE character varying USING ip_address::character varying;
