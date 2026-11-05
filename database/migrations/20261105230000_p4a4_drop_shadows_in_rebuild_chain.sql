-- ============================================================
-- P4 反向表清理 · 迁移链纠偏（空库重建终态对齐 prod）
--
-- 背景：39 张 public/mes 影子表由历史迁移与 database/init 创建。已发布迁移不可改写
--   （会破坏现有库 checksum），故追加本「删除段」：空库重建时先被早期迁移建出，
--   再由本迁移删除，终态与 prod 一致。database/init/05_mobile_init.sql 的 12 处
--   CREATE 直接移除（见同名提交），不依赖本迁移兜底。
--
-- 判据：39 张均为 0 行、0 入站 FK、运行时代码 0 命中本表（prod 已删，见
--   docs/quality/p4-reverse-tables-triage-2026-11-05.md §4 / §14）。
--
-- 顺序陷阱：core_chat_members / core_chat_messages 出站 FK 指向 core_chat_rooms，
--   故子表先删；其余目标表的出站 FK 全部指向保留表，无表间删除依赖。
--   另有一类仅重建路径可能出现的入站 FK（20261007000006 在 iam./mes.core_chat_* 上
--   追加 → public.core_chat_rooms）：prod 无此类约束，本迁移先自动解除，避免 RESTRICT 失败。
--
-- 安全：逐表 to_regclass + relkind + 行数守卫，DROP TABLE ... RESTRICT（无 CASCADE）；
--   末尾断言 39 张全部不存在，否则迁移失败（不放宽校验）。
-- 幂等：prod 上全部表已不存在，整段为 no-op。
-- ============================================================

SET lock_timeout = '5s';
SET statement_timeout = '60s';

-- ---------- 预步骤：解除指向目标表的入站 FK（仅重建路径可能存在） ----------

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT con.conname, cn.nspname AS child_schema, cc.relname AS child_table,
           pn.nspname AS parent_schema, pc.relname AS parent_table
    FROM pg_constraint con
    JOIN pg_class cc ON cc.oid = con.conrelid
    JOIN pg_namespace cn ON cn.oid = cc.relnamespace
    JOIN pg_class pc ON pc.oid = con.confrelid
    JOIN pg_namespace pn ON pn.oid = pc.relnamespace
    WHERE con.contype = 'f'
      AND (pn.nspname, pc.relname) IN (VALUES
        ('public','core_chat_members'),
        ('public','core_chat_messages'),
        ('public','core_chat_rooms'),
        ('public','qa_ehs_discharge_permits'),
        ('public','qa_ehs_disease_cases'),
        ('public','qa_ehs_drill_evaluations'),
        ('public','qa_ehs_drill_problems'),
        ('public','qa_ehs_emergency_plan_approvals'),
        ('public','qa_ehs_emergency_plan_supplies'),
        ('public','qa_ehs_emergency_plan_versions'),
        ('public','qa_ehs_employees'),
        ('public','qa_ehs_env_monitor_records'),
        ('public','qa_ehs_environment_incidents'),
        ('public','qa_ehs_inspection_record_items'),
        ('public','qa_ehs_msds'),
        ('public','barcode_scans'),
        ('public','devices'),
        ('public','media_files'),
        ('public','mobile_scan_records'),
        ('public','offline_operations'),
        ('public','offline_sync_records'),
        ('public','photo_uploads'),
        ('public','push_devices'),
        ('public','push_notifications'),
        ('public','push_templates'),
        ('public','shortcuts'),
        ('public','sync_policies'),
        ('public','core_comments'),
        ('public','core_favorites'),
        ('public','core_email_templates'),
        ('public','core_mobile_offline_records'),
        ('public','reports'),
        ('public','report_templates'),
        ('public','report_schedules'),
        ('public','cqrs_projection_progress'),
        ('public','quality_records'),
        ('mes','permission_audit_logs'),
        ('mes','schema_registry'),
        ('mes','tool_permissions'))
      AND (cn.nspname, cc.relname) NOT IN (VALUES
        ('public','core_chat_members'),
        ('public','core_chat_messages'),
        ('public','core_chat_rooms'),
        ('public','qa_ehs_discharge_permits'),
        ('public','qa_ehs_disease_cases'),
        ('public','qa_ehs_drill_evaluations'),
        ('public','qa_ehs_drill_problems'),
        ('public','qa_ehs_emergency_plan_approvals'),
        ('public','qa_ehs_emergency_plan_supplies'),
        ('public','qa_ehs_emergency_plan_versions'),
        ('public','qa_ehs_employees'),
        ('public','qa_ehs_env_monitor_records'),
        ('public','qa_ehs_environment_incidents'),
        ('public','qa_ehs_inspection_record_items'),
        ('public','qa_ehs_msds'),
        ('public','barcode_scans'),
        ('public','devices'),
        ('public','media_files'),
        ('public','mobile_scan_records'),
        ('public','offline_operations'),
        ('public','offline_sync_records'),
        ('public','photo_uploads'),
        ('public','push_devices'),
        ('public','push_notifications'),
        ('public','push_templates'),
        ('public','shortcuts'),
        ('public','sync_policies'),
        ('public','core_comments'),
        ('public','core_favorites'),
        ('public','core_email_templates'),
        ('public','core_mobile_offline_records'),
        ('public','reports'),
        ('public','report_templates'),
        ('public','report_schedules'),
        ('public','cqrs_projection_progress'),
        ('public','quality_records'),
        ('mes','permission_audit_logs'),
        ('mes','schema_registry'),
        ('mes','tool_permissions'))
  LOOP
    EXECUTE format('ALTER TABLE %I.%I DROP CONSTRAINT %I', r.child_schema, r.child_table, r.conname);
    RAISE NOTICE 'P4 chain DROP inbound FK %.% -> %.%', r.child_schema, r.child_table, r.parent_schema, r.parent_table;
  END LOOP;
