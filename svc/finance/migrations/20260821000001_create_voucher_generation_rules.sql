-- V232 P0: Create finance_voucher_generation_rules table
--
-- The voucher_generation.rs service code references this table but it
-- was never created. This migration creates the table with the correct
-- column names matching the VoucherGenerationRule struct and INSERT
-- statements in the code.

CREATE TABLE IF NOT EXISTS finance_voucher_generation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    source_type VARCHAR(100) NOT NULL,
    source_filter JSONB,
    mapping_config JSONB NOT NULL,
    output_voucher_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    priority INT NOT NULL DEFAULT 100,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_vgr_tenant_id ON finance_voucher_generation_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vgr_status ON finance_voucher_generation_rules(status);
CREATE INDEX IF NOT EXISTS idx_vgr_source_type ON finance_voucher_generation_rules(source_type);
CREATE INDEX IF NOT EXISTS idx_vgr_deleted_at ON finance_voucher_generation_rules(deleted_at);
