-- =============================================================================
-- DROP 5433 迁移链残留表（5432 已演进掉的反向独有表，表级对齐）
-- 由 2026-10-07 表级系统性收敛（304 独有表补链）后暴露的反向差异
-- 这些表仅存在于 5433（空库重放迁移链的历史残留），5432 已无，且无任何
-- 5433 表 FK 引用（已核验），DROP 安全
-- =============================================================================

DROP TABLE IF EXISTS "public"."_archive_core_workflow_tasks";
DROP TABLE IF EXISTS "public"."core_dashboard_refresh_log";
DROP TABLE IF EXISTS "public"."core_subscriptions";
DROP TABLE IF EXISTS "public"."core_usage_records";
DROP TABLE IF EXISTS "public"."dashboard_stats";
DROP TABLE IF EXISTS "public"."financial_records";
DROP TABLE IF EXISTS "public"."inspection_records";
DROP TABLE IF EXISTS "public"."production_plans";
DROP TABLE IF EXISTS "public"."supply_chain_orders";
DROP TABLE IF EXISTS "public"."tool_permissions";
