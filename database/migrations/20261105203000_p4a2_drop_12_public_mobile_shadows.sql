-- ============================================================
-- P4 反向表清理 · A2 批：public 移动端影子 12 张
--
-- 依据：docs/quality/p4-reverse-tables-triage-2026-11-05.md §4.2（可直删）。
-- 判据：0 行、0 入站 FK、运行时 0 命中本表（mobile 服务裸名在 mobile,public 下解析到 mobile.*，权威表为 mobile.mobile_users 等）。
-- 安全：逐表 to_regclass 守卫 + relkind/count/入站 FK/视图/函数依赖校验；
--   一律 DROP TABLE ... RESTRICT，禁止 CASCADE；校验不满足或 DROP 失败即跳过并 NOTICE。
-- 幂等：表已不存在时跳过。
-- 备份：全库 ~/topems/backups/topems_prod_pre_p4rem_20261105_122001.dump（4,226,439 字节，
--   pg_restore -l 8279 行）；单表归档见 ~/topems/backups/p4_rem_20261105/。
-- 回滚：对单表归档执行 pg_restore -d topems_prod -t '<schema>.<table>' <dump>。
-- ============================================================

SET lock_timeout = '5s';
SET statement_timeout = '60s';

DO $$
DECLARE v_rows bigint;
BEGIN
  IF to_regclass('public.barcode_scans') IS NULL THEN RAISE NOTICE 'P4 SKIP public.barcode_scans: not exists'; RETURN; END IF;
  IF (SELECT relkind::text FROM pg_class WHERE oid = to_regclass('public.barcode_scans')) <> 'r' THEN RAISE NOTICE 'P4 SKIP public.barcode_scans: relkind not r'; RETURN; END IF;
  SELECT count(*) INTO v_rows FROM public.barcode_scans;
  IF v_rows <> 0 THEN RAISE NOTICE 'P4 SKIP public.barcode_scans: rows=% (expected 0)', v_rows; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'f' AND confrelid = to_regclass('public.barcode_scans')) THEN RAISE NOTICE 'P4 SKIP public.barcode_scans: inbound FK exists'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_depend d JOIN pg_class c ON c.oid = d.objid WHERE d.refobjid = to_regclass('public.barcode_scans') AND c.relkind IN ('v','m')) THEN RAISE NOTICE 'P4 SKIP public.barcode_scans: view dependency'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_depend d WHERE d.refobjid = to_regclass('public.barcode_scans') AND d.classid = 'pg_proc'::regclass) THEN RAISE NOTICE 'P4 SKIP public.barcode_scans: function dependency'; RETURN; END IF;
  BEGIN
    DROP TABLE public.barcode_scans RESTRICT;
    RAISE NOTICE 'P4 DROPPED public.barcode_scans';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'P4 SKIP public.barcode_scans: drop failed: %', SQLERRM;
  END;
END $$;

DO $$
DECLARE v_rows bigint;
BEGIN
  IF to_regclass('public.devices') IS NULL THEN RAISE NOTICE 'P4 SKIP public.devices: not exists'; RETURN; END IF;
  IF (SELECT relkind::text FROM pg_class WHERE oid = to_regclass('public.devices')) <> 'r' THEN RAISE NOTICE 'P4 SKIP public.devices: relkind not r'; RETURN; END IF;
  SELECT count(*) INTO v_rows FROM public.devices;
  IF v_rows <> 0 THEN RAISE NOTICE 'P4 SKIP public.devices: rows=% (expected 0)', v_rows; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'f' AND confrelid = to_regclass('public.devices')) THEN RAISE NOTICE 'P4 SKIP public.devices: inbound FK exists'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_depend d JOIN pg_class c ON c.oid = d.objid WHERE d.refobjid = to_regclass('public.devices') AND c.relkind IN ('v','m')) THEN RAISE NOTICE 'P4 SKIP public.devices: view dependency'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_depend d WHERE d.refobjid = to_regclass('public.devices') AND d.classid = 'pg_proc'::regclass) THEN RAISE NOTICE 'P4 SKIP public.devices: function dependency'; RETURN; END IF;
  BEGIN
    DROP TABLE public.devices RESTRICT;
    RAISE NOTICE 'P4 DROPPED public.devices';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'P4 SKIP public.devices: drop failed: %', SQLERRM;
  END;
