-- P3 A 级止血 / 2026-11-09：master_data.mdm_asset_categories → mdm_data_asset_categories 改名
--
-- 背景（见 docs/quality/prod-schema-drift-2026-11-09.md 第 8 节 A4）：
--   生产实际表名是旧名 mdm_asset_categories（0 行），而后端（svc/master-data
--   knowledge_v53.rs）直查新名 mdm_data_asset_categories，导致 GET /…/kg-v53/categories 500。
--   迁移 20261107000034 的改名脚本从未进入生产账本。
--
-- 决策：按清单建议改名，而不是并列新建（避免双表并存后写入分叉）。
--   执行前已复核生产 mdm_asset_categories 为 0 行；本迁移再带行数守卫：
--   若表内有数据则拒绝改名（RAISE EXCEPTION），交回人工按口径处理。
--   列集合（id/name/parent_id/asset_count/tenant_id）与后端查询完全一致，无需补列。
--
-- 守卫分支：
--   旧表在 & 新表不在 → 改名（含约束/策略/索引重命名）；
--   新表已在（本地/已重跑）→ no-op；
--   两表都不在 → NOTICE 跳过（不会凭空建表）。
--
-- owner 归一：改名后按 20261109100100 同一写法归 topems_prod（已归位则 no-op）。
--
-- ROLLBACK（生产，仅当确认表内无业务数据）：
--   DO $$ BEGIN
--     IF to_regclass('master_data.mdm_data_asset_categories') IS NOT NULL
--        AND to_regclass('master_data.mdm_asset_categories') IS NULL
--        AND (SELECT count(*) FROM master_data.mdm_data_asset_categories) = 0
--     THEN ALTER TABLE master_data.mdm_data_asset_categories RENAME TO mdm_asset_categories; END IF;
--   END $$;

BEGIN;

-- 0) 行数守卫：旧表存在且有数据 → 硬失败（不擅自搬迁数据）
DO $$
DECLARE
    old_rows bigint;
BEGIN
    IF to_regclass('master_data.mdm_asset_categories') IS NOT NULL
       AND to_regclass('master_data.mdm_data_asset_categories') IS NULL THEN
        EXECUTE 'SELECT count(*) FROM master_data.mdm_asset_categories' INTO old_rows;
        IF old_rows > 0 THEN
            RAISE EXCEPTION 'P3 止血：mdm_asset_categories 有 % 行数据，拒绝自动改名，需人工确认口径', old_rows;
        END IF;
    END IF;
END $$;

-- 1) 改名（旧在 & 新不在）
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'master_data' AND table_name = 'mdm_asset_categories'
    )
    AND NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'master_data' AND table_name = 'mdm_data_asset_categories'
    ) THEN
        ALTER TABLE master_data.mdm_asset_categories
            RENAME TO mdm_data_asset_categories;
    END IF;
END $$;

-- 2) 约束重命名（pkey 改名会连带底层索引改名）
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        JOIN pg_namespace n ON t.relnamespace = n.oid
        WHERE n.nspname = 'master_data'
          AND t.relname = 'mdm_data_asset_categories'
          AND c.conname = 'mdm_asset_categories_pkey'
    ) THEN
        ALTER TABLE master_data.mdm_data_asset_categories
            RENAME CONSTRAINT mdm_asset_categories_pkey TO mdm_data_asset_categories_pkey;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        JOIN pg_namespace n ON t.relnamespace = n.oid
        WHERE n.nspname = 'master_data'
          AND t.relname = 'mdm_data_asset_categories'
          AND c.conname = 'mdm_asset_categories_id_not_null'
    ) THEN
        ALTER TABLE master_data.mdm_data_asset_categories
            RENAME CONSTRAINT mdm_asset_categories_id_not_null TO mdm_data_asset_categories_id_not_null;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        JOIN pg_namespace n ON t.relnamespace = n.oid
        WHERE n.nspname = 'master_data'
          AND t.relname = 'mdm_data_asset_categories'
          AND c.conname = 'mdm_asset_categories_name_not_null'
    ) THEN
        ALTER TABLE master_data.mdm_data_asset_categories
            RENAME CONSTRAINT mdm_asset_categories_name_not_null TO mdm_data_asset_categories_name_not_null;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        JOIN pg_namespace n ON t.relnamespace = n.oid
        WHERE n.nspname = 'master_data'
          AND t.relname = 'mdm_data_asset_categories'
          AND c.conname = 'mdm_asset_categories_asset_count_not_null'
    ) THEN
        ALTER TABLE master_data.mdm_data_asset_categories
            RENAME CONSTRAINT mdm_asset_categories_asset_count_not_null TO mdm_data_asset_categories_asset_count_not_null;
    END IF;
END $$;

-- 3) RLS 策略重命名
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'master_data'
          AND tablename  = 'mdm_data_asset_categories'
          AND policyname = 'mdm_asset_categories_tenant_policy'
    ) THEN
        ALTER POLICY mdm_asset_categories_tenant_policy
            ON master_data.mdm_data_asset_categories
            RENAME TO mdm_data_asset_categories_tenant_policy;
    END IF;
END $$;

-- 4) 索引兜底（正常路径由 2) 连带改名）
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'master_data'
          AND tablename  = 'mdm_data_asset_categories'
          AND indexname  = 'mdm_asset_categories_pkey'
    ) THEN
        ALTER INDEX master_data.mdm_asset_categories_pkey
            RENAME TO mdm_data_asset_categories_pkey;
    END IF;
END $$;

-- 5) owner 归一（同 20261109100100）
DO $$
DECLARE
    svc_role text;
BEGIN
    IF to_regclass('master_data.mdm_data_asset_categories') IS NULL THEN
        RAISE NOTICE 'P3 止血：mdm_data_asset_categories 不存在，跳过 owner 归一';
        RETURN;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'topems_prod') THEN
        svc_role := 'topems_prod';
    ELSIF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'topems_app') THEN
        svc_role := 'topems_app';
    ELSE
        RAISE NOTICE 'P3 止血：未找到服务运行角色（topems_prod/topems_app），跳过 owner 归一';
        RETURN;
    END IF;

    EXECUTE format('ALTER TABLE master_data.mdm_data_asset_categories OWNER TO %I', svc_role);
    RAISE NOTICE 'P3 止血：mdm_data_asset_categories owner -> %', svc_role;

    IF svc_role <> 'topems_app'
       AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'topems_app') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE
            ON master_data.mdm_data_asset_categories TO topems_app;
    END IF;
END $$;

COMMIT;
