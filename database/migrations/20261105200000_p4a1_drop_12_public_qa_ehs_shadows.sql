-- ============================================================
-- P4 反向表清理 · A1 批：public.qa_ehs_* 影子 12 张
--
-- 依据：docs/quality/p4-reverse-tables-triage-2026-11-05.md §4.1（可直删）。
-- 判据：0 行、0 入站 FK、运行时 0 命中本表（ehs 服务裸名在 ehs,public 下解析到 ehs.*）、
--   test 侧权威 ehs.qa_ehs_* 列结构一致（Jaccard 0.93–1.00）。
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
  IF to_regclass('public.qa_ehs_discharge_permits') IS NULL THEN RAISE NOTICE 'P4 SKIP public.qa_ehs_discharge_permits: not exists'; RETURN; END IF;
  IF (SELECT relkind::text FROM pg_class WHERE oid = to_regclass('public.qa_ehs_discharge_permits')) <> 'r' THEN RAISE NOTICE 'P4 SKIP public.qa_ehs_discharge_permits: relkind not r'; RETURN; END IF;
  SELECT count(*) INTO v_rows FROM public.qa_ehs_discharge_permits;
  IF v_rows <> 0 THEN RAISE NOTICE 'P4 SKIP public.qa_ehs_discharge_permits: rows=% (expected 0)', v_rows; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'f' AND confrelid = to_regclass('public.qa_ehs_discharge_permits')) THEN RAISE NOTICE 'P4 SKIP public.qa_ehs_discharge_permits: inbound FK exists'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_depend d JOIN pg_class c ON c.oid = d.objid WHERE d.refobjid = to_regclass('public.qa_ehs_discharge_permits') AND c.relkind IN ('v','m')) THEN RAISE NOTICE 'P4 SKIP public.qa_ehs_discharge_permits: view dependency'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_depend d WHERE d.refobjid = to_regclass('public.qa_ehs_discharge_permits') AND d.classid = 'pg_proc'::regclass) THEN RAISE NOTICE 'P4 SKIP public.qa_ehs_discharge_permits: function dependency'; RETURN; END IF;
  BEGIN
    DROP TABLE public.qa_ehs_discharge_permits RESTRICT;
    RAISE NOTICE 'P4 DROPPED public.qa_ehs_discharge_permits';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'P4 SKIP public.qa_ehs_discharge_permits: drop failed: %', SQLERRM;
  END;
END $$;

DO $$
DECLARE v_rows bigint;
BEGIN
  IF to_regclass('public.qa_ehs_disease_cases') IS NULL THEN RAISE NOTICE 'P4 SKIP public.qa_ehs_disease_cases: not exists'; RETURN; END IF;
  IF (SELECT relkind::text FROM pg_class WHERE oid = to_regclass('public.qa_ehs_disease_cases')) <> 'r' THEN RAISE NOTICE 'P4 SKIP public.qa_ehs_disease_cases: relkind not r'; RETURN; END IF;
  SELECT count(*) INTO v_rows FROM public.qa_ehs_disease_cases;
  IF v_rows <> 0 THEN RAISE NOTICE 'P4 SKIP public.qa_ehs_disease_cases: rows=% (expected 0)', v_rows; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'f' AND confrelid = to_regclass('public.qa_ehs_disease_cases')) THEN RAISE NOTICE 'P4 SKIP public.qa_ehs_disease_cases: inbound FK exists'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_depend d JOIN pg_class c ON c.oid = d.objid WHERE d.refobjid = to_regclass('public.qa_ehs_disease_cases') AND c.relkind IN ('v','m')) THEN RAISE NOTICE 'P4 SKIP public.qa_ehs_disease_cases: view dependency'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_depend d WHERE d.refobjid = to_regclass('public.qa_ehs_disease_cases') AND d.classid = 'pg_proc'::regclass) THEN RAISE NOTICE 'P4 SKIP public.qa_ehs_disease_cases: function dependency'; RETURN; END IF;
  BEGIN
    DROP TABLE public.qa_ehs_disease_cases RESTRICT;
    RAISE NOTICE 'P4 DROPPED public.qa_ehs_disease_cases';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'P4 SKIP public.qa_ehs_disease_cases: drop failed: %', SQLERRM;
  END;
