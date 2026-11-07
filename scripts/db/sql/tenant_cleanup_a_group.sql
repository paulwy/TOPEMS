-- 窗口第三段：A 组清理（4 张表，按表独立事务）
-- 用法：psql "$DSN" -X -v ON_ERROR_STOP=1 -f scripts/db/sql/tenant_cleanup_a_group.sql
--
-- 已定口径：refs 121 / returns 18 / risks 19 / monitors 36（14:14 实测 121/19/20/38）。
-- 窗口现场重测，数量不写死；每表：
--   预统计目标行 → DELETE → 行数核对（DELETE = 预统计）→ 目标残留 0 → 非目标行数不变。
-- 任一断言失败：该表事务内 RAISE EXCEPTION，psql ON_ERROR_STOP=1 立即中止，
-- 已提交的前序表用备份恢复（见窗口总表“回滚”）。

\set ON_ERROR_STOP on

-- ============ 3.1 crm.crm_master_data_refs（无 id 列，主键 master_data_id）============
BEGIN;
SET LOCAL app.rls_system = 'on';
DO $$
DECLARE
  n_target bigint;
  n_deleted bigint;
  n_left bigint;
  n_other_before bigint;
  n_other_after bigint;
BEGIN
  SELECT count(*) INTO n_other_before FROM crm.crm_master_data_refs
   WHERE NOT (tenant_id = '00000000-0000-0000-0000-000000000000' AND local_entity_id IS NULL);

  SELECT count(*) INTO n_target FROM crm.crm_master_data_refs
   WHERE tenant_id = '00000000-0000-0000-0000-000000000000'
     AND local_entity_id IS NULL;
  IF n_target = 0 THEN
    RAISE EXCEPTION 'refs 目标 0 行：可能已清理或判据失效，拒绝继续';
  END IF;

  DELETE FROM crm.crm_master_data_refs
   WHERE tenant_id = '00000000-0000-0000-0000-000000000000'
     AND local_entity_id IS NULL;
  GET DIAGNOSTICS n_deleted = ROW_COUNT;
  IF n_deleted <> n_target THEN
    RAISE EXCEPTION 'refs 删除行数不一致：预统计 %，实际 DELETE %', n_target, n_deleted;
  END IF;

  SELECT count(*) INTO n_left FROM crm.crm_master_data_refs
   WHERE tenant_id = '00000000-0000-0000-0000-000000000000'
     AND local_entity_id IS NULL;
  IF n_left <> 0 THEN
    RAISE EXCEPTION 'refs 残留 % 行目标数据', n_left;
  END IF;

  SELECT count(*) INTO n_other_after FROM crm.crm_master_data_refs
   WHERE NOT (tenant_id = '00000000-0000-0000-0000-000000000000' AND local_entity_id IS NULL);
  IF n_other_after <> n_other_before THEN
    RAISE EXCEPTION 'refs 非目标行数变化：before=% after=%', n_other_before, n_other_after;
  END IF;

  RAISE NOTICE 'CLEANUP|refs|target=%|deleted=%|remaining_total=%',
               n_target, n_deleted, n_other_after;
END $$;
COMMIT;

-- ============ 3.2 crm.returns ============
BEGIN;
SET LOCAL app.rls_system = 'on';
DO $$
DECLARE
  n_target bigint;
  n_deleted bigint;
  n_left bigint;
  n_other_before bigint;
  n_other_after bigint;
BEGIN
  SELECT count(*) INTO n_other_before FROM crm.returns
   WHERE NOT (tenant_id = '00000000-0000-0000-0000-000000000000'
              AND customer_id IS NULL
              AND created_by = 'e91e2228-ab9d-4ac3-99f4-fdcd9c723f21');

  SELECT count(*) INTO n_target FROM crm.returns
   WHERE tenant_id = '00000000-0000-0000-0000-000000000000'
     AND customer_id IS NULL
     AND created_by = 'e91e2228-ab9d-4ac3-99f4-fdcd9c723f21';
  IF n_target = 0 THEN
    RAISE EXCEPTION 'returns 目标 0 行：可能已清理或判据失效，拒绝继续';
  END IF;

  DELETE FROM crm.returns
   WHERE tenant_id = '00000000-0000-0000-0000-000000000000'
     AND customer_id IS NULL
     AND created_by = 'e91e2228-ab9d-4ac3-99f4-fdcd9c723f21';
  GET DIAGNOSTICS n_deleted = ROW_COUNT;
  IF n_deleted <> n_target THEN
    RAISE EXCEPTION 'returns 删除行数不一致：预统计 %，实际 DELETE %', n_target, n_deleted;
  END IF;

  SELECT count(*) INTO n_left FROM crm.returns
   WHERE tenant_id = '00000000-0000-0000-0000-000000000000'
     AND customer_id IS NULL
     AND created_by = 'e91e2228-ab9d-4ac3-99f4-fdcd9c723f21';
  IF n_left <> 0 THEN
    RAISE EXCEPTION 'returns 残留 % 行目标数据', n_left;
  END IF;

  SELECT count(*) INTO n_other_after FROM crm.returns
   WHERE NOT (tenant_id = '00000000-0000-0000-0000-000000000000'
              AND customer_id IS NULL
              AND created_by = 'e91e2228-ab9d-4ac3-99f4-fdcd9c723f21');
  IF n_other_after <> n_other_before THEN
    RAISE EXCEPTION 'returns 非目标行数变化：before=% after=%', n_other_before, n_other_after;
  END IF;

  RAISE NOTICE 'CLEANUP|returns|target=%|deleted=%|remaining_total=%',
               n_target, n_deleted, n_other_after;
