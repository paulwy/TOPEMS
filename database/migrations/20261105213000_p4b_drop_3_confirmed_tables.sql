-- ============================================================
-- P4 反向表清理 · B 批：已确认删除 3 张
--
-- 依据：docs/quality/p4-reverse-tables-triage-2026-11-05.md §4.7–§4.9（用户确认）。
-- 判据：finance.settlements / mes.inspection_records 0 行 0 入站 FK；public.core_coding_rules 有 2 行（已单表归档，部署 seed 同步移除）。
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
  IF to_regclass('finance.settlements') IS NULL THEN RAISE NOTICE 'P4 SKIP finance.settlements: not exists'; RETURN; END IF;
  IF (SELECT relkind::text FROM pg_class WHERE oid = to_regclass('finance.settlements')) <> 'r' THEN RAISE NOTICE 'P4 SKIP finance.settlements: relkind not r'; RETURN; END IF;
  SELECT count(*) INTO v_rows FROM finance.settlements;
  IF v_rows <> 0 THEN RAISE NOTICE 'P4 SKIP finance.settlements: rows=% (expected 0)', v_rows; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'f' AND confrelid = to_regclass('finance.settlements')) THEN RAISE NOTICE 'P4 SKIP finance.settlements: inbound FK exists'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_depend d JOIN pg_class c ON c.oid = d.objid WHERE d.refobjid = to_regclass('finance.settlements') AND c.relkind IN ('v','m')) THEN RAISE NOTICE 'P4 SKIP finance.settlements: view dependency'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_depend d WHERE d.refobjid = to_regclass('finance.settlements') AND d.classid = 'pg_proc'::regclass) THEN RAISE NOTICE 'P4 SKIP finance.settlements: function dependency'; RETURN; END IF;
  BEGIN
    DROP TABLE finance.settlements RESTRICT;
    RAISE NOTICE 'P4 DROPPED finance.settlements';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'P4 SKIP finance.settlements: drop failed: %', SQLERRM;
  END;
END $$;

DO $$
DECLARE v_rows bigint;
BEGIN
  IF to_regclass('mes.inspection_records') IS NULL THEN RAISE NOTICE 'P4 SKIP mes.inspection_records: not exists'; RETURN; END IF;
  IF (SELECT relkind::text FROM pg_class WHERE oid = to_regclass('mes.inspection_records')) <> 'r' THEN RAISE NOTICE 'P4 SKIP mes.inspection_records: relkind not r'; RETURN; END IF;
  SELECT count(*) INTO v_rows FROM mes.inspection_records;
  IF v_rows <> 0 THEN RAISE NOTICE 'P4 SKIP mes.inspection_records: rows=% (expected 0)', v_rows; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'f' AND confrelid = to_regclass('mes.inspection_records')) THEN RAISE NOTICE 'P4 SKIP mes.inspection_records: inbound FK exists'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_depend d JOIN pg_class c ON c.oid = d.objid WHERE d.refobjid = to_regclass('mes.inspection_records') AND c.relkind IN ('v','m')) THEN RAISE NOTICE 'P4 SKIP mes.inspection_records: view dependency'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_depend d WHERE d.refobjid = to_regclass('mes.inspection_records') AND d.classid = 'pg_proc'::regclass) THEN RAISE NOTICE 'P4 SKIP mes.inspection_records: function dependency'; RETURN; END IF;
  BEGIN
    DROP TABLE mes.inspection_records RESTRICT;
    RAISE NOTICE 'P4 DROPPED mes.inspection_records';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'P4 SKIP mes.inspection_records: drop failed: %', SQLERRM;
  END;
END $$;

DO $$
DECLARE v_rows bigint;
BEGIN
  IF to_regclass('public.core_coding_rules') IS NULL THEN RAISE NOTICE 'P4 SKIP public.core_coding_rules: not exists'; RETURN; END IF;
  IF (SELECT relkind::text FROM pg_class WHERE oid = to_regclass('public.core_coding_rules')) <> 'r' THEN RAISE NOTICE 'P4 SKIP public.core_coding_rules: relkind not r'; RETURN; END IF;
  SELECT count(*) INTO v_rows FROM public.core_coding_rules;
  IF v_rows <> 2 THEN RAISE NOTICE 'P4 SKIP public.core_coding_rules: rows=% (expected 2)', v_rows; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'f' AND confrelid = to_regclass('public.core_coding_rules')) THEN RAISE NOTICE 'P4 SKIP public.core_coding_rules: inbound FK exists'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_depend d JOIN pg_class c ON c.oid = d.objid WHERE d.refobjid = to_regclass('public.core_coding_rules') AND c.relkind IN ('v','m')) THEN RAISE NOTICE 'P4 SKIP public.core_coding_rules: view dependency'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_depend d WHERE d.refobjid = to_regclass('public.core_coding_rules') AND d.classid = 'pg_proc'::regclass) THEN RAISE NOTICE 'P4 SKIP public.core_coding_rules: function dependency'; RETURN; END IF;
  BEGIN
    DROP TABLE public.core_coding_rules RESTRICT;
    RAISE NOTICE 'P4 DROPPED public.core_coding_rules';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'P4 SKIP public.core_coding_rules: drop failed: %', SQLERRM;
  END;
END $$;
