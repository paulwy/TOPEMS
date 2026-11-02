-- 2026-11-03 移除 lims schema 15 张业务表上误用的模板 status CHECK（10-26 批量修复的漏网部分）
-- 背景（全库实测）：ck_*_status_standard 通用三态模板
--       CHECK (status IS NULL OR status IN ('active','inactive','archived'))
--       被批量贴到业务表，而业务 status DEFAULT 是领域态（pending/in_progress/completed/
--       available/normal/success/planning/unused/in_stock/draft...）——DEFAULT 不在 CHECK 内，
--       不带 status 的 INSERT 必违反（与 20261026130000 修复的 23 张同款炸弹；本次为 lims 漏网）。
--       触发证据：svc/lims/tests/integration_tests.rs 集成测试（test_inspection_task_crud /
--       test_inspection_record_crud）INSERT lims.inspection_tasks status='pending' 被
--       ck_inspection_tasks_status_standard 拒绝（23514）；lims 业务代码
--       svc/lims/src/modules/data_sync.rs:272 实际 UPDATE qa_lims_sync_records SET status='pending'
--       同样会被拦截。约束拦的是合法业务值，属模板误用。
-- 处置：删除这 15 张表上的 *_status_standard CHECK（业务状态机由代码层枚举保证；
--       DEFAULT 业务态保留）。数据面：15 张全 0 行——删除约束零数据风险。
--       非 status_standard 的其他 CHECK 不动。
-- 幂等：按 schema + 表名 + 约束名 LIKE '%_status_standard' 匹配删除，约束不存在即跳过，可重复执行。

DO $$
DECLARE
    r record;
BEGIN
    FOR r IN
        SELECT n.nspname, c.relname, con.conname
        FROM pg_constraint con
        JOIN pg_class c ON c.oid = con.conrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE con.contype = 'c'
          AND con.conname LIKE '%_status_standard'
          AND (n.nspname, c.relname) IN (
              ('lims','inspection_tasks'),
              ('lims','lab_ledger'),
              ('lims','qa_lab_inspection_reports'),
              ('lims','qa_lab_instruments'),
              ('lims','qa_lab_reagents'),
              ('lims','qa_lims_audit_logs'),
              ('lims','qa_lims_instrument_data'),
              ('lims','qa_lims_method_validations'),
              ('lims','qa_lims_pt_corrective_actions'),
              ('lims','qa_lims_pt_plans'),
              ('lims','qa_lims_rfid_tags'),
              ('lims','qa_lims_sync_records'),
              ('lims','qa_lims_test_methods'),
              ('lims','qa_lims_uncertainty_projects'),
              ('lims','reagents')
          )
    LOOP
        EXECUTE format('ALTER TABLE %I.%I DROP CONSTRAINT %I', r.nspname, r.relname, r.conname);
        RAISE NOTICE 'dropped % on %.%', r.conname, r.nspname, r.relname;
    END LOOP;
END $$;
