-- 回滚：20261115142500_shell_tail_7tables_13cols.sql
-- 空壳表收尾（7/8）· portal_todos + finance_voucher_templates + integration 四张 sync + core_inter_module_sync
--
-- 顺序：portal_todos 4 只部分索引 → 各表列（portal_todos / voucher_templates /
--   四张 sync 的 updated_at / core_inter_module_sync 7 列）。
-- 逐列规则：仅当列内无任何非空值才 DROP；存在非空值则保留并 RAISE NOTICE，不静默丢数据。
-- 不动迁移前的既有列（含 core_inter_module_sync 的 prod 独有 5 列）、不动 PK、不改策略。
-- destructive-gate: 允许（本文件为回滚脚本，不在前向链执行）

DO $$
DECLARE
    todo_idx text[] := ARRAY[
        'idx_todos_user','idx_todos_completed','idx_todos_due_date','idx_todos_tenant'
    ];
    todo_cols text[] := ARRAY['service_code','service_name','todo_type','link_url'];
    vt_cols   text[] := ARRAY['default_credit_account','default_debit_account'];
    sync_tbls text[] := ARRAY['crm_erp_sync','crm_scm_sync','erp_wms_sync','hrm_finance_sync'];
    ims_cols  text[] := ARRAY[
        'source_entity','source_id','source_code','retry_count',
        'max_retries','next_retry_at','executed_at'
    ];
    i text;
    t text;
    n bigint;
BEGIN
    -- 1. portal_todos：索引 → 列
    IF to_regclass('portal.portal_todos') IS NOT NULL THEN
        FOREACH i IN ARRAY todo_idx LOOP
            EXECUTE format('DROP INDEX IF EXISTS portal.%I', i);
        END LOOP;
        FOREACH i IN ARRAY todo_cols LOOP
            IF EXISTS (SELECT 1 FROM information_schema.columns
                        WHERE table_schema='portal' AND table_name='portal_todos' AND column_name=i) THEN
                EXECUTE format('SELECT count(*) FROM portal.portal_todos WHERE %I IS NOT NULL', i) INTO n;
                IF n = 0 THEN
                    EXECUTE format('ALTER TABLE portal.portal_todos DROP COLUMN IF EXISTS %I', i);
                ELSE
                    RAISE NOTICE '保留列 portal_todos.%：存在 % 行非空值', i, n;
                END IF;
            END IF;
        END LOOP;
    END IF;

    -- 2. finance_voucher_templates
    IF to_regclass('finance.finance_voucher_templates') IS NOT NULL THEN
        FOREACH i IN ARRAY vt_cols LOOP
            IF EXISTS (SELECT 1 FROM information_schema.columns
                        WHERE table_schema='finance' AND table_name='finance_voucher_templates' AND column_name=i) THEN
                EXECUTE format('SELECT count(*) FROM finance.finance_voucher_templates WHERE %I IS NOT NULL', i) INTO n;
                IF n = 0 THEN
                    EXECUTE format('ALTER TABLE finance.finance_voucher_templates DROP COLUMN IF EXISTS %I', i);
                ELSE
                    RAISE NOTICE '保留列 finance_voucher_templates.%：存在 % 行非空值', i, n;
                END IF;
            END IF;
        END LOOP;
    END IF;

    -- 3. integration 四张 sync 的 updated_at（NOT NULL，只有空表才可安全回退）
    FOREACH t IN ARRAY sync_tbls LOOP
        IF to_regclass('integration.' || t) IS NOT NULL
           AND EXISTS (SELECT 1 FROM information_schema.columns
                        WHERE table_schema='integration' AND table_name=t AND column_name='updated_at') THEN
            EXECUTE format('SELECT count(*) FROM integration.%I', t) INTO n;
            IF n = 0 THEN
                EXECUTE format('ALTER TABLE integration.%I DROP COLUMN IF EXISTS updated_at', t);
            ELSE
                RAISE NOTICE '保留列 integration.%.updated_at：表有 % 行，NOT NULL 列无法在保留数据的前提下回退', t, n;
            END IF;
        END IF;
    END LOOP;

    -- 4. core_inter_module_sync 7 列（prod 独有 5 列不在回滚范围）
    IF to_regclass('integration.core_inter_module_sync') IS NOT NULL THEN
        FOREACH i IN ARRAY ims_cols LOOP
            IF EXISTS (SELECT 1 FROM information_schema.columns
                        WHERE table_schema='integration' AND table_name='core_inter_module_sync' AND column_name=i) THEN
                EXECUTE format('SELECT count(*) FROM integration.core_inter_module_sync WHERE %I IS NOT NULL', i) INTO n;
                IF n = 0 THEN
                    EXECUTE format('ALTER TABLE integration.core_inter_module_sync DROP COLUMN IF EXISTS %I', i);
                ELSE
                    RAISE NOTICE '保留列 core_inter_module_sync.%：存在 % 行非空值', i, n;
                END IF;
            END IF;
        END LOOP;
    END IF;
END $$;
