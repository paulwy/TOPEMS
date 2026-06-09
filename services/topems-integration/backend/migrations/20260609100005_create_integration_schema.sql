-- Integration Schema Migration
-- 集成服务

-- Create schema
CREATE SCHEMA IF NOT EXISTS integration;

-- Set search path
SET search_path TO integration;

-- ==================== 集成事件表 ====================

-- 集成事件表
CREATE TABLE IF NOT EXISTS integration_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_system VARCHAR(50) NOT NULL,
    target_system VARCHAR(50) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    source_record_id UUID,
    target_record_id UUID,
    payload JSONB,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    error_message TEXT,
    synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==================== LIMS-QMS 同步表 ====================

-- LIMS-QMS 同步表
CREATE TABLE IF NOT EXISTS lims_qms_sync (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lims_sample_id UUID NOT NULL,
    qms_inspection_id UUID,
    sample_name VARCHAR(255) NOT NULL,
    inspection_result TEXT,
    inspection_notes TEXT,
    synced BOOLEAN NOT NULL DEFAULT FALSE,
    sync_status VARCHAR(50) NOT NULL DEFAULT 'pending',
    sync_error TEXT,
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==================== MES-ERP 同步表 ====================

-- MES-ERP 同步表
CREATE TABLE IF NOT EXISTS mes_erp_sync (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mes_order_id UUID NOT NULL,
    erp_order_id UUID,
    order_number VARCHAR(255) NOT NULL,
    product_name VARCHAR(255),
    quantity NUMERIC(15,2),
    synced BOOLEAN NOT NULL DEFAULT FALSE,
    sync_status VARCHAR(50) NOT NULL DEFAULT 'pending',
    sync_error TEXT,
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==================== WMS-SCM 同步表 ====================

-- WMS-SCM 同步表
CREATE TABLE IF NOT EXISTS wms_scm_sync (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wms_inventory_id UUID NOT NULL,
    scm_supply_id UUID,
    item_name VARCHAR(255) NOT NULL,
    quantity NUMERIC(15,2),
    unit VARCHAR(50),
    synced BOOLEAN NOT NULL DEFAULT FALSE,
    sync_status VARCHAR(50) NOT NULL DEFAULT 'pending',
    sync_error TEXT,
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==================== 集成配置表 ====================

-- 集成配置表
CREATE TABLE IF NOT EXISTS integration_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_name VARCHAR(100) NOT NULL UNIQUE,
    source_system VARCHAR(50) NOT NULL,
    target_system VARCHAR(50) NOT NULL,
    config_type VARCHAR(50) NOT NULL,
    config_value JSONB NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ==================== 索引创建 ====================

CREATE INDEX IF NOT EXISTS idx_integration_events_source ON integration.integration_events(source_system);
CREATE INDEX IF NOT EXISTS idx_integration_events_target ON integration.integration_events(target_system);
CREATE INDEX IF NOT EXISTS idx_integration_events_status ON integration.integration_events(status);
CREATE INDEX IF NOT EXISTS idx_integration_events_created ON integration.integration_events(created_at);
CREATE INDEX IF NOT EXISTS idx_lims_qms_sync_sample ON integration.lims_qms_sync(lims_sample_id);
CREATE INDEX IF NOT EXISTS idx_lims_qms_sync_status ON integration.lims_qms_sync(sync_status);
CREATE INDEX IF NOT EXISTS idx_mes_erp_sync_order ON integration.mes_erp_sync(mes_order_id);
CREATE INDEX IF NOT EXISTS idx_mes_erp_sync_status ON integration.mes_erp_sync(sync_status);
CREATE INDEX IF NOT EXISTS idx_wms_scm_sync_inventory ON integration.wms_scm_sync(wms_inventory_id);
CREATE INDEX IF NOT EXISTS idx_wms_scm_sync_status ON integration.wms_scm_sync(sync_status);
CREATE INDEX IF NOT EXISTS idx_integration_configs_name ON integration.integration_configs(config_name);

-- Reset search path
RESET search_path;