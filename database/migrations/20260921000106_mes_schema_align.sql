-- 000106: mes schema 结构对齐（编译/运行双库一致性）
-- 背景：mes 运行库(5433)的 production_orders 有 order_no NOT NULL（历史遗留，不在迁移内），
--       编译参考库(5432)缺失该列，导致编译期 sqlx 在线解析报 column does not exist；
--       同时 mes.teams / mes.equipment_oee 缺失 tenant_id 列，而代码查询（租户 RLS 过滤）
--       显式引用 t.tenant_id / oee.tenant_id。
-- 本迁移幂等补齐：两库可重放；NOT NULL 列带 DEFAULT '' 保证旧行可加列。

-- 1. production_orders.order_no（与运行库已有列对齐；已存在则跳过）
ALTER TABLE mes.production_orders ADD COLUMN IF NOT EXISTS order_no VARCHAR(100) NOT NULL DEFAULT '';

-- 2. teams.tenant_id（租户隔离过滤所需）
--    mes.teams / mes.team_members 无任何迁移定义（遗留表仅存在于运行库），
--    按 mes 服务 team.rs 实体结构（CreateTeamRequest/TeamResponse/INSERT 列）补齐真表
CREATE TABLE IF NOT EXISTS mes.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_code VARCHAR(100) NOT NULL,
    team_name VARCHAR(200) NOT NULL,
    team_type VARCHAR(50),
    work_station_id UUID,
    leader_id VARCHAR(64),
    leader_name VARCHAR(128),
    member_count INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    description TEXT,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS mes.team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES mes.teams(id) ON DELETE CASCADE,
    employee_id VARCHAR(64) NOT NULL,
    employee_name VARCHAR(128) NOT NULL,
    employee_code VARCHAR(64),
    position VARCHAR(128),
    join_date timestamptz
);
ALTER TABLE mes.teams ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- 3. equipment_oee.tenant_id（租户隔离过滤所需）
--    mes.equipment_oee 无任何迁移定义（遗留表仅存在于运行库），
--    按 mes 服务 equipment_oee.rs 查询/响应列补齐真表
CREATE TABLE IF NOT EXISTS mes.equipment_oee (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_id UUID NOT NULL,
    record_date timestamptz NOT NULL,
    planned_production_time DOUBLE PRECISION,
    actual_run_time DOUBLE PRECISION,
    downtime DOUBLE PRECISION,
    ideal_cycle_time DOUBLE PRECISION,
    actual_output DOUBLE PRECISION,
    good_output DOUBLE PRECISION,
    defective_output DOUBLE PRECISION,
    availability DOUBLE PRECISION,
    performance DOUBLE PRECISION,
    quality_rate DOUBLE PRECISION,
    oee DOUBLE PRECISION,
    shift VARCHAR(32),
    operator VARCHAR(128),
    notes TEXT,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW(),
    deleted_at timestamptz
);
ALTER TABLE mes.equipment_oee ADD COLUMN IF NOT EXISTS tenant_id UUID;
