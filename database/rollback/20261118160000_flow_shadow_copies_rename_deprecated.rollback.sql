-- 回滚：20261118160000_flow_shadow_copies_rename_deprecated.sql
-- 把 flow._deprecated_<原名> 改回 flow.<原名>；不恢复任何数据（前向迁移不改数据）。
-- 幂等：原名已存在 / 废弃表不存在 → NOTICE 跳过。
-- 注意：前向迁移要求副本 0 行，故回滚恢复的也是 0 行副本，不会造成双写或数据漂移。

BEGIN;

DO $$
DECLARE
    t text;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'core_doc_documents',
        'core_doc_folders',
        'core_doc_templates',
        'core_doc_document_versions',
        'core_flow_categories',
        'core_master_data_change_log',
        'core_mdm_approvals',
        'core_operation_logs',
        'core_tenant_modules',
        'core_tenant_settings',
        'core_tenant_usage',
        'core_tenant_users'
    ] LOOP
        IF to_regclass(format('flow.%I', t)) IS NOT NULL THEN
            RAISE NOTICE '跳过 flow.%：原名已存在，无需回滚', t;
            CONTINUE;
        END IF;

        IF to_regclass(format('flow.%I', '_deprecated_' || t)) IS NULL THEN
            RAISE NOTICE '跳过 flow.%：废弃表不存在', t;
            CONTINUE;
        END IF;

        EXECUTE format('ALTER TABLE flow.%I RENAME TO %I', '_deprecated_' || t, t);
        RAISE NOTICE '已回滚 flow._deprecated_% → flow.%', t, t;
    END LOOP;
END $$;

-- 清理本迁移在账本中的登记行（幂等；不存在也不报错）
DELETE FROM public._sqlx_migrations WHERE version = 20261118160000;

COMMIT;
