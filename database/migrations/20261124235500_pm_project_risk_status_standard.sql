-- B269: 回迁 pm.project_risks 状态值域（原 B235 仅候选 SQL，无迁移）
-- 规范三态：identified / mitigated / closed；默认 identified。
-- 兼容历史别名只做一次性归一，未知值保留并由 NOT VALID 约束等待人工处置。

ALTER TABLE pm.project_risks
    ALTER COLUMN status SET DEFAULT 'identified';

-- destructive-gate: allow
-- destructive-kind: UPDATE
-- destructive-reason: 把 B235 遗留的风险状态历史别名归一为 identified/mitigated/closed
-- destructive-owner: pm
-- destructive-ticket: W5-B-B269
-- destructive-expires: 2027-05-01
-- destructive-max-rows: 100000
-- destructive-backup: 窗口前 pg_dump -t pm.project_risks
UPDATE pm.project_risks
SET status = CASE lower(btrim(status))
    WHEN 'open' THEN 'identified'
    WHEN 'active' THEN 'identified'
    WHEN 'mitigating' THEN 'mitigated'
    WHEN 'controlled' THEN 'mitigated'
    WHEN 'complete' THEN 'closed'
    WHEN 'completed' THEN 'closed'
    WHEN 'done' THEN 'closed'
    WHEN 'resolved' THEN 'closed'
    ELSE lower(btrim(status))
END
WHERE status IS NOT NULL;

-- destructive-gate: allow
-- destructive-kind: UPDATE
-- destructive-reason: 把 B235 遗留的空风险状态补默认 identified，随后收紧 NOT NULL
-- destructive-owner: pm
-- destructive-ticket: W5-B-B269
-- destructive-expires: 2027-05-01
-- destructive-max-rows: 100000
-- destructive-backup: 窗口前 pg_dump -t pm.project_risks
UPDATE pm.project_risks
SET status = 'identified'
WHERE status IS NULL;

ALTER TABLE pm.project_risks
    ALTER COLUMN status SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint con
        JOIN pg_class c ON c.oid = con.conrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'pm'
          AND c.relname = 'project_risks'
          AND con.conname = 'ck_project_risks_status_standard'
    ) THEN
        ALTER TABLE pm.project_risks
            ADD CONSTRAINT ck_project_risks_status_standard
            CHECK (status IN ('identified', 'mitigated', 'closed'))
            NOT VALID;
    END IF;
END $$;

COMMENT ON COLUMN pm.project_risks.status IS
    '状态：identified, mitigated, closed';