END $$;

DO $$
DECLARE v_rows bigint;
BEGIN
  IF to_regclass('public.core_chat_members') IS NULL THEN RETURN; END IF;
  IF (SELECT relkind::text FROM pg_class WHERE oid = to_regclass('public.core_chat_members')) <> 'r' THEN RAISE NOTICE 'P4 chain SKIP public.core_chat_members: relkind not r'; RETURN; END IF;
  SELECT count(*) INTO v_rows FROM public.core_chat_members;
  IF v_rows > 0 THEN RAISE NOTICE 'P4 chain SKIP public.core_chat_members: rows=% (expected 0 in rebuild)', v_rows; RETURN; END IF;
  BEGIN
    DROP TABLE public.core_chat_members RESTRICT;
    RAISE NOTICE 'P4 chain DROPPED public.core_chat_members';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'P4 chain SKIP public.core_chat_members: drop failed: %', SQLERRM;
  END;
END $$;

DO $$
DECLARE v_rows bigint;
BEGIN
  IF to_regclass('public.core_chat_messages') IS NULL THEN RETURN; END IF;
  IF (SELECT relkind::text FROM pg_class WHERE oid = to_regclass('public.core_chat_messages')) <> 'r' THEN RAISE NOTICE 'P4 chain SKIP public.core_chat_messages: relkind not r'; RETURN; END IF;
  SELECT count(*) INTO v_rows FROM public.core_chat_messages;
  IF v_rows > 0 THEN RAISE NOTICE 'P4 chain SKIP public.core_chat_messages: rows=% (expected 0 in rebuild)', v_rows; RETURN; END IF;
  BEGIN
    DROP TABLE public.core_chat_messages RESTRICT;
    RAISE NOTICE 'P4 chain DROPPED public.core_chat_messages';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'P4 chain SKIP public.core_chat_messages: drop failed: %', SQLERRM;
  END;
END $$;

DO $$
DECLARE v_rows bigint;
BEGIN
  IF to_regclass('public.core_chat_rooms') IS NULL THEN RETURN; END IF;
  IF (SELECT relkind::text FROM pg_class WHERE oid = to_regclass('public.core_chat_rooms')) <> 'r' THEN RAISE NOTICE 'P4 chain SKIP public.core_chat_rooms: relkind not r'; RETURN; END IF;
  SELECT count(*) INTO v_rows FROM public.core_chat_rooms;
  IF v_rows > 0 THEN RAISE NOTICE 'P4 chain SKIP public.core_chat_rooms: rows=% (expected 0 in rebuild)', v_rows; RETURN; END IF;
  BEGIN
    DROP TABLE public.core_chat_rooms RESTRICT;
    RAISE NOTICE 'P4 chain DROPPED public.core_chat_rooms';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'P4 chain SKIP public.core_chat_rooms: drop failed: %', SQLERRM;
  END;
END $$;

DO $$
DECLARE v_rows bigint;
BEGIN
  IF to_regclass('public.qa_ehs_discharge_permits') IS NULL THEN RETURN; END IF;
  IF (SELECT relkind::text FROM pg_class WHERE oid = to_regclass('public.qa_ehs_discharge_permits')) <> 'r' THEN RAISE NOTICE 'P4 chain SKIP public.qa_ehs_discharge_permits: relkind not r'; RETURN; END IF;
  SELECT count(*) INTO v_rows FROM public.qa_ehs_discharge_permits;
  IF v_rows > 0 THEN RAISE NOTICE 'P4 chain SKIP public.qa_ehs_discharge_permits: rows=% (expected 0 in rebuild)', v_rows; RETURN; END IF;
  BEGIN
    DROP TABLE public.qa_ehs_discharge_permits RESTRICT;
    RAISE NOTICE 'P4 chain DROPPED public.qa_ehs_discharge_permits';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'P4 chain SKIP public.qa_ehs_discharge_permits: drop failed: %', SQLERRM;
  END;
END $$;

DO $$
DECLARE v_rows bigint;
BEGIN
  IF to_regclass('public.qa_ehs_disease_cases') IS NULL THEN RETURN; END IF;
  IF (SELECT relkind::text FROM pg_class WHERE oid = to_regclass('public.qa_ehs_disease_cases')) <> 'r' THEN RAISE NOTICE 'P4 chain SKIP public.qa_ehs_disease_cases: relkind not r'; RETURN; END IF;
  SELECT count(*) INTO v_rows FROM public.qa_ehs_disease_cases;
  IF v_rows > 0 THEN RAISE NOTICE 'P4 chain SKIP public.qa_ehs_disease_cases: rows=% (expected 0 in rebuild)', v_rows; RETURN; END IF;
  BEGIN
    DROP TABLE public.qa_ehs_disease_cases RESTRICT;
    RAISE NOTICE 'P4 chain DROPPED public.qa_ehs_disease_cases';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'P4 chain SKIP public.qa_ehs_disease_cases: drop failed: %', SQLERRM;
  END;
END $$;

