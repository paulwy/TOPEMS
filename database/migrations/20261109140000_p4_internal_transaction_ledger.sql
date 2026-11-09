-- P4 第一批（1/3）：内部交易台账约束与状态机（2026-11-09）
--
-- 拍板口径（不再讨论）：
--   1) erp.internal_transactions 是内部交易唯一事实源；凭证扫描只产候选。
--   2) 客户/供应商补「是否集团内 + 关联公司 id」最小映射，落既有档案表。
--   3) 不新增差异科目；差异留在 remaining_amount，未清阻断合并。
--
-- 本次只做结构与数据收敛，不建新业务表（候选表见下一支迁移）：
--   - 客户/供应商 → 集团主体映射（erp.customers / erp.suppliers）
--   - 台账状态机：unmatched → confirmed → eliminated（disputed 可插入）
--   - 台账金额守恒：remaining_amount = amount - eliminated_amount
--   - transaction_no 唯一性由全局收紧为租户维度
--
-- ROLLBACK（人工评估后执行；先回滚下一支迁移）：
--   ALTER TABLE erp.internal_transactions DROP CONSTRAINT IF EXISTS ck_internal_transactions_amount_conservation;
--   ALTER TABLE erp.internal_transactions DROP CONSTRAINT IF EXISTS ck_internal_transactions_elimination_status;
--   ALTER TABLE erp.internal_transactions DROP CONSTRAINT IF EXISTS uq_internal_transactions_tenant_no;
--   ALTER TABLE erp.internal_transactions ADD CONSTRAINT internal_transactions_transaction_no_key UNIQUE (transaction_no);
--   ALTER TABLE erp.internal_transactions ALTER COLUMN elimination_status SET DEFAULT 'pending';
--   ALTER TABLE erp.internal_transactions DROP COLUMN IF EXISTS confirmed_at, DROP COLUMN IF EXISTS confirmed_by,
--     DROP COLUMN IF EXISTS disputed_at, DROP COLUMN IF EXISTS disputed_by, DROP COLUMN IF EXISTS disputed_reason;
--   ALTER TABLE erp.customers DROP CONSTRAINT IF EXISTS fk_customers_group_company,
--     DROP CONSTRAINT IF EXISTS ck_customers_group_company_consistency,
--     DROP COLUMN IF EXISTS is_group_company, DROP COLUMN IF EXISTS group_company_id;
--   ALTER TABLE erp.suppliers DROP CONSTRAINT IF EXISTS fk_suppliers_group_company,
--     DROP CONSTRAINT IF EXISTS ck_suppliers_group_company_consistency,
--     DROP COLUMN IF EXISTS is_group_company, DROP COLUMN IF EXISTS group_company_id;

-- ── 1) 客户/供应商 → 集团主体映射（最小形态）────────────────────────────
ALTER TABLE erp.customers ADD COLUMN IF NOT EXISTS is_group_company boolean NOT NULL DEFAULT false;
ALTER TABLE erp.customers ADD COLUMN IF NOT EXISTS group_company_id uuid;
ALTER TABLE erp.suppliers ADD COLUMN IF NOT EXISTS is_group_company boolean NOT NULL DEFAULT false;
ALTER TABLE erp.suppliers ADD COLUMN IF NOT EXISTS group_company_id uuid;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_customers_group_company'
          AND conrelid = 'erp.customers'::regclass
    ) THEN
        ALTER TABLE erp.customers
            ADD CONSTRAINT fk_customers_group_company
            FOREIGN KEY (group_company_id) REFERENCES hrm.companies(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'ck_customers_group_company_consistency'
          AND conrelid = 'erp.customers'::regclass
    ) THEN
        ALTER TABLE erp.customers
            ADD CONSTRAINT ck_customers_group_company_consistency
            CHECK (NOT is_group_company OR group_company_id IS NOT NULL);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_suppliers_group_company'
          AND conrelid = 'erp.suppliers'::regclass
    ) THEN
        ALTER TABLE erp.suppliers
            ADD CONSTRAINT fk_suppliers_group_company
            FOREIGN KEY (group_company_id) REFERENCES hrm.companies(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'ck_suppliers_group_company_consistency'
          AND conrelid = 'erp.suppliers'::regclass
    ) THEN
        ALTER TABLE erp.suppliers
            ADD CONSTRAINT ck_suppliers_group_company_consistency
            CHECK (NOT is_group_company OR group_company_id IS NOT NULL);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_customers_group_company
    ON erp.customers (tenant_id, group_company_id)
    WHERE group_company_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_suppliers_group_company
    ON erp.suppliers (tenant_id, group_company_id)
    WHERE group_company_id IS NOT NULL;

