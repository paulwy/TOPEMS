-- 2026-09-01 plugin-registry 建表预留治理：public.core_plugin_* 归位清理
-- 审计结论：
--   - core schema 为插件功能真实数据层（core.core_plugin_*，由 plugin-registry 显式 core.* 查询）
--   - public.core_plugin_* 为旧副本/建表残留（含裸名查询已全部改显式 core.*，search_path 改 core, public）
--   - core_plugin_pricing 两个 schema 均不存在（建表代码残留，无需处理）
--   - 逐表：categories(9 vs core 15)/instances(25 vs core 32)/plugins(25 vs core 32)/tenant_plugins(2 vs core 4)
--            navigation(0)/permissions(0)/reviews(0)/versions(0) 为空影子
DROP TABLE IF EXISTS public.core_plugin_categories;
DROP TABLE IF EXISTS public.core_plugin_instances;
DROP TABLE IF EXISTS public.core_plugin_navigation;
DROP TABLE IF EXISTS public.core_plugin_permissions;
DROP TABLE IF EXISTS public.core_plugin_reviews;
DROP TABLE IF EXISTS public.core_plugin_versions;
DROP TABLE IF EXISTS public.core_tenant_plugins;
DROP TABLE IF EXISTS public.core_plugins;
