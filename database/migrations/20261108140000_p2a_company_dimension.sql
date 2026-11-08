-- P2a 第二笔：财务公司维度（2026-11-08）
--
-- 目标：给 5 张账簿表补 company_id（法人主体），回填存量后收紧为 NOT NULL，
--       唯一键从「租户级」升级为「租户 + 公司级」，并补 (tenant_id, company_id) 复合索引。
--       5 张表：finance.core_finance_vouchers / _voucher_lines / _ledger / _aux_balances、
--               erp.opening_balances。
--
-- 固定顺序（每个对象都走完再进入下一阶段）：
--   0) 为有财务数据但无公司的租户建 code='DEFAULT' 默认公司（幂等）；
--      有财务数据的租户若存在多个公司，主体归属不明 → 直接失败交人工；
--   1) 加 nullable company_id；
--   2) 回填（凭证/分录/总账由 voucher 关联回填，辅助核算与期初按租户归属）；
--   3) 校验零遗漏（任何 NULL 直接 RAISE，不静默兜底）；
--   4) 建新唯一键（建键前显式校验重复：不静默清理，失败交人工）；
--   5) company_id SET NOT NULL；
--   6) 建 (tenant_id, company_id) 复合索引；
--   7) 最后删除被新键取代的旧唯一键。
--
-- 不改历史迁移；本文件为前向迁移，执行器以 --single-transaction 包裹。
--
-- ROLLBACK（人工评估后执行；顺序与正向相反）：
--   CREATE UNIQUE INDEX IF NOT EXISTS uq_aux_balance
--       ON finance.core_finance_aux_balances (tenant_id, account_id, aux_type, aux_id, period);
--   CREATE UNIQUE INDEX IF NOT EXISTS unique_aux_balance
--       ON finance.core_finance_aux_balances (tenant_id, account_id, aux_type, aux_id, period);
--   CREATE UNIQUE INDEX IF NOT EXISTS idx_opening_balances_unique
--       ON erp.opening_balances (company_id, subject_code, period);
--   DROP INDEX IF EXISTS finance.uq_voucher_company_period_no;
--   DROP INDEX IF EXISTS finance.uq_aux_balance_company;
--   DROP INDEX IF EXISTS erp.uq_opening_balance_company_period_subject;
--   DROP INDEX IF EXISTS finance.idx_voucher_tenant_company;
--   DROP INDEX IF EXISTS finance.idx_voucher_line_tenant_company;
--   DROP INDEX IF EXISTS finance.idx_ledger_tenant_company;
--   DROP INDEX IF EXISTS finance.idx_aux_balance_tenant_company;
--   DROP INDEX IF EXISTS erp.idx_opening_balances_tenant_company;
--   ALTER TABLE finance.core_finance_vouchers ALTER COLUMN company_id DROP NOT NULL;
--   ALTER TABLE finance.core_finance_voucher_lines ALTER COLUMN company_id DROP NOT NULL;
--   ALTER TABLE finance.core_finance_ledger ALTER COLUMN company_id DROP NOT NULL;
--   ALTER TABLE finance.core_finance_aux_balances ALTER COLUMN company_id DROP NOT NULL;
--   ALTER TABLE erp.opening_balances ALTER COLUMN tenant_id DROP NOT NULL;
--   ALTER TABLE finance.core_finance_vouchers DROP COLUMN IF EXISTS company_id;
--   ALTER TABLE finance.core_finance_voucher_lines DROP COLUMN IF EXISTS company_id;
--   ALTER TABLE finance.core_finance_ledger DROP COLUMN IF EXISTS company_id;
--   ALTER TABLE finance.core_finance_aux_balances DROP COLUMN IF EXISTS company_id;

-- ---------------------------------------------------------------------------
-- 0) 前置：默认公司与主体唯一性
-- ---------------------------------------------------------------------------

-- 参与本次回填的租户集合（一次性快照，后续阶段共用）。
CREATE TEMP TABLE _p2a_dim_tenants ON COMMIT DROP AS
SELECT DISTINCT tenant_id
FROM (
    SELECT tenant_id FROM finance.core_finance_vouchers WHERE tenant_id IS NOT NULL
    UNION
    SELECT tenant_id FROM finance.core_finance_ledger WHERE tenant_id IS NOT NULL
    UNION
    SELECT tenant_id FROM finance.core_finance_aux_balances WHERE tenant_id IS NOT NULL
    UNION
    SELECT tenant_id FROM finance.core_finance_voucher_lines WHERE tenant_id IS NOT NULL
    UNION
    SELECT c.tenant_id
    FROM erp.opening_balances o
    JOIN hrm.companies c ON c.id = o.company_id
    UNION
    SELECT tenant_id FROM erp.opening_balances WHERE tenant_id IS NOT NULL
) t;