DO $$
DECLARE v_rows bigint;
BEGIN
  IF to_regclass('public.qa_ehs_drill_evaluations') IS NULL THEN RETURN; END IF;
  IF (SELECT relkind::text FROM pg_class WHERE oid = to_regclass('public.qa_ehs_drill_evaluations')) <> 'r' THEN RAISE NOTICE 'P4 chain SKIP public.qa_ehs_drill_evaluations: relkind not r'; RETURN; END IF;
  SELECT count(*) INTO v_rows FROM public.qa_ehs_drill_evaluations;
  IF v_rows > 0 THEN RAISE NOTICE 'P4 chain SKIP public.qa_ehs_drill_evaluations: rows=% (expected 0 in rebuild)', v_rows; RETURN; END IF;
  BEGIN
    DROP TABLE public.qa_ehs_drill_evaluations RESTRICT;
    RAISE NOTICE 'P4 chain DROPPED public.qa_ehs_drill_evaluations';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'P4 chain SKIP public.qa_ehs_drill_evaluations: drop failed: %', SQLERRM;
  END;
END $$;

DO $$
DECLARE v_rows bigint;
BEGIN
  IF to_regclass('public.qa_ehs_drill_problems') IS NULL THEN RETURN; END IF;
  IF (SELECT relkind::text FROM pg_class WHERE oid = to_regclass('public.qa_ehs_drill_problems')) <> 'r' THEN RAISE NOTICE 'P4 chain SKIP public.qa_ehs_drill_problems: relkind not r'; RETURN; END IF;
  SELECT count(*) INTO v_rows FROM public.qa_ehs_drill_problems;
  IF v_rows > 0 THEN RAISE NOTICE 'P4 chain SKIP public.qa_ehs_drill_problems: rows=% (expected 0 in rebuild)', v_rows; RETURN; END IF;
  BEGIN
    DROP TABLE public.qa_ehs_drill_problems RESTRICT;
    RAISE NOTICE 'P4 chain DROPPED public.qa_ehs_drill_problems';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'P4 chain SKIP public.qa_ehs_drill_problems: drop failed: %', SQLERRM;
  END;
END $$;

DO $$
DECLARE v_rows bigint;
BEGIN
  IF to_regclass('public.qa_ehs_emergency_plan_approvals') IS NULL THEN RETURN; END IF;
  IF (SELECT relkind::text FROM pg_class WHERE oid = to_regclass('public.qa_ehs_emergency_plan_approvals')) <> 'r' THEN RAISE NOTICE 'P4 chain SKIP public.qa_ehs_emergency_plan_approvals: relkind not r'; RETURN; END IF;
  SELECT count(*) INTO v_rows FROM public.qa_ehs_emergency_plan_approvals;
  IF v_rows > 0 THEN RAISE NOTICE 'P4 chain SKIP public.qa_ehs_emergency_plan_approvals: rows=% (expected 0 in rebuild)', v_rows; RETURN; END IF;
  BEGIN
    DROP TABLE public.qa_ehs_emergency_plan_approvals RESTRICT;
    RAISE NOTICE 'P4 chain DROPPED public.qa_ehs_emergency_plan_approvals';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'P4 chain SKIP public.qa_ehs_emergency_plan_approvals: drop failed: %', SQLERRM;
  END;
END $$;

DO $$
DECLARE v_rows bigint;
BEGIN
  IF to_regclass('public.qa_ehs_emergency_plan_supplies') IS NULL THEN RETURN; END IF;
  IF (SELECT relkind::text FROM pg_class WHERE oid = to_regclass('public.qa_ehs_emergency_plan_supplies')) <> 'r' THEN RAISE NOTICE 'P4 chain SKIP public.qa_ehs_emergency_plan_supplies: relkind not r'; RETURN; END IF;
  SELECT count(*) INTO v_rows FROM public.qa_ehs_emergency_plan_supplies;
  IF v_rows > 0 THEN RAISE NOTICE 'P4 chain SKIP public.qa_ehs_emergency_plan_supplies: rows=% (expected 0 in rebuild)', v_rows; RETURN; END IF;
  BEGIN
    DROP TABLE public.qa_ehs_emergency_plan_supplies RESTRICT;
    RAISE NOTICE 'P4 chain DROPPED public.qa_ehs_emergency_plan_supplies';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'P4 chain SKIP public.qa_ehs_emergency_plan_supplies: drop failed: %', SQLERRM;
  END;
END $$;

DO $$
DECLARE v_rows bigint;
BEGIN
  IF to_regclass('public.qa_ehs_emergency_plan_versions') IS NULL THEN RETURN; END IF;
  IF (SELECT relkind::text FROM pg_class WHERE oid = to_regclass('public.qa_ehs_emergency_plan_versions')) <> 'r' THEN RAISE NOTICE 'P4 chain SKIP public.qa_ehs_emergency_plan_versions: relkind not r'; RETURN; END IF;
  SELECT count(*) INTO v_rows FROM public.qa_ehs_emergency_plan_versions;
  IF v_rows > 0 THEN RAISE NOTICE 'P4 chain SKIP public.qa_ehs_emergency_plan_versions: rows=% (expected 0 in rebuild)', v_rows; RETURN; END IF;
  BEGIN
    DROP TABLE public.qa_ehs_emergency_plan_versions RESTRICT;
    RAISE NOTICE 'P4 chain DROPPED public.qa_ehs_emergency_plan_versions';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'P4 chain SKIP public.qa_ehs_emergency_plan_versions: drop failed: %', SQLERRM;
  END;
END $$;

DO $$
DECLARE v_rows bigint;
BEGIN
  IF to_regclass('public.qa_ehs_employees') IS NULL THEN RETURN; END IF;
  IF (SELECT relkind::text FROM pg_class WHERE oid = to_regclass('public.qa_ehs_employees')) <> 'r' THEN RAISE NOTICE 'P4 chain SKIP public.qa_ehs_employees: relkind not r'; RETURN; END IF;
  SELECT count(*) INTO v_rows FROM public.qa_ehs_employees;
  IF v_rows > 0 THEN RAISE NOTICE 'P4 chain SKIP public.qa_ehs_employees: rows=% (expected 0 in rebuild)', v_rows; RETURN; END IF;
  BEGIN
    DROP TABLE public.qa_ehs_employees RESTRICT;
    RAISE NOTICE 'P4 chain DROPPED public.qa_ehs_employees';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'P4 chain SKIP public.qa_ehs_employees: drop failed: %', SQLERRM;
  END;
