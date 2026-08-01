-- B-2: 为 core_finance_vouchers 添加 template_id 列
-- 修复 usage_stats 端点 generated_voucher_count 固定返回 0 的问题：
-- 凭证模板表实际为 finance_voucher_templates（id 为 UUID 类型），
-- 因此 template_id 使用 UUID 类型并引用 finance_voucher_templates(id)。
-- 迁移可重复执行（IF NOT EXISTS）。

ALTER TABLE core_finance_vouchers
    ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES finance_voucher_templates(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_vouchers_template_id
    ON core_finance_vouchers(template_id) WHERE template_id IS NOT NULL;
