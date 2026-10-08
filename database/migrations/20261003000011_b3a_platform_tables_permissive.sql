-- =============================================================
-- B3a：无 tenant_id 平台表 permissive 策略补齐（拆 FORCE RLS 零 policy 脚枪）
-- 关联：20261003000009_a5_rls_policies_align（含 tenant_id 业务表已补 rls_tenant_isolation）
--       3b/0012（FORCE=ON 但 RLS=OFF 空转表，与本迁移清单严格切分，互不重叠）
--
-- 背景：
--   A5 已对「RLS=ON 零 policy + 含 tenant_id」业务表补 rls_tenant_isolation；
--   「RLS=ON 零 policy + 无 tenant_id」的平台表（5432=30 / 5433=31，
--   scripts/audit/audit-force-rls-no-policy.sql 只读复核确认，与 A5 登记无差异）
--   当时仅登记未处置。这些表 RLS=ON（实测已 FORCE=ON）但零 policy，Postgres 对
--   NOSUPERUSER 受限角色（topems_app）默认 default-deny=全零脚枪：接入即零行。
--   本迁移动态扫描补齐 permissive allow-all 策略（USING true / WITH CHECK true），
--   使受限角色接入时可正常读写；运行时连接角色 topems 为 superuser，恒无视 RLS，
--   行为零变化。
--
-- 本迁移动作（仅补策略，不改表结构、不 ENABLE/FORCE——RLS 开关维持现状）：
--   对「基表 + RLS=ON + 零 policy + 无 tenant_id 列」的表：
--     CREATE POLICY <schema>_allow_all_<table> AS PERMISSIVE FOR ALL
--       USING (true) WITH CHECK (true)
--   - 命名对齐既有 allow-all 风格（gis_allow_all_*，如 gis_allow_all_geofences）。
--   - 仅当该策略不存在时创建（内层 pol_exists 守卫）；不覆盖任何既有策略。
--
-- 幂等：
--   外层选择条件本身即「零 policy」表。首次应用后这些表已带策略，二次重放外层
--   无命中、循环零迭代、零 NOTICE。
--
-- 边界（严格遵守 B3a 范围）：
--   - 只动「RLS=ON 零 policy 无 tenant_id」表；A5 已补 tenant 策略的表（含
--     tenant_id 列）被 NOT EXISTS tenant_id 条件天然排除，不重复处理。
--   - 不碰「FORCE=ON 但 RLS=OFF」空转表（5432=173 / 5433=192，3b/0012 范围）：
--     被 c.relrowsecurity = TRUE 条件天然排除。
--   - 不修改任何已应用迁移文件；仅处理基表（relkind='r'）。
-- =============================================================

DO $$
DECLARE
    r RECORD;
    pol_name text;
    pol_exists boolean;
BEGIN
    FOR r IN
        SELECT c.relname AS tbl, n.nspname AS sch
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relkind = 'r'                         -- 仅基表，排除视图
          AND n.nspname NOT IN ('pg_catalog', 'information_schema')
          AND n.nspname NOT LIKE 'pg_toast%'
          AND c.relname NOT LIKE 'pg\_%'
          AND c.relrowsecurity = TRUE                 -- RLS 已 ON 的「无策略」脚枪表
          AND NOT EXISTS (
              SELECT 1 FROM pg_policy p WHERE p.polrelid = c.oid
          )
          AND NOT EXISTS (                            -- 必须不含 tenant_id 列（与 A5 切分）
              SELECT 1 FROM information_schema.columns ci
              WHERE ci.table_schema = n.nspname
                AND ci.table_name = c.relname
                AND ci.column_name = 'tenant_id'
          )
        ORDER BY n.nspname, c.relname
    LOOP
        -- 命名对齐既有 allow-all 风格：<schema>_allow_all_<table>（参 gis_allow_all_*）
        pol_name := r.sch || '_allow_all_' || r.tbl;

        -- 守卫：仅当本策略不存在时创建（幂等，不覆盖既有策略）
        SELECT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = r.sch
              AND tablename = r.tbl
              AND policyname = pol_name
        ) INTO pol_exists;

        IF NOT pol_exists THEN
            EXECUTE format(
                'CREATE POLICY %I ON %I.%I AS PERMISSIVE FOR ALL USING (true) WITH CHECK (true)',
                pol_name, r.sch, r.tbl
            );
            RAISE NOTICE 'B3a: created % on %.%', pol_name, r.sch, r.tbl;
        END IF;
    END LOOP;
END $$;
