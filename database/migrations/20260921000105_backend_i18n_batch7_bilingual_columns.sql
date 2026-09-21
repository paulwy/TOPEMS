-- 000105: 后端数据多语言第七批（字段级双语列）——
--   pm 任务标题 title、hrm 职位名 name、hrm 员工名 name、
--   crm 商机名 name、crm 合同标题 title、crm 标签名 name、crm 客户分群名 name、
--   erp 资产类别名 name（新增英文备用列）
-- 目的：在已有中文字段之外新增英文备用列，运行时按 Accept-Language 由 SQL CASE WHEN 切换：
--         CASE WHEN $lang = 'en' THEN COALESCE(<col>_en, <col>) ELSE <col> END AS <col>
--       未提供英文时 COALESCE 回退到中文原列，保证向后兼容。
-- 说明：
--   - 搜索仍按中文原名（* ILIKE 不动）；合并/回退读取保留原始列，不用 CASE 后的值。
--   - crm.opportunities.customer_name 为冗余快照字段，不翻译；hrm/contracts 内部 join 别名不改。
--   - 正文/描述大文本（如 customer_segments.description）不翻译；status/枚举/编号类不做。
-- 兼容性：幂等（ADD COLUMN IF NOT EXISTS），双库（5432 / 5433）可重放。

-- 1. pm 任务：任务标题英文列（用户可见字段 title）
ALTER TABLE pm.pm_tasks ADD COLUMN IF NOT EXISTS title_en VARCHAR(255);

-- 2. hrm 职位：职位名英文列（用户可见字段 name）
ALTER TABLE hrm.positions ADD COLUMN IF NOT EXISTS name_en VARCHAR(255);

-- 3. hrm 员工：员工姓名英文列（用户可见字段 e.name）
ALTER TABLE hrm.employees ADD COLUMN IF NOT EXISTS name_en VARCHAR(255);

-- 4. crm 商机：商机名英文列（用户可见字段 name；customer_name 快照不改）
ALTER TABLE crm.opportunities ADD COLUMN IF NOT EXISTS name_en VARCHAR(255);

-- 5. crm 合同：合同标题英文列（用户可见字段 title）
ALTER TABLE crm.contracts ADD COLUMN IF NOT EXISTS title_en VARCHAR(255);

-- 6. crm 标签：标签名英文列（用户可见字段 name）
ALTER TABLE crm.tags ADD COLUMN IF NOT EXISTS name_en VARCHAR(255);

-- 7. crm 客户分群：分群名英文列（用户可见字段 name；description 大文本不翻译）
ALTER TABLE crm.customer_segments ADD COLUMN IF NOT EXISTS name_en VARCHAR(255);

-- 8. erp 资产类别：类别名英文列（用户可见字段 name）
ALTER TABLE erp.asset_categories ADD COLUMN IF NOT EXISTS name_en VARCHAR(255);
