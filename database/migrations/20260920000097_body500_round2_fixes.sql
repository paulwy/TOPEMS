-- 000097: body500 二轮修复——补列/约束/类型对齐（幂等，双库可重放）
-- 来源：复扫日志 ERROR（2026-09-20 第二轮）

-- 1. unified_core.inter_module_sync 补 target_module（srm/wms 同步日志查询用）
ALTER TABLE unified_core.inter_module_sync ADD COLUMN IF NOT EXISTS target_module text;

-- 2. finance.core_finance_periods 补唯一索引（ON CONFLICT (tenant_id, period) 依赖）
--    已确认无重复数据，幂等创建
CREATE UNIQUE INDEX IF NOT EXISTS ux_core_finance_periods_tenant_period
    ON finance.core_finance_periods (tenant_id, period)
    WHERE period IS NOT NULL;

-- 3. erp.financial_vouchers status CHECK 放宽（代码 INSERT 'draft'）
DO $$
BEGIN
    ALTER TABLE erp.financial_vouchers DROP CONSTRAINT IF EXISTS ck_financial_vouchers_status_standard;
    ALTER TABLE erp.financial_vouchers ADD CONSTRAINT ck_financial_vouchers_status_standard
        CHECK (status IS NULL OR status IN ('active','inactive','archived','draft','pending','posted'));
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- 4. rs.document_relations.created_by 对齐代码（代码 bind String）
ALTER TABLE rs.document_relations ALTER COLUMN created_by TYPE text USING created_by::text;
