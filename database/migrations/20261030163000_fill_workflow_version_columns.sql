-- public.core_workflow_versions 补齐 handler/写入端引用的 2 列
-- 成因：create/list/get workflow version 的 handler（svc/unified-core/src/modules/flow/workflow.rs）
-- 均引用 change_description/created_by，生产库建表漏掉这两列 → INSERT/SELECT 均 500
-- 幂等：ADD COLUMN IF NOT EXISTS

ALTER TABLE public.core_workflow_versions
    ADD COLUMN IF NOT EXISTS change_description TEXT,
    ADD COLUMN IF NOT EXISTS created_by UUID;
