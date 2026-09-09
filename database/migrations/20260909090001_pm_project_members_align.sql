-- pm.project_members 表结构对齐代码契约（V514 修复）
-- 背景：旧 schema_defense TABLE_DEFS 误写 user_name/join_date/leave_date/status，
-- 而 handler/前端契约为 responsibilities/start_date/end_date；
-- 且 INSERT 缺 tenant_id（NOT NULL）导致项目成员接口 500。
-- 本迁移幂等：新库按正确结构建表；存量库补齐缺失列并放宽旧列 NOT NULL。

CREATE TABLE IF NOT EXISTS pm.project_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL,
    user_id VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL,
    responsibilities TEXT,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    tenant_id UUID
);

ALTER TABLE pm.project_members ADD COLUMN IF NOT EXISTS responsibilities TEXT;
ALTER TABLE pm.project_members ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ;
ALTER TABLE pm.project_members ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ;
ALTER TABLE pm.project_members ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- 旧版 TABLE_DEFS 遗留列：放宽 NOT NULL（该列已不在代码写入路径中，后续版本可清理）
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'pm' AND table_name = 'project_members' AND column_name = 'user_name'
    ) THEN
        EXECUTE 'ALTER TABLE pm.project_members ALTER COLUMN user_name DROP NOT NULL';
    END IF;
END $$;
