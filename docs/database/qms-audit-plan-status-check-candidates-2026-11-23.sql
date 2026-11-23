-- B241：qms.qa_audit_plans.status 收敛到 AuditPlanStatus
-- 值集与 shared::fsm::AUDIT_PLAN 一致：draft/scheduled/in_progress/completed/cancelled
-- 同时补上缺失的 /audit-plans/{id}/schedule 入口，start 仅接受 scheduled。

ALTER TABLE qms.qa_audit_plans
    ADD CONSTRAINT ck_qa_audit_plans_status_standard
    CHECK (
        (status IS NULL)
        OR ((status)::text = ANY (ARRAY['draft'::text, 'scheduled'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text]))
    ) NOT VALID;
