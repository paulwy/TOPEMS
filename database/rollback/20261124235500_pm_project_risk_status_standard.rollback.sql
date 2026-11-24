-- B269 rollback: 移除 PM 项目风险状态约束并恢复可空
ALTER TABLE pm.project_risks
    DROP CONSTRAINT IF EXISTS ck_project_risks_status_standard;

ALTER TABLE pm.project_risks
    ALTER COLUMN status DROP NOT NULL;

ALTER TABLE pm.project_risks
    ALTER COLUMN status SET DEFAULT 'identified';
