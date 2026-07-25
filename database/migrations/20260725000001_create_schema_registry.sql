-- Schema Registry — 元数据驱动的动态 API
-- 创建 schema_registry 和 dynamic_data 表
--
-- 功能：
--   1. schema_registry 存储 EntitySchema 配置（JSON）
--   2. dynamic_data 存储根据 Schema 创建的业务数据（JSONB）
--   3. 后端根据 Schema JSON 动态创建专用数据表（dynamic_<name>）

-- ============ schema_registry 表 ============
CREATE TABLE IF NOT EXISTS schema_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    schema_json JSONB NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_schema_registry_name ON schema_registry(name);
CREATE INDEX IF NOT EXISTS idx_schema_registry_active ON schema_registry(is_active);
CREATE INDEX IF NOT EXISTS idx_schema_registry_created_at ON schema_registry(created_at DESC);

COMMENT ON TABLE schema_registry IS 'Schema 注册表 - 存储前端 EntitySchema 配置，驱动动态 CRUD API';
COMMENT ON COLUMN schema_registry.schema_json IS 'EntitySchema JSON 配置（含 fields、list、form 等）';
COMMENT ON COLUMN schema_registry.table_name IS '动态创建的数据表名（dynamic_<name>）';

-- ============ dynamic_data 表 ============
-- 通用数据存储表，用于未自动建表时的 JSONB 存储
CREATE TABLE IF NOT EXISTS dynamic_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schema_id UUID NOT NULL REFERENCES schema_registry(id) ON DELETE CASCADE,
    data_json JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dynamic_data_schema_id ON dynamic_data(schema_id);
CREATE INDEX IF NOT EXISTS idx_dynamic_data_created_at ON dynamic_data(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dynamic_data_data_json_gin ON dynamic_data USING GIN(data_json);

COMMENT ON TABLE dynamic_data IS '动态数据存储表 - 根据 Schema 存储业务数据（JSONB）';
COMMENT ON COLUMN dynamic_data.data_json IS '业务数据（JSONB，结构由 schema_id 对应的 schema_json 定义）';

-- ============ 更新时间触发器 ============
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_schema_registry_updated_at ON schema_registry;
CREATE TRIGGER trigger_schema_registry_updated_at
    BEFORE UPDATE ON schema_registry
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_dynamic_data_updated_at ON dynamic_data;
CREATE TRIGGER trigger_dynamic_data_updated_at
    BEFORE UPDATE ON dynamic_data
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