END $$;

DO $$
DECLARE v_rows bigint;
BEGIN
  IF to_regclass('public.media_files') IS NULL THEN RAISE NOTICE 'P4 SKIP public.media_files: not exists'; RETURN; END IF;
  IF (SELECT relkind::text FROM pg_class WHERE oid = to_regclass('public.media_files')) <> 'r' THEN RAISE NOTICE 'P4 SKIP public.media_files: relkind not r'; RETURN; END IF;
  SELECT count(*) INTO v_rows FROM public.media_files;
  IF v_rows <> 0 THEN RAISE NOTICE 'P4 SKIP public.media_files: rows=% (expected 0)', v_rows; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'f' AND confrelid = to_regclass('public.media_files')) THEN RAISE NOTICE 'P4 SKIP public.media_files: inbound FK exists'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_depend d JOIN pg_class c ON c.oid = d.objid WHERE d.refobjid = to_regclass('public.media_files') AND c.relkind IN ('v','m')) THEN RAISE NOTICE 'P4 SKIP public.media_files: view dependency'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_depend d WHERE d.refobjid = to_regclass('public.media_files') AND d.classid = 'pg_proc'::regclass) THEN RAISE NOTICE 'P4 SKIP public.media_files: function dependency'; RETURN; END IF;
  BEGIN
    DROP TABLE public.media_files RESTRICT;
    RAISE NOTICE 'P4 DROPPED public.media_files';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'P4 SKIP public.media_files: drop failed: %', SQLERRM;
  END;
END $$;

DO $$
DECLARE v_rows bigint;
BEGIN
  IF to_regclass('public.mobile_scan_records') IS NULL THEN RAISE NOTICE 'P4 SKIP public.mobile_scan_records: not exists'; RETURN; END IF;
  IF (SELECT relkind::text FROM pg_class WHERE oid = to_regclass('public.mobile_scan_records')) <> 'r' THEN RAISE NOTICE 'P4 SKIP public.mobile_scan_records: relkind not r'; RETURN; END IF;
  SELECT count(*) INTO v_rows FROM public.mobile_scan_records;
  IF v_rows <> 0 THEN RAISE NOTICE 'P4 SKIP public.mobile_scan_records: rows=% (expected 0)', v_rows; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'f' AND confrelid = to_regclass('public.mobile_scan_records')) THEN RAISE NOTICE 'P4 SKIP public.mobile_scan_records: inbound FK exists'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_depend d JOIN pg_class c ON c.oid = d.objid WHERE d.refobjid = to_regclass('public.mobile_scan_records') AND c.relkind IN ('v','m')) THEN RAISE NOTICE 'P4 SKIP public.mobile_scan_records: view dependency'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_depend d WHERE d.refobjid = to_regclass('public.mobile_scan_records') AND d.classid = 'pg_proc'::regclass) THEN RAISE NOTICE 'P4 SKIP public.mobile_scan_records: function dependency'; RETURN; END IF;
  BEGIN
    DROP TABLE public.mobile_scan_records RESTRICT;
    RAISE NOTICE 'P4 DROPPED public.mobile_scan_records';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'P4 SKIP public.mobile_scan_records: drop failed: %', SQLERRM;
  END;
END $$;