-- 0 个公司的租户：建默认公司承接存量（code 冲突时命中表达式唯一索引的推断落点）。
INSERT INTO hrm.companies (tenant_id, name, code, status, functional_currency)
SELECT t.tenant_id, '默认公司', 'DEFAULT', 'active', 'CNY'
FROM _p2a_dim_tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM hrm.companies c
    WHERE c.tenant_id = t.tenant_id AND c.deleted_at IS NULL
)
ON CONFLICT (tenant_id, lower(code)) WHERE deleted_at IS NULL DO NOTHING;

-- 多公司租户：存量数据无法判定归属，拒绝猜测。
DO $$
DECLARE
    ambiguous bigint;
BEGIN
    SELECT count(*) INTO ambiguous
    FROM _p2a_dim_tenants t
    WHERE (
        SELECT count(*) FROM hrm.companies c
        WHERE c.tenant_id = t.tenant_id AND c.deleted_at IS NULL
    ) > 1;

    IF ambiguous > 0 THEN
        RAISE EXCEPTION
            'P2a 公司维度：% 个租户存在多个公司主体，存量财务数据无法自动归属，请先人工指定后重跑', ambiguous;
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1) 加 nullable company_id（erp.opening_balances 已有 company_id，跳过）
-- ---------------------------------------------------------------------------

ALTER TABLE finance.core_finance_vouchers ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE finance.core_finance_voucher_lines ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE finance.core_finance_ledger ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE finance.core_finance_aux_balances ADD COLUMN IF NOT EXISTS company_id uuid;

-- ---------------------------------------------------------------------------
-- 2) 回填
-- ---------------------------------------------------------------------------

UPDATE finance.core_finance_vouchers v
SET company_id = c.id
FROM hrm.companies c
WHERE v.company_id IS NULL
  AND c.tenant_id = v.tenant_id
  AND c.deleted_at IS NULL;

UPDATE finance.core_finance_voucher_lines l
SET company_id = v.company_id
FROM finance.core_finance_vouchers v
WHERE l.company_id IS NULL
  AND v.id = l.voucher_id;

UPDATE finance.core_finance_ledger g
SET company_id = v.company_id
FROM finance.core_finance_vouchers v
WHERE g.company_id IS NULL
  AND v.id = g.voucher_id;

UPDATE finance.core_finance_aux_balances a
SET company_id = c.id
FROM hrm.companies c
WHERE a.company_id IS NULL
  AND c.tenant_id = a.tenant_id
  AND c.deleted_at IS NULL;

-- 期初余额：company_id 已是 NOT NULL，缺的是 tenant_id。
UPDATE erp.opening_balances o
SET tenant_id = c.tenant_id
FROM hrm.companies c
WHERE o.tenant_id IS NULL
  AND c.id = o.company_id;

-- ---------------------------------------------------------------------------
-- 3) 校验零遗漏：任何 NULL 都说明归属推导失败，直接失败（不兜底）
-- ---------------------------------------------------------------------------

DO $$
DECLARE
    n bigint;
BEGIN
    SELECT count(*) INTO n FROM finance.core_finance_vouchers WHERE company_id IS NULL;
    IF n > 0 THEN
        RAISE EXCEPTION 'P2a 公司维度：finance.core_finance_vouchers 仍有 % 行 company_id 为空', n;
    END IF;

    SELECT count(*) INTO n FROM finance.core_finance_voucher_lines WHERE company_id IS NULL;
    IF n > 0 THEN
        RAISE EXCEPTION 'P2a 公司维度：finance.core_finance_voucher_lines 仍有 % 行 company_id 为空', n;
    END IF;

    SELECT count(*) INTO n FROM finance.core_finance_ledger WHERE company_id IS NULL;
    IF n > 0 THEN
        RAISE EXCEPTION 'P2a 公司维度：finance.core_finance_ledger 仍有 % 行 company_id 为空', n;
    END IF;

    SELECT count(*) INTO n FROM finance.core_finance_aux_balances WHERE company_id IS NULL;
    IF n > 0 THEN
        RAISE EXCEPTION 'P2a 公司维度：finance.core_finance_aux_balances 仍有 % 行 company_id 为空', n;
    END IF;

    SELECT count(*) INTO n FROM erp.opening_balances WHERE company_id IS NULL OR tenant_id IS NULL;
    IF n > 0 THEN
        RAISE EXCEPTION 'P2a 公司维度：erp.opening_balances 仍有 % 行 company_id/tenant_id 为空', n;
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4) 新唯一键（含 company_id）
--    建键前显式校验重复：失败交人工清洗，不静默删数据。
-- ---------------------------------------------------------------------------