END $$;

DO $$
DECLARE v_rows bigint;
BEGIN
  IF to_regclass('public.qa_ehs_env_monitor_records') IS NULL THEN RETURN; END IF;
  IF (SELECT relkind::text FROM pg_class WHERE oid = to_regclass('public.qa_ehs_env_monitor_records')) <> 'r' THEN RAISE NOTICE 'P4 chain SKIP public.qa_ehs_env_monitor_records: relkind not r'; RETURN; END IF;
  SELECT count(*) INTO v_rows FROM public.qa_ehs_env_monitor_records;
  IF v_rows > 0 THEN RAISE NOTICE 'P4 chain SKIP public.qa_ehs_env_monitor_records: rows=% (expected 0 in rebuild)', v_rows; RETURN; END IF;
  BEGIN
    DROP TABLE public.qa_ehs_env_monitor_records RESTRICT;
    RAISE NOTICE 'P4 chain DROPPED public.qa_ehs_env_monitor_records';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'P4 chain SKIP public.qa_ehs_env_monitor_records: drop failed: %', SQLERRM;
  END;
END $$;

DO $$
DECLARE v_rows bigint;
BEGIN
  IF to_regclass('public.qa_ehs_environment_incidents') IS NULL THEN RETURN; END IF;
  IF (SELECT relkind::text FROM pg_class WHERE oid = to_regclass('public.qa_ehs_environment_incidents')) <> 'r' THEN RAISE NOTICE 'P4 chain SKIP public.qa_ehs_environment_incidents: relkind not r'; RETURN; END IF;
  SELECT count(*) INTO v_rows FROM public.qa_ehs_environment_incidents;
  IF v_rows > 0 THEN RAISE NOTICE 'P4 chain SKIP public.qa_ehs_environment_incidents: rows=% (expected 0 in rebuild)', v_rows; RETURN; END IF;
  BEGIN
    DROP TABLE public.qa_ehs_environment_incidents RESTRICT;
    RAISE NOTICE 'P4 chain DROPPED public.qa_ehs_environment_incidents';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'P4 chain SKIP public.qa_ehs_environment_incidents: drop failed: %', SQLERRM;
  END;
END $$;

DO $$
DECLARE v_rows bigint;
BEGIN
  IF to_regclass('public.qa_ehs_inspection_record_items') IS NULL THEN RETURN; END IF;
  IF (SELECT relkind::text FROM pg_class WHERE oid = to_regclass('public.qa_ehs_inspection_record_items')) <> 'r' THEN RAISE NOTICE 'P4 chain SKIP public.qa_ehs_inspection_record_items: relkind not r'; RETURN; END IF;
  SELECT count(*) INTO v_rows FROM public.qa_ehs_inspection_record_items;
  IF v_rows > 0 THEN RAISE NOTICE 'P4 chain SKIP public.qa_ehs_inspection_record_items: rows=% (expected 0 in rebuild)', v_rows; RETURN; END IF;
  BEGIN
    DROP TABLE public.qa_ehs_inspection_record_items RESTRICT;
    RAISE NOTICE 'P4 chain DROPPED public.qa_ehs_inspection_record_items';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'P4 chain SKIP public.qa_ehs_inspection_record_items: drop failed: %', SQLERRM;
  END;
END $$;

DO $$
DECLARE v_rows bigint;
BEGIN
  IF to_regclass('public.qa_ehs_msds') IS NULL THEN RETURN; END IF;
  IF (SELECT relkind::text FROM pg_class WHERE oid = to_regclass('public.qa_ehs_msds')) <> 'r' THEN RAISE NOTICE 'P4 chain SKIP public.qa_ehs_msds: relkind not r'; RETURN; END IF;
  SELECT count(*) INTO v_rows FROM public.qa_ehs_msds;
  IF v_rows > 0 THEN RAISE NOTICE 'P4 chain SKIP public.qa_ehs_msds: rows=% (expected 0 in rebuild)', v_rows; RETURN; END IF;
  BEGIN
    DROP TABLE public.qa_ehs_msds RESTRICT;
    RAISE NOTICE 'P4 chain DROPPED public.qa_ehs_msds';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'P4 chain SKIP public.qa_ehs_msds: drop failed: %', SQLERRM;
  END;
END $$;

DO $$
DECLARE v_rows bigint;
BEGIN
  IF to_regclass('public.barcode_scans') IS NULL THEN RETURN; END IF;
  IF (SELECT relkind::text FROM pg_class WHERE oid = to_regclass('public.barcode_scans')) <> 'r' THEN RAISE NOTICE 'P4 chain SKIP public.barcode_scans: relkind not r'; RETURN; END IF;
  SELECT count(*) INTO v_rows FROM public.barcode_scans;
  IF v_rows > 0 THEN RAISE NOTICE 'P4 chain SKIP public.barcode_scans: rows=% (expected 0 in rebuild)', v_rows; RETURN; END IF;
  BEGIN
    DROP TABLE public.barcode_scans RESTRICT;
    RAISE NOTICE 'P4 chain DROPPED public.barcode_scans';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'P4 chain SKIP public.barcode_scans: drop failed: %', SQLERRM;
  END;
END $$;

