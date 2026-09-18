-- 外部 ERP 数据导入 Staging 表
-- 用于存储从外部 ERP 系统导入的原始数据，支持后续转换和写入本地业务表

-- 2026-09-18 防御化（空库重建链卡点）：若 integration.external_erp_staging 仅为 business_base_tables 建的 2 列裸骨架
-- （无 tenant_id 列）则 DROP 重建（骨架无数据）；结构完整或不存在则跳过。
DO $skel$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='integration' AND table_name='external_erp_staging')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='integration' AND table_name='external_erp_staging' AND column_name='tenant_id')
  THEN
    DROP TABLE integration.external_erp_staging;
  END IF;
END $skel$;

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
