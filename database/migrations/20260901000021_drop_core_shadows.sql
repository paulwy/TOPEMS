-- 2026-09-01 清理 core_* 影子/死表（4 张）：
--   core_faqs/core_guides(public 12=12)  portal schema 有同名活表（portal search_path 解析到 portal 版），public 为影子
--   core_documents/core_plugin_pricing  全代码 0 提及（无建表代码重建）纯死表
-- 其余 core_plugin_* 由 plugin-registry(unified-core) search_path=public 建表，DROP 会被重建 → 保留（建表无查询预留）
DROP TABLE IF EXISTS public.core_faqs CASCADE;
DROP TABLE IF EXISTS public.core_guides CASCADE;
DROP TABLE IF EXISTS public.core_documents CASCADE;
DROP TABLE IF EXISTS public.core_plugin_pricing CASCADE;
