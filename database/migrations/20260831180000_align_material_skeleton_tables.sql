-- ================================================================================
-- 20260831180000_align_material_skeleton_tables.sql
-- 空库重建 material 骨架对齐（20260831190100 的 public→mes 归位前置）
-- ================================================================================
-- 背景（2026-09-18 全链验证发现）：business_base_tables（20260725000000）为
-- material 系列表创建了 public/mes 双侧裸骨架（id,deleted_at），使
-- 20260831190100_material_schema_migrate（public→mes 归位 + 归档）的
-- ALTER TABLE public.material_categories SET SCHEMA mes 报
-- "relation already exists in schema mes"（目标 schema 已有同名骨架）。
-- 处理：DROP 掉 mes 侧 3 张骨架（categories/requirement_items/plans），
--       还原为 20260831190100 期望的"mes 无同名"初始态：
--         - public.material_categories/requirement_items → 由 20260831190100 搬入 mes
--         - public.material_boms 等 6 张 → 由 20260831190100 归档 _archive_*
--         - mes.material_plans 由 20260908000003 以完整结构重建（CREATE IF NOT EXISTS）
-- 幂等：DROP TABLE IF EXISTS（仅空库重建路径；5432 不应用本迁移）。
-- ================================================================================

DROP TABLE IF EXISTS "mes"."material_categories";
DROP TABLE IF EXISTS "mes"."material_requirement_items";
DROP TABLE IF EXISTS "mes"."material_plans";
