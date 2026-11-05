-- ============================================================
-- P4 反向表清理 · A3 批：协作/聊天/骨架/mes 影子 15 张
--
-- 依据：docs/quality/p4-reverse-tables-triage-2026-11-05.md §4.3–§4.6（可直删）。
-- 判据：0 行、0 入站 FK、运行时 0 命中本表（裸名按各服务真实 search_path 解析；mes.tool_permissions 出站 FK 已在 20261105100000 重指向 iam.tenant_permissions）。
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
  IF to_regclass('public.core_comments') IS NULL THEN RAISE NOTICE 'P4 SKIP public.core_comments: not exists'; RETURN; END IF;
  IF (SELECT relkind::text FROM pg_class WHERE oid = to_regclass('public.core_comments')) <> 'r' THEN RAISE NOTICE 'P4 SKIP public.core_comments: relkind not r'; RETURN; END IF;
  SELECT count(*) INTO v_rows FROM public.core_comments;
  IF v_rows <> 0 THEN RAISE NOTICE 'P4 SKIP public.core_comments: rows=% (expected 0)', v_rows; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'f' AND confrelid = to_regclass('public.core_comments')) THEN RAISE NOTICE 'P4 SKIP public.core_comments: inbound FK exists'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_depend d JOIN pg_class c ON c.oid = d.objid WHERE d.refobjid = to_regclass('public.core_comments') AND c.relkind IN ('v','m')) THEN RAISE NOTICE 'P4 SKIP public.core_comments: view dependency'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_depend d WHERE d.refobjid = to_regclass('public.core_comments') AND d.classid = 'pg_proc'::regclass) THEN RAISE NOTICE 'P4 SKIP public.core_comments: function dependency'; RETURN; END IF;
  BEGIN
    DROP TABLE public.core_comments RESTRICT;
    RAISE NOTICE 'P4 DROPPED public.core_comments';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'P4 SKIP public.core_comments: drop failed: %', SQLERRM;
  END;
END $$;

DO $$
DECLARE v_rows bigint;
BEGIN
  IF to_regclass('public.core_favorites') IS NULL THEN RAISE NOTICE 'P4 SKIP public.core_favorites: not exists'; RETURN; END IF;
  IF (SELECT relkind::text FROM pg_class WHERE oid = to_regclass('public.core_favorites')) <> 'r' THEN RAISE NOTICE 'P4 SKIP public.core_favorites: relkind not r'; RETURN; END IF;
  SELECT count(*) INTO v_rows FROM public.core_favorites;
  IF v_rows <> 0 THEN RAISE NOTICE 'P4 SKIP public.core_favorites: rows=% (expected 0)', v_rows; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'f' AND confrelid = to_regclass('public.core_favorites')) THEN RAISE NOTICE 'P4 SKIP public.core_favorites: inbound FK exists'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_depend d JOIN pg_class c ON c.oid = d.objid WHERE d.refobjid = to_regclass('public.core_favorites') AND c.relkind IN ('v','m')) THEN RAISE NOTICE 'P4 SKIP public.core_favorites: view dependency'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_depend d WHERE d.refobjid = to_regclass('public.core_favorites') AND d.classid = 'pg_proc'::regclass) THEN RAISE NOTICE 'P4 SKIP public.core_favorites: function dependency'; RETURN; END IF;
  BEGIN
    DROP TABLE public.core_favorites RESTRICT;
    RAISE NOTICE 'P4 DROPPED public.core_favorites';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'P4 SKIP public.core_favorites: drop failed: %', SQLERRM;
  END;
END $$;

