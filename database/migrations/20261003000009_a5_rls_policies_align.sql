-- =============================================================
-- A5：全库「RLS=ON 但无任何 policy」脚枪拆解——按 finance U5 同构补齐策略（幂等）
-- 关联：20261003000001_u5_finance_rls_enable（finance）、
--       20261003000008_b5_gis_rls（gis 7 表 allow-all→rls_tenant_isolation）
--       R-7b：erp.erp_master_data_refs 已自带 rls_tenant_isolation（实测命中 1 策略，
--       本迁移的「无策略」选择条件天然跳过它，不重复处理）
--
-- 背景：
--   RLS=ON（relrowsecurity=true）但表上零 policy 时，Postgres 对非表 owner、
--   非 superuser 角色默认全拒（default-deny）。运行时连接角色 topems 为 superuser
--   （B 口径：本批不切换受限角色），当前不暴露，但属于「切换受限角色即炸」的脚枪。
--   审计（scripts/audit/audit-force-rls-no-policy.sql，只读）实测：
--     5432：27 张（含 tenant_id uuid 列）；5433：29 张（多 finance.accounting_subjects、
--       finance.core_finance_voucher_lines、finance.source_amount_snapshots、
--       mes.production_plans —— 双库既有漂移，本迁移各按自身目录补齐）。
--   非空目标仅 3 张，数据分布已核：
--     ehs.qa_ehs_employees 4 行（单租户）、finance.erp_payment_records 8 行（单租户）、
--     hrm.audit_logs 11 行（tenant_id 全 NULL，走 tenant_id IS NULL 放行分支）。
--
-- 本迁移动作（与 U5 逐字同构，仅选择范围由 finance 单 schema 扩为全库非系统 schema）：
--   对「基表 + RLS=ON + 零 policy + 有 tenant_id 列」的表：
--     1) ENABLE ROW LEVEL SECURITY（幂等，已开无操作）
--     2) FORCE ROW LEVEL SECURITY（幂等；使未来受限角色即使是表 owner 也受策略约束）
--     3) 按 tenant_id 列类型取表达式（uuid 分支 / text 分支，与 U5 完全一致），
--        仅当 rls_tenant_isolation 不存在时 CREATE POLICY（二次运行外层即无策略表，
--        整体零副作用）。
--
-- 策略语义（同 U5/B5）：
--   - GUC 未设置/为空（系统/事件/健康查询）→ 全放行（向后兼容）
--   - GUC = nil UUID（service token）→ 全放行
--   - tenant_id IS NULL（共享/全局行）→ 放行
--   - 否则仅放行本租户行
--
-- 边界（严格遵守 A5 范围）：
--   - 不处理「FORCE=ON 但 RLS=OFF」（FORCE 空转，U5-C 型，173~192 张）：当前对
--     superuser 运行时无脚枪效应，属单独一类债务，登记报告不混做。
--   - 不处理「RLS=ON 无 policy 但无 tenant_id 列」的平台表（30~31 张）：补列/按
--     角色 permissive 策略超出本批范围，登记报告不混做。
--   - 不修改任何已应用迁移文件；不碰视图（relkind='r'）。
-- =============================================================

DO $$
DECLARE
    r RECORD;
    col_type text;
    expr text;
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
          AND EXISTS (                                 -- 必须含 tenant_id 列
              SELECT 1 FROM information_schema.columns ci
              WHERE ci.table_schema = n.nspname
                AND ci.table_name = c.relname
                AND ci.column_name = 'tenant_id'
          )
        ORDER BY n.nspname, c.relname
    LOOP
        -- 1) 启用 RLS（幂等：已启用则无操作）
        EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', r.sch, r.tbl);

        -- 2) FORCE：与 U5/B5 口径一致（运行时 superuser 不受影响；受限角色后置切换时生效）
        EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', r.sch, r.tbl);

        -- 3) 按 tenant_id 列类型选择比较表达式（与 U5 逐字一致）
        SELECT data_type INTO col_type
        FROM information_schema.columns
        WHERE table_schema = r.sch
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
            WHERE schemaname = r.sch
              AND tablename = r.tbl
              AND policyname = 'rls_tenant_isolation'
        ) INTO pol_exists;

        IF NOT pol_exists THEN
            EXECUTE format(
                'CREATE POLICY rls_tenant_isolation ON %I.%I FOR ALL USING (%s) WITH CHECK (%s)',
                r.sch, r.tbl, expr, expr
            );
            RAISE NOTICE 'A5: created rls_tenant_isolation on %.%', r.sch, r.tbl;
        END IF;
    END LOOP;
END $$;