DO $$
DECLARE v_rows bigint;
BEGIN
  IF to_regclass('public.devices') IS NULL THEN RETURN; END IF;
  IF (SELECT relkind::text FROM pg_class WHERE oid = to_regclass('public.devices')) <> 'r' THEN RAISE NOTICE 'P4 chain SKIP public.devices: relkind not r'; RETURN; END IF;
  SELECT count(*) INTO v_rows FROM public.devices;
  IF v_rows > 0 THEN RAISE NOTICE 'P4 chain SKIP public.devices: rows=% (expected 0 in rebuild)', v_rows; RETURN; END IF;
  BEGIN
    DROP TABLE public.devices RESTRICT;
    RAISE NOTICE 'P4 chain DROPPED public.devices';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'P4 chain SKIP public.devices: drop failed: %', SQLERRM;
  END;
END $$;

DO $$
DECLARE v_rows bigint;
BEGIN
  IF to_regclass('public.media_files') IS NULL THEN RETURN; END IF;
  IF (SELECT relkind::text FROM pg_class WHERE oid = to_regclass('public.media_files')) <> 'r' THEN RAISE NOTICE 'P4 chain SKIP public.media_files: relkind not r'; RETURN; END IF;
  SELECT count(*) INTO v_rows FROM public.media_files;
  IF v_rows > 0 THEN RAISE NOTICE 'P4 chain SKIP public.media_files: rows=% (expected 0 in rebuild)', v_rows; RETURN; END IF;
  BEGIN
    DROP TABLE public.media_files RESTRICT;
    RAISE NOTICE 'P4 chain DROPPED public.media_files';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'P4 chain SKIP public.media_files: drop failed: %', SQLERRM;
  END;
END $$;

DO $$
DECLARE v_rows bigint;
BEGIN
  IF to_regclass('public.mobile_scan_records') IS NULL THEN RETURN; END IF;
  IF (SELECT relkind::text FROM pg_class WHERE oid = to_regclass('public.mobile_scan_records')) <> 'r' THEN RAISE NOTICE 'P4 chain SKIP public.mobile_scan_records: relkind not r'; RETURN; END IF;
  SELECT count(*) INTO v_rows FROM public.mobile_scan_records;
  IF v_rows > 0 THEN RAISE NOTICE 'P4 chain SKIP public.mobile_scan_records: rows=% (expected 0 in rebuild)', v_rows; RETURN; END IF;
  BEGIN
    DROP TABLE public.mobile_scan_records RESTRICT;
    RAISE NOTICE 'P4 chain DROPPED public.mobile_scan_records';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'P4 chain SKIP public.mobile_scan_records: drop failed: %', SQLERRM;
  END;
END $$;

DO $$
DECLARE v_rows bigint;
BEGIN
  IF to_regclass('public.offline_operations') IS NULL THEN RETURN; END IF;
  IF (SELECT relkind::text FROM pg_class WHERE oid = to_regclass('public.offline_operations')) <> 'r' THEN RAISE NOTICE 'P4 chain SKIP public.offline_operations: relkind not r'; RETURN; END IF;
  SELECT count(*) INTO v_rows FROM public.offline_operations;
  IF v_rows > 0 THEN RAISE NOTICE 'P4 chain SKIP public.offline_operations: rows=% (expected 0 in rebuild)', v_rows; RETURN; END IF;
  BEGIN
    DROP TABLE public.offline_operations RESTRICT;
    RAISE NOTICE 'P4 chain DROPPED public.offline_operations';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'P4 chain SKIP public.offline_operations: drop failed: %', SQLERRM;
  END;
END $$;

DO $$
DECLARE v_rows bigint;
BEGIN
  IF to_regclass('public.offline_sync_records') IS NULL THEN RETURN; END IF;
  IF (SELECT relkind::text FROM pg_class WHERE oid = to_regclass('public.offline_sync_records')) <> 'r' THEN RAISE NOTICE 'P4 chain SKIP public.offline_sync_records: relkind not r'; RETURN; END IF;
  SELECT count(*) INTO v_rows FROM public.offline_sync_records;
  IF v_rows > 0 THEN RAISE NOTICE 'P4 chain SKIP public.offline_sync_records: rows=% (expected 0 in rebuild)', v_rows; RETURN; END IF;
  BEGIN
    DROP TABLE public.offline_sync_records RESTRICT;
    RAISE NOTICE 'P4 chain DROPPED public.offline_sync_records';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'P4 chain SKIP public.offline_sync_records: drop failed: %', SQLERRM;
  END;
END $$;

DO $$
DECLARE v_rows bigint;
BEGIN
  IF to_regclass('public.photo_uploads') IS NULL THEN RETURN; END IF;
  IF (SELECT relkind::text FROM pg_class WHERE oid = to_regclass('public.photo_uploads')) <> 'r' THEN RAISE NOTICE 'P4 chain SKIP public.photo_uploads: relkind not r'; RETURN; END IF;
  SELECT count(*) INTO v_rows FROM public.photo_uploads;
  IF v_rows > 0 THEN RAISE NOTICE 'P4 chain SKIP public.photo_uploads: rows=% (expected 0 in rebuild)', v_rows; RETURN; END IF;
  BEGIN
    DROP TABLE public.photo_uploads RESTRICT;
    RAISE NOTICE 'P4 chain DROPPED public.photo_uploads';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'P4 chain SKIP public.photo_uploads: drop failed: %', SQLERRM;
  END;
END $$;

DO $$
DECLARE v_rows bigint;
BEGIN
  IF to_regclass('public.push_devices') IS NULL THEN RETURN; END IF;
  IF (SELECT relkind::text FROM pg_class WHERE oid = to_regclass('public.push_devices')) <> 'r' THEN RAISE NOTICE 'P4 chain SKIP public.push_devices: relkind not r'; RETURN; END IF;
  SELECT count(*) INTO v_rows FROM public.push_devices;
  IF v_rows > 0 THEN RAISE NOTICE 'P4 chain SKIP public.push_devices: rows=% (expected 0 in rebuild)', v_rows; RETURN; END IF;
  BEGIN
    DROP TABLE public.push_devices RESTRICT;
    RAISE NOTICE 'P4 chain DROPPED public.push_devices';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'P4 chain SKIP public.push_devices: drop failed: %', SQLERRM;
  END;
