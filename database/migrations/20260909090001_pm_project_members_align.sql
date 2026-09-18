-- pm.project_members 表结构对齐代码契约（V514 修复）
-- 背景：旧 schema_defense TABLE_DEFS 误写 user_name/join_date/leave_date/status，
-- 而 handler/前端契约为 responsibilities/start_date/end_date；
-- 且 INSERT 缺 tenant_id（NOT NULL）导致项目成员接口 500。
-- 本迁移幂等：新库按正确结构建表；存量库补齐缺失列并放宽旧列 NOT NULL。

-- 2026-09-18 防御化（空库重建链卡点）：若 pm.project_members 仅为 business_base_tables 建的 2 列裸骨架
-- （无 project_id 列）则 DROP 重建（骨架无数据）；结构完整或不存在则跳过。
DO $skel$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='pm' AND table_name='project_members')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='pm' AND table_name='project_members' AND column_name='project_id')
  THEN
    DROP TABLE pm.project_members;
  END IF;
END $skel$;

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