DO $$
DECLARE v_rows bigint;
BEGIN
  IF to_regclass('public.offline_operations') IS NULL THEN RAISE NOTICE 'P4 SKIP public.offline_operations: not exists'; RETURN; END IF;
  IF (SELECT relkind::text FROM pg_class WHERE oid = to_regclass('public.offline_operations')) <> 'r' THEN RAISE NOTICE 'P4 SKIP public.offline_operations: relkind not r'; RETURN; END IF;
  SELECT count(*) INTO v_rows FROM public.offline_operations;
  IF v_rows <> 0 THEN RAISE NOTICE 'P4 SKIP public.offline_operations: rows=% (expected 0)', v_rows; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'f' AND confrelid = to_regclass('public.offline_operations')) THEN RAISE NOTICE 'P4 SKIP public.offline_operations: inbound FK exists'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_depend d JOIN pg_class c ON c.oid = d.objid WHERE d.refobjid = to_regclass('public.offline_operations') AND c.relkind IN ('v','m')) THEN RAISE NOTICE 'P4 SKIP public.offline_operations: view dependency'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_depend d WHERE d.refobjid = to_regclass('public.offline_operations') AND d.classid = 'pg_proc'::regclass) THEN RAISE NOTICE 'P4 SKIP public.offline_operations: function dependency'; RETURN; END IF;
  BEGIN
    DROP TABLE public.offline_operations RESTRICT;
    RAISE NOTICE 'P4 DROPPED public.offline_operations';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'P4 SKIP public.offline_operations: drop failed: %', SQLERRM;
  END;
END $$;

DO $$
DECLARE v_rows bigint;
BEGIN
  IF to_regclass('public.offline_sync_records') IS NULL THEN RAISE NOTICE 'P4 SKIP public.offline_sync_records: not exists'; RETURN; END IF;
  IF (SELECT relkind::text FROM pg_class WHERE oid = to_regclass('public.offline_sync_records')) <> 'r' THEN RAISE NOTICE 'P4 SKIP public.offline_sync_records: relkind not r'; RETURN; END IF;
  SELECT count(*) INTO v_rows FROM public.offline_sync_records;
  IF v_rows <> 0 THEN RAISE NOTICE 'P4 SKIP public.offline_sync_records: rows=% (expected 0)', v_rows; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'f' AND confrelid = to_regclass('public.offline_sync_records')) THEN RAISE NOTICE 'P4 SKIP public.offline_sync_records: inbound FK exists'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_depend d JOIN pg_class c ON c.oid = d.objid WHERE d.refobjid = to_regclass('public.offline_sync_records') AND c.relkind IN ('v','m')) THEN RAISE NOTICE 'P4 SKIP public.offline_sync_records: view dependency'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_depend d WHERE d.refobjid = to_regclass('public.offline_sync_records') AND d.classid = 'pg_proc'::regclass) THEN RAISE NOTICE 'P4 SKIP public.offline_sync_records: function dependency'; RETURN; END IF;
  BEGIN
    DROP TABLE public.offline_sync_records RESTRICT;
    RAISE NOTICE 'P4 DROPPED public.offline_sync_records';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'P4 SKIP public.offline_sync_records: drop failed: %', SQLERRM;
  END;
END $$;

DO $$
DECLARE v_rows bigint;
BEGIN
  IF to_regclass('public.photo_uploads') IS NULL THEN RAISE NOTICE 'P4 SKIP public.photo_uploads: not exists'; RETURN; END IF;
  IF (SELECT relkind::text FROM pg_class WHERE oid = to_regclass('public.photo_uploads')) <> 'r' THEN RAISE NOTICE 'P4 SKIP public.photo_uploads: relkind not r'; RETURN; END IF;
  SELECT count(*) INTO v_rows FROM public.photo_uploads;
  IF v_rows <> 0 THEN RAISE NOTICE 'P4 SKIP public.photo_uploads: rows=% (expected 0)', v_rows; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'f' AND confrelid = to_regclass('public.photo_uploads')) THEN RAISE NOTICE 'P4 SKIP public.photo_uploads: inbound FK exists'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_depend d JOIN pg_class c ON c.oid = d.objid WHERE d.refobjid = to_regclass('public.photo_uploads') AND c.relkind IN ('v','m')) THEN RAISE NOTICE 'P4 SKIP public.photo_uploads: view dependency'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_depend d WHERE d.refobjid = to_regclass('public.photo_uploads') AND d.classid = 'pg_proc'::regclass) THEN RAISE NOTICE 'P4 SKIP public.photo_uploads: function dependency'; RETURN; END IF;
  BEGIN
    DROP TABLE public.photo_uploads RESTRICT;
    RAISE NOTICE 'P4 DROPPED public.photo_uploads';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'P4 SKIP public.photo_uploads: drop failed: %', SQLERRM;
  END;
END $$;

DO $$
DECLARE v_rows bigint;
BEGIN
  IF to_regclass('public.push_devices') IS NULL THEN RAISE NOTICE 'P4 SKIP public.push_devices: not exists'; RETURN; END IF;
  IF (SELECT relkind::text FROM pg_class WHERE oid = to_regclass('public.push_devices')) <> 'r' THEN RAISE NOTICE 'P4 SKIP public.push_devices: relkind not r'; RETURN; END IF;
  SELECT count(*) INTO v_rows FROM public.push_devices;
  IF v_rows <> 0 THEN RAISE NOTICE 'P4 SKIP public.push_devices: rows=% (expected 0)', v_rows; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'f' AND confrelid = to_regclass('public.push_devices')) THEN RAISE NOTICE 'P4 SKIP public.push_devices: inbound FK exists'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_depend d JOIN pg_class c ON c.oid = d.objid WHERE d.refobjid = to_regclass('public.push_devices') AND c.relkind IN ('v','m')) THEN RAISE NOTICE 'P4 SKIP public.push_devices: view dependency'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_depend d WHERE d.refobjid = to_regclass('public.push_devices') AND d.classid = 'pg_proc'::regclass) THEN RAISE NOTICE 'P4 SKIP public.push_devices: function dependency'; RETURN; END IF;
  BEGIN
    DROP TABLE public.push_devices RESTRICT;
    RAISE NOTICE 'P4 DROPPED public.push_devices';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'P4 SKIP public.push_devices: drop failed: %', SQLERRM;
  END;
END $$;

DO $$
DECLARE v_rows bigint;
BEGIN
  IF to_regclass('public.push_notifications') IS NULL THEN RAISE NOTICE 'P4 SKIP public.push_notifications: not exists'; RETURN; END IF;
  IF (SELECT relkind::text FROM pg_class WHERE oid = to_regclass('public.push_notifications')) <> 'r' THEN RAISE NOTICE 'P4 SKIP public.push_notifications: relkind not r'; RETURN; END IF;
  SELECT count(*) INTO v_rows FROM public.push_notifications;
  IF v_rows <> 0 THEN RAISE NOTICE 'P4 SKIP public.push_notifications: rows=% (expected 0)', v_rows; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'f' AND confrelid = to_regclass('public.push_notifications')) THEN RAISE NOTICE 'P4 SKIP public.push_notifications: inbound FK exists'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_depend d JOIN pg_class c ON c.oid = d.objid WHERE d.refobjid = to_regclass('public.push_notifications') AND c.relkind IN ('v','m')) THEN RAISE NOTICE 'P4 SKIP public.push_notifications: view dependency'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_depend d WHERE d.refobjid = to_regclass('public.push_notifications') AND d.classid = 'pg_proc'::regclass) THEN RAISE NOTICE 'P4 SKIP public.push_notifications: function dependency'; RETURN; END IF;
  BEGIN
    DROP TABLE public.push_notifications RESTRICT;
    RAISE NOTICE 'P4 DROPPED public.push_notifications';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'P4 SKIP public.push_notifications: drop failed: %', SQLERRM;
  END;
END $$;

