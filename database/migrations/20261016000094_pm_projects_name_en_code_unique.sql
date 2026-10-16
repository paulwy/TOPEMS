-- PM 项目创建 500 根因修复：
-- 1) INSERT/RETURNING 引用 name_en（i18n 双语列）但 pm.projects 缺该列 → 500
-- 2) ON CONFLICT (code) DO NOTHING 需要 code 唯一约束，但仅有主键 id → 500
-- 均幂等；已手工 ALTER 的库可安全重跑。
ALTER TABLE pm.projects
    ADD COLUMN IF NOT EXISTS name_en character varying(200);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'projects_code_key' AND conrelid = 'pm.projects'::regclass
    ) THEN
        ALTER TABLE pm.projects ADD CONSTRAINT projects_code_key UNIQUE (code);
    END IF;
END $$;
