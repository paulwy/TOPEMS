-- 回滚：20261115142000_finance_core_vouchers_26cols.sql
-- 空壳表整表对齐（2/6）· finance.core_finance_vouchers
--
-- 顺序：先删本迁移建的外键，再逐列判断。
-- 逐列规则：仅当列内无任何非空值才 DROP；存在非空值则保留并 RAISE NOTICE，不静默丢数据。
-- 不动迁移前的既有 20 列、不动既有索引、不改策略、不改表。
-- destructive-gate: 允许（本文件为回滚脚本，不在前向链执行）

DO $$
DECLARE
    cols text[] := ARRAY[
        'voucher_number', 'year', 'month', 'total_amount', 'currency_code',
        'submitter_id', 'submitter_name', 'maker_id', 'maker_name', 'submitted_at',
        'approver_id', 'approver_name', 'checker_id', 'checker_name', 'approved_at',
        'poster_id', 'poster_name', 'bookkeeper_id', 'bookkeeper_name', 'posted_at',
        'is_reversed', 'reverse_voucher_id', 'reversed_at', 'attachment_count',
        'summary', 'updated_by'
    ];
    c text;
    n bigint;
BEGIN
    IF to_regclass('finance.core_finance_vouchers') IS NULL THEN
        RAISE NOTICE '回滚跳过：表 finance.core_finance_vouchers 不存在';
        RETURN;
    END IF;

    -- 1. 外键（本迁移新建，先删）
    ALTER TABLE finance.core_finance_vouchers
        DROP CONSTRAINT IF EXISTS core_finance_vouchers_tenant_id_fkey;

    -- 2. 列：有数据保留
    FOREACH c IN ARRAY cols LOOP
        IF EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'finance' AND table_name = 'core_finance_vouchers'
                      AND column_name = c) THEN
            EXECUTE format('SELECT count(*) FROM finance.core_finance_vouchers WHERE %I IS NOT NULL', c) INTO n;
            IF n = 0 THEN
                EXECUTE format('ALTER TABLE finance.core_finance_vouchers DROP COLUMN IF EXISTS %I', c);
            ELSE
                RAISE NOTICE '保留列 %：存在 % 行非空值', c, n;
            END IF;
        END IF;
    END LOOP;
END $$;
