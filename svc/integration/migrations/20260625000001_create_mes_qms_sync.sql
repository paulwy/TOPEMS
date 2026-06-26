-- MES ↔ QMS Integration Schema
-- MES与QMS质检数据集成

-- Set search path
SET search_path TO integration;

-- ==================== MES-QMS 同步表 ====================

-- MES-QMS 质检数据同步表
CREATE TABLE IF NOT EXISTS mes_qms_sync (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sync_type VARCHAR(50) NOT NULL,
    direction VARCHAR(30) NOT NULL,
    mes_record_id UUID,
    mes_record_type VARCHAR(50),
    qms_inspection_id UUID,
    order_id UUID,
    order_no VARCHAR(64),
    product_id UUID,
    product_name VARCHAR(256),
    product_code VARCHAR(64),
    batch_no VARCHAR(64),
    quantity DECIMAL(12,2),
    synced BOOLEAN NOT NULL DEFAULT FALSE,
    sync_status VARCHAR(50) NOT NULL DEFAULT 'pending',
    sync_error TEXT,
    retry_count INT NOT NULL DEFAULT 0,
    max_retries INT NOT NULL DEFAULT 5,
    payload JSONB,
    result_payload JSONB,
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==================== 索引创建 ====================

CREATE INDEX IF NOT EXISTS idx_mes_qms_sync_type ON integration.mes_qms_sync(sync_type);
CREATE INDEX IF NOT EXISTS idx_mes_qms_sync_direction ON integration.mes_qms_sync(direction);
CREATE INDEX IF NOT EXISTS idx_mes_qms_sync_mes_record ON integration.mes_qms_sync(mes_record_id);
CREATE INDEX IF NOT EXISTS idx_mes_qms_sync_qms_inspection ON integration.mes_qms_sync(qms_inspection_id);
CREATE INDEX IF NOT EXISTS idx_mes_qms_sync_status ON integration.mes_qms_sync(sync_status);
CREATE INDEX IF NOT EXISTS idx_mes_qms_sync_order ON integration.mes_qms_sync(order_id);
CREATE INDEX IF NOT EXISTS idx_mes_qms_sync_created ON integration.mes_qms_sync(created_at);
CREATE INDEX IF NOT EXISTS idx_mes_qms_sync_batch ON integration.mes_qms_sync(batch_no);

-- Reset search path
RESET search_path;
