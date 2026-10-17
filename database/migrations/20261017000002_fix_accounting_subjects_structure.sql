-- 20261017000002_fix_accounting_subjects_structure.sql
-- C2 模拟录入验证发现（2026-10-17）：finance.accounting_subjects 仅有 5 列
-- （id/deleted_at/code/name/tenant_id），而 struct AccountingSubject 与报表 SQL
-- （financial_reports WHERE status='active'、JOIN code）期望 14 列。
-- 根因：V321（20260827000002）在 plugin_finance 建 14 列表，但 finance schema 的
-- stub 表（20260725000000 仅 id 列）从未被 ALTER；后续 restore 迁移只补了
-- code/name/tenant_id/deleted_at，14 列结构未落地 → 列表/创建在数据非空时
-- 报 sqlx 列数不匹配（"查询失败"）。
-- 修正：补齐缺失列 + 索引，与 struct/报表口径对齐。
BEGIN;

ALTER TABLE finance.accounting_subjects
    ADD COLUMN IF NOT EXISTS organization_id UUID NOT NULL DEFAULT gen_random_uuid(),
    ADD COLUMN IF NOT EXISTS category VARCHAR(100),
    ADD COLUMN IF NOT EXISTS level INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS parent_code VARCHAR(50),
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS is_cash_flow BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active',
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_accounting_subjects_code ON finance.accounting_subjects(code);
CREATE INDEX IF NOT EXISTS idx_accounting_subjects_tenant ON finance.accounting_subjects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_accounting_subjects_org ON finance.accounting_subjects(organization_id);
CREATE INDEX IF NOT EXISTS idx_accounting_subjects_parent ON finance.accounting_subjects(parent_code);

COMMIT;