DO $$
DECLARE v_rows bigint;
BEGIN
  IF to_regclass('public.core_email_templates') IS NULL THEN RAISE NOTICE 'P4 SKIP public.core_email_templates: not exists'; RETURN; END IF;
  IF (SELECT relkind::text FROM pg_class WHERE oid = to_regclass('public.core_email_templates')) <> 'r' THEN RAISE NOTICE 'P4 SKIP public.core_email_templates: relkind not r'; RETURN; END IF;
  SELECT count(*) INTO v_rows FROM public.core_email_templates;
  IF v_rows <> 0 THEN RAISE NOTICE 'P4 SKIP public.core_email_templates: rows=% (expected 0)', v_rows; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'f' AND confrelid = to_regclass('public.core_email_templates')) THEN RAISE NOTICE 'P4 SKIP public.core_email_templates: inbound FK exists'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_depend d JOIN pg_class c ON c.oid = d.objid WHERE d.refobjid = to_regclass('public.core_email_templates') AND c.relkind IN ('v','m')) THEN RAISE NOTICE 'P4 SKIP public.core_email_templates: view dependency'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_depend d WHERE d.refobjid = to_regclass('public.core_email_templates') AND d.classid = 'pg_proc'::regclass) THEN RAISE NOTICE 'P4 SKIP public.core_email_templates: function dependency'; RETURN; END IF;
  BEGIN
    DROP TABLE public.core_email_templates RESTRICT;
    RAISE NOTICE 'P4 DROPPED public.core_email_templates';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'P4 SKIP public.core_email_templates: drop failed: %', SQLERRM;
  END;
END $$;

DO $$
DECLARE v_rows bigint;
BEGIN
  IF to_regclass('public.core_mobile_offline_records') IS NULL THEN RAISE NOTICE 'P4 SKIP public.core_mobile_offline_records: not exists'; RETURN; END IF;
  IF (SELECT relkind::text FROM pg_class WHERE oid = to_regclass('public.core_mobile_offline_records')) <> 'r' THEN RAISE NOTICE 'P4 SKIP public.core_mobile_offline_records: relkind not r'; RETURN; END IF;
  SELECT count(*) INTO v_rows FROM public.core_mobile_offline_records;
  IF v_rows <> 0 THEN RAISE NOTICE 'P4 SKIP public.core_mobile_offline_records: rows=% (expected 0)', v_rows; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'f' AND confrelid = to_regclass('public.core_mobile_offline_records')) THEN RAISE NOTICE 'P4 SKIP public.core_mobile_offline_records: inbound FK exists'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_depend d JOIN pg_class c ON c.oid = d.objid WHERE d.refobjid = to_regclass('public.core_mobile_offline_records') AND c.relkind IN ('v','m')) THEN RAISE NOTICE 'P4 SKIP public.core_mobile_offline_records: view dependency'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_depend d WHERE d.refobjid = to_regclass('public.core_mobile_offline_records') AND d.classid = 'pg_proc'::regclass) THEN RAISE NOTICE 'P4 SKIP public.core_mobile_offline_records: function dependency'; RETURN; END IF;
  BEGIN
    DROP TABLE public.core_mobile_offline_records RESTRICT;
    RAISE NOTICE 'P4 DROPPED public.core_mobile_offline_records';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'P4 SKIP public.core_mobile_offline_records: drop failed: %', SQLERRM;
  END;
END $$;

DO $$
DECLARE v_rows bigint;
BEGIN
  IF to_regclass('public.core_chat_members') IS NULL THEN RAISE NOTICE 'P4 SKIP public.core_chat_members: not exists'; RETURN; END IF;
  IF (SELECT relkind::text FROM pg_class WHERE oid = to_regclass('public.core_chat_members')) <> 'r' THEN RAISE NOTICE 'P4 SKIP public.core_chat_members: relkind not r'; RETURN; END IF;
  SELECT count(*) INTO v_rows FROM public.core_chat_members;
  IF v_rows <> 0 THEN RAISE NOTICE 'P4 SKIP public.core_chat_members: rows=% (expected 0)', v_rows; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'f' AND confrelid = to_regclass('public.core_chat_members')) THEN RAISE NOTICE 'P4 SKIP public.core_chat_members: inbound FK exists'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_depend d JOIN pg_class c ON c.oid = d.objid WHERE d.refobjid = to_regclass('public.core_chat_members') AND c.relkind IN ('v','m')) THEN RAISE NOTICE 'P4 SKIP public.core_chat_members: view dependency'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_depend d WHERE d.refobjid = to_regclass('public.core_chat_members') AND d.classid = 'pg_proc'::regclass) THEN RAISE NOTICE 'P4 SKIP public.core_chat_members: function dependency'; RETURN; END IF;
  BEGIN
    DROP TABLE public.core_chat_members RESTRICT;
    RAISE NOTICE 'P4 DROPPED public.core_chat_members';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'P4 SKIP public.core_chat_members: drop failed: %', SQLERRM;
  END;
