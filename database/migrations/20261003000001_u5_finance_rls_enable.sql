-- =============================================================
-- U5：finance schema 业务表 RLS 开启与租户隔离策略补齐（幂等）
-- 关联审计：FCRM-02 / XCUT-06（finance 显式关闭 RLS）、F-05
--
-- 背景：
--   finance 运行时此前 enable_rls=false（svc/finance/src/main.rs），DB 层 RLS 纵深防御
--   形同虚设。盘点 5432 现网 finance schema 后发现三类缺口：
--     B. RLS+FORCE 已开但缺策略（无策略=默认拒绝）：
--        finance.accounting_subjects、finance.core_finance_voucher_lines
--     C. FORCE 已开但 RLS 未 ENABLE（FORCE 空转）：
--        finance.expenses、finance.payables、finance.receivables
--     D. 完全未接入 RLS（v54~v60 新特性表，含 tenant_id 列）：
--        finance_v54_* / finance_v55_* / ... / finance_v60_* 约 47 张
--   本迁移对 finance schema 全部“含 tenant_id 列的基表”幂等补齐：
--     ENABLE ROW LEVEL SECURITY + FORCE + rls_tenant_isolation 策略（缺失才建）。
--
-- 策略语义（与 scripts/db/rls-policy-unify.sql、20260908000017_rls_policy_align.sql 一致）：
--   - GUC 未设置/为空（rls_middleware 无 x-tenant-id、系统/事件/健康查询）→ 全放行（向后兼容）
--   - GUC = nil UUID（service token / 系统调用）→ 全放行
--   - tenant_id IS NULL（共享/全局行）→ 放行
--   - 否则仅放行本租户行（跨租户行对运行时角色不可见）
--
-- 幂等：
--   - ALTER TABLE ... ENABLE/FORCE ROW LEVEL SECURITY 重复执行无副作用
--   - 策略仅在不存在时创建（IF NOT EXISTS 语义用 NOT EXISTS 守卫），不改动既有正确策略
--   - 不触碰视图（relkind='r' 过滤）、不触碰 qa_lab_*（在 public/qms/lims schema）
--   - 不修改任何已应用迁移文件
-- =============================================================

DO $$
DECLARE
    r RECORD;
    col_type text;
    expr text;
    pol_exists boolean;
BEGIN
    FOR r IN
        SELECT c.relname AS tbl
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'finance'
          AND c.relkind = 'r'                 -- 仅基表，排除视图
          AND c.relname NOT LIKE 'pg\_%'
          AND EXISTS (
              SELECT 1 FROM information_schema.columns ci
              WHERE ci.table_schema = 'finance'
                AND ci.table_name = c.relname
                AND ci.column_name = 'tenant_id'
          )
        ORDER BY c.relname
    LOOP
        -- 1) 启用 RLS（幂等：已启用则无操作）
        EXECUTE format('ALTER TABLE finance.%I ENABLE ROW LEVEL SECURITY', r.tbl);

        -- 2) FORCE：使表 owner（迁移池 superuser 之外的受限角色）同样受策略约束
        --    （与 20260908000018 / 20260909000004 既有 finance 约定一致）
        EXECUTE format('ALTER TABLE finance.%I FORCE ROW LEVEL SECURITY', r.tbl);

        -- 3) 按 tenant_id 列类型选择比较表达式
        SELECT data_type INTO col_type
        FROM information_schema.columns
        WHERE table_schema = 'finance'
          AND table_name = r.tbl
          AND column_name = 'tenant_id'
        LIMIT 1;

        IF col_type = 'uuid' THEN
            expr := '(COALESCE(current_setting(''app.tenant_id''::text, true), '''') = ''00000000-0000-0000-0000-000000000000'')'
                 || ' OR (current_setting(''app.tenant_id''::text, true) IS NULL)'
                 || ' OR (current_setting(''app.tenant_id''::text, true) = '''')'
                 || ' OR (tenant_id IS NULL)'
                 || ' OR ((tenant_id)::text = NULLIF(current_setting(''app.tenant_id''::text, true), ''''))';
        ELSE
            -- text / varchar 列：文本比较，无需 cast
            expr := '(COALESCE(current_setting(''app.tenant_id''::text, true), '''') = ''00000000-0000-0000-0000-000000000000'')'
                 || ' OR (current_setting(''app.tenant_id''::text, true) IS NULL)'
                 || ' OR (current_setting(''app.tenant_id''::text, true) = '''')'
                 || ' OR (tenant_id IS NULL)'
                 || ' OR (tenant_id = NULLIF(current_setting(''app.tenant_id''::text, true), ''''))';
        END IF;

        -- 4) 仅当 rls_tenant_isolation 策略缺失时创建（不覆盖既有正确策略，保证幂等）
        SELECT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'finance'
              AND tablename = r.tbl
              AND policyname = 'rls_tenant_isolation'
        ) INTO pol_exists;

        IF NOT pol_exists THEN
            EXECUTE format(
                'CREATE POLICY rls_tenant_isolation ON finance.%I FOR ALL USING (%s) WITH CHECK (%s)',
                r.tbl, expr, expr
            );
            RAISE NOTICE 'U5: created rls_tenant_isolation on finance.%', r.tbl;
        END IF;
    END LOOP;
END $$;
