-- V321: B2 C1a accounting_subjects 物理迁移
-- 将 accounting_subjects 表从 plugin_erp schema 迁移到 plugin_finance schema
-- 日期: 2026-08-27

BEGIN;

-- 1. 在 plugin_finance schema 中创建 accounting_subjects 表（同结构）
CREATE TABLE IF NOT EXISTS plugin_finance.accounting_subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(100),
    level INTEGER NOT NULL DEFAULT 1,
    parent_code VARCHAR(50),
    description TEXT,
    is_cash_flow BOOLEAN NOT NULL DEFAULT false,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    tenant_id UUID
);

-- 2. 创建索引
CREATE INDEX IF NOT EXISTS idx_accounting_subjects_code ON plugin_finance.accounting_subjects(code);
CREATE INDEX IF NOT EXISTS idx_accounting_subjects_tenant ON plugin_finance.accounting_subjects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_accounting_subjects_org ON plugin_finance.accounting_subjects(organization_id);
CREATE INDEX IF NOT EXISTS idx_accounting_subjects_parent ON plugin_finance.accounting_subjects(parent_code);

-- 3. 从 plugin_erp 复制数据（如果源表存在且有数据）
INSERT INTO plugin_finance.accounting_subjects
    (id, organization_id, code, name, category, level, parent_code, description,
     is_cash_flow, status, created_at, updated_at, deleted_at, tenant_id)
SELECT id, organization_id, code, name, category, level, parent_code, description,
       is_cash_flow, status, created_at, updated_at, deleted_at, tenant_id
FROM plugin_erp.accounting_subjects
WHERE EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'plugin_erp' AND table_name = 'accounting_subjects'
)
ON CONFLICT (id) DO NOTHING;

-- 4. 删除 plugin_erp 中的 accounting_subjects 表（如果存在）
DROP TABLE IF EXISTS plugin_erp.accounting_subjects;

COMMIT;
