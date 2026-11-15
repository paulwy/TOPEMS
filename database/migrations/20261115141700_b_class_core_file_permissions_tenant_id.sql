-- B 类列补齐（6/7）· unified-core · public.core_file_permissions（1 表 1 列）
--
-- 口径：B 类 = prod 缺列、且 HEAD 代码已真实读/写该列（docs/database/column-drift-attribution-2026-11-15.md §4.2.2）。
--   本迁移只做 ADD COLUMN，不建索引、不建约束、不改策略、不含 BEGIN/COMMIT。
--
-- 目标定义（以 dev 现有定义为唯一依据）：
--   public.core_file_permissions.tenant_id  uuid  NULL  （无默认值）
--
-- 证据（取证门已回读，行号直接引用）：
--   写：svc/unified-core/src/modules/file/manage.rs:1022-1025
--       INSERT INTO core_file_permissions (file_id, user_id, permission, tenant_id)
--       VALUES ($1, $2, $3, $4)
--       ON CONFLICT (file_id, user_id) DO UPDATE SET permission = $3, tenant_id = EXCLUDED.tenant_id
--
--   prod 缺列时的失败方式：列清单与 DO UPDATE 的 SET/EXCLUDED 都引用 tenant_id，
--   parse/analyze 阶段报 SQLSTATE 42703 undefined_column（column "tenant_id" does not exist），
--   授予/调整文件权限整条路径 500；稳定报错，不是"冲突未命中"。
--
-- 前置断言：表存在；tenant_id 不存在；列在 dev 为可空，故不设行数门（prod 实测 0 行）。
-- 同名对象冲突：本迁移不创建索引/约束，故无同名对象创建冲突。本语句依赖的唯一索引
--   core_file_permissions_file_id_user_id_key (file_id, user_id) 在 prod 已存在且不含 tenant_id，
--   补列不影响 ON CONFLICT 的推断目标（已核 prod pg_indexes）。
-- 后置断言：tenant_id 形状 = (uuid, 可空, 无默认)。
--
-- RLS 副作用核查（prod 实测）：public.core_file_permissions 为 relrowsecurity=false /
--   relforcerowsecurity=false，pg_policies 中无任何策略。补列不创建/修改策略，补列前后都无
--   RLS 过滤，无副作用。dev 侧已有的 tenant_isolation_core_file_permissions 属后续收紧批次，
--   本迁移不涉及，也不会因为补列而在 prod 自动生效。
--
-- 残余缺列：无。prod 该表除 tenant_id 外与 dev 列集合一致，本迁移后上述语句在列层面齐备。
--
-- 回滚：database/rollback/20261115141700_b_class_core_file_permissions_tenant_id.rollback.sql
--   （仅当列内无任何非空值才删列，有数据则保留并 RAISE NOTICE）。

-- 1. 前置断言
DO $$
BEGIN
    IF to_regclass('public.core_file_permissions') IS NULL THEN
        RAISE EXCEPTION 'B 类前置断言失败：表 public.core_file_permissions 不存在';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'core_file_permissions'
           AND column_name = 'tenant_id'
    ) THEN
        RAISE EXCEPTION 'B 类前置断言失败：public.core_file_permissions.tenant_id 已存在，本迁移只补缺失列';
    END IF;

    IF to_regclass('public.core_file_permissions_file_id_user_id_key') IS NULL THEN
        RAISE EXCEPTION 'B 类前置断言失败：ON CONFLICT (file_id, user_id) 依赖的唯一索引不存在';
    END IF;
END $$;

-- 2. 补列
ALTER TABLE public.core_file_permissions ADD COLUMN IF NOT EXISTS tenant_id uuid;

-- 3. 后置断言：形状与 dev 定义逐项对齐
DO $$
DECLARE
    v_type text;
    v_nullable text;
    v_default text;
BEGIN
    SELECT data_type, is_nullable, column_default
      INTO v_type, v_nullable, v_default
      FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'core_file_permissions'
       AND column_name = 'tenant_id';

    IF v_type IS NULL THEN
        RAISE EXCEPTION 'B 类后置断言失败：public.core_file_permissions.tenant_id 未创建';
    END IF;
    IF v_type <> 'uuid' OR v_nullable <> 'YES' OR v_default IS NOT NULL THEN
        RAISE EXCEPTION 'B 类后置断言失败：core_file_permissions.tenant_id 形状=(%,%,%)，期望=(uuid,YES,NULL)',
            v_type, v_nullable, coalesce(v_default, 'NULL');
    END IF;
END $$;
