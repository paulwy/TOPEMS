-- ================================================================================
-- unified_core.inter_module_sync 正式建表
-- 2026-09-08：wms data_sync 模块活跃引用（同步日志读写）但表从未建过
-- 定义源自 init/04（历史脚本），迁移体系侧 core_inter_module_sync 已于 09-02 归档删除
-- 归属决策：wms 代码引用 unified_core.inter_module_sync，按 04 定义补建于此
-- ================================================================================
BEGIN;

CREATE SCHEMA IF NOT EXISTS unified_core;

CREATE TABLE IF NOT EXISTS unified_core.inter_module_sync (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    sync_type VARCHAR(50) NOT NULL,
    source_module VARCHAR(50) NOT NULL,
    target_module VARCHAR(50) NOT NULL,
    source_entity VARCHAR(50) NOT NULL,
    source_id UUID NOT NULL,
    source_code VARCHAR(100),
    target_id UUID,
    target_code VARCHAR(100),
    operation VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    error_message TEXT,
    retry_count INT DEFAULT 0,
    max_retries INT DEFAULT 3,
    next_retry_at TIMESTAMP WITH TIME ZONE,
    sync_data JSONB,
    executed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inter_module_sync_status ON unified_core.inter_module_sync(status);
CREATE INDEX IF NOT EXISTS idx_inter_module_sync_sync_type ON unified_core.inter_module_sync(sync_type);
CREATE INDEX IF NOT EXISTS idx_inter_module_sync_tenant ON unified_core.inter_module_sync(tenant_id);

COMMIT;