END $$;

DO $$
DECLARE v_rows bigint;
BEGIN
  IF to_regclass('public.core_chat_messages') IS NULL THEN RAISE NOTICE 'P4 SKIP public.core_chat_messages: not exists'; RETURN; END IF;
  IF (SELECT relkind::text FROM pg_class WHERE oid = to_regclass('public.core_chat_messages')) <> 'r' THEN RAISE NOTICE 'P4 SKIP public.core_chat_messages: relkind not r'; RETURN; END IF;
  SELECT count(*) INTO v_rows FROM public.core_chat_messages;
  IF v_rows <> 0 THEN RAISE NOTICE 'P4 SKIP public.core_chat_messages: rows=% (expected 0)', v_rows; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'f' AND confrelid = to_regclass('public.core_chat_messages')) THEN RAISE NOTICE 'P4 SKIP public.core_chat_messages: inbound FK exists'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_depend d JOIN pg_class c ON c.oid = d.objid WHERE d.refobjid = to_regclass('public.core_chat_messages') AND c.relkind IN ('v','m')) THEN RAISE NOTICE 'P4 SKIP public.core_chat_messages: view dependency'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_depend d WHERE d.refobjid = to_regclass('public.core_chat_messages') AND d.classid = 'pg_proc'::regclass) THEN RAISE NOTICE 'P4 SKIP public.core_chat_messages: function dependency'; RETURN; END IF;
  BEGIN
    DROP TABLE public.core_chat_messages RESTRICT;
    RAISE NOTICE 'P4 DROPPED public.core_chat_messages';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'P4 SKIP public.core_chat_messages: drop failed: %', SQLERRM;
  END;
END $$;

DO $$
DECLARE v_rows bigint;
BEGIN
  IF to_regclass('public.core_chat_rooms') IS NULL THEN RAISE NOTICE 'P4 SKIP public.core_chat_rooms: not exists'; RETURN; END IF;
  IF (SELECT relkind::text FROM pg_class WHERE oid = to_regclass('public.core_chat_rooms')) <> 'r' THEN RAISE NOTICE 'P4 SKIP public.core_chat_rooms: relkind not r'; RETURN; END IF;
  SELECT count(*) INTO v_rows FROM public.core_chat_rooms;
  IF v_rows <> 0 THEN RAISE NOTICE 'P4 SKIP public.core_chat_rooms: rows=% (expected 0)', v_rows; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'f' AND confrelid = to_regclass('public.core_chat_rooms')) THEN RAISE NOTICE 'P4 SKIP public.core_chat_rooms: inbound FK exists'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_depend d JOIN pg_class c ON c.oid = d.objid WHERE d.refobjid = to_regclass('public.core_chat_rooms') AND c.relkind IN ('v','m')) THEN RAISE NOTICE 'P4 SKIP public.core_chat_rooms: view dependency'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_depend d WHERE d.refobjid = to_regclass('public.core_chat_rooms') AND d.classid = 'pg_proc'::regclass) THEN RAISE NOTICE 'P4 SKIP public.core_chat_rooms: function dependency'; RETURN; END IF;
  BEGIN
    DROP TABLE public.core_chat_rooms RESTRICT;
    RAISE NOTICE 'P4 DROPPED public.core_chat_rooms';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'P4 SKIP public.core_chat_rooms: drop failed: %', SQLERRM;
  END;
END $$;

