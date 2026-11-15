-- 回滚入口（B 类 6/7）· 对应 database/migrations/20261115141700_b_class_core_file_permissions_tenant_id.sql
-- 口径：仅本次新增才删；列内一旦出现非空数据即保留并 RAISE NOTICE。
-- 本迁移未建索引/约束/策略，回滚只涉及列本身；不涉及 pg_policies。

-- 1. public.core_file_permissions.tenant_id
-- destructive-gate: allow
-- destructive-kind: DROP COLUMN
-- destructive-reason: 回滚 B 类补列；仅当列内无任何非空 tenant_id 时删列，有数据则保留并 RAISE NOTICE
-- destructive-owner: platform-db
-- destructive-ticket: B-CLASS-20261115
-- destructive-expires: 2027-03-31
-- destructive-rows-at-review: 0
-- destructive-backup: database/rollback/20261115141700_b_class_core_file_permissions_tenant_id.rollback.sql
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.core_file_permissions WHERE tenant_id IS NOT NULL) THEN
        ALTER TABLE public.core_file_permissions DROP COLUMN IF EXISTS tenant_id;
    ELSE
        RAISE NOTICE 'public.core_file_permissions.tenant_id 存在非空值，保留列';
    END IF;
END $$;