DO $$
DECLARE
    dup_voucher bigint;
    dup_aux bigint;
    dup_opening bigint;
BEGIN
    SELECT count(*) INTO dup_voucher
    FROM (
        SELECT tenant_id, company_id, period, voucher_no
        FROM finance.core_finance_vouchers
        WHERE deleted_at IS NULL
        GROUP BY tenant_id, company_id, period, voucher_no
        HAVING count(*) > 1
    ) d;
    IF dup_voucher > 0 THEN
        RAISE EXCEPTION
            'P2a 公司维度：finance.core_finance_vouchers 有 % 组 (tenant, company, period, voucher_no) 重复，请先人工清洗', dup_voucher;
    END IF;

    SELECT count(*) INTO dup_aux
    FROM (
        SELECT tenant_id, company_id, account_id, aux_type, aux_id, period
        FROM finance.core_finance_aux_balances
        GROUP BY tenant_id, company_id, account_id, aux_type, aux_id, period
        HAVING count(*) > 1
    ) d;
    IF dup_aux > 0 THEN
        RAISE EXCEPTION
            'P2a 公司维度：finance.core_finance_aux_balances 有 % 组重复，请先人工清洗', dup_aux;
    END IF;

    SELECT count(*) INTO dup_opening
    FROM (
        SELECT tenant_id, company_id, subject_code, period
        FROM erp.opening_balances
        GROUP BY tenant_id, company_id, subject_code, period
        HAVING count(*) > 1
    ) d;
    IF dup_opening > 0 THEN
        RAISE EXCEPTION
            'P2a 公司维度：erp.opening_balances 有 % 组重复，请先人工清洗', dup_opening;
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_voucher_company_period_no
    ON finance.core_finance_vouchers (tenant_id, company_id, period, voucher_no)
    WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_aux_balance_company
    ON finance.core_finance_aux_balances (tenant_id, company_id, account_id, aux_type, aux_id, period);

CREATE UNIQUE INDEX IF NOT EXISTS uq_opening_balance_company_period_subject
    ON erp.opening_balances (tenant_id, company_id, subject_code, period);

-- ---------------------------------------------------------------------------
-- 5) NOT NULL
-- ---------------------------------------------------------------------------

ALTER TABLE finance.core_finance_vouchers ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE finance.core_finance_voucher_lines ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE finance.core_finance_ledger ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE finance.core_finance_aux_balances ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE erp.opening_balances ALTER COLUMN tenant_id SET NOT NULL;

-- ---------------------------------------------------------------------------
-- 6) 复合索引 (tenant_id, company_id)
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_voucher_tenant_company
    ON finance.core_finance_vouchers (tenant_id, company_id);

CREATE INDEX IF NOT EXISTS idx_voucher_line_tenant_company
    ON finance.core_finance_voucher_lines (tenant_id, company_id);

CREATE INDEX IF NOT EXISTS idx_ledger_tenant_company
    ON finance.core_finance_ledger (tenant_id, company_id);

CREATE INDEX IF NOT EXISTS idx_aux_balance_tenant_company
    ON finance.core_finance_aux_balances (tenant_id, company_id);

CREATE INDEX IF NOT EXISTS idx_opening_balances_tenant_company
    ON erp.opening_balances (tenant_id, company_id);

-- ---------------------------------------------------------------------------
-- 7) 最后删除被新键取代的旧唯一键
-- ---------------------------------------------------------------------------

ALTER TABLE finance.core_finance_aux_balances DROP CONSTRAINT IF EXISTS uq_aux_balance;
ALTER TABLE finance.core_finance_aux_balances DROP CONSTRAINT IF EXISTS unique_aux_balance;
DROP INDEX IF EXISTS erp.idx_opening_balances_unique;

-- 重建方式（如需回退旧口径）：
--   CREATE UNIQUE INDEX uq_aux_balance ON finance.core_finance_aux_balances
--       (tenant_id, account_id, aux_type, aux_id, period);
--   CREATE UNIQUE INDEX unique_aux_balance ON finance.core_finance_aux_balances
--       (tenant_id, account_id, aux_type, aux_id, period);
--   CREATE UNIQUE INDEX idx_opening_balances_unique ON erp.opening_balances
--       (company_id, subject_code, period);
