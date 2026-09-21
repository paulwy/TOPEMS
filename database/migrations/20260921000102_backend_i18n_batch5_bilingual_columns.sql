-- 000102: 后端数据多语言第五批（字段级双语列）——
--   mes 工单产品名 product_name、mes 设备名 equipment_name（新增英文备用列）
--   finance 科目名 name 复用既有 name_en 列（本批次不重复加列）
-- 目的：在已有中文字段之外新增英文备用列，运行时按 Accept-Language 由 SQL CASE WHEN 切换：
--         CASE WHEN $lang = 'en' THEN COALESCE(<col>_en, <col>) ELSE <col> END AS <col>
--       未提供英文时 COALESCE 回退到中文原列，保证向后兼容。
-- 说明：
--   - finance.core_finance_accounts.name_en 列在本批次之前已存在，仅在 SELECT 层套 CASE，不重复加列。
--   - mes.production_orders.product_name 与 mes.equipment.equipment_name 为本次新增英文列。
--   - 搜索仍按中文原名（* ILIKE 不动）；合并/回退读取保留原始列，不用 CASE 后的值。
-- 兼容性：幂等（ADD COLUMN IF NOT EXISTS），双库（5432 / 5433）可重放。

-- 1. mes 生产工单：产品名英文列（用户可见字段 product_name）
ALTER TABLE mes.production_orders ADD COLUMN IF NOT EXISTS product_name_en VARCHAR(255);

-- 2. mes 设备：设备名英文列（真实列名 equipment_name，SELECT 别名为 name）
ALTER TABLE mes.equipment ADD COLUMN IF NOT EXISTS equipment_name_en VARCHAR(255);