END $$;

DO $$
DECLARE v_rows bigint;
BEGIN
  IF to_regclass('public.qa_ehs_drill_evaluations') IS NULL THEN RAISE NOTICE 'P4 SKIP public.qa_ehs_drill_evaluations: not exists'; RETURN; END IF;
  IF (SELECT relkind::text FROM pg_class WHERE oid = to_regclass('public.qa_ehs_drill_evaluations')) <> 'r' THEN RAISE NOTICE 'P4 SKIP public.qa_ehs_drill_evaluations: relkind not r'; RETURN; END IF;
  SELECT count(*) INTO v_rows FROM public.qa_ehs_drill_evaluations;
  IF v_rows <> 0 THEN RAISE NOTICE 'P4 SKIP public.qa_ehs_drill_evaluations: rows=% (expected 0)', v_rows; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'f' AND confrelid = to_regclass('public.qa_ehs_drill_evaluations')) THEN RAISE NOTICE 'P4 SKIP public.qa_ehs_drill_evaluations: inbound FK exists'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_depend d JOIN pg_class c ON c.oid = d.objid WHERE d.refobjid = to_regclass('public.qa_ehs_drill_evaluations') AND c.relkind IN ('v','m')) THEN RAISE NOTICE 'P4 SKIP public.qa_ehs_drill_evaluations: view dependency'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_depend d WHERE d.refobjid = to_regclass('public.qa_ehs_drill_evaluations') AND d.classid = 'pg_proc'::regclass) THEN RAISE NOTICE 'P4 SKIP public.qa_ehs_drill_evaluations: function dependency'; RETURN; END IF;
  BEGIN
    DROP TABLE public.qa_ehs_drill_evaluations RESTRICT;
    RAISE NOTICE 'P4 DROPPED public.qa_ehs_drill_evaluations';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'P4 SKIP public.qa_ehs_drill_evaluations: drop failed: %', SQLERRM;
  END;
END $$;

DO $$
DECLARE v_rows bigint;
BEGIN
  IF to_regclass('public.qa_ehs_drill_problems') IS NULL THEN RAISE NOTICE 'P4 SKIP public.qa_ehs_drill_problems: not exists'; RETURN; END IF;
  IF (SELECT relkind::text FROM pg_class WHERE oid = to_regclass('public.qa_ehs_drill_problems')) <> 'r' THEN RAISE NOTICE 'P4 SKIP public.qa_ehs_drill_problems: relkind not r'; RETURN; END IF;
  SELECT count(*) INTO v_rows FROM public.qa_ehs_drill_problems;
  IF v_rows <> 0 THEN RAISE NOTICE 'P4 SKIP public.qa_ehs_drill_problems: rows=% (expected 0)', v_rows; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'f' AND confrelid = to_regclass('public.qa_ehs_drill_problems')) THEN RAISE NOTICE 'P4 SKIP public.qa_ehs_drill_problems: inbound FK exists'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_depend d JOIN pg_class c ON c.oid = d.objid WHERE d.refobjid = to_regclass('public.qa_ehs_drill_problems') AND c.relkind IN ('v','m')) THEN RAISE NOTICE 'P4 SKIP public.qa_ehs_drill_problems: view dependency'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_depend d WHERE d.refobjid = to_regclass('public.qa_ehs_drill_problems') AND d.classid = 'pg_proc'::regclass) THEN RAISE NOTICE 'P4 SKIP public.qa_ehs_drill_problems: function dependency'; RETURN; END IF;
  BEGIN
    DROP TABLE public.qa_ehs_drill_problems RESTRICT;
    RAISE NOTICE 'P4 DROPPED public.qa_ehs_drill_problems';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'P4 SKIP public.qa_ehs_drill_problems: drop failed: %', SQLERRM;
  END;
