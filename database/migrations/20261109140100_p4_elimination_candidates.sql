-- P4 第一批（2/3）：凭证扫描候选表（2026-11-09）
--
-- 口径：凭证扫描仅产候选，不自动定性、不直接触发抵消；台账才是唯一事实源。
-- 候选按「期间 × scope 公司对 × 科目配对」记录同额反向的双方凭证分录，
-- 人工确认后才允许回填台账。
--
-- ROLLBACK：
--   DROP TABLE IF EXISTS erp.elimination_candidates;

CREATE TABLE IF NOT EXISTS erp.elimination_candidates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid,
    scope_id uuid NOT NULL REFERENCES erp.consolidation_scopes(id) ON DELETE CASCADE,
    period varchar(7) NOT NULL,
    from_company_id uuid NOT NULL,
    to_company_id uuid NOT NULL,
    transaction_type varchar(32) NOT NULL,
    account_pair varchar(16) NOT NULL,
    amount numeric(20,2) NOT NULL,
    debit_voucher_id uuid NOT NULL,
    credit_voucher_id uuid NOT NULL,
    from_ledger_id uuid NOT NULL,
    to_ledger_id uuid NOT NULL,
    aux_type varchar(32),
    aux_id uuid,
    status varchar(20) NOT NULL DEFAULT 'pending',
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT ck_elimination_candidates_status
        CHECK (status IN ('pending', 'accepted', 'rejected')),
    CONSTRAINT ck_elimination_candidates_amount CHECK (amount > 0),
    CONSTRAINT ck_elimination_candidates_pair CHECK (from_company_id <> to_company_id),
    CONSTRAINT uq_elimination_candidates_source
        UNIQUE (scope_id, period, from_ledger_id, to_ledger_id)
);

CREATE INDEX IF NOT EXISTS idx_elimination_candidates_scope_period
    ON erp.elimination_candidates (tenant_id, scope_id, period, status);
CREATE INDEX IF NOT EXISTS idx_elimination_candidates_pair
    ON erp.elimination_candidates (tenant_id, period, from_company_id, to_company_id);

ALTER TABLE erp.elimination_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.elimination_candidates FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON erp.elimination_candidates;
CREATE POLICY tenant_isolation ON erp.elimination_candidates
  USING (
    current_setting('app.tenant_id', true) IS NULL
    OR current_setting('app.tenant_id', true) = ''
    OR current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000'
    OR tenant_id IS NULL
    OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
  )
  WITH CHECK (
    current_setting('app.tenant_id', true) IS NULL
    OR current_setting('app.tenant_id', true) = ''
    OR current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000'
    OR tenant_id IS NULL
    OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
  );
