-- 000098: 后端数据多语言（字段级双语列）——ERP 公告 + PM 项目名
-- 目的：在已有中文字段（title/content/name）之外新增英文备用列，
--       运行时按 Accept-Language 由 SQL CASE WHEN 切换：
--         CASE WHEN $lang = 'en' THEN COALESCE(title_en, title) ELSE title END
--       未提供英文时 COALESCE 回退到中文原列，保证向后兼容。
-- 兼容性：幂等（ADD COLUMN IF NOT EXISTS），双库（5432 / 5433）可重放。

-- 1. erp.announcements：标题 + 正文英文列
ALTER TABLE erp.announcements ADD COLUMN IF NOT EXISTS title_en  VARCHAR(500);
ALTER TABLE erp.announcements ADD COLUMN IF NOT EXISTS content_en TEXT;

-- 2. pm.projects：项目名英文列
ALTER TABLE pm.projects ADD COLUMN IF NOT EXISTS name_en VARCHAR(500);