END $$;

DO $$
DECLARE v_rows bigint;
BEGIN
  IF to_regclass('public.qa_ehs_emergency_plan_approvals') IS NULL THEN RAISE NOTICE 'P4 SKIP public.qa_ehs_emergency_plan_approvals: not exists'; RETURN; END IF;
  IF (SELECT relkind::text FROM pg_class WHERE oid = to_regclass('public.qa_ehs_emergency_plan_approvals')) <> 'r' THEN RAISE NOTICE 'P4 SKIP public.qa_ehs_emergency_plan_approvals: relkind not r'; RETURN; END IF;
  SELECT count(*) INTO v_rows FROM public.qa_ehs_emergency_plan_approvals;
  IF v_rows <> 0 THEN RAISE NOTICE 'P4 SKIP public.qa_ehs_emergency_plan_approvals: rows=% (expected 0)', v_rows; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'f' AND confrelid = to_regclass('public.qa_ehs_emergency_plan_approvals')) THEN RAISE NOTICE 'P4 SKIP public.qa_ehs_emergency_plan_approvals: inbound FK exists'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_depend d JOIN pg_class c ON c.oid = d.objid WHERE d.refobjid = to_regclass('public.qa_ehs_emergency_plan_approvals') AND c.relkind IN ('v','m')) THEN RAISE NOTICE 'P4 SKIP public.qa_ehs_emergency_plan_approvals: view dependency'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_depend d WHERE d.refobjid = to_regclass('public.qa_ehs_emergency_plan_approvals') AND d.classid = 'pg_proc'::regclass) THEN RAISE NOTICE 'P4 SKIP public.qa_ehs_emergency_plan_approvals: function dependency'; RETURN; END IF;
  BEGIN
    DROP TABLE public.qa_ehs_emergency_plan_approvals RESTRICT;
    RAISE NOTICE 'P4 DROPPED public.qa_ehs_emergency_plan_approvals';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'P4 SKIP public.qa_ehs_emergency_plan_approvals: drop failed: %', SQLERRM;
  END;
END $$;

DO $$
DECLARE v_rows bigint;
BEGIN
  IF to_regclass('public.qa_ehs_emergency_plan_supplies') IS NULL THEN RAISE NOTICE 'P4 SKIP public.qa_ehs_emergency_plan_supplies: not exists'; RETURN; END IF;
  IF (SELECT relkind::text FROM pg_class WHERE oid = to_regclass('public.qa_ehs_emergency_plan_supplies')) <> 'r' THEN RAISE NOTICE 'P4 SKIP public.qa_ehs_emergency_plan_supplies: relkind not r'; RETURN; END IF;
  SELECT count(*) INTO v_rows FROM public.qa_ehs_emergency_plan_supplies;
  IF v_rows <> 0 THEN RAISE NOTICE 'P4 SKIP public.qa_ehs_emergency_plan_supplies: rows=% (expected 0)', v_rows; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'f' AND confrelid = to_regclass('public.qa_ehs_emergency_plan_supplies')) THEN RAISE NOTICE 'P4 SKIP public.qa_ehs_emergency_plan_supplies: inbound FK exists'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_depend d JOIN pg_class c ON c.oid = d.objid WHERE d.refobjid = to_regclass('public.qa_ehs_emergency_plan_supplies') AND c.relkind IN ('v','m')) THEN RAISE NOTICE 'P4 SKIP public.qa_ehs_emergency_plan_supplies: view dependency'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_depend d WHERE d.refobjid = to_regclass('public.qa_ehs_emergency_plan_supplies') AND d.classid = 'pg_proc'::regclass) THEN RAISE NOTICE 'P4 SKIP public.qa_ehs_emergency_plan_supplies: function dependency'; RETURN; END IF;
  BEGIN
    DROP TABLE public.qa_ehs_emergency_plan_supplies RESTRICT;
    RAISE NOTICE 'P4 DROPPED public.qa_ehs_emergency_plan_supplies';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'P4 SKIP public.qa_ehs_emergency_plan_supplies: drop failed: %', SQLERRM;
  END;