END $$;

DO $$
DECLARE v_rows bigint;
BEGIN
  IF to_regclass('public.push_notifications') IS NULL THEN RETURN; END IF;
  IF (SELECT relkind::text FROM pg_class WHERE oid = to_regclass('public.push_notifications')) <> 'r' THEN RAISE NOTICE 'P4 chain SKIP public.push_notifications: relkind not r'; RETURN; END IF;
  SELECT count(*) INTO v_rows FROM public.push_notifications;
  IF v_rows > 0 THEN RAISE NOTICE 'P4 chain SKIP public.push_notifications: rows=% (expected 0 in rebuild)', v_rows; RETURN; END IF;
  BEGIN
    DROP TABLE public.push_notifications RESTRICT;
    RAISE NOTICE 'P4 chain DROPPED public.push_notifications';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'P4 chain SKIP public.push_notifications: drop failed: %', SQLERRM;
  END;
END $$;

DO $$
DECLARE v_rows bigint;
BEGIN
  IF to_regclass('public.push_templates') IS NULL THEN RETURN; END IF;
  IF (SELECT relkind::text FROM pg_class WHERE oid = to_regclass('public.push_templates')) <> 'r' THEN RAISE NOTICE 'P4 chain SKIP public.push_templates: relkind not r'; RETURN; END IF;
  SELECT count(*) INTO v_rows FROM public.push_templates;
  IF v_rows > 0 THEN RAISE NOTICE 'P4 chain SKIP public.push_templates: rows=% (expected 0 in rebuild)', v_rows; RETURN; END IF;
  BEGIN
    DROP TABLE public.push_templates RESTRICT;
    RAISE NOTICE 'P4 chain DROPPED public.push_templates';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'P4 chain SKIP public.push_templates: drop failed: %', SQLERRM;
  END;
END $$;

DO $$
DECLARE v_rows bigint;
BEGIN
  IF to_regclass('public.shortcuts') IS NULL THEN RETURN; END IF;
  IF (SELECT relkind::text FROM pg_class WHERE oid = to_regclass('public.shortcuts')) <> 'r' THEN RAISE NOTICE 'P4 chain SKIP public.shortcuts: relkind not r'; RETURN; END IF;
  SELECT count(*) INTO v_rows FROM public.shortcuts;
  IF v_rows > 0 THEN RAISE NOTICE 'P4 chain SKIP public.shortcuts: rows=% (expected 0 in rebuild)', v_rows; RETURN; END IF;
  BEGIN
    DROP TABLE public.shortcuts RESTRICT;
    RAISE NOTICE 'P4 chain DROPPED public.shortcuts';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'P4 chain SKIP public.shortcuts: drop failed: %', SQLERRM;
  END;
END $$;

DO $$
DECLARE v_rows bigint;
BEGIN
  IF to_regclass('public.sync_policies') IS NULL THEN RETURN; END IF;
  IF (SELECT relkind::text FROM pg_class WHERE oid = to_regclass('public.sync_policies')) <> 'r' THEN RAISE NOTICE 'P4 chain SKIP public.sync_policies: relkind not r'; RETURN; END IF;
  SELECT count(*) INTO v_rows FROM public.sync_policies;
  IF v_rows > 0 THEN RAISE NOTICE 'P4 chain SKIP public.sync_policies: rows=% (expected 0 in rebuild)', v_rows; RETURN; END IF;
  BEGIN
    DROP TABLE public.sync_policies RESTRICT;
    RAISE NOTICE 'P4 chain DROPPED public.sync_policies';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'P4 chain SKIP public.sync_policies: drop failed: %', SQLERRM;
  END;
END $$;

DO $$
DECLARE v_rows bigint;
BEGIN
  IF to_regclass('public.core_comments') IS NULL THEN RETURN; END IF;
  IF (SELECT relkind::text FROM pg_class WHERE oid = to_regclass('public.core_comments')) <> 'r' THEN RAISE NOTICE 'P4 chain SKIP public.core_comments: relkind not r'; RETURN; END IF;
  SELECT count(*) INTO v_rows FROM public.core_comments;
  IF v_rows > 0 THEN RAISE NOTICE 'P4 chain SKIP public.core_comments: rows=% (expected 0 in rebuild)', v_rows; RETURN; END IF;
  BEGIN
    DROP TABLE public.core_comments RESTRICT;
    RAISE NOTICE 'P4 chain DROPPED public.core_comments';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'P4 chain SKIP public.core_comments: drop failed: %', SQLERRM;
  END;
END $$;

DO $$
DECLARE v_rows bigint;
BEGIN
  IF to_regclass('public.core_favorites') IS NULL THEN RETURN; END IF;
  IF (SELECT relkind::text FROM pg_class WHERE oid = to_regclass('public.core_favorites')) <> 'r' THEN RAISE NOTICE 'P4 chain SKIP public.core_favorites: relkind not r'; RETURN; END IF;
  SELECT count(*) INTO v_rows FROM public.core_favorites;
  IF v_rows > 0 THEN RAISE NOTICE 'P4 chain SKIP public.core_favorites: rows=% (expected 0 in rebuild)', v_rows; RETURN; END IF;
  BEGIN
    DROP TABLE public.core_favorites RESTRICT;
    RAISE NOTICE 'P4 chain DROPPED public.core_favorites';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'P4 chain SKIP public.core_favorites: drop failed: %', SQLERRM;
  END;
