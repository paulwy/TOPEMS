-- portal 帮助中心 4 张表（core_faqs / core_guides / core_guide_lessons /
-- core_guide_progress）：帮助内容为平台级全局共享数据（faq/guide handler
-- 无任何租户过滤），种子数据在服务启动时无租户上下文写入。
-- 005-help.sql 中 tenant_id 为 NOT NULL，导致：
--   1) 迁移建库环境下种子 INSERT（不含 tenant_id）违反 NOT NULL 直接失败，
--      FAQ/指南种子数据永远无法写入；
--   2) 与全局共享语义冲突。
-- 本迁移：补列（兼容仅由服务建表的旧库）+ 放宽为可空（NULL = 共享行，
-- 与全库 RLS "tenant_id IS NULL 放行" 语义一致）。幂等。

ALTER TABLE public.core_faqs ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE public.core_guides ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE public.core_guide_lessons ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE public.core_guide_progress ADD COLUMN IF NOT EXISTS tenant_id UUID;

ALTER TABLE public.core_faqs ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.core_guides ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.core_guide_lessons ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.core_guide_progress ALTER COLUMN tenant_id DROP NOT NULL;