END $$;

DO $$
DECLARE v_rows bigint;
BEGIN
  IF to_regclass('public.qa_ehs_emergency_plan_versions') IS NULL THEN RAISE NOTICE 'P4 SKIP public.qa_ehs_emergency_plan_versions: not exists'; RETURN; END IF;
  IF (SELECT relkind::text FROM pg_class WHERE oid = to_regclass('public.qa_ehs_emergency_plan_versions')) <> 'r' THEN RAISE NOTICE 'P4 SKIP public.qa_ehs_emergency_plan_versions: relkind not r'; RETURN; END IF;
  SELECT count(*) INTO v_rows FROM public.qa_ehs_emergency_plan_versions;
  IF v_rows <> 0 THEN RAISE NOTICE 'P4 SKIP public.qa_ehs_emergency_plan_versions: rows=% (expected 0)', v_rows; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'f' AND confrelid = to_regclass('public.qa_ehs_emergency_plan_versions')) THEN RAISE NOTICE 'P4 SKIP public.qa_ehs_emergency_plan_versions: inbound FK exists'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_depend d JOIN pg_class c ON c.oid = d.objid WHERE d.refobjid = to_regclass('public.qa_ehs_emergency_plan_versions') AND c.relkind IN ('v','m')) THEN RAISE NOTICE 'P4 SKIP public.qa_ehs_emergency_plan_versions: view dependency'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_depend d WHERE d.refobjid = to_regclass('public.qa_ehs_emergency_plan_versions') AND d.classid = 'pg_proc'::regclass) THEN RAISE NOTICE 'P4 SKIP public.qa_ehs_emergency_plan_versions: function dependency'; RETURN; END IF;
  BEGIN
    DROP TABLE public.qa_ehs_emergency_plan_versions RESTRICT;
    RAISE NOTICE 'P4 DROPPED public.qa_ehs_emergency_plan_versions';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'P4 SKIP public.qa_ehs_emergency_plan_versions: drop failed: %', SQLERRM;
  END;
END $$;

DO $$
DECLARE v_rows bigint;
BEGIN
  IF to_regclass('public.qa_ehs_employees') IS NULL THEN RAISE NOTICE 'P4 SKIP public.qa_ehs_employees: not exists'; RETURN; END IF;
  IF (SELECT relkind::text FROM pg_class WHERE oid = to_regclass('public.qa_ehs_employees')) <> 'r' THEN RAISE NOTICE 'P4 SKIP public.qa_ehs_employees: relkind not r'; RETURN; END IF;
  SELECT count(*) INTO v_rows FROM public.qa_ehs_employees;
  IF v_rows <> 0 THEN RAISE NOTICE 'P4 SKIP public.qa_ehs_employees: rows=% (expected 0)', v_rows; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'f' AND confrelid = to_regclass('public.qa_ehs_employees')) THEN RAISE NOTICE 'P4 SKIP public.qa_ehs_employees: inbound FK exists'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_depend d JOIN pg_class c ON c.oid = d.objid WHERE d.refobjid = to_regclass('public.qa_ehs_employees') AND c.relkind IN ('v','m')) THEN RAISE NOTICE 'P4 SKIP public.qa_ehs_employees: view dependency'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_depend d WHERE d.refobjid = to_regclass('public.qa_ehs_employees') AND d.classid = 'pg_proc'::regclass) THEN RAISE NOTICE 'P4 SKIP public.qa_ehs_employees: function dependency'; RETURN; END IF;
  BEGIN
    DROP TABLE public.qa_ehs_employees RESTRICT;
    RAISE NOTICE 'P4 DROPPED public.qa_ehs_employees';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'P4 SKIP public.qa_ehs_employees: drop failed: %', SQLERRM;
  END;
