-- ============================================================
-- DB-25：恢复 CASCADE 顺带删除的 FK 约束（第四十三轮遗留）
--
-- 背景：第四十三轮在 prepare/5433 用 `DROP TABLE ... CASCADE` 清理 public 历史残壳
--   （public.mobile_users / public.qa_ehs_*）。CASCADE 只删指向残壳的 FK 约束、
--   不删引用表本身，但导致仍保留的引用表失去这些外键约束。
--
-- 范围（幂等，库无关）：
--   1. 10 条 public 引用表 → mobile.mobile_users(id)（ON DELETE CASCADE，与 prod 一致）
--   2. 4 条 public 引用表 → ehs.qa_ehs_*(id)
--   引用表/权威表任一缺失则跳过；约束已存在（含 P4 已重指向）则跳过。
--
-- 安全：先 ADD ... NOT VALID，仅当孤儿行 = 0 时再 VALIDATE；
--   有孤儿则保持 NOT VALID（新行仍受约束，存量数据留待业务清理）。
-- 全部为 ADD CONSTRAINT，无 DROP/CASCADE，可重复执行。
-- ============================================================

SET lock_timeout = '5s';

DO $$
DECLARE
  r record;
  n bigint;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      -- 引用表                        约束名                                                 列              权威表                          ON DELETE
      ('public.barcode_scans',        'barcode_scans_user_id_fkey',                          'user_id',      'mobile.mobile_users',          'ON DELETE CASCADE'),
      ('public.devices',              'devices_user_id_fkey',                                'user_id',      'mobile.mobile_users',          'ON DELETE CASCADE'),
      ('public.mobile_scan_records',  'mobile_scan_records_user_id_fkey',                    'user_id',      'mobile.mobile_users',          'ON DELETE CASCADE'),
      ('public.offline_operations',   'offline_operations_user_id_fkey',                     'user_id',      'mobile.mobile_users',          'ON DELETE CASCADE'),
      ('public.offline_sync_records', 'offline_sync_records_user_id_fkey',                   'user_id',      'mobile.mobile_users',          'ON DELETE CASCADE'),
      ('public.photo_uploads',        'photo_uploads_user_id_fkey',                          'user_id',      'mobile.mobile_users',          'ON DELETE CASCADE'),
      ('public.push_devices',         'push_devices_user_id_fkey',                           'user_id',      'mobile.mobile_users',          'ON DELETE CASCADE'),
      ('public.shortcuts',            'shortcuts_user_id_fkey',                              'user_id',      'mobile.mobile_users',          'ON DELETE CASCADE'),
      ('public.sync_policies',        'sync_policies_user_id_fkey',                          'user_id',      'mobile.mobile_users',          'ON DELETE CASCADE'),
      ('public.user_settings',        'user_settings_user_id_fkey',                          'user_id',      'mobile.mobile_users',          'ON DELETE CASCADE'),
      ('public.qa_ehs_compliance_items',  'qa_ehs_compliance_items_evaluation_id_fkey',      'evaluation_id','ehs.qa_ehs_compliance_evaluations', ''),
      ('public.qa_ehs_compliance_items',  'qa_ehs_compliance_items_regulation_id_fkey',      'regulation_id','ehs.qa_ehs_environmental_regulations', ''),
      ('public.qa_ehs_detection_records','qa_ehs_detection_records_factor_id_fkey',         'factor_id',    'ehs.qa_ehs_hazard_factors',    ''),
      ('public.qa_ehs_hazards',           'qa_ehs_hazards_inspection_id_fkey',               'inspection_id','ehs.qa_ehs_inspection_records','')
    ) AS v(tbl, con, col, rt, del)
  LOOP
    IF to_regclass(r.tbl) IS NULL OR to_regclass(r.rt) IS NULL THEN
      RAISE NOTICE 'skip (table missing): %.%', r.tbl, r.con;
      CONTINUE;
    END IF;

    IF EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = to_regclass(r.tbl) AND conname = r.con
    ) THEN
      RAISE NOTICE 'skip (constraint exists): %.%', r.tbl, r.con;
      CONTINUE;
    END IF;

    EXECUTE format(
      'ALTER TABLE %s ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES %s(id) %s NOT VALID',
      r.tbl, r.con, r.col, r.rt, r.del
    );

    EXECUTE format(
      'SELECT count(*) FROM %s t LEFT JOIN %s r ON t.%I = r.id WHERE t.%I IS NOT NULL AND r.id IS NULL',
      r.tbl, r.rt, r.col, r.col
    ) INTO n;

    IF n = 0 THEN
      EXECUTE format('ALTER TABLE %s VALIDATE CONSTRAINT %I', r.tbl, r.con);
      RAISE NOTICE 'restored + validated: %.% (→ %)', r.tbl, r.con, r.rt;
    ELSE
      RAISE NOTICE 'restored (NOT VALID, orphans=%): %.% (→ %)', n, r.tbl, r.con, r.rt;
    END IF;
  END LOOP;
END $$;
