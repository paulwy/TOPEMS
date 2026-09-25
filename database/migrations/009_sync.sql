CREATE TABLE IF NOT EXISTS core_inter_module_sync (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    sync_type VARCHAR(64) NOT NULL,
    source_module VARCHAR(64) NOT NULL,
    target_module VARCHAR(64) NOT NULL,
    source_entity VARCHAR(128) NOT NULL,
    source_id UUID,
    source_code VARCHAR(128),
    status VARCHAR(32) DEFAULT 'pending',
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    error_message TEXT,
    next_retry_at timestamptz,
    executed_at timestamptz,
    created_at timestamptz DEFAULT NOW(),
    updated_at timestamptz DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS core_mobile_offline_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    module VARCHAR(64) NOT NULL,
    action VARCHAR(64) NOT NULL,
    data JSONB NOT NULL,
    status VARCHAR(32) DEFAULT 'pending',
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    error_message TEXT,
    created_at timestamptz DEFAULT NOW(),
    updated_at timestamptz DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inter_module_sync_status ON core_inter_module_sync(status);
CREATE INDEX IF NOT EXISTS idx_inter_module_sync_tenant ON core_inter_module_sync(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inter_module_sync_source ON core_inter_module_sync(source_module);
CREATE INDEX IF NOT EXISTS idx_mobile_offline_status ON core_mobile_offline_records(status);
CREATE INDEX IF NOT EXISTS idx_mobile_offline_user ON core_mobile_offline_records(user_id);
CREATE INDEX IF NOT EXISTS idx_mobile_offline_module ON core_mobile_offline_records(module);