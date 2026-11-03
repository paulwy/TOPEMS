-- ============================================================
-- DB-12: 5433 date↔timestamptz 21 列对齐 test
--
-- 背景：类型批次——date/timestamptz 方向差异。
-- 方向：对齐 test（基准）。
--   * test=date, cur=timestamptz → 5433 改 date（17 列）
--   * test=timestamptz, cur=date → 5433 改 timestamptz（4 列）
-- 关键实测（2026-11-03）：全空表。
-- ============================================================

SET lock_timeout = '5s';

-- test=date → 5433 改 date（17 列）
ALTER TABLE ai.model_usage_stats ALTER COLUMN date TYPE date USING date::date;
ALTER TABLE finance.core_finance_payments ALTER COLUMN actual_payment_date TYPE date USING actual_payment_date::date;
ALTER TABLE finance.core_finance_payments ALTER COLUMN payment_date TYPE date USING payment_date::date;
ALTER TABLE finance.erp_payables ALTER COLUMN due_date TYPE date USING due_date::date;
ALTER TABLE finance.erp_payables ALTER COLUMN invoice_date TYPE date USING invoice_date::date;
ALTER TABLE finance.erp_payment_records ALTER COLUMN invoice_date TYPE date USING invoice_date::date;
ALTER TABLE finance.erp_payment_records ALTER COLUMN payment_date TYPE date USING payment_date::date;
ALTER TABLE finance.erp_receivables ALTER COLUMN due_date TYPE date USING due_date::date;
ALTER TABLE finance.erp_receivables ALTER COLUMN invoice_date TYPE date USING invoice_date::date;
ALTER TABLE finance.settlement_snapshots ALTER COLUMN settlement_date TYPE date USING settlement_date::date;
ALTER TABLE mes.equipment_oee ALTER COLUMN record_date TYPE date USING record_date::date;
ALTER TABLE mes.work_reports ALTER COLUMN report_date TYPE date USING report_date::date;
ALTER TABLE pm.contract_milestones ALTER COLUMN actual_date TYPE date USING actual_date::date;
ALTER TABLE pm.contract_milestones ALTER COLUMN target_date TYPE date USING target_date::date;
ALTER TABLE pm.contract_payment_schedule ALTER COLUMN actual_payment_date TYPE date USING actual_payment_date::date;
ALTER TABLE pm.contract_payment_schedule ALTER COLUMN due_date TYPE date USING due_date::date;
ALTER TABLE pm.project_risks ALTER COLUMN response_due_date TYPE date USING response_due_date::date;

-- test=timestamptz → 5433 改 timestamptz（4 列）
ALTER TABLE crm.sales_orders ALTER COLUMN order_date TYPE timestamptz USING order_date::timestamptz;
ALTER TABLE erp.fixed_assets ALTER COLUMN purchase_date TYPE timestamptz USING purchase_date::timestamptz;
ALTER TABLE lims.instrument_calibrations ALTER COLUMN calibration_date TYPE timestamptz USING calibration_date::timestamptz;
ALTER TABLE lims.samples ALTER COLUMN received_date TYPE timestamptz USING received_date::timestamptz;