-- ── 2) 台账状态机字段 ────────────────────────────────────────────────
ALTER TABLE erp.internal_transactions ADD COLUMN IF NOT EXISTS confirmed_at timestamptz;
ALTER TABLE erp.internal_transactions ADD COLUMN IF NOT EXISTS confirmed_by varchar(100);
ALTER TABLE erp.internal_transactions ADD COLUMN IF NOT EXISTS disputed_at timestamptz;
ALTER TABLE erp.internal_transactions ADD COLUMN IF NOT EXISTS disputed_by varchar(100);
ALTER TABLE erp.internal_transactions ADD COLUMN IF NOT EXISTS disputed_reason text;

ALTER TABLE erp.internal_transactions
    ALTER COLUMN elimination_status SET DEFAULT 'unmatched';

-- 旧状态收敛：pending/processing/error → unmatched；partial → confirmed。
-- 金额守恒收敛：eliminated 钳制到 [0, amount]，remaining 由 amount - eliminated 重算。
-- destructive-gate: allow
-- destructive-kind: UPDATE
-- destructive-reason: P4 统一内部交易台账状态机与金额守恒，旧状态/旧余额映射到新口径
-- destructive-owner: finance-platform
-- destructive-ticket: P4-INTERTXN-20261109
-- destructive-expires: 2026-12-31
-- destructive-max-rows: 10000
-- destructive-backup: docs/quality/p4-intercompany-elimination-design-2026-11-09.md §1.1（本地 0 行）
UPDATE erp.internal_transactions
SET eliminated_amount = LEAST(GREATEST(eliminated_amount, 0), amount),
    remaining_amount = amount - LEAST(GREATEST(eliminated_amount, 0), amount),
    elimination_status = CASE
        WHEN elimination_status IN ('pending', 'processing', 'error') THEN 'unmatched'
        WHEN elimination_status = 'partial' THEN 'confirmed'
        ELSE elimination_status
    END
WHERE elimination_status IN ('pending', 'processing', 'error', 'partial')
   OR remaining_amount <> amount - eliminated_amount
   OR eliminated_amount < 0;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'ck_internal_transactions_elimination_status'
          AND conrelid = 'erp.internal_transactions'::regclass
    ) THEN
        ALTER TABLE erp.internal_transactions
            ADD CONSTRAINT ck_internal_transactions_elimination_status
            CHECK (elimination_status IN ('unmatched', 'confirmed', 'eliminated', 'disputed'));
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'ck_internal_transactions_amount_conservation'
          AND conrelid = 'erp.internal_transactions'::regclass
    ) THEN
        ALTER TABLE erp.internal_transactions
            ADD CONSTRAINT ck_internal_transactions_amount_conservation
            CHECK (
                eliminated_amount >= 0
                AND remaining_amount >= 0
                AND remaining_amount = amount - eliminated_amount
            );
    END IF;
END $$;

-- ── 3) 交易编号唯一性收紧到租户维度 ───────────────────────────────────
ALTER TABLE erp.internal_transactions
    DROP CONSTRAINT IF EXISTS internal_transactions_transaction_no_key;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'uq_internal_transactions_tenant_no'
          AND conrelid = 'erp.internal_transactions'::regclass
    ) THEN
        ALTER TABLE erp.internal_transactions
            ADD CONSTRAINT uq_internal_transactions_tenant_no
            UNIQUE (tenant_id, transaction_no);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_internal_transactions_tenant_period_pair
    ON erp.internal_transactions (tenant_id, period, from_company_id, to_company_id);
