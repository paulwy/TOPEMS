-- ============================================================
-- 20260908000001_plugin_core_schema_guard.sql
-- 遗留⑪闭环（2026-09-08）：core schema 插件表归属冲突治理
--
-- 背景：
--   - core.core_plugin_*（plugins/versions/reviews/tenant_plugins/categories/
--     instances/permissions）为插件功能真实数据层（20260901000023 审计背书）
--   - 003-plugin.sql 与 plugin-registry 代码建表均为"裸名"（依赖连接 search_path=core）
--   - 若在 search_path 非 core 的会话重放/执行，表会落 public 导致代码 core.* 访问失败
--
-- 本迁移（幂等，可在任意 search_path 下安全执行）：
--   1. 将可能落在 public 的历史插件表搬回 core（防污染兜底）
--   2. 显式预建 core.core_plugin_navigation（该表历史仅由代码建，补入迁移链）
-- ============================================================

-- 1) public 影子表归位 core（幂等：不存在则跳过）
ALTER TABLE IF EXISTS public.core_plugins SET SCHEMA core;
ALTER TABLE IF EXISTS public.core_plugin_versions SET SCHEMA core;
ALTER TABLE IF EXISTS public.core_plugin_reviews SET SCHEMA core;
ALTER TABLE IF EXISTS public.core_tenant_plugins SET SCHEMA core;
ALTER TABLE IF EXISTS public.core_plugin_categories SET SCHEMA core;
ALTER TABLE IF EXISTS public.core_plugin_instances SET SCHEMA core;
ALTER TABLE IF EXISTS public.core_plugin_permissions SET SCHEMA core;
ALTER TABLE IF EXISTS public.core_plugin_navigation SET SCHEMA core;

-- 2) 显式预建 core.core_plugin_navigation（与 plugin-registry 代码建表结构一致）
CREATE TABLE IF NOT EXISTS core.core_plugin_navigation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plugin_code VARCHAR(64) NOT NULL UNIQUE,
    nav_config JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_core_plugin_navigation_code
    ON core.core_plugin_navigation(plugin_code);
