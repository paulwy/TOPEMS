-- B242：pm.acceptance_plans.status 收敛到 pending/in_progress/completed/cancelled
-- 创建入口原硬编码 'pending'；更新接口原样写 status；新增 CHECK 与枚举统一。

ALTER TABLE pm.acceptance_plans
    ADD CONSTRAINT ck_acceptance_plans_status_standard
    CHECK (
        (status IS NULL)
        OR ((status)::text = ANY (ARRAY['pending'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text]))
    ) NOT VALID;
