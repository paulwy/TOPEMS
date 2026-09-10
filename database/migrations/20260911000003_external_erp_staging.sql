-- 外部 ERP 数据导入 Staging 表
-- 用于存储从外部 ERP 系统导入的原始数据，支持后续转换和写入本地业务表

CREATE TABLE IF NOT EXISTS integration.external_erp_staging (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    connection_id UUID NOT NULL,
    entity VARCHAR(100) NOT NULL,
    direction VARCHAR(20) NOT NULL DEFAULT 'import',
    source_system VARCHAR(100),
    external_id VARCHAR(200),
    raw_data JSONB NOT NULL,
    processed BOOLEAN NOT NULL DEFAULT FALSE,
    process_status VARCHAR(20) DEFAULT 'pending',
    process_error TEXT,
    processed_at TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_external_erp_staging_tenant
    ON integration.external_erp_staging (tenant_id);

CREATE INDEX IF NOT EXISTS idx_external_erp_staging_connection
    ON integration.external_erp_staging (connection_id);

CREATE INDEX IF NOT EXISTS idx_external_erp_staging_entity
    ON integration.external_erp_staging (entity);

CREATE INDEX IF NOT EXISTS idx_external_erp_staging_processed
    ON integration.external_erp_staging (processed, process_status);

CREATE INDEX IF NOT EXISTS idx_external_erp_staging_external_id
    ON integration.external_erp_staging (connection_id, entity, external_id);

-- 注释
COMMENT ON TABLE integration.external_erp_staging IS '外部 ERP 数据导入 Staging 表，存储原始数据供后续转换';
COMMENT ON COLUMN integration.external_erp_staging.raw_data IS '从 ERP 获取的原始 JSON 数据';
COMMENT ON COLUMN integration.external_erp_staging.process_status IS '处理状态：pending/processing/success/failed';
COMMENT ON COLUMN integration.external_erp_staging.external_id IS '外部系统中的记录 ID，用于去重';
