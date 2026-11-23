-- ============================================================
-- 20261123142000_search_projection_v2_company_scope.rollback.sql
--
-- 回滚：删除 public.search_entity_projections_v2。
--
-- 影响（必须知悉）：
--   * 直接 DROP TABLE，表中已双写/回填的投影数据全部丢失；
--   * 搜索读取仍走 v1（本轮未切流），因此业务查询不受影响；
--   * 双写代码若仍在运行，会因缺表持续告警并进入重试队列——
--     回滚代码前先停用 v2 双写或接受告警。
--
-- 幂等性：DROP TABLE IF EXISTS；文件内不含 BEGIN/COMMIT。
-- ============================================================

SET lock_timeout = '5s';
SET statement_timeout = '120s';

DROP TABLE IF EXISTS public.search_entity_projections_v2;

DO $w13_v2_rb_assert$
BEGIN
    IF to_regclass('public.search_entity_projections_v2') IS NOT NULL THEN
        RAISE EXCEPTION '回滚后置断言失败：public.search_entity_projections_v2 仍存在';
    END IF;
END
$w13_v2_rb_assert$;
