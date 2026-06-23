-- SCM 同步日志表
-- 用于记录模块间数据同步的详细日志和重试信息

CREATE TABLE IF NOT EXISTS scm.sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sync_type VARCHAR(50) NOT NULL,
    source_module VARCHAR(50) NOT NULL,
    target_module VARCHAR(50) NOT NULL,
    source_entity VARCHAR(50) NOT NULL,
    source_id UUID,
    source_code VARCHAR(100),
    target_id UUID,
    target_code VARCHAR(100),
    operation VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    error_message TEXT,
    retry_count INT NOT NULL DEFAULT 0,
    max_retries INT NOT NULL DEFAULT 3,
    next_retry_at TIMESTAMPTZ,
    executed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_logs_type ON scm.sync_logs(sync_type);
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON scm.sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_sync_logs_source ON scm.sync_logs(source_module, source_entity);
CREATE INDEX IF NOT EXISTS idx_sync_logs_next_retry ON scm.sync_logs(next_retry_at);
CREATE INDEX IF NOT EXISTS idx_sync_logs_created ON scm.sync_logs(created_at);

-- 添加采购订单表的同步字段
ALTER TABLE scm.purchase_orders ADD COLUMN IF NOT EXISTS inbound_order_id UUID;
ALTER TABLE scm.purchase_orders ADD COLUMN IF NOT EXISTS inbound_order_number VARCHAR(50);
ALTER TABLE scm.purchase_orders ADD COLUMN IF NOT EXISTS is_synced_to_wms BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE scm.purchase_orders ADD COLUMN IF NOT EXISTS sync_error TEXT;
ALTER TABLE scm.purchase_orders ADD COLUMN IF NOT EXISTS sync_retry_count INT NOT NULL DEFAULT 0;
ALTER TABLE scm.purchase_orders ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ;

-- 添加供应商表的同步字段
ALTER TABLE scm.suppliers ADD COLUMN IF NOT EXISTS sync_from_srm BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE scm.suppliers ADD COLUMN IF NOT EXISTS srm_supplier_id UUID;
ALTER TABLE scm.suppliers ADD COLUMN IF NOT EXISTS sync_error TEXT;
ALTER TABLE scm.suppliers ADD COLUMN IF NOT EXISTS sync_retry_count INT NOT NULL DEFAULT 0;
ALTER TABLE scm.suppliers ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ;