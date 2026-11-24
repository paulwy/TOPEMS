-- B270 rollback: 恢复 core_workflows.status 可空，并回退为允许 NULL 的旧约束
ALTER TABLE public.core_workflows
    ALTER COLUMN status DROP NOT NULL;

ALTER TABLE public.core_workflows
    DROP CONSTRAINT IF EXISTS ck_core_workflows_status_standard;

ALTER TABLE public.core_workflows
    ADD CONSTRAINT ck_core_workflows_status_standard
    CHECK (status IS NULL OR status IN ('draft', 'published', 'active', 'inactive', 'deployed'))
    NOT VALID;

ALTER TABLE public.core_workflows
    ALTER COLUMN status SET DEFAULT 'draft';