DO $$
DECLARE v_rows bigint;
BEGIN
  IF to_regclass('public.reports') IS NULL THEN RAISE NOTICE 'P4 SKIP public.reports: not exists'; RETURN; END IF;
  IF (SELECT relkind::text FROM pg_class WHERE oid = to_regclass('public.reports')) <> 'r' THEN RAISE NOTICE 'P4 SKIP public.reports: relkind not r'; RETURN; END IF;
  SELECT count(*) INTO v_rows FROM public.reports;
  IF v_rows <> 0 THEN RAISE NOTICE 'P4 SKIP public.reports: rows=% (expected 0)', v_rows; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'f' AND confrelid = to_regclass('public.reports')) THEN RAISE NOTICE 'P4 SKIP public.reports: inbound FK exists'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_depend d JOIN pg_class c ON c.oid = d.objid WHERE d.refobjid = to_regclass('public.reports') AND c.relkind IN ('v','m')) THEN RAISE NOTICE 'P4 SKIP public.reports: view dependency'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_depend d WHERE d.refobjid = to_regclass('public.reports') AND d.classid = 'pg_proc'::regclass) THEN RAISE NOTICE 'P4 SKIP public.reports: function dependency'; RETURN; END IF;
  BEGIN
    DROP TABLE public.reports RESTRICT;
    RAISE NOTICE 'P4 DROPPED public.reports';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'P4 SKIP public.reports: drop failed: %', SQLERRM;
  END;
END $$;

DO $$
DECLARE v_rows bigint;
BEGIN
  IF to_regclass('public.report_templates') IS NULL THEN RAISE NOTICE 'P4 SKIP public.report_templates: not exists'; RETURN; END IF;
  IF (SELECT relkind::text FROM pg_class WHERE oid = to_regclass('public.report_templates')) <> 'r' THEN RAISE NOTICE 'P4 SKIP public.report_templates: relkind not r'; RETURN; END IF;
  SELECT count(*) INTO v_rows FROM public.report_templates;
  IF v_rows <> 0 THEN RAISE NOTICE 'P4 SKIP public.report_templates: rows=% (expected 0)', v_rows; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'f' AND confrelid = to_regclass('public.report_templates')) THEN RAISE NOTICE 'P4 SKIP public.report_templates: inbound FK exists'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_depend d JOIN pg_class c ON c.oid = d.objid WHERE d.refobjid = to_regclass('public.report_templates') AND c.relkind IN ('v','m')) THEN RAISE NOTICE 'P4 SKIP public.report_templates: view dependency'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_depend d WHERE d.refobjid = to_regclass('public.report_templates') AND d.classid = 'pg_proc'::regclass) THEN RAISE NOTICE 'P4 SKIP public.report_templates: function dependency'; RETURN; END IF;
  BEGIN
    DROP TABLE public.report_templates RESTRICT;
    RAISE NOTICE 'P4 DROPPED public.report_templates';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'P4 SKIP public.report_templates: drop failed: %', SQLERRM;
  END;
END $$;

DO $$
DECLARE v_rows bigint;
BEGIN
  IF to_regclass('public.report_schedules') IS NULL THEN RAISE NOTICE 'P4 SKIP public.report_schedules: not exists'; RETURN; END IF;
  IF (SELECT relkind::text FROM pg_class WHERE oid = to_regclass('public.report_schedules')) <> 'r' THEN RAISE NOTICE 'P4 SKIP public.report_schedules: relkind not r'; RETURN; END IF;
  SELECT count(*) INTO v_rows FROM public.report_schedules;
  IF v_rows <> 0 THEN RAISE NOTICE 'P4 SKIP public.report_schedules: rows=% (expected 0)', v_rows; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'f' AND confrelid = to_regclass('public.report_schedules')) THEN RAISE NOTICE 'P4 SKIP public.report_schedules: inbound FK exists'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_depend d JOIN pg_class c ON c.oid = d.objid WHERE d.refobjid = to_regclass('public.report_schedules') AND c.relkind IN ('v','m')) THEN RAISE NOTICE 'P4 SKIP public.report_schedules: view dependency'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_depend d WHERE d.refobjid = to_regclass('public.report_schedules') AND d.classid = 'pg_proc'::regclass) THEN RAISE NOTICE 'P4 SKIP public.report_schedules: function dependency'; RETURN; END IF;
  BEGIN
    DROP TABLE public.report_schedules RESTRICT;
    RAISE NOTICE 'P4 DROPPED public.report_schedules';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'P4 SKIP public.report_schedules: drop failed: %', SQLERRM;
  END;
END $$;

