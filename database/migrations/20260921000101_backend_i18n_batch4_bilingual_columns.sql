-- 000101: 后端数据多语言第四批（字段级双语列）——
--   qms 检验项 product_name / item_name、wms 仓库名、erp 客户名、erp 供应商名（新增英文备用列）
-- 目的：在已有中文字段之外新增英文备用列，运行时按 Accept-Language 由 SQL CASE WHEN 切换：
--         CASE WHEN $lang = 'en' THEN COALESCE(<col>_en, <col>) ELSE <col> END AS <col>
--       未提供英文时 COALESCE 回退到中文原列，保证向后兼容。
-- 说明：
--   - erp.customers 与 crm.customers 是两张不同 schema 的表，各自加 name_en 列，互不影响。
--   - 搜索仍按中文原名（* ILIKE 不动）；合并/回退读取保留原始列，不用 CASE 后的值。
-- 兼容性：幂等（ADD COLUMN IF NOT EXISTS），双库（5432 / 5433）可重放。

-- 1. qms 质量检验单：检验产品名英文列
ALTER TABLE qms.qa_quality_inspections ADD COLUMN IF NOT EXISTS product_name_en VARCHAR(255);

-- 2. qms 检验结果明细：检验项名英文列
ALTER TABLE qms.qa_inspection_results ADD COLUMN IF NOT EXISTS item_name_en VARCHAR(255);

-- 3. wms 仓库：仓库名英文列（真实列名 warehouse_name，SELECT 别名为 name）
ALTER TABLE wms.warehouses ADD COLUMN IF NOT EXISTS warehouse_name_en VARCHAR(255);

-- 4. erp 客户：客户名英文列
ALTER TABLE erp.customers ADD COLUMN IF NOT EXISTS name_en VARCHAR(255);

-- 5. erp 供应商：供应商名英文列
ALTER TABLE erp.suppliers ADD COLUMN IF NOT EXISTS name_en VARCHAR(255);
