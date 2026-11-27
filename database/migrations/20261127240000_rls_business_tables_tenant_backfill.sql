-- 20261127240000: 业务表 tenant_id 回填 + SET NOT NULL + 同步收紧 RLS 旁路（B 组）
--
-- 背景：20261127230000 只收紧了「当前 0 行 tenant_id 为空」的表。剩下的 18 张业务表因为历史写入路径
--   未带租户，库里存在 tenant_id 为空的记录，所以那一步跳过；这些 NULL 行正是 RLS 旁路
--   `OR (tenant_id IS NULL)` 的实际暴露面——谁都能读到。
--
-- 代码侧前置修复（同窗口提交，缺一不可）：
--   · svc/search/src/handlers.rs：search_recent 写入补 tenant_id 绑定（原 SQL 只写 user_id/keyword）
--   · svc/unified-core/src/modules/iam/user/roles.rs / iam/user_permission.rs：core_user_roles 写入补 tenant_id
--   · svc/unified-core/src/modules/tenant/handlers.rs：建租户时超管角色绑定补 tenant_id
--   全仓生产代码 INSERT 复查：这 18 张表已无「缺 tenant_id」的插入点（测试夹具除外）。
--
-- 本迁移动作（逐表、运行时发现、缺表自动跳过）：
--   1) 把 tenant_id 为空的行原样快照到 archive.rls_backfill_tenant_before_20261127（jsonb 全文）；
--   2) UPDATE ... SET tenant_id = 默认租户 '00000000-0000-0000-0000-000000000001'
--      —— 默认租户是平台既有租户（不是新造），把「无主历史行」归到它；不删除、不改其他列；
--   3) ALTER COLUMN tenant_id SET NOT NULL —— 从此写入路径必须带租户，旁路失效；
--   4) 对该表策略再跑一遍「删 OR (tenant_id IS NULL)」逻辑（改前快照到同一张 archive 表）。
--
-- 影响面：dev 18 张表合计 468 行（最大单表 62 行）；生产这 18 张表中 6 张不存在、其余 0 行 NULL
--   → 生产侧 UPDATE 影响 0 行，等价空跑，但列约束与策略仍会一并收敛。
-- 回滚：database/rollback/20261127240000_rls_business_tables_tenant_backfill.rollback.sql
--   1) 策略按快照还原；2) 被回填的行按快照把 tenant_id 改回 NULL；3) DROP NOT NULL。
--
-- 事务：由 scripts/migration/apply-forward.sh 单事务执行，本文件不含 BEGIN/COMMIT。

SET LOCAL search_path = pg_catalog, public, pg_temp;

CREATE TABLE IF NOT EXISTS archive.rls_backfill_tenant_before_20261127 (
  schemaname text NOT NULL,
  tablename  text NOT NULL,
  row_json   jsonb NOT NULL,
  backfilled_at timestamptz NOT NULL DEFAULT now(),
  batch text NOT NULL DEFAULT 'RLS-BACKFILL-20261127'
);

-- destructive-gate: allow
-- destructive-kind: UPDATE
-- destructive-reason: 把 18 张业务表里 tenant_id 为空的历史行归入默认租户，用于关闭 RLS tenant_id IS NULL 旁路；行先全文快照到 archive 表
-- destructive-owner: db
-- destructive-ticket: RLS-BACKFILL-20261127
-- destructive-expires: 2027-06-30
-- destructive-max-rows: 62
-- destructive-backup: archive.rls_backfill_tenant_before_20261127（本迁移同事务内写入 jsonb 全量快照）
DO $$
DECLARE
    default_tenant constant uuid := '00000000-0000-0000-0000-000000000001';
    targets constant text[] := ARRAY[
        'notification.notifications','public.search_recent','public.core_files','qms.quality_inspections',
        'storage.files','report.reports','rs.audit_logs','mail.emails','public.core_emails',
        'rs.rs_projects','public.core_user_roles','public.search_logs','qms.dashboard_metrics',
        'crm.tags','qms.quality_standards','portal.user_preferences','crm.interactions',
        'master_data.mdm_supplier_categories'
    ];
    full_name text;
    sch text;
    tbl text;
    n_null bigint;
    n_done int := 0;
    n_skip int := 0;
    r record;
    new_qual text;
    new_check text;
    n_pol int := 0;