DO $$
DECLARE v_rows bigint;
BEGIN
  IF to_regclass('public.cqrs_projection_progress') IS NULL THEN RAISE NOTICE 'P4 SKIP public.cqrs_projection_progress: not exists'; RETURN; END IF;
  IF (SELECT relkind::text FROM pg_class WHERE oid = to_regclass('public.cqrs_projection_progress')) <> 'r' THEN RAISE NOTICE 'P4 SKIP public.cqrs_projection_progress: relkind not r'; RETURN; END IF;
  SELECT count(*) INTO v_rows FROM public.cqrs_projection_progress;
  IF v_rows <> 0 THEN RAISE NOTICE 'P4 SKIP public.cqrs_projection_progress: rows=% (expected 0)', v_rows; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'f' AND confrelid = to_regclass('public.cqrs_projection_progress')) THEN RAISE NOTICE 'P4 SKIP public.cqrs_projection_progress: inbound FK exists'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_depend d JOIN pg_class c ON c.oid = d.objid WHERE d.refobjid = to_regclass('public.cqrs_projection_progress') AND c.relkind IN ('v','m')) THEN RAISE NOTICE 'P4 SKIP public.cqrs_projection_progress: view dependency'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_depend d WHERE d.refobjid = to_regclass('public.cqrs_projection_progress') AND d.classid = 'pg_proc'::regclass) THEN RAISE NOTICE 'P4 SKIP public.cqrs_projection_progress: function dependency'; RETURN; END IF;
  BEGIN
    DROP TABLE public.cqrs_projection_progress RESTRICT;
    RAISE NOTICE 'P4 DROPPED public.cqrs_projection_progress';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'P4 SKIP public.cqrs_projection_progress: drop failed: %', SQLERRM;
  END;
END $$;

DO $$
DECLARE v_rows bigint;
BEGIN
  IF to_regclass('public.quality_records') IS NULL THEN RAISE NOTICE 'P4 SKIP public.quality_records: not exists'; RETURN; END IF;
  IF (SELECT relkind::text FROM pg_class WHERE oid = to_regclass('public.quality_records')) <> 'r' THEN RAISE NOTICE 'P4 SKIP public.quality_records: relkind not r'; RETURN; END IF;
  SELECT count(*) INTO v_rows FROM public.quality_records;
  IF v_rows <> 0 THEN RAISE NOTICE 'P4 SKIP public.quality_records: rows=% (expected 0)', v_rows; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'f' AND confrelid = to_regclass('public.quality_records')) THEN RAISE NOTICE 'P4 SKIP public.quality_records: inbound FK exists'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_depend d JOIN pg_class c ON c.oid = d.objid WHERE d.refobjid = to_regclass('public.quality_records') AND c.relkind IN ('v','m')) THEN RAISE NOTICE 'P4 SKIP public.quality_records: view dependency'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_depend d WHERE d.refobjid = to_regclass('public.quality_records') AND d.classid = 'pg_proc'::regclass) THEN RAISE NOTICE 'P4 SKIP public.quality_records: function dependency'; RETURN; END IF;
  BEGIN
    DROP TABLE public.quality_records RESTRICT;
    RAISE NOTICE 'P4 DROPPED public.quality_records';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'P4 SKIP public.quality_records: drop failed: %', SQLERRM;
  END;
END $$;

DO $$
DECLARE v_rows bigint;
BEGIN
  IF to_regclass('mes.permission_audit_logs') IS NULL THEN RAISE NOTICE 'P4 SKIP mes.permission_audit_logs: not exists'; RETURN; END IF;
  IF (SELECT relkind::text FROM pg_class WHERE oid = to_regclass('mes.permission_audit_logs')) <> 'r' THEN RAISE NOTICE 'P4 SKIP mes.permission_audit_logs: relkind not r'; RETURN; END IF;
  SELECT count(*) INTO v_rows FROM mes.permission_audit_logs;
  IF v_rows <> 0 THEN RAISE NOTICE 'P4 SKIP mes.permission_audit_logs: rows=% (expected 0)', v_rows; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'f' AND confrelid = to_regclass('mes.permission_audit_logs')) THEN RAISE NOTICE 'P4 SKIP mes.permission_audit_logs: inbound FK exists'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_depend d JOIN pg_class c ON c.oid = d.objid WHERE d.refobjid = to_regclass('mes.permission_audit_logs') AND c.relkind IN ('v','m')) THEN RAISE NOTICE 'P4 SKIP mes.permission_audit_logs: view dependency'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_depend d WHERE d.refobjid = to_regclass('mes.permission_audit_logs') AND d.classid = 'pg_proc'::regclass) THEN RAISE NOTICE 'P4 SKIP mes.permission_audit_logs: function dependency'; RETURN; END IF;
  BEGIN
    DROP TABLE mes.permission_audit_logs RESTRICT;
    RAISE NOTICE 'P4 DROPPED mes.permission_audit_logs';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'P4 SKIP mes.permission_audit_logs: drop failed: %', SQLERRM;
  END;