END $$;

DO $$
DECLARE v_rows bigint;
BEGIN
  IF to_regclass('public.core_email_templates') IS NULL THEN RETURN; END IF;
  IF (SELECT relkind::text FROM pg_class WHERE oid = to_regclass('public.core_email_templates')) <> 'r' THEN RAISE NOTICE 'P4 chain SKIP public.core_email_templates: relkind not r'; RETURN; END IF;
  SELECT count(*) INTO v_rows FROM public.core_email_templates;
  IF v_rows > 0 THEN RAISE NOTICE 'P4 chain SKIP public.core_email_templates: rows=% (expected 0 in rebuild)', v_rows; RETURN; END IF;
  BEGIN
    DROP TABLE public.core_email_templates RESTRICT;
    RAISE NOTICE 'P4 chain DROPPED public.core_email_templates';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'P4 chain SKIP public.core_email_templates: drop failed: %', SQLERRM;
  END;
END $$;

DO $$
DECLARE v_rows bigint;
BEGIN
  IF to_regclass('public.core_mobile_offline_records') IS NULL THEN RETURN; END IF;
  IF (SELECT relkind::text FROM pg_class WHERE oid = to_regclass('public.core_mobile_offline_records')) <> 'r' THEN RAISE NOTICE 'P4 chain SKIP public.core_mobile_offline_records: relkind not r'; RETURN; END IF;
  SELECT count(*) INTO v_rows FROM public.core_mobile_offline_records;
  IF v_rows > 0 THEN RAISE NOTICE 'P4 chain SKIP public.core_mobile_offline_records: rows=% (expected 0 in rebuild)', v_rows; RETURN; END IF;
  BEGIN
    DROP TABLE public.core_mobile_offline_records RESTRICT;
    RAISE NOTICE 'P4 chain DROPPED public.core_mobile_offline_records';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'P4 chain SKIP public.core_mobile_offline_records: drop failed: %', SQLERRM;
  END;
END $$;

DO $$
DECLARE v_rows bigint;
BEGIN
  IF to_regclass('public.reports') IS NULL THEN RETURN; END IF;
  IF (SELECT relkind::text FROM pg_class WHERE oid = to_regclass('public.reports')) <> 'r' THEN RAISE NOTICE 'P4 chain SKIP public.reports: relkind not r'; RETURN; END IF;
  SELECT count(*) INTO v_rows FROM public.reports;
  IF v_rows > 0 THEN RAISE NOTICE 'P4 chain SKIP public.reports: rows=% (expected 0 in rebuild)', v_rows; RETURN; END IF;
  BEGIN
    DROP TABLE public.reports RESTRICT;
    RAISE NOTICE 'P4 chain DROPPED public.reports';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'P4 chain SKIP public.reports: drop failed: %', SQLERRM;
  END;
END $$;

DO $$
DECLARE v_rows bigint;
BEGIN
  IF to_regclass('public.report_templates') IS NULL THEN RETURN; END IF;
  IF (SELECT relkind::text FROM pg_class WHERE oid = to_regclass('public.report_templates')) <> 'r' THEN RAISE NOTICE 'P4 chain SKIP public.report_templates: relkind not r'; RETURN; END IF;
  SELECT count(*) INTO v_rows FROM public.report_templates;
  IF v_rows > 0 THEN RAISE NOTICE 'P4 chain SKIP public.report_templates: rows=% (expected 0 in rebuild)', v_rows; RETURN; END IF;
  BEGIN
    DROP TABLE public.report_templates RESTRICT;
    RAISE NOTICE 'P4 chain DROPPED public.report_templates';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'P4 chain SKIP public.report_templates: drop failed: %', SQLERRM;
  END;
END $$;

DO $$
DECLARE v_rows bigint;
BEGIN
  IF to_regclass('public.report_schedules') IS NULL THEN RETURN; END IF;
  IF (SELECT relkind::text FROM pg_class WHERE oid = to_regclass('public.report_schedules')) <> 'r' THEN RAISE NOTICE 'P4 chain SKIP public.report_schedules: relkind not r'; RETURN; END IF;
  SELECT count(*) INTO v_rows FROM public.report_schedules;
  IF v_rows > 0 THEN RAISE NOTICE 'P4 chain SKIP public.report_schedules: rows=% (expected 0 in rebuild)', v_rows; RETURN; END IF;
  BEGIN
    DROP TABLE public.report_schedules RESTRICT;
    RAISE NOTICE 'P4 chain DROPPED public.report_schedules';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'P4 chain SKIP public.report_schedules: drop failed: %', SQLERRM;
  END;
END $$;

DO $$
DECLARE v_rows bigint;
BEGIN
  IF to_regclass('public.cqrs_projection_progress') IS NULL THEN RETURN; END IF;
  IF (SELECT relkind::text FROM pg_class WHERE oid = to_regclass('public.cqrs_projection_progress')) <> 'r' THEN RAISE NOTICE 'P4 chain SKIP public.cqrs_projection_progress: relkind not r'; RETURN; END IF;
  SELECT count(*) INTO v_rows FROM public.cqrs_projection_progress;
  IF v_rows > 0 THEN RAISE NOTICE 'P4 chain SKIP public.cqrs_projection_progress: rows=% (expected 0 in rebuild)', v_rows; RETURN; END IF;
  BEGIN
    DROP TABLE public.cqrs_projection_progress RESTRICT;
    RAISE NOTICE 'P4 chain DROPPED public.cqrs_projection_progress';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'P4 chain SKIP public.cqrs_projection_progress: drop failed: %', SQLERRM;
  END;
