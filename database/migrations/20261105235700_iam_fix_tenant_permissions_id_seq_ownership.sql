-- ============================================================
-- 修正 tenant_permissions_id_seq 归属守卫缺陷（B）
--
-- 缺陷来源：20261105235000_test_baseline_20_reverse_tables.sql#L317-L324
--   守卫写成 IF to_regclass('public') IS NULL —— to_regclass('public') 恒为 NULL
--   （'public' 不是可解析的关系名），故该块永远 RETURN，OWNED BY 从未执行。
--
-- 实测（2026-11-05）：
--   prod：public.tenant_permissions_id_seq 已通过 pg_depend(deptype='a',
--         refobjid=public.tenant_permissions, refobjsubid=1) 归属到 id → 本迁移 no-op。
--   test：无任何 pg_depend 记录，pg_get_serial_sequence 返回 NULL → 需真正执行。
--
-- 处置：正确守卫目标表与目标列，已归属则 SKIP，否则执行
--   ALTER SEQUENCE ... OWNED BY public.tenant_permissions.id。
-- 幂等：重复执行命中「已归属」分支。
-- ============================================================

SET lock_timeout = '5s';

DO $$
BEGIN
  IF to_regclass('public.tenant_permissions') IS NULL THEN
    RAISE NOTICE 'SKIP owned-by: public.tenant_permissions missing';
    RETURN;
  END IF;
  IF to_regclass('public.tenant_permissions_id_seq') IS NULL THEN
    RAISE NOTICE 'SKIP owned-by: public.tenant_permissions_id_seq missing';
    RETURN;
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM pg_attribute
    WHERE attrelid = to_regclass('public.tenant_permissions')
      AND attname = 'id'
      AND NOT attisdropped
  ) THEN
    RAISE NOTICE 'SKIP owned-by: public.tenant_permissions.id missing';
    RETURN;
  END IF;
  IF EXISTS (
    SELECT 1
    FROM pg_depend d
    JOIN pg_attribute a ON a.attrelid = d.refobjid AND a.attnum = d.refobjsubid
    WHERE d.classid = 'pg_class'::regclass
      AND d.refclassid = 'pg_class'::regclass
      AND d.objid = to_regclass('public.tenant_permissions_id_seq')
      AND d.refobjid = to_regclass('public.tenant_permissions')
      AND a.attname = 'id'
      AND d.deptype IN ('a', 'i')
  ) THEN
    RAISE NOTICE 'SKIP owned-by: already owned by public.tenant_permissions.id';
    RETURN;
  END IF;
  ALTER SEQUENCE public.tenant_permissions_id_seq OWNED BY public.tenant_permissions.id;
  RAISE NOTICE 'FIXED owned-by: public.tenant_permissions_id_seq -> public.tenant_permissions.id';
END $$;
