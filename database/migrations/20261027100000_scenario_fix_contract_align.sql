-- ============================================================================
-- 场景化测试修复批次：代码 ↔ DB schema 契约对齐补丁（2026-10-27）
-- 来源：R0-R7 场景化全模块测试 + 全模块 E2E 测试发现的 schema 漂移
-- 目标库：topems_test / topems_dev（可安全重放，全部幂等）
-- 验证状态：逐条已执行并通过 API 复验
-- ============================================================================

-- 1) master_data.materials 表缺失（S1 首次 create 500 → 手工建表后 200）
--    根因：TABLE_DEFS 已声明但 build 期 schema_defense 自愈未建此表
CREATE TABLE IF NOT EXISTS master_data.materials (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_code VARCHAR(64)  NOT NULL UNIQUE,
    material_name VARCHAR(128) NOT NULL,
    unit          VARCHAR(32),
    tenant_id     UUID,
    created_by    VARCHAR(64),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at    TIMESTAMPTZ
);

-- 2) hrm.employees：organization_id / tenant_id NOT NULL 无默认，代码绑定 Option（S4 create 500）
ALTER TABLE hrm.employees ALTER COLUMN organization_id DROP NOT NULL;
ALTER TABLE hrm.employees ALTER COLUMN tenant_id     DROP NOT NULL;

-- 3) portal.portal_todos 壳表缺业务列（S4 create 500，仅 id/deleted_at/tenant_id）
ALTER TABLE portal.portal_todos ADD COLUMN IF NOT EXISTS title        VARCHAR(255);
ALTER TABLE portal.portal_todos ADD COLUMN IF NOT EXISTS service      VARCHAR(64);
ALTER TABLE portal.portal_todos ADD COLUMN IF NOT EXISTS due_date     TIMESTAMPTZ;
ALTER TABLE portal.portal_todos ADD COLUMN IF NOT EXISTS priority     VARCHAR(32);
ALTER TABLE portal.portal_todos ADD COLUMN IF NOT EXISTS status       VARCHAR(32) DEFAULT 'pending';
ALTER TABLE portal.portal_todos ADD COLUMN IF NOT EXISTS description  TEXT;
ALTER TABLE portal.portal_todos ADD COLUMN IF NOT EXISTS assigned_to  VARCHAR(64);
ALTER TABLE portal.portal_todos ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE portal.portal_todos ADD COLUMN IF NOT EXISTS created_by   VARCHAR(64);
ALTER TABLE portal.portal_todos ADD COLUMN IF NOT EXISTS created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE portal.portal_todos ADD COLUMN IF NOT EXISTS updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 4) ehs.qa_ehs_accidents 缺 tenant_id（R4 accidents envelope 500，代码 SELECT 引用）
ALTER TABLE ehs.qa_ehs_accidents ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- 5) pm.projects.tags：jsonb → text[]（Project.tags: Option<Vec<String>>，sqlx 原生解码）
--    jsonb 无直接 cast 到 text[]，采用 DROP+ADD（幂等防护：仅当 jsonb 时执行）
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'pm' AND table_name = 'projects'
          AND column_name = 'tags' AND data_type = 'jsonb'
    ) THEN
        ALTER TABLE pm.projects DROP COLUMN tags;
        ALTER TABLE pm.projects ADD COLUMN tags text[] DEFAULT '{}';
    END IF;
END $$;

-- 6) pm.projects.code 唯一约束（create 的 ON CONFLICT (code) 依赖）
CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_code_unique ON pm.projects(code);

-- 7) pm.projects.cost_center_id / cost_center_name（INSERT/RETURNING/SELECT 引用但表缺失）
ALTER TABLE pm.projects ADD COLUMN IF NOT EXISTS cost_center_id   VARCHAR(64);
ALTER TABLE pm.projects ADD COLUMN IF NOT EXISTS cost_center_name VARCHAR(128);

-- ============================================================================
-- 未纳入本补丁（另文登记）：
--  - mes/wms/qms/pm 列表读回 rows=0（落库有数据但列表查询过滤差异，P2 待深查）
--  - plugins/subscriptions 未挂载 monolith（P2，需 unified-core 路由挂载）
--  - iam 空库自愈缺 users/core_users（P2，首次登录 500）
-- ============================================================================