BEGIN
    FOREACH full_name IN ARRAY targets LOOP
        sch := split_part(full_name, '.', 1);
        tbl := split_part(full_name, '.', 2);

        IF to_regclass(format('%I.%I', sch, tbl)) IS NULL THEN
            RAISE NOTICE 'skip 表不存在：%', full_name;
            n_skip := n_skip + 1;
            CONTINUE;
        END IF;

        EXECUTE format('SELECT count(*) FROM %I.%I WHERE tenant_id IS NULL', sch, tbl) INTO n_null;

        IF n_null > 0 THEN
            EXECUTE format(
                'INSERT INTO archive.rls_backfill_tenant_before_20261127 (schemaname, tablename, row_json)
                 SELECT %L, %L, to_jsonb(x) FROM %I.%I x WHERE x.tenant_id IS NULL',
                sch, tbl, sch, tbl);
            EXECUTE format('UPDATE %I.%I SET tenant_id = %L WHERE tenant_id IS NULL', sch, tbl, default_tenant);
            RAISE NOTICE 'backfilled %.%：% 行 → 默认租户', sch, tbl, n_null;
        ELSE
            RAISE NOTICE 'no-op %.%：本环境无 tenant_id 为空的行', sch, tbl;
        END IF;

        -- 列约束：从此不许再写 NULL
        IF EXISTS (
            SELECT 1 FROM information_schema.columns c
            WHERE c.table_schema = sch AND c.table_name = tbl
              AND c.column_name = 'tenant_id' AND c.is_nullable = 'YES'
        ) THEN
            EXECUTE format('ALTER TABLE %I.%I ALTER COLUMN tenant_id SET NOT NULL', sch, tbl);
            RAISE NOTICE 'set not null %.%', sch, tbl;
        END IF;

        -- 策略收紧：删 OR (tenant_id IS NULL)，其余判定逐字保留
        FOR r IN
            SELECT p.policyname AS pol, p.qual, p.with_check
            FROM pg_policies p
            WHERE p.schemaname = sch AND p.tablename = tbl
              AND (p.policyname LIKE 'tenant_isolation%' OR p.policyname = 'rls_tenant_isolation')
              AND coalesce(p.qual,'') LIKE '%(tenant_id IS NULL)%'
        LOOP
            new_qual  := regexp_replace(coalesce(r.qual,''),       ' OR \(tenant_id IS NULL\)', '', 'gi');
            new_check := regexp_replace(coalesce(r.with_check,''), ' OR \(tenant_id IS NULL\)', '', 'gi');
            IF new_qual = coalesce(r.qual,'') AND new_check = coalesce(r.with_check,'') THEN
                CONTINUE;
            END IF;
            IF r.with_check IS NULL THEN
                EXECUTE format('ALTER POLICY %I ON %I.%I USING (%s)', r.pol, sch, tbl, new_qual);
            ELSE
                EXECUTE format('ALTER POLICY %I ON %I.%I USING (%s) WITH CHECK (%s)', r.pol, sch, tbl, new_qual, new_check);
            END IF;
            n_pol := n_pol + 1;
        END LOOP;

        n_done := n_done + 1;
    END LOOP;

    RAISE NOTICE '完成：处理 % 张表，跳过 % 张（不存在），收紧策略 % 条', n_done, n_skip, n_pol;
END $$;

-- 后置断言：这些表不允许再有 tenant_id 为空的行，也不允许 tenant_id 仍可空
DO $$
DECLARE
    targets constant text[] := ARRAY[
        'notification.notifications','public.search_recent','public.core_files','qms.quality_inspections',
        'storage.files','report.reports','rs.audit_logs','mail.emails','public.core_emails',
        'rs.rs_projects','public.core_user_roles','public.search_logs','qms.dashboard_metrics',
        'crm.tags','qms.quality_standards','portal.user_preferences','crm.interactions',
        'master_data.mdm_supplier_categories'
    ];
    full_name text; sch text; tbl text; n_null bigint; bad text;
BEGIN
    FOREACH full_name IN ARRAY targets LOOP
        sch := split_part(full_name, '.', 1);
        tbl := split_part(full_name, '.', 2);
        IF to_regclass(format('%I.%I', sch, tbl)) IS NULL THEN CONTINUE; END IF;

        EXECUTE format('SELECT count(*) FROM %I.%I WHERE tenant_id IS NULL', sch, tbl) INTO n_null;
        IF n_null > 0 THEN
            bad := coalesce(bad || ', ', '') || format('%s(%s 行 NULL)', full_name, n_null);
            CONTINUE;
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.columns c
                   WHERE c.table_schema = sch AND c.table_name = tbl
                     AND c.column_name = 'tenant_id' AND c.is_nullable = 'YES') THEN
            bad := coalesce(bad || ', ', '') || format('%s(tenant_id 仍可空)', full_name);
        END IF;
    END LOOP;
    IF bad IS NOT NULL THEN
        RAISE EXCEPTION '后置断言失败：%', bad;
    END IF;
    RAISE NOTICE '后置断言通过：18 张业务表 tenant_id 全部 NOT NULL 且无 NULL 行';
END $$;