END $$;
COMMIT;

-- ============ 3.3 ehs.qa_ehs_risks ============
BEGIN;
SET LOCAL app.rls_system = 'on';
DO $$
DECLARE
  n_target bigint;
  n_deleted bigint;
  n_left bigint;
  n_other_before bigint;
  n_other_after bigint;
BEGIN
  SELECT count(*) INTO n_other_before FROM ehs.qa_ehs_risks
   WHERE NOT (tenant_id = '00000000-0000-0000-0000-000000000000'
              AND title = '未命名风险' AND created_by IS NULL);

  SELECT count(*) INTO n_target FROM ehs.qa_ehs_risks
   WHERE tenant_id = '00000000-0000-0000-0000-000000000000'
     AND title = '未命名风险' AND created_by IS NULL;
  IF n_target = 0 THEN
    RAISE EXCEPTION 'risks 目标 0 行：可能已清理或判据失效，拒绝继续';
  END IF;

  DELETE FROM ehs.qa_ehs_risks
   WHERE tenant_id = '00000000-0000-0000-0000-000000000000'
     AND title = '未命名风险' AND created_by IS NULL;
  GET DIAGNOSTICS n_deleted = ROW_COUNT;
  IF n_deleted <> n_target THEN
    RAISE EXCEPTION 'risks 删除行数不一致：预统计 %，实际 DELETE %', n_target, n_deleted;
  END IF;

  SELECT count(*) INTO n_left FROM ehs.qa_ehs_risks
   WHERE tenant_id = '00000000-0000-0000-0000-000000000000'
     AND title = '未命名风险' AND created_by IS NULL;
  IF n_left <> 0 THEN
    RAISE EXCEPTION 'risks 残留 % 行目标数据', n_left;
  END IF;

  SELECT count(*) INTO n_other_after FROM ehs.qa_ehs_risks
   WHERE NOT (tenant_id = '00000000-0000-0000-0000-000000000000'
              AND title = '未命名风险' AND created_by IS NULL);
  IF n_other_after <> n_other_before THEN
    RAISE EXCEPTION 'risks 非目标行数变化：before=% after=%', n_other_before, n_other_after;
  END IF;

  RAISE NOTICE 'CLEANUP|risks|target=%|deleted=%|remaining_total=%',
               n_target, n_deleted, n_other_after;
END $$;
COMMIT;

-- ============ 3.4 ehs.qa_ehs_environment_monitors ============
BEGIN;
SET LOCAL app.rls_system = 'on';
DO $$
DECLARE
  n_target bigint;
  n_deleted bigint;
  n_left bigint;
  n_other_before bigint;
  n_other_after bigint;
BEGIN
  SELECT count(*) INTO n_other_before FROM ehs.qa_ehs_environment_monitors
   WHERE NOT (tenant_id = '00000000-0000-0000-0000-000000000000'
              AND name = '未命名监测点' AND COALESCE(created_by, '') = '');

  SELECT count(*) INTO n_target FROM ehs.qa_ehs_environment_monitors
   WHERE tenant_id = '00000000-0000-0000-0000-000000000000'
     AND name = '未命名监测点' AND COALESCE(created_by, '') = '';
  IF n_target = 0 THEN
    RAISE EXCEPTION 'monitors 目标 0 行：可能已清理或判据失效，拒绝继续';
  END IF;

  DELETE FROM ehs.qa_ehs_environment_monitors
   WHERE tenant_id = '00000000-0000-0000-0000-000000000000'
     AND name = '未命名监测点' AND COALESCE(created_by, '') = '';
  GET DIAGNOSTICS n_deleted = ROW_COUNT;
  IF n_deleted <> n_target THEN
    RAISE EXCEPTION 'monitors 删除行数不一致：预统计 %，实际 DELETE %', n_target, n_deleted;
  END IF;

  SELECT count(*) INTO n_left FROM ehs.qa_ehs_environment_monitors
   WHERE tenant_id = '00000000-0000-0000-0000-000000000000'
     AND name = '未命名监测点' AND COALESCE(created_by, '') = '';
  IF n_left <> 0 THEN
    RAISE EXCEPTION 'monitors 残留 % 行目标数据', n_left;
  END IF;

  SELECT count(*) INTO n_other_after FROM ehs.qa_ehs_environment_monitors
   WHERE NOT (tenant_id = '00000000-0000-0000-0000-000000000000'
              AND name = '未命名监测点' AND COALESCE(created_by, '') = '');
  IF n_other_after <> n_other_before THEN
    RAISE EXCEPTION 'monitors 非目标行数变化：before=% after=%', n_other_before, n_other_after;
  END IF;

  RAISE NOTICE 'CLEANUP|monitors|target=%|deleted=%|remaining_total=%',
               n_target, n_deleted, n_other_after;
END $$;
COMMIT;

-- 不删表守住基线（写入执行记录；任何变化都说明误伤）
SELECT 'CLEANUP|guard|customers_total|' || count(*) FROM crm.customers;
SELECT 'CLEANUP|guard|audit_total|' || count(*) FROM public.audit_logs;
SELECT 'CLEANUP|guard|audit_0099|' || count(*) FROM public.audit_logs
 WHERE tenant_id = '00000000-0000-0000-0000-000000000000'
   AND entity_id = '00000000-0000-0000-0000-000000000099';
