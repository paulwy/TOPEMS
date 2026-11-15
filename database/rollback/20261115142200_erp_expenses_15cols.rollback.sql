-- 回滚：20261115142200_erp_expenses_15cols.sql
-- 空壳表整表对齐（4/6）· erp.expenses 补 15 列 + expense_number 唯一约束 + 4 只索引
--
-- 顺序：唯一约束（连带同名索引）→ 4 只索引 → 15 列。
-- 逐列规则：仅当列内无任何非空值才 DROP；存在非空值则保留并 RAISE NOTICE，不静默丢数据。
-- 不动迁移前的既有列（id / deleted_at / tenant_id）、不动 PK 与既有索引、不改策略、不改表。
-- destructive-gate: 允许（本文件为回滚脚本，不在前向链执行）

DO $$
DECLARE
    idx text[] := ARRAY[
        'idx_expenses_expense_number','idx_expenses_organization_id',
        'idx_expenses_status','idx_expenses_deleted_at'
    ];
    cols text[] := ARRAY[
        'organization_id','expense_number','applicant_name','department_id','expense_type',
        'amount','description','expense_date','receipt_count','status','approver_id',
        'approved_at','reimbursed_at','created_at','updated_at'
    ];
    i text;
    n bigint;
BEGIN
    IF to_regclass('erp.expenses') IS NULL THEN
        RAISE NOTICE '回滚跳过：erp.expenses 不存在';
        RETURN;
    END IF;

    -- 1. 唯一约束（同名索引随约束一并删除）
    ALTER TABLE erp.expenses
        DROP CONSTRAINT IF EXISTS expenses_expense_number_key;

    -- 2. 索引
    FOREACH i IN ARRAY idx LOOP
        EXECUTE format('DROP INDEX IF EXISTS erp.%I', i);
    END LOOP;

    -- 3. 列（有数据保留）
    FOREACH i IN ARRAY cols LOOP
        IF EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema='erp' AND table_name='expenses' AND column_name=i) THEN
            EXECUTE format('SELECT count(*) FROM erp.expenses WHERE %I IS NOT NULL', i) INTO n;
            IF n = 0 THEN
                EXECUTE format('ALTER TABLE erp.expenses DROP COLUMN IF EXISTS %I', i);
            ELSE
                RAISE NOTICE '保留列 erp.expenses.%：存在 % 行非空值', i, n;
            END IF;
        END IF;
    END LOOP;
END $$;