END $$;

DO $$
DECLARE v_rows bigint;
BEGIN
  IF to_regclass('public.qa_ehs_env_monitor_records') IS NULL THEN RAISE NOTICE 'P4 SKIP public.qa_ehs_env_monitor_records: not exists'; RETURN; END IF;
  IF (SELECT relkind::text FROM pg_class WHERE oid = to_regclass('public.qa_ehs_env_monitor_records')) <> 'r' THEN RAISE NOTICE 'P4 SKIP public.qa_ehs_env_monitor_records: relkind not r'; RETURN; END IF;
  SELECT count(*) INTO v_rows FROM public.qa_ehs_env_monitor_records;
  IF v_rows <> 0 THEN RAISE NOTICE 'P4 SKIP public.qa_ehs_env_monitor_records: rows=% (expected 0)', v_rows; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'f' AND confrelid = to_regclass('public.qa_ehs_env_monitor_records')) THEN RAISE NOTICE 'P4 SKIP public.qa_ehs_env_monitor_records: inbound FK exists'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_depend d JOIN pg_class c ON c.oid = d.objid WHERE d.refobjid = to_regclass('public.qa_ehs_env_monitor_records') AND c.relkind IN ('v','m')) THEN RAISE NOTICE 'P4 SKIP public.qa_ehs_env_monitor_records: view dependency'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_depend d WHERE d.refobjid = to_regclass('public.qa_ehs_env_monitor_records') AND d.classid = 'pg_proc'::regclass) THEN RAISE NOTICE 'P4 SKIP public.qa_ehs_env_monitor_records: function dependency'; RETURN; END IF;
  BEGIN
    DROP TABLE public.qa_ehs_env_monitor_records RESTRICT;
    RAISE NOTICE 'P4 DROPPED public.qa_ehs_env_monitor_records';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'P4 SKIP public.qa_ehs_env_monitor_records: drop failed: %', SQLERRM;
  END;
END $$;

DO $$
DECLARE v_rows bigint;
BEGIN
  IF to_regclass('public.qa_ehs_environment_incidents') IS NULL THEN RAISE NOTICE 'P4 SKIP public.qa_ehs_environment_incidents: not exists'; RETURN; END IF;
  IF (SELECT relkind::text FROM pg_class WHERE oid = to_regclass('public.qa_ehs_environment_incidents')) <> 'r' THEN RAISE NOTICE 'P4 SKIP public.qa_ehs_environment_incidents: relkind not r'; RETURN; END IF;
  SELECT count(*) INTO v_rows FROM public.qa_ehs_environment_incidents;
  IF v_rows <> 0 THEN RAISE NOTICE 'P4 SKIP public.qa_ehs_environment_incidents: rows=% (expected 0)', v_rows; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'f' AND confrelid = to_regclass('public.qa_ehs_environment_incidents')) THEN RAISE NOTICE 'P4 SKIP public.qa_ehs_environment_incidents: inbound FK exists'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_depend d JOIN pg_class c ON c.oid = d.objid WHERE d.refobjid = to_regclass('public.qa_ehs_environment_incidents') AND c.relkind IN ('v','m')) THEN RAISE NOTICE 'P4 SKIP public.qa_ehs_environment_incidents: view dependency'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_depend d WHERE d.refobjid = to_regclass('public.qa_ehs_environment_incidents') AND d.classid = 'pg_proc'::regclass) THEN RAISE NOTICE 'P4 SKIP public.qa_ehs_environment_incidents: function dependency'; RETURN; END IF;
  BEGIN
    DROP TABLE public.qa_ehs_environment_incidents RESTRICT;
    RAISE NOTICE 'P4 DROPPED public.qa_ehs_environment_incidents';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'P4 SKIP public.qa_ehs_environment_incidents: drop failed: %', SQLERRM;
  END;
