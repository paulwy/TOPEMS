-- 000100: 后端数据多语言第三批（字段级双语列）——
--   scm 供应商名 / tms 承运商名（新增英文备用列）
-- 目的：在已有中文字段之外新增英文备用列，运行时按 Accept-Language 由 SQL CASE WHEN 切换：
--         CASE WHEN $lang = 'en' THEN COALESCE(name_en, name) ELSE name END AS name
--       未提供英文时 COALESCE 回退到中文原列，保证向后兼容。
-- 说明：
--   - iam 用户 full_name_en 已在 000099 加好，本批次不重复添加（本批仅补齐其读取 SELECT）。
--   - crm 客户 name_en 已在 000099 加好，本批仅调整其 L1 缓存 key 增加 locale 维度。
-- 兼容性：幂等（ADD COLUMN IF NOT EXISTS），双库（5432 / 5433）可重放。

-- 1. scm 供应商：供应商名英文列
ALTER TABLE scm.suppliers ADD COLUMN IF NOT EXISTS name_en VARCHAR(255);

-- 2. tms 承运商：承运商名英文列
ALTER TABLE tms.tms_carriers ADD COLUMN IF NOT EXISTS name_en VARCHAR(255);
