-- 20261127220000: flow / doc_service 遗留同名副本收尾（统一改名为 _deprecated_ 前缀）
--
-- 背景：public 层清理（20261127140000 → 20261127200000）之后，剩下唯一的同名副本家族在
--   flow 与 doc_service 两个遗留 schema。生产已通过 20261118160000（12 张改名）与
--   20261119180000（108 张归档到 archive.drop_20261119_lc__*）收口；dev 因基线不同
--   （108 张批次断言「108 张齐备」，dev 实际只有 62 张）无法用同一条迁移收口，故补本条：
--   只做「改名打戳」，不 DROP、不删数据，保证可逆。
--
-- 判定（2026-11-27 dev 实测）：下列 20 张表全部 0 行、svc/*.rs 对 flow.<表> 零引用、
--   flow schema 无任何外部 schema 入向外键、无视图依赖；生产对应表全部不存在（纯空跑）。
--   唯一有数据的两类已先行处理：
--     · flow.core_workflows 20 行 / flow.workflows 18 行 → id 全部已在 public.core_workflows，
--       已归档到 archive._purge_20261127_flow_shadow_rows 后清空；
--     · flow.core_tenants 1 行 / flow.core_tenant_users 1 行 → 指向 iam.users 不存在的影子用户，
--       同批归档后清空。
--
-- 保留（不动）：flow.core_comments / core_favorites / core_menu_groups / core_menus（运行期显式引用）、
--   flow.schema_defense_ledger（2 行，模块台账）；
--   doc_service.files（9 行）/ doc_service.templates（13 行）有真实上传数据，保留原样。
--
-- 幂等：表不存在 → NOTICE 跳过；_deprecated_<名> 已存在 → 视为完成跳过；
--   有行数据 → 前置断言 RAISE EXCEPTION，不允许带数据改名。
--
-- 回滚：database/rollback/20261127220000_flow_doc_service_shadow_cleanup.rollback.sql（原路改回）。
--
-- 事务：由 scripts/migration/apply-forward.sh 单事务执行，本文件不含 BEGIN/COMMIT。

SET LOCAL search_path = pg_catalog, public, pg_temp;

DO $$
DECLARE
    r record;
    n_renamed int := 0;
    n_skipped int := 0;
    n_rows bigint;
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
            ('flow','approval_records'), ('flow','approvals'), ('flow','audit_logs'),
            ('flow','core_file_folders'), ('flow','core_file_permissions'),
            ('flow','core_flow_delegates'), ('flow','core_flow_rules'),
            ('flow','core_flow_variable_history'), ('flow','core_flow_variables'),
            ('flow','core_master_data_refs'), ('flow','core_mdm_reconciliation_log'),
            ('flow','core_migration_history'), ('flow','core_tenants'),
            ('flow','core_workflow_versions'), ('flow','core_workflows'),
            ('flow','notifications'), ('flow','workflows'),
            ('doc_service','core_doc_documents'), ('doc_service','core_doc_folders'),
            ('doc_service','core_doc_templates')
        ) AS v(sch, tbl)
    LOOP
        IF to_regclass(format('%I.%I', r.sch, r.tbl)) IS NULL THEN
            RAISE NOTICE 'skip missing %.%', r.sch, r.tbl;
            n_skipped := n_skipped + 1;
            CONTINUE;
        END IF;
        IF to_regclass(format('%I.%I', r.sch, '_deprecated_' || r.tbl)) IS NOT NULL THEN
            RAISE NOTICE 'skip already deprecated %.%.%', r.sch, '_deprecated_', r.tbl;
            n_skipped := n_skipped + 1;
            CONTINUE;
        END IF;

        EXECUTE format('SELECT count(*) FROM %I.%I', r.sch, r.tbl) INTO n_rows;
        IF n_rows <> 0 THEN
            RAISE EXCEPTION '前置断言失败：%.% 有 % 行数据，不得改名为废弃表', r.sch, r.tbl, n_rows;
        END IF;

        EXECUTE format('ALTER TABLE %I.%I RENAME TO %I', r.sch, r.tbl, '_deprecated_' || r.tbl);
        RAISE NOTICE 'renamed %.% -> _deprecated_%', r.sch, r.tbl, r.tbl;
        n_renamed := n_renamed + 1;
    END LOOP;

    RAISE NOTICE '完成：改名 % 张，跳过 % 张', n_renamed, n_skipped;
END $$;

-- 收尾断言：仍处于活名的 flow 表只能是运行期引用/台账这 5 张
DO $$
DECLARE
    bad text;
BEGIN
    SELECT string_agg(c.relname, ', ' ORDER BY c.relname) INTO bad
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'flow' AND c.relkind = 'r'
      AND c.relname NOT LIKE '\_deprecated\_%'
      AND c.relname NOT IN ('core_comments','core_favorites','core_menu_groups','core_menus','schema_defense_ledger');
    IF bad IS NOT NULL THEN
        RAISE EXCEPTION '后置断言失败：flow 仍有未打戳的副本表 %', bad;
    END IF;
    RAISE NOTICE '后置断言通过：flow 活名表只剩运行期引用 4 张 + 台账 1 张';
END $$;