END $$;

DO $$
DECLARE v_rows bigint;
BEGIN
  IF to_regclass('mes.schema_registry') IS NULL THEN RAISE NOTICE 'P4 SKIP mes.schema_registry: not exists'; RETURN; END IF;
  IF (SELECT relkind::text FROM pg_class WHERE oid = to_regclass('mes.schema_registry')) <> 'r' THEN RAISE NOTICE 'P4 SKIP mes.schema_registry: relkind not r'; RETURN; END IF;
  SELECT count(*) INTO v_rows FROM mes.schema_registry;
  IF v_rows <> 0 THEN RAISE NOTICE 'P4 SKIP mes.schema_registry: rows=% (expected 0)', v_rows; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'f' AND confrelid = to_regclass('mes.schema_registry')) THEN RAISE NOTICE 'P4 SKIP mes.schema_registry: inbound FK exists'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_depend d JOIN pg_class c ON c.oid = d.objid WHERE d.refobjid = to_regclass('mes.schema_registry') AND c.relkind IN ('v','m')) THEN RAISE NOTICE 'P4 SKIP mes.schema_registry: view dependency'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_depend d WHERE d.refobjid = to_regclass('mes.schema_registry') AND d.classid = 'pg_proc'::regclass) THEN RAISE NOTICE 'P4 SKIP mes.schema_registry: function dependency'; RETURN; END IF;
  BEGIN
    DROP TABLE mes.schema_registry RESTRICT;
    RAISE NOTICE 'P4 DROPPED mes.schema_registry';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'P4 SKIP mes.schema_registry: drop failed: %', SQLERRM;
  END;
END $$;

DO $$
DECLARE v_rows bigint;
BEGIN
  IF to_regclass('mes.tool_permissions') IS NULL THEN RAISE NOTICE 'P4 SKIP mes.tool_permissions: not exists'; RETURN; END IF;
  IF (SELECT relkind::text FROM pg_class WHERE oid = to_regclass('mes.tool_permissions')) <> 'r' THEN RAISE NOTICE 'P4 SKIP mes.tool_permissions: relkind not r'; RETURN; END IF;
  SELECT count(*) INTO v_rows FROM mes.tool_permissions;
  IF v_rows <> 0 THEN RAISE NOTICE 'P4 SKIP mes.tool_permissions: rows=% (expected 0)', v_rows; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'f' AND confrelid = to_regclass('mes.tool_permissions')) THEN RAISE NOTICE 'P4 SKIP mes.tool_permissions: inbound FK exists'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_depend d JOIN pg_class c ON c.oid = d.objid WHERE d.refobjid = to_regclass('mes.tool_permissions') AND c.relkind IN ('v','m')) THEN RAISE NOTICE 'P4 SKIP mes.tool_permissions: view dependency'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_depend d WHERE d.refobjid = to_regclass('mes.tool_permissions') AND d.classid = 'pg_proc'::regclass) THEN RAISE NOTICE 'P4 SKIP mes.tool_permissions: function dependency'; RETURN; END IF;
  BEGIN
    DROP TABLE mes.tool_permissions RESTRICT;
    RAISE NOTICE 'P4 DROPPED mes.tool_permissions';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'P4 SKIP mes.tool_permissions: drop failed: %', SQLERRM;
  END;
END $$;
