-- 000099: 后端数据多语言第二批（字段级双语列）——
--   iam 用户 full_name / hrm 部门名 / crm 客户名 / master-data 字典类型与字典项名
-- 目的：在已有中文字段之外新增英文备用列，运行时按 Accept-Language 由 SQL CASE WHEN 切换：
--         CASE WHEN $lang = 'en' THEN COALESCE(name_en, name) ELSE name END AS name
--       未提供英文时 COALESCE 回退到中文原列，保证向后兼容。
-- 兼容性：幂等（ADD COLUMN IF NOT EXISTS），双库（5432 / 5433）可重放。

-- 1. iam 用户：全名英文列
ALTER TABLE public.core_users ADD COLUMN IF NOT EXISTS full_name_en VARCHAR(128);

-- 2. hrm 部门：部门名英文列
ALTER TABLE hrm.departments ADD COLUMN IF NOT EXISTS name_en VARCHAR(255);

-- 3. crm 客户：客户名英文列
ALTER TABLE crm.customers ADD COLUMN IF NOT EXISTS name_en VARCHAR(255);

-- 4. master-data 字典类型：类型名英文列
ALTER TABLE master_data.core_dict_types ADD COLUMN IF NOT EXISTS name_en VARCHAR(255);

-- 5. master-data 字典项：项名英文列
ALTER TABLE master_data.core_dict_items ADD COLUMN IF NOT EXISTS name_en VARCHAR(255);
