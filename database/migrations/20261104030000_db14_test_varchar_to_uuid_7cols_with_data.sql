-- ============================================================
-- DB-14: test varchar→uuid 7 列（有数据，转零 uuid）
--
-- 背景：类型批次——test=varchar, cur=uuid，test 对齐 5433/prod。
-- 关键实测（2026-11-03）：有数据，非合法 uuid 值（system/test_admin/user-1/user-2）
-- 转零 uuid（'00000000-0000-0000-0000-000000000000'）后 ALTER。
-- ============================================================

SET lock_timeout = '5s';

-- 转非合法 uuid → 零 uuid
UPDATE finance.core_finance_payment_approval_config SET created_by = '00000000-0000-0000-0000-000000000000' WHERE created_by = 'system';
UPDATE finance.erp_collection_records SET created_by = '00000000-0000-0000-0000-000000000000' WHERE created_by = 'test_admin';
UPDATE finance.erp_payment_records SET created_by = '00000000-0000-0000-0000-000000000000' WHERE created_by = 'test_admin';
UPDATE public.user_settings SET user_id = '00000000-0000-0000-0000-000000000000' WHERE user_id IN ('user-1','user-2');

-- ALTER TYPE uuid
ALTER TABLE finance.core_finance_payment_approval_config ALTER COLUMN created_by TYPE uuid USING created_by::uuid;
ALTER TABLE finance.core_finance_payments ALTER COLUMN approved_by TYPE uuid USING approved_by::uuid;
ALTER TABLE finance.core_finance_payments ALTER COLUMN created_by TYPE uuid USING created_by::uuid;
ALTER TABLE finance.core_finance_payments ALTER COLUMN executed_by TYPE uuid USING executed_by::uuid;
ALTER TABLE finance.erp_collection_records ALTER COLUMN created_by TYPE uuid USING created_by::uuid;
ALTER TABLE finance.erp_payment_records ALTER COLUMN created_by TYPE uuid USING created_by::uuid;
ALTER TABLE public.user_settings ALTER COLUMN user_id TYPE uuid USING user_id::uuid;
