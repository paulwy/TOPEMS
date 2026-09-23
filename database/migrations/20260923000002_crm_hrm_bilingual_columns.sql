-- 补齐 crm + hrm 服务代码已引用但数据库缺失的 *_en 双语列（6 表）
-- 全部可空 text，与代码中 Option<String> 绑定一致

ALTER TABLE crm.contracts ADD COLUMN IF NOT EXISTS title_en text;
ALTER TABLE crm.customer_segments ADD COLUMN IF NOT EXISTS name_en text;
ALTER TABLE crm.opportunities ADD COLUMN IF NOT EXISTS name_en text;
ALTER TABLE crm.tags ADD COLUMN IF NOT EXISTS name_en text;
ALTER TABLE hrm.employees ADD COLUMN IF NOT EXISTS name_en text;
ALTER TABLE hrm.positions ADD COLUMN IF NOT EXISTS name_en text;
