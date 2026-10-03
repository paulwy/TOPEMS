-- ================================================================================
-- R-2b: ck_qa_lab_tasks_status_standard 窄约束放宽（补 R-3 同族缺口）
-- 来源：go-live 排期 R2 六链路复测步骤 A / regression-baseline-r2 遗留 #3（同族窄约束）
--
-- 背景：
--   R-3（20261003000003_r3_status_constraint_relax）已放宽同族 7 张表
--   （payroll_runs / financial_vouchers / erp_production_orders / qa_lab_samples /
--     crm.audit_logs / wms.audit_logs / qa_lims_audit_logs），但**漏放 public.qa_lab_tasks**。
--   R-2 链路④实测：integration 编排到 lims `/api/internal/lims/tasks/integration`，
--   任务落库被 `ck_qa_lab_tasks_status_standard` 拦截——status='pending' 不在
--   窄约束（仅 active/inactive/archived）允许集合内。
--
-- 实测业务写入值（以代码为准，非臆测）：
--   - svc/lims/src/modules/integration.rs:127 create_integration_task
--       status = req.status.unwrap_or("pending")  → 集成建任务默认 pending
--   - svc/lims/src/modules/inspection_task.rs:387 常规建任务 INSERT 不写 status，
--       依赖列默认 'pending'::character varying（\d 实测 DEFAULT 'pending'）
--   - svc/lims/src/modules/inspection_task.rs:635 完成 handler
--       SET status = 'completed'
--   - svc/lims/src/modules/inspection_task.rs:547 更新 handler COALESCE($2,status)
--       透传调用方状态（assigned/in_progress/testing 等生命周期态）
--
-- 本表在 public schema（非 lims.qa_lab_tasks——后者已被 20260921000100 cleanup）。
-- 幂等：IF EXISTS 守卫；DROP CONSTRAINT IF EXISTS。不吞错（去掉 EXCEPTION WHEN OTHERS）。
-- ================================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema='public' AND table_name='qa_lab_tasks') THEN
        ALTER TABLE public.qa_lab_tasks DROP CONSTRAINT IF EXISTS ck_qa_lab_tasks_status_standard;
        ALTER TABLE public.qa_lab_tasks ADD CONSTRAINT ck_qa_lab_tasks_status_standard
            CHECK (status IS NULL OR status IN (
                'active','inactive','archived',
                'pending','received','registered',
                'assigned','in_progress','testing','completed','cancelled'
            ));
    END IF;
END $$;
