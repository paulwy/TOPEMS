-- 回滚 20261127220000：把 _deprecated_ 前缀去掉，恢复原名（0 行表，无数据搬动）
SET LOCAL search_path = pg_catalog, public, pg_temp;

DO $$
DECLARE
    r record;
    n int := 0;
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
        IF to_regclass(format('%I.%I', r.sch, '_deprecated_' || r.tbl)) IS NULL THEN
            CONTINUE;
        END IF;
        IF to_regclass(format('%I.%I', r.sch, r.tbl)) IS NOT NULL THEN
            CONTINUE;
        END IF;
        EXECUTE format('ALTER TABLE %I.%I RENAME TO %I', r.sch, '_deprecated_' || r.tbl, r.tbl);
        RAISE NOTICE 'restored %.%', r.sch, r.tbl;
        n := n + 1;
    END LOOP;
    RAISE NOTICE '回滚完成：恢复 % 张', n;
END $$;
