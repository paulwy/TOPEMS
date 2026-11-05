-- ============================================================
-- erp_dictionaries 下线（A）· 数据表删除
--
-- 背景：mes.erp_dictionaries 是 20261021000008_crm_tags_erp_dictionaries.sql#L7
--   以「无 schema 前缀」建表的产物，落点取决于执行时 search_path；prod 实际落在
--   mes，而 erp 服务池固定 SEARCH_PATH=erp, public，裸名解析不到 → 功能 100% 不可用。
--   2026-11-05 确认：prod 该表 0 行、0 入站 FK；erp./public. 均无同名表；
--   test 任何 schema 均无该表。
--
-- 处置：prod 执行前已用 pg_dump -Fc -t mes.erp_dictionaries 单表归档，随后本迁移删除。
--
-- 重建链维度：不改历史迁移文件字节（checksum），本迁移同时清理
--   public.erp_dictionaries —— 空库重建时 20261021000008 以默认 search_path 建在 public，
--   由本迁移删除，确保重建终态不再产出该表。
--
-- 安全：to_regclass + relkind 守卫；有行则 RAISE EXCEPTION（拒绝静默丢数）；
--   DROP TABLE ... RESTRICT（无 CASCADE）。
-- 幂等：表已不存在时整段 no-op。
-- ============================================================

SET lock_timeout = '5s';
SET statement_timeout = '60s';

DO $$
DECLARE
  v_rows bigint;
BEGIN
  IF to_regclass('mes.erp_dictionaries') IS NULL THEN
    RAISE NOTICE 'SKIP mes.erp_dictionaries: absent';
    RETURN;
  END IF;
  IF (SELECT relkind::text FROM pg_class WHERE oid = to_regclass('mes.erp_dictionaries')) <> 'r' THEN
    RAISE NOTICE 'SKIP mes.erp_dictionaries: relkind not r';
    RETURN;
  END IF;
  SELECT count(*) INTO v_rows FROM mes.erp_dictionaries;
  IF v_rows > 0 THEN
    RAISE EXCEPTION 'ABORT mes.erp_dictionaries: % row(s) present, archive first', v_rows;
  END IF;
  DROP TABLE mes.erp_dictionaries RESTRICT;
  RAISE NOTICE 'DROPPED mes.erp_dictionaries';
END $$;

DO $$
DECLARE
  v_rows bigint;
BEGIN
  IF to_regclass('public.erp_dictionaries') IS NULL THEN
    RAISE NOTICE 'SKIP public.erp_dictionaries: absent';
    RETURN;
  END IF;
  IF (SELECT relkind::text FROM pg_class WHERE oid = to_regclass('public.erp_dictionaries')) <> 'r' THEN
    RAISE NOTICE 'SKIP public.erp_dictionaries: relkind not r';
    RETURN;
  END IF;
  SELECT count(*) INTO v_rows FROM public.erp_dictionaries;
  IF v_rows > 0 THEN
    RAISE EXCEPTION 'ABORT public.erp_dictionaries: % row(s) present, archive first', v_rows;
  END IF;
  DROP TABLE public.erp_dictionaries RESTRICT;
  RAISE NOTICE 'DROPPED public.erp_dictionaries';
END $$;

-- 终态断言：两条落点均不得存在
DO $$
DECLARE
  v_left text;
BEGIN
  SELECT string_agg(t, ', ') INTO v_left
  FROM unnest(ARRAY['mes.erp_dictionaries', 'public.erp_dictionaries']) AS t
  WHERE to_regclass(t) IS NOT NULL;
  IF v_left IS NOT NULL THEN
    RAISE EXCEPTION 'ABORT: erp_dictionaries still exists: %', v_left;
  END IF;
  RAISE NOTICE 'OK: erp_dictionaries absent in mes/public';
END $$;
