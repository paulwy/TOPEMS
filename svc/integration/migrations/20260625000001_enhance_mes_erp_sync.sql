-- MES-ERP Production Order Sync Enhancement Migration
-- MES-ERP 生产订单同步增强迁移

-- Set search path
SET search_path TO integration;

-- ==================== 增强 MES-ERP 同步表 ====================

-- 添加新字段到 mes_erp_sync 表
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'integration' 
        AND table_name = 'mes_erp_sync' 
        AND column_name = 'sync_direction'
    ) THEN
        ALTER TABLE mes_erp_sync ADD COLUMN sync_direction VARCHAR(50) DEFAULT 'erp_to_mes';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'integration' 
        AND table_name = 'mes_erp_sync' 
        AND column_name = 'sync_type'
    ) THEN
        ALTER TABLE mes_erp_sync ADD COLUMN sync_type VARCHAR(50) DEFAULT 'create';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'integration' 
        AND table_name = 'mes_erp_sync' 
        AND column_name = 'payload'
    ) THEN
        ALTER TABLE mes_erp_sync ADD COLUMN payload JSONB;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'integration' 
        AND table_name = 'mes_erp_sync' 
        AND column_name = 'retry_count'
    ) THEN
        ALTER TABLE mes_erp_sync ADD COLUMN retry_count INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'integration' 
        AND table_name = 'mes_erp_sync' 
        AND column_name = 'max_retries'
    ) THEN
        ALTER TABLE mes_erp_sync ADD COLUMN max_retries INTEGER DEFAULT 5;
    END IF;
END $$;

-- ==================== MES-ERP 同步日志表 ====================

CREATE TABLE IF NOT EXISTS mes_erp_sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sync_record_id UUID NOT NULL REFERENCES integration.mes_erp_sync(id) ON DELETE CASCADE,
    sync_direction VARCHAR(50) NOT NULL,
    sync_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    error_message TEXT,
    attempt INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==================== 索引创建 ====================

CREATE INDEX IF NOT EXISTS idx_mes_erp_sync_direction ON integration.mes_erp_sync(sync_direction);
CREATE INDEX IF NOT EXISTS idx_mes_erp_sync_type ON integration.mes_erp_sync(sync_type);
CREATE INDEX IF NOT EXISTS idx_mes_erp_sync_logs_record ON integration.mes_erp_sync_logs(sync_record_id);
CREATE INDEX IF NOT EXISTS idx_mes_erp_sync_logs_status ON integration.mes_erp_sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_mes_erp_sync_logs_created ON integration.mes_erp_sync_logs(created_at);

-- Reset search path
RESET search_path;