END $$;

DO $$
DECLARE v_rows bigint;
BEGIN
  IF to_regclass('public.quality_records') IS NULL THEN RETURN; END IF;
  IF (SELECT relkind::text FROM pg_class WHERE oid = to_regclass('public.quality_records')) <> 'r' THEN RAISE NOTICE 'P4 chain SKIP public.quality_records: relkind not r'; RETURN; END IF;
  SELECT count(*) INTO v_rows FROM public.quality_records;
  IF v_rows > 0 THEN RAISE NOTICE 'P4 chain SKIP public.quality_records: rows=% (expected 0 in rebuild)', v_rows; RETURN; END IF;
  BEGIN
    DROP TABLE public.quality_records RESTRICT;
    RAISE NOTICE 'P4 chain DROPPED public.quality_records';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'P4 chain SKIP public.quality_records: drop failed: %', SQLERRM;
  END;
END $$;

DO $$
DECLARE v_rows bigint;
BEGIN
  IF to_regclass('mes.permission_audit_logs') IS NULL THEN RETURN; END IF;
  IF (SELECT relkind::text FROM pg_class WHERE oid = to_regclass('mes.permission_audit_logs')) <> 'r' THEN RAISE NOTICE 'P4 chain SKIP mes.permission_audit_logs: relkind not r'; RETURN; END IF;
  SELECT count(*) INTO v_rows FROM mes.permission_audit_logs;
  IF v_rows > 0 THEN RAISE NOTICE 'P4 chain SKIP mes.permission_audit_logs: rows=% (expected 0 in rebuild)', v_rows; RETURN; END IF;
  BEGIN
    DROP TABLE mes.permission_audit_logs RESTRICT;
    RAISE NOTICE 'P4 chain DROPPED mes.permission_audit_logs';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'P4 chain SKIP mes.permission_audit_logs: drop failed: %', SQLERRM;
  END;
END $$;

DO $$
DECLARE v_rows bigint;
BEGIN
  IF to_regclass('mes.schema_registry') IS NULL THEN RETURN; END IF;
  IF (SELECT relkind::text FROM pg_class WHERE oid = to_regclass('mes.schema_registry')) <> 'r' THEN RAISE NOTICE 'P4 chain SKIP mes.schema_registry: relkind not r'; RETURN; END IF;
  SELECT count(*) INTO v_rows FROM mes.schema_registry;
  IF v_rows > 0 THEN RAISE NOTICE 'P4 chain SKIP mes.schema_registry: rows=% (expected 0 in rebuild)', v_rows; RETURN; END IF;
  BEGIN
    DROP TABLE mes.schema_registry RESTRICT;
    RAISE NOTICE 'P4 chain DROPPED mes.schema_registry';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'P4 chain SKIP mes.schema_registry: drop failed: %', SQLERRM;
  END;
END $$;

DO $$
DECLARE v_rows bigint;
BEGIN
  IF to_regclass('mes.tool_permissions') IS NULL THEN RETURN; END IF;
  IF (SELECT relkind::text FROM pg_class WHERE oid = to_regclass('mes.tool_permissions')) <> 'r' THEN RAISE NOTICE 'P4 chain SKIP mes.tool_permissions: relkind not r'; RETURN; END IF;
  SELECT count(*) INTO v_rows FROM mes.tool_permissions;
  IF v_rows > 0 THEN RAISE NOTICE 'P4 chain SKIP mes.tool_permissions: rows=% (expected 0 in rebuild)', v_rows; RETURN; END IF;
  BEGIN
    DROP TABLE mes.tool_permissions RESTRICT;
    RAISE NOTICE 'P4 chain DROPPED mes.tool_permissions';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'P4 chain SKIP mes.tool_permissions: drop failed: %', SQLERRM;
  END;
END $$;

-- ---------- 终态断言：39 张必须全部不存在 ----------

DO $$
DECLARE v_left text;
BEGIN
  SELECT string_agg(t, ', ') INTO v_left
  FROM unnest(ARRAY[
    'public.core_chat_members',
    'public.core_chat_messages',
    'public.core_chat_rooms',
    'public.qa_ehs_discharge_permits',
    'public.qa_ehs_disease_cases',
    'public.qa_ehs_drill_evaluations',
    'public.qa_ehs_drill_problems',
    'public.qa_ehs_emergency_plan_approvals',
    'public.qa_ehs_emergency_plan_supplies',
    'public.qa_ehs_emergency_plan_versions',
    'public.qa_ehs_employees',
    'public.qa_ehs_env_monitor_records',
    'public.qa_ehs_environment_incidents',
    'public.qa_ehs_inspection_record_items',
    'public.qa_ehs_msds',
    'public.barcode_scans',
    'public.devices',
    'public.media_files',
    'public.mobile_scan_records',
    'public.offline_operations',
    'public.offline_sync_records',
    'public.photo_uploads',
    'public.push_devices',
    'public.push_notifications',
    'public.push_templates',
    'public.shortcuts',
    'public.sync_policies',
    'public.core_comments',
    'public.core_favorites',
    'public.core_email_templates',
    'public.core_mobile_offline_records',
    'public.reports',
    'public.report_templates',
    'public.report_schedules',
    'public.cqrs_projection_progress',
    'public.quality_records',
    'mes.permission_audit_logs',
    'mes.schema_registry',
    'mes.tool_permissions'
  ]) AS t
  WHERE to_regclass(t) IS NOT NULL;
  IF v_left IS NOT NULL THEN
    RAISE EXCEPTION 'P4 chain ABORT: shadow tables still exist: %', v_left;
  END IF;
  RAISE NOTICE 'P4 chain OK: 39 shadow tables absent';
END $$;
