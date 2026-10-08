-- =============================================================
-- B3b：FORCE 空转表分类处置（FORCE=ON 但 RLS=OFF → 补齐为有策略的 RLS 常态）
-- 关联：
--   20261003000001_u5_finance_rls_enable（U5-C：FORCE 空转 tenant 表 → ENABLE+FORCE+isolation）
--   20261003000009_a5_rls_policies_align（RLS=ON 零 policy tenant 表补 rls_tenant_isolation）
--   20261003000011_b3a_platform_tables_permissive（RLS=ON 零 policy 无 tenant 表补 allow_all）
--
-- 背景：
--   A5 审计（scripts/audit/audit-force-rls-no-policy.sql）登记 FORCE 空转表
--     5432=173 / 5433=192：relforcerowsecurity=TRUE 但 relrowsecurity=FALSE。
--   成因：20260908000018 / 20260909000004 两个历史迁移按「已启用 RLS」的前提批量打
--   FORCE 标志，但这批表的 RLS 从未真正 ENABLE → FORCE 孤儿标志（空转）。
--   RLS=OFF 时 FORCE 无任何过滤效果，当前对 superuser 运行时无暴露，但 schema 状态异常、
--   受限角色（topems_app）接入存在语义不确定性。
--
-- 分类（scripts/audit/b3b_force_idle_classify.sql 只读幂等复核）：
--   - 含 tenant_id(uuid) 业务表：5432=118（15 非空）/ 5433=137（3 非空）。
--     这些表被历史 FORCE 清单收录即「设计为租户隔离」，RLS=OFF 是未完成的开关。
--     处置 = U5-C 同构：ENABLE RLS + FORCE + rls_tenant_isolation（表达式逐字对齐
--     U5/A5：GUC 未设/空/nil/tenant_id IS NULL 放行，否则仅本租户行）。
--   - 无 tenant_id 平台表：5432=55（1 非空 core.core_plugins）/ 5433=55（全空）。
--     全局平台表（iam.roles / portal.* / ehs.* / qms.* / doc_service.* 等），本就无租户
--     隔离语义。处置 = B3a 同构：ENABLE RLS + FORCE + <schema>_allow_all_<table>
--     permissive（USING true / WITH CHECK true），使受限角色接入时正常读写（与现状一致）。
--   - 死表/影子表（public.* 影子 / qa_lab 骨架）：本清单实测为 0
--     （历史已由 U3b 20261003000002 及 2026090x_*_drop_*_shadow 系列清理完毕）。
--   - 非空表数据安全性已核：tenant_id 多为全 NULL 或单租户，命中 policy 的 NULL/单租户放行分支。
--
-- 边界（严格切分，靠 relrowsecurity 标志天然互斥）：
--   - 只动 relforcerowsecurity=TRUE AND relrowsecurity=FALSE（FORCE 空转）表。
--   - B3a(0011)/A5(0009) 的范围是 relrowsecurity=TRUE（RLS 已开），被本迁移选择条件天然排除，
--     互不重叠；本迁移把空转表 ENABLE 后即带策略，也不会回流成「RLS=ON 零 policy」。
--   - 不 DROP 任何表；不改表结构；不修改任何已应用迁移文件；仅基表 relkind='r'。
--
-- 幂等：
--   - 外层选择条件即「FORCE 空转」表。本迁移 ENABLE RLS 后这些表 relrowsecurity=TRUE，
--     二次重放外层零命中、循环零迭代、零 NOTICE。
--   - 策略均带 NOT EXISTS 守卫，不覆盖既有正确策略。
--   - 运行时连接角色 topems 为 superuser（双库 rolsuper=t），ENABLE+FORCE 后仍恒无视 RLS，
--     行为零变化（B 口径，受限角色切换为后置条件）。
-- =============================================================

DO $$
DECLARE
    r RECORD;
    col_type text;
    expr text;
    pol_exists boolean;
    pol_name text;
