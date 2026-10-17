-- BE-09 未闭环项 3a: finance.expenses 补 6 列（currency/sub_category/project_id/employee_id/payment_method/voucher_id）
-- 消除 operational.rs row_to_expense_json 中的 null 占位

ALTER TABLE "finance"."expenses" ADD COLUMN IF NOT EXISTS currency VARCHAR(8) DEFAULT 'CNY';
ALTER TABLE "finance"."expenses" ADD COLUMN IF NOT EXISTS sub_category VARCHAR(64);
ALTER TABLE "finance"."expenses" ADD COLUMN IF NOT EXISTS project_id UUID;
ALTER TABLE "finance"."expenses" ADD COLUMN IF NOT EXISTS employee_id UUID;
ALTER TABLE "finance"."expenses" ADD COLUMN IF NOT EXISTS payment_method VARCHAR(32);
ALTER TABLE "finance"."expenses" ADD COLUMN IF NOT EXISTS voucher_id UUID;
