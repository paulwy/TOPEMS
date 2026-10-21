-- =============================================================
-- 批2（P1-6）：MES 车间/产线/班次/工作日历主数据
--
-- 背景：MES 工位 work_stations.workshop_id / 生产订单 production_orders.workshop_id
-- 长期悬空（无 workshop 表可引用），缺排产基础数据（车间/产线/班次/日历）。
-- 本迁移建 4 张主数据表（public schema，对齐 MES 现有表惯例：无 tenant_id、
-- 带 deleted_at 软删），并回填工位/订单的 workshop_id 外键（存量均 NULL，无冲突）。
-- =============================================================

CREATE TABLE IF NOT EXISTS workshops (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code        VARCHAR(64) NOT NULL UNIQUE,
    name        VARCHAR(128) NOT NULL,
    location    VARCHAR(256),
    manager     VARCHAR(128),
    status      VARCHAR(32) DEFAULT 'active',
    description TEXT,
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW(),
    deleted_at  TIMESTAMP
);

CREATE TABLE IF NOT EXISTS production_lines (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code        VARCHAR(64) NOT NULL UNIQUE,
    name        VARCHAR(128) NOT NULL,
    workshop_id UUID REFERENCES workshops(id) ON DELETE SET NULL,
    description TEXT,
    status      VARCHAR(32) DEFAULT 'active',
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW(),
    deleted_at  TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shifts (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code         VARCHAR(64) NOT NULL UNIQUE,
    name         VARCHAR(128) NOT NULL,
    start_time   TIME NOT NULL,
    end_time     TIME NOT NULL,
    is_overnight BOOLEAN DEFAULT FALSE,
    status       VARCHAR(32) DEFAULT 'active',
    description  TEXT,
    created_at   TIMESTAMP DEFAULT NOW(),
    updated_at   TIMESTAMP DEFAULT NOW(),
    deleted_at   TIMESTAMP
);

CREATE TABLE IF NOT EXISTS work_calendars (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code         VARCHAR(64) NOT NULL UNIQUE,
    name         VARCHAR(128) NOT NULL,
    calendar_type VARCHAR(32) DEFAULT 'workday',  -- workday / holiday
    work_date    DATE NOT NULL,
    shift_id     UUID REFERENCES shifts(id) ON DELETE SET NULL,
    is_working   BOOLEAN DEFAULT TRUE,
    remark       TEXT,
    created_at   TIMESTAMP DEFAULT NOW(),
    updated_at   TIMESTAMP DEFAULT NOW(),
    deleted_at   TIMESTAMP
);

-- 回填悬空外键：工位 / 生产订单 -> 车间（存量 workshop_id 均 NULL，FK 允许 NULL 不冲突）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_work_stations_workshop'
    ) THEN
        ALTER TABLE work_stations
            ADD CONSTRAINT fk_work_stations_workshop
            FOREIGN KEY (workshop_id) REFERENCES workshops(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_production_orders_workshop'
    ) THEN
        ALTER TABLE production_orders
            ADD CONSTRAINT fk_production_orders_workshop
            FOREIGN KEY (workshop_id) REFERENCES workshops(id) ON DELETE SET NULL;
    END IF;
END $$;