BEGIN
    -- ===== 桶 1：含 tenant_id 的 FORCE 空转业务表 → U5-C isolation =====
    FOR r IN
        SELECT c.relname AS tbl, n.nspname AS sch
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relkind = 'r'                         -- 仅基表，排除视图
          AND n.nspname NOT IN ('pg_catalog', 'information_schema')
          AND n.nspname NOT LIKE 'pg_toast%'
          AND c.relname NOT LIKE 'pg\_%'
          AND c.relforcerowsecurity = TRUE
          AND c.relrowsecurity = FALSE               -- FORCE 空转（与 B3a/A5 互斥）
          AND EXISTS (                               -- 必须含 tenant_id 列
              SELECT 1 FROM information_schema.columns ci
              WHERE ci.table_schema = n.nspname
                AND ci.table_name = c.relname
                AND ci.column_name = 'tenant_id'
          )
        ORDER BY n.nspname, c.relname
    LOOP
        -- 1) 启用 RLS（幂等）+ 2) FORCE（本就 TRUE，重申与 U5/A5 口径一致）
        EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', r.sch, r.tbl);
        EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', r.sch, r.tbl);

        -- 3) 按 tenant_id 列类型取表达式（uuid / text 双分支，与 U5/A5 逐字一致）
        SELECT data_type INTO col_type
        FROM information_schema.columns
        WHERE table_schema = r.sch AND table_name = r.tbl AND column_name = 'tenant_id'
        LIMIT 1;

        IF col_type = 'uuid' THEN
            expr := '(COALESCE(current_setting(''app.tenant_id''::text, true), '''') = ''00000000-0000-0000-0000-000000000000'')'
                 || ' OR (current_setting(''app.tenant_id''::text, true) IS NULL)'
                 || ' OR (current_setting(''app.tenant_id''::text, true) = '''')'
                 || ' OR (tenant_id IS NULL)'
                 || ' OR ((tenant_id)::text = NULLIF(current_setting(''app.tenant_id''::text, true), ''''))';
        ELSE
            expr := '(COALESCE(current_setting(''app.tenant_id''::text, true), '''') = ''00000000-0000-0000-0000-000000000000'')'
                 || ' OR (current_setting(''app.tenant_id''::text, true) IS NULL)'
                 || ' OR (current_setting(''app.tenant_id''::text, true) = '''')'
                 || ' OR (tenant_id IS NULL)'
                 || ' OR (tenant_id = NULLIF(current_setting(''app.tenant_id''::text, true), ''''))';
        END IF;

        -- 4) 仅当 rls_tenant_isolation 缺失时创建（幂等）
        SELECT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = r.sch AND tablename = r.tbl
              AND policyname = 'rls_tenant_isolation'
        ) INTO pol_exists;

        IF NOT pol_exists THEN
            EXECUTE format(
                'CREATE POLICY rls_tenant_isolation ON %I.%I FOR ALL USING (%s) WITH CHECK (%s)',
                r.sch, r.tbl, expr, expr
            );
            RAISE NOTICE 'B3b: created rls_tenant_isolation on %.%', r.sch, r.tbl;
        END IF;
    END LOOP;

    -- ===== 桶 2：无 tenant_id 的 FORCE 空转平台表 → B3a 同构 allow_all permissive =====
    FOR r IN
        SELECT c.relname AS tbl, n.nspname AS sch
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relkind = 'r'
          AND n.nspname NOT IN ('pg_catalog', 'information_schema')
          AND n.nspname NOT LIKE 'pg_toast%'
          AND c.relname NOT LIKE 'pg\_%'
          AND c.relforcerowsecurity = TRUE
          AND c.relrowsecurity = FALSE               -- FORCE 空转（与 B3a/A5 互斥）
          AND NOT EXISTS (                           -- 必须不含 tenant_id 列（与桶 1 切分）
              SELECT 1 FROM information_schema.columns ci
              WHERE ci.table_schema = n.nspname
                AND ci.table_name = c.relname
                AND ci.column_name = 'tenant_id'
          )
        ORDER BY n.nspname, c.relname
    LOOP
        -- 1) 启用 RLS（幂等）+ 2) FORCE（本就 TRUE，重申口径一致）
        EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', r.sch, r.tbl);
        EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', r.sch, r.tbl);

        -- 命名对齐 B3a / 既有 allow-all 风格：<schema>_allow_all_<table>
        pol_name := r.sch || '_allow_all_' || r.tbl;

        -- 守卫：仅当本策略不存在时创建（幂等，不覆盖既有策略）
        SELECT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = r.sch AND tablename = r.tbl
              AND policyname = pol_name
        ) INTO pol_exists;

        IF NOT pol_exists THEN
            EXECUTE format(
                'CREATE POLICY %I ON %I.%I AS PERMISSIVE FOR ALL USING (true) WITH CHECK (true)',
                pol_name, r.sch, r.tbl
            );
            RAISE NOTICE 'B3b: created % on %.%', pol_name, r.sch, r.tbl;
        END IF;
    END LOOP;
END $$;