DO $$
DECLARE v_rows bigint;
BEGIN
  IF to_regclass('public.push_templates') IS NULL THEN RAISE NOTICE 'P4 SKIP public.push_templates: not exists'; RETURN; END IF;
  IF (SELECT relkind::text FROM pg_class WHERE oid = to_regclass('public.push_templates')) <> 'r' THEN RAISE NOTICE 'P4 SKIP public.push_templates: relkind not r'; RETURN; END IF;
  SELECT count(*) INTO v_rows FROM public.push_templates;
  IF v_rows <> 0 THEN RAISE NOTICE 'P4 SKIP public.push_templates: rows=% (expected 0)', v_rows; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'f' AND confrelid = to_regclass('public.push_templates')) THEN RAISE NOTICE 'P4 SKIP public.push_templates: inbound FK exists'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_depend d JOIN pg_class c ON c.oid = d.objid WHERE d.refobjid = to_regclass('public.push_templates') AND c.relkind IN ('v','m')) THEN RAISE NOTICE 'P4 SKIP public.push_templates: view dependency'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_depend d WHERE d.refobjid = to_regclass('public.push_templates') AND d.classid = 'pg_proc'::regclass) THEN RAISE NOTICE 'P4 SKIP public.push_templates: function dependency'; RETURN; END IF;
  BEGIN
    DROP TABLE public.push_templates RESTRICT;
    RAISE NOTICE 'P4 DROPPED public.push_templates';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'P4 SKIP public.push_templates: drop failed: %', SQLERRM;
  END;
END $$;

DO $$
DECLARE v_rows bigint;
BEGIN
  IF to_regclass('public.shortcuts') IS NULL THEN RAISE NOTICE 'P4 SKIP public.shortcuts: not exists'; RETURN; END IF;
  IF (SELECT relkind::text FROM pg_class WHERE oid = to_regclass('public.shortcuts')) <> 'r' THEN RAISE NOTICE 'P4 SKIP public.shortcuts: relkind not r'; RETURN; END IF;
  SELECT count(*) INTO v_rows FROM public.shortcuts;
  IF v_rows <> 0 THEN RAISE NOTICE 'P4 SKIP public.shortcuts: rows=% (expected 0)', v_rows; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'f' AND confrelid = to_regclass('public.shortcuts')) THEN RAISE NOTICE 'P4 SKIP public.shortcuts: inbound FK exists'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_depend d JOIN pg_class c ON c.oid = d.objid WHERE d.refobjid = to_regclass('public.shortcuts') AND c.relkind IN ('v','m')) THEN RAISE NOTICE 'P4 SKIP public.shortcuts: view dependency'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_depend d WHERE d.refobjid = to_regclass('public.shortcuts') AND d.classid = 'pg_proc'::regclass) THEN RAISE NOTICE 'P4 SKIP public.shortcuts: function dependency'; RETURN; END IF;
  BEGIN
    DROP TABLE public.shortcuts RESTRICT;
    RAISE NOTICE 'P4 DROPPED public.shortcuts';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'P4 SKIP public.shortcuts: drop failed: %', SQLERRM;
  END;
END $$;

DO $$
DECLARE v_rows bigint;
BEGIN
  IF to_regclass('public.sync_policies') IS NULL THEN RAISE NOTICE 'P4 SKIP public.sync_policies: not exists'; RETURN; END IF;
  IF (SELECT relkind::text FROM pg_class WHERE oid = to_regclass('public.sync_policies')) <> 'r' THEN RAISE NOTICE 'P4 SKIP public.sync_policies: relkind not r'; RETURN; END IF;
  SELECT count(*) INTO v_rows FROM public.sync_policies;
  IF v_rows <> 0 THEN RAISE NOTICE 'P4 SKIP public.sync_policies: rows=% (expected 0)', v_rows; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'f' AND confrelid = to_regclass('public.sync_policies')) THEN RAISE NOTICE 'P4 SKIP public.sync_policies: inbound FK exists'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_depend d JOIN pg_class c ON c.oid = d.objid WHERE d.refobjid = to_regclass('public.sync_policies') AND c.relkind IN ('v','m')) THEN RAISE NOTICE 'P4 SKIP public.sync_policies: view dependency'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_depend d WHERE d.refobjid = to_regclass('public.sync_policies') AND d.classid = 'pg_proc'::regclass) THEN RAISE NOTICE 'P4 SKIP public.sync_policies: function dependency'; RETURN; END IF;
  BEGIN
    DROP TABLE public.sync_policies RESTRICT;
    RAISE NOTICE 'P4 DROPPED public.sync_policies';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'P4 SKIP public.sync_policies: drop failed: %', SQLERRM;
  END;
END $$;
