-- B270: 回迁 public.core_workflows 状态值域（原 B168 仅候选 SQL，无迁移）
-- 规范五态：draft / published / active / inactive / deployed；默认 draft。
-- 旧迁移 20260920000081 会先 DROP 约束，因此本迁移必须重建，保证「基线 + 前向迁移」可复现。

ALTER TABLE public.core_workflows
    ALTER COLUMN status SET DEFAULT 'draft';

-- destructive-gate: allow
-- destructive-kind: UPDATE
-- destructive-reason: 把工作流空状态补默认 draft，随后收紧 NOT NULL
-- destructive-owner: unified-core
-- destructive-ticket: W5-B-B270
-- destructive-expires: 2027-05-01
-- destructive-max-rows: 100000
-- destructive-backup: 窗口前 pg_dump -t public.core_workflows
UPDATE public.core_workflows
SET status = 'draft'
WHERE status IS NULL;

ALTER TABLE public.core_workflows
    ALTER COLUMN status SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint con
        JOIN pg_class c ON c.oid = con.conrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relname = 'core_workflows'
          AND con.conname = 'ck_core_workflows_status_standard'
    ) THEN
        ALTER TABLE public.core_workflows
            ADD CONSTRAINT ck_core_workflows_status_standard
            CHECK (status IN ('draft', 'published', 'active', 'inactive', 'deployed'))
            NOT VALID;
    END IF;
END $$;

COMMENT ON COLUMN public.core_workflows.status IS
    '状态：draft, published, active, inactive, deployed';
