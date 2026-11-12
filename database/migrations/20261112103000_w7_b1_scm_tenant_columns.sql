-- ============================================================
-- W7 · B1：SCM 6 张缺 tenant_id 的表补列 + 回填 + 索引
-- 版本：20261112103000
--
-- 背景（见 docs/quality/w7-b4-scm-ehs-wms-readonly-assessment-2026-11-12.md §2.1）：
--   scm.purchase_contract_items / purchase_inquiries / purchase_inquiry_items /
--   supplier_admission_audit_items / supplier_quote_items / schema_defense_ledger
--   六张表没有 tenant_id 列；其中前两张子表是活代码在写的（INSERT 已带 tenant_id，
--   因列不存在报错后被 `let _ =` 吞掉 → 明细一行都没落库）。
--
-- 回填来源（按父表 tenant_id）：
--   purchase_contract_items.contract_id  → scm.purchase_contracts.tenant_id
--   supplier_admission_audit_items.admission_id → scm.supplier_admissions.tenant_id
--   supplier_quote_items.quote_id        → scm.supplier_quotes.tenant_id
--   purchase_inquiries / purchase_inquiry_items：无父表可回溯（inquiries 本身无租户列），
--     保持 NULL，仅在补列后由写入方显式绑定；生产/副本这两张表当前 0 行。
--   schema_defense_ledger：系统账本，tenant_id 保持 NULL。
--
-- 可重复执行；不删任何数据；只加列/索引。
--
-- 回滚（急停）：
--   DROP INDEX IF EXISTS scm.ix_scm_purchase_contract_items_tenant_id; -- 其余同理
--   ALTER TABLE scm.purchase_contract_items DROP COLUMN IF EXISTS tenant_id; -- 其余同理
-- ============================================================

SET lock_timeout = '5s';

DO $w7b1_cols$
DECLARE
    t text;
    tbls text[] := ARRAY[
        'purchase_contract_items',
        'purchase_inquiries',
        'purchase_inquiry_items',
        'supplier_admission_audit_items',
        'supplier_quote_items',
        'schema_defense_ledger'
    ];
BEGIN
    FOREACH t IN ARRAY tbls LOOP
        IF to_regclass('scm.' || t) IS NULL THEN
            RAISE EXCEPTION 'scm.% 不存在，B1 补列中止', t;
        END IF;
        EXECUTE format('ALTER TABLE scm.%I ADD COLUMN IF NOT EXISTS tenant_id uuid', t);
    END LOOP;
END
$w7b1_cols$;

-- ---- 回填：子表从父表取租户 ----
DO $w7b1_backfill$
DECLARE
    v int;
BEGIN
    IF to_regclass('scm.purchase_contracts') IS NOT NULL THEN
        UPDATE scm.purchase_contract_items i
        SET tenant_id = c.tenant_id
        FROM scm.purchase_contracts c
        WHERE i.contract_id = c.id
          AND i.tenant_id IS NULL
          AND c.tenant_id IS NOT NULL;
        GET DIAGNOSTICS v = ROW_COUNT;
        RAISE NOTICE 'B1 回填 purchase_contract_items: % 行', v;
    END IF;

    IF to_regclass('scm.supplier_admissions') IS NOT NULL THEN
        UPDATE scm.supplier_admission_audit_items i
        SET tenant_id = a.tenant_id
        FROM scm.supplier_admissions a
        WHERE i.admission_id = a.id
          AND i.tenant_id IS NULL
          AND a.tenant_id IS NOT NULL;
        GET DIAGNOSTICS v = ROW_COUNT;
        RAISE NOTICE 'B1 回填 supplier_admission_audit_items: % 行', v;
    END IF;

    IF to_regclass('scm.supplier_quotes') IS NOT NULL THEN
        UPDATE scm.supplier_quote_items i
        SET tenant_id = q.tenant_id
        FROM scm.supplier_quotes q
        WHERE i.quote_id = q.id
          AND i.tenant_id IS NULL
          AND q.tenant_id IS NOT NULL;
        GET DIAGNOSTICS v = ROW_COUNT;
        RAISE NOTICE 'B1 回填 supplier_quote_items: % 行', v;
    END IF;
END
$w7b1_backfill$;

-- ---- 索引 ----
CREATE INDEX IF NOT EXISTS ix_scm_purchase_contract_items_tenant_id
    ON scm.purchase_contract_items (tenant_id);
CREATE INDEX IF NOT EXISTS ix_scm_purchase_inquiries_tenant_id
    ON scm.purchase_inquiries (tenant_id);
CREATE INDEX IF NOT EXISTS ix_scm_purchase_inquiry_items_tenant_id
    ON scm.purchase_inquiry_items (tenant_id);
CREATE INDEX IF NOT EXISTS ix_scm_supplier_admission_audit_items_tenant_id
    ON scm.supplier_admission_audit_items (tenant_id);
CREATE INDEX IF NOT EXISTS ix_scm_supplier_quote_items_tenant_id
    ON scm.supplier_quote_items (tenant_id);
CREATE INDEX IF NOT EXISTS ix_scm_schema_defense_ledger_tenant_id
    ON scm.schema_defense_ledger (tenant_id);

-- ---- NOT NULL：仅对"可完整回填"且回填后无 NULL 的三张子表 ----
DO $w7b1_notnull$
DECLARE
    t text;
    left_null bigint;
    tbls text[] := ARRAY[
        'purchase_contract_items',
        'supplier_admission_audit_items',
        'supplier_quote_items'
    ];
BEGIN
    FOREACH t IN ARRAY tbls LOOP
        EXECUTE format('SELECT count(*) FROM scm.%I WHERE tenant_id IS NULL', t) INTO left_null;
        IF left_null = 0 THEN
            EXECUTE format('ALTER TABLE scm.%I ALTER COLUMN tenant_id SET NOT NULL', t);
            RAISE NOTICE 'B1 %: tenant_id 已置 NOT NULL', t;
        ELSE
            RAISE NOTICE 'B1 %: 仍有 % 行 tenant_id 为 NULL，暂不设 NOT NULL', t, left_null;
        END IF;
    END LOOP;
END
$w7b1_notnull$;

DO $w7b1_verify$
DECLARE
    t text;
    missing int := 0;
    tbls text[] := ARRAY[
        'purchase_contract_items',
        'purchase_inquiries',
        'purchase_inquiry_items',
        'supplier_admission_audit_items',
        'supplier_quote_items',
        'schema_defense_ledger'
    ];
BEGIN
    FOREACH t IN ARRAY tbls LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'scm' AND table_name = t AND column_name = 'tenant_id'
        ) THEN
            missing := missing + 1;
        END IF;
    END LOOP;
    IF missing > 0 THEN
        RAISE EXCEPTION 'B1 校验失败：% 张表仍缺 tenant_id', missing;
    END IF;
END
$w7b1_verify$;
