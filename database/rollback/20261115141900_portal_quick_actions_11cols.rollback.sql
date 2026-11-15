-- 回滚：20261115141900_portal_quick_actions_11cols.sql
-- 空壳表整表对齐（1/6）· portal.portal_quick_actions
--
-- 顺序：先删本迁移建的 3 只索引（它们依赖新增列），再逐列判断。
-- 逐列规则：仅当列内无任何非空值才 DROP；存在非空值则保留并 RAISE NOTICE，不静默丢数据。
-- 不删除 id / deleted_at（迁移前既有列），不改策略、不改表。
-- destructive-gate: 允许（本文件为回滚脚本，不在前向链执行）

DO $$
DECLARE
    n bigint;
BEGIN
    IF to_regclass('portal.portal_quick_actions') IS NULL THEN
        RAISE NOTICE '回滚跳过：表 portal.portal_quick_actions 不存在';
        RETURN;
    END IF;

    -- 1. 索引（新对象，先删；不依赖数据）
    DROP INDEX IF EXISTS portal.idx_quick_actions_active;
    DROP INDEX IF EXISTS portal.idx_quick_actions_service;
    DROP INDEX IF EXISTS portal.idx_quick_actions_tenant;

    -- 2. 列：有数据保留
    IF EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'portal' AND table_name = 'portal_quick_actions'
                  AND column_name = 'tenant_id') THEN
        EXECUTE 'SELECT count(*) FROM portal.portal_quick_actions WHERE tenant_id IS NOT NULL' INTO n;
        IF n = 0 THEN
            ALTER TABLE portal.portal_quick_actions DROP COLUMN IF EXISTS tenant_id;
        ELSE
            RAISE NOTICE '保留列 tenant_id：存在 % 行非空值', n;
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'portal' AND table_name = 'portal_quick_actions'
                  AND column_name = 'name') THEN
        EXECUTE 'SELECT count(*) FROM portal.portal_quick_actions WHERE name IS NOT NULL' INTO n;
        IF n = 0 THEN
            ALTER TABLE portal.portal_quick_actions DROP COLUMN IF EXISTS name;
        ELSE
            RAISE NOTICE '保留列 name：存在 % 行非空值', n;
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'portal' AND table_name = 'portal_quick_actions'
                  AND column_name = 'description') THEN
        EXECUTE 'SELECT count(*) FROM portal.portal_quick_actions WHERE description IS NOT NULL' INTO n;
        IF n = 0 THEN
            ALTER TABLE portal.portal_quick_actions DROP COLUMN IF EXISTS description;
        ELSE
            RAISE NOTICE '保留列 description：存在 % 行非空值', n;
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'portal' AND table_name = 'portal_quick_actions'
                  AND column_name = 'icon') THEN
        EXECUTE 'SELECT count(*) FROM portal.portal_quick_actions WHERE icon IS NOT NULL' INTO n;
        IF n = 0 THEN
            ALTER TABLE portal.portal_quick_actions DROP COLUMN IF EXISTS icon;
        ELSE
            RAISE NOTICE '保留列 icon：存在 % 行非空值', n;
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'portal' AND table_name = 'portal_quick_actions'
                  AND column_name = 'action_type') THEN
        EXECUTE 'SELECT count(*) FROM portal.portal_quick_actions WHERE action_type IS NOT NULL' INTO n;
        IF n = 0 THEN
            ALTER TABLE portal.portal_quick_actions DROP COLUMN IF EXISTS action_type;
        ELSE
            RAISE NOTICE '保留列 action_type：存在 % 行非空值', n;
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'portal' AND table_name = 'portal_quick_actions'
                  AND column_name = 'target_url') THEN
        EXECUTE 'SELECT count(*) FROM portal.portal_quick_actions WHERE target_url IS NOT NULL' INTO n;
        IF n = 0 THEN
            ALTER TABLE portal.portal_quick_actions DROP COLUMN IF EXISTS target_url;
        ELSE
            RAISE NOTICE '保留列 target_url：存在 % 行非空值', n;
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'portal' AND table_name = 'portal_quick_actions'
                  AND column_name = 'service_code') THEN
        EXECUTE 'SELECT count(*) FROM portal.portal_quick_actions WHERE service_code IS NOT NULL' INTO n;
        IF n = 0 THEN
            ALTER TABLE portal.portal_quick_actions DROP COLUMN IF EXISTS service_code;
        ELSE
            RAISE NOTICE '保留列 service_code：存在 % 行非空值', n;
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'portal' AND table_name = 'portal_quick_actions'
                  AND column_name = 'sort_order') THEN
        EXECUTE 'SELECT count(*) FROM portal.portal_quick_actions WHERE sort_order IS NOT NULL' INTO n;
        IF n = 0 THEN
            ALTER TABLE portal.portal_quick_actions DROP COLUMN IF EXISTS sort_order;
        ELSE
            RAISE NOTICE '保留列 sort_order：存在 % 行非空值', n;
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'portal' AND table_name = 'portal_quick_actions'
                  AND column_name = 'is_active') THEN
        EXECUTE 'SELECT count(*) FROM portal.portal_quick_actions WHERE is_active IS NOT NULL' INTO n;
        IF n = 0 THEN
            ALTER TABLE portal.portal_quick_actions DROP COLUMN IF EXISTS is_active;
        ELSE
            RAISE NOTICE '保留列 is_active：存在 % 行非空值', n;
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'portal' AND table_name = 'portal_quick_actions'
                  AND column_name = 'created_at') THEN
        EXECUTE 'SELECT count(*) FROM portal.portal_quick_actions WHERE created_at IS NOT NULL' INTO n;
        IF n = 0 THEN
            ALTER TABLE portal.portal_quick_actions DROP COLUMN IF EXISTS created_at;
        ELSE
            RAISE NOTICE '保留列 created_at：存在 % 行非空值', n;
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'portal' AND table_name = 'portal_quick_actions'
                  AND column_name = 'updated_at') THEN
        EXECUTE 'SELECT count(*) FROM portal.portal_quick_actions WHERE updated_at IS NOT NULL' INTO n;
        IF n = 0 THEN
            ALTER TABLE portal.portal_quick_actions DROP COLUMN IF EXISTS updated_at;
        ELSE
            RAISE NOTICE '保留列 updated_at：存在 % 行非空值', n;
        END IF;
    END IF;
END $$;