END $$;

DO $$
DECLARE v_rows bigint;
BEGIN
  IF to_regclass('public.qa_ehs_inspection_record_items') IS NULL THEN RAISE NOTICE 'P4 SKIP public.qa_ehs_inspection_record_items: not exists'; RETURN; END IF;
  IF (SELECT relkind::text FROM pg_class WHERE oid = to_regclass('public.qa_ehs_inspection_record_items')) <> 'r' THEN RAISE NOTICE 'P4 SKIP public.qa_ehs_inspection_record_items: relkind not r'; RETURN; END IF;
  SELECT count(*) INTO v_rows FROM public.qa_ehs_inspection_record_items;
  IF v_rows <> 0 THEN RAISE NOTICE 'P4 SKIP public.qa_ehs_inspection_record_items: rows=% (expected 0)', v_rows; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'f' AND confrelid = to_regclass('public.qa_ehs_inspection_record_items')) THEN RAISE NOTICE 'P4 SKIP public.qa_ehs_inspection_record_items: inbound FK exists'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_depend d JOIN pg_class c ON c.oid = d.objid WHERE d.refobjid = to_regclass('public.qa_ehs_inspection_record_items') AND c.relkind IN ('v','m')) THEN RAISE NOTICE 'P4 SKIP public.qa_ehs_inspection_record_items: view dependency'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_depend d WHERE d.refobjid = to_regclass('public.qa_ehs_inspection_record_items') AND d.classid = 'pg_proc'::regclass) THEN RAISE NOTICE 'P4 SKIP public.qa_ehs_inspection_record_items: function dependency'; RETURN; END IF;
  BEGIN
    DROP TABLE public.qa_ehs_inspection_record_items RESTRICT;
    RAISE NOTICE 'P4 DROPPED public.qa_ehs_inspection_record_items';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'P4 SKIP public.qa_ehs_inspection_record_items: drop failed: %', SQLERRM;
  END;
END $$;

DO $$
DECLARE v_rows bigint;
BEGIN
  IF to_regclass('public.qa_ehs_msds') IS NULL THEN RAISE NOTICE 'P4 SKIP public.qa_ehs_msds: not exists'; RETURN; END IF;
  IF (SELECT relkind::text FROM pg_class WHERE oid = to_regclass('public.qa_ehs_msds')) <> 'r' THEN RAISE NOTICE 'P4 SKIP public.qa_ehs_msds: relkind not r'; RETURN; END IF;
  SELECT count(*) INTO v_rows FROM public.qa_ehs_msds;
  IF v_rows <> 0 THEN RAISE NOTICE 'P4 SKIP public.qa_ehs_msds: rows=% (expected 0)', v_rows; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'f' AND confrelid = to_regclass('public.qa_ehs_msds')) THEN RAISE NOTICE 'P4 SKIP public.qa_ehs_msds: inbound FK exists'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_depend d JOIN pg_class c ON c.oid = d.objid WHERE d.refobjid = to_regclass('public.qa_ehs_msds') AND c.relkind IN ('v','m')) THEN RAISE NOTICE 'P4 SKIP public.qa_ehs_msds: view dependency'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_depend d WHERE d.refobjid = to_regclass('public.qa_ehs_msds') AND d.classid = 'pg_proc'::regclass) THEN RAISE NOTICE 'P4 SKIP public.qa_ehs_msds: function dependency'; RETURN; END IF;
  BEGIN
    DROP TABLE public.qa_ehs_msds RESTRICT;
    RAISE NOTICE 'P4 DROPPED public.qa_ehs_msds';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'P4 SKIP public.qa_ehs_msds: drop failed: %', SQLERRM;
  END;
END $$;
