-- ============================================================
-- W7 · B4-SIX：erp / mes / ticket / portal / crm / hrm 六 schema
--                剩余 fail-open 策略收敛为 fail-closed（28 张）
-- 版本：20261114120000
--
-- 范围（生产只读实测 51 张 qual='true' AND with_check='true' 表中，
--       逐表判定后纳入的 28 张；全部 0 行 / tenant_id NULL=0 / 子表孤儿=0）：
--   系统通道（仅 app.rls_system='on'，读写同形）：
--     crm.audit_logs, erp.audit_logs, hrm.audit_logs
--   子表（父单租户 EXISTS 校验，不机械加等值谓词）：
--     mes.process_flow_steps      → mes.process_flows(id)
--     mes.quality_patrol_items    → mes.quality_patrols(id)
--     ticket.core_ticket_activities     → ticket.core_tickets(id)
--     ticket.core_ticket_comments       → ticket.core_tickets(id)
--     ticket.core_ticket_sla_escalations→ ticket.core_tickets(id)
--   真租户表（tenant_id = app.tenant_id，或系统通道）：
--     erp: customers, financial_vouchers, fixed_assets, leave_requests,
--          opening_balances, payables, receivables, sales_orders, suppliers
--     mes: capacities, demand_forecasts, process_flows, production_plans,
--          quality_inspections, quality_patrols
--     portal: portal_todos
--     ticket: core_tickets, core_ticket_sla_policies,
--             ticket_automation_rules, ticket_knowledge_articles
--
-- 明确不在本批（保持原状，见 manifest 登记）：
--   8 张合并域表、erp.dict_types / erp.dict_items、12 张无 tenant_id 表、
--   hrm.initialization_logs（语义待单独判定）。
--
-- 行为：
--   1. DROP 这 28 张表上的全部既有策略（含 mes.process_flow_steps 上一条
--      fail-open 的 rls_tenant_isolation，其分支含 IS NULL / nil uuid 放行）；
--   2. ENABLE + FORCE ROW LEVEL SECURITY（生产现状已是 ENABLE+FORCE，本迁移重申）；
--   3. CREATE POLICY rls_tenant_isolation FOR ALL TO PUBLIC，USING 与 WITH CHECK 同形。
--
-- 前置形状断言：28 张表存在、tenant_id 均为 uuid、子表外键列存在、
--   策略总数恰为 29（28 条 <schema>_allow_all_<table> + process_flow_steps 的 1 条旧
--   rls_tenant_isolation）、无未知策略名、28 张表均 ENABLE+FORCE。
-- 后置形状自检：每表恰 1 条 rls_tenant_isolation、qual=with_check、含系统通道、
--   租户表含租户通道、审计表不含租户通道、子表含父表 EXISTS；
--   六 schema 残留 true/true 表数 = 23（即全部排除项），且本批 28 张为 0。
-- 数据自查（在 FORCE 之后、显式系统通道下执行，不被 RLS 过滤）：
--   28 表 tenant_id IS NULL 行数必须全为 0；5 张子表孤儿/父租户不一致必须全为 0。
--   NULL 行不自动回填：任一非 0 即 RAISE EXCEPTION 并给出表名与数字，整笔回滚。
--
-- 可重复执行：DROP POLICY IF EXISTS + 幂等建策略；形状不符或自查非 0 时整笔 ROLLBACK。
-- 依赖：本迁移不改变表结构，不新增列，不回填数据。
--
-- 回滚：database/rollback/20261114120000_w7_b4_six_schema_rls_fail_closed_forward.rollback.sql
--   （按生产只读快照逐表重建 29 条原策略；不提供 DISABLE RLS 路径）
-- ============================================================

SET lock_timeout = '5s';
SET statement_timeout = '120s';

-- ---------- 1. 前置形状断言 ----------
DO $w7b4six_pre$
DECLARE
    n_exist int;
    n_expected constant int := 28;
    missing_cols text;
    bad_policies text;
    n_policies int;
    n_converged int;
    n_forced int;
BEGIN
    -- 28 张表全部存在且为普通表
    SELECT count(*) INTO n_exist
      FROM pg_class c
      JOIN pg_namespace ns ON ns.oid = c.relnamespace
     WHERE c.relkind = 'r'
       AND (ns.nspname, c.relname) IN (VALUES
        ('crm','audit_logs'),('erp','audit_logs'),('hrm','audit_logs'),
        ('erp','customers'),('erp','financial_vouchers'),('erp','fixed_assets'),
        ('erp','leave_requests'),('erp','opening_balances'),('erp','payables'),
        ('erp','receivables'),('erp','sales_orders'),('erp','suppliers'),
        ('mes','capacities'),('mes','demand_forecasts'),('mes','process_flow_steps'),
        ('mes','process_flows'),('mes','production_plans'),('mes','quality_inspections'),
        ('mes','quality_patrol_items'),('mes','quality_patrols'),
        ('portal','portal_todos'),
        ('ticket','core_ticket_activities'),('ticket','core_ticket_comments'),
        ('ticket','core_ticket_sla_escalations'),('ticket','core_ticket_sla_policies'),
        ('ticket','core_tickets'),('ticket','ticket_automation_rules'),
        ('ticket','ticket_knowledge_articles'));

    IF n_exist <> n_expected THEN
        RAISE EXCEPTION 'B4-SIX 前置不满足：命中表数 %，期望 %', n_exist, n_expected;
    END IF;

    -- 缺列集：tenant_id 必须存在且为 uuid（覆盖 28 张表）
    SELECT string_agg(x.s || '.' || x.t, ', ' ORDER BY x.s, x.t) INTO missing_cols
      FROM (VALUES
        ('crm','audit_logs'),('erp','audit_logs'),('hrm','audit_logs'),
        ('erp','customers'),('erp','financial_vouchers'),('erp','fixed_assets'),
        ('erp','leave_requests'),('erp','opening_balances'),('erp','payables'),
        ('erp','receivables'),('erp','sales_orders'),('erp','suppliers'),
        ('mes','capacities'),('mes','demand_forecasts'),('mes','process_flow_steps'),
        ('mes','process_flows'),('mes','production_plans'),('mes','quality_inspections'),
        ('mes','quality_patrol_items'),('mes','quality_patrols'),
        ('portal','portal_todos'),
        ('ticket','core_ticket_activities'),('ticket','core_ticket_comments'),
        ('ticket','core_ticket_sla_escalations'),('ticket','core_ticket_sla_policies'),
        ('ticket','core_tickets'),('ticket','ticket_automation_rules'),
        ('ticket','ticket_knowledge_articles')
      ) AS x(s, t)
     CROSS JOIN LATERAL (SELECT x.s || '.' || x.t AS tbl) AS x2
     WHERE NOT EXISTS (
         SELECT 1 FROM information_schema.columns col
          WHERE col.table_schema = x.s
            AND col.table_name = x.t
            AND col.column_name = 'tenant_id'
            AND col.udt_name = 'uuid'
     );

    IF missing_cols IS NOT NULL THEN
        RAISE EXCEPTION 'B4-SIX 前置不满足：以下表缺 tenant_id(uuid) → %', missing_cols;
    END IF;

    -- 子表外键列必须存在且为 uuid
    SELECT string_agg(t.s || '.' || t.t || '.' || t.c, ', ' ORDER BY t.s, t.t) INTO missing_cols
      FROM (VALUES
        ('mes','process_flow_steps','flow_id'),
        ('mes','quality_patrol_items','patrol_id'),
        ('ticket','core_ticket_activities','ticket_id'),
        ('ticket','core_ticket_comments','ticket_id'),
        ('ticket','core_ticket_sla_escalations','ticket_id')
      ) AS t(s, t, c)
     WHERE NOT EXISTS (
         SELECT 1 FROM information_schema.columns col
          WHERE col.table_schema = t.s AND col.table_name = t.t
            AND col.column_name = t.c AND col.udt_name = 'uuid'
     );

    IF missing_cols IS NOT NULL THEN
        RAISE EXCEPTION 'B4-SIX 前置不满足：子表外键列缺失或非 uuid → %', missing_cols;
    END IF;

    -- 策略形状：28 表上恰 29 条策略（28 条 allow_all + process_flow_steps 的旧 rls_tenant_isolation）
    SELECT count(*) INTO n_policies
      FROM pg_policies p
     WHERE (p.schemaname, p.tablename) IN (VALUES
        ('crm','audit_logs'),('erp','audit_logs'),('hrm','audit_logs'),
        ('erp','customers'),('erp','financial_vouchers'),('erp','fixed_assets'),
        ('erp','leave_requests'),('erp','opening_balances'),('erp','payables'),
        ('erp','receivables'),('erp','sales_orders'),('erp','suppliers'),
        ('mes','capacities'),('mes','demand_forecasts'),('mes','process_flow_steps'),
        ('mes','process_flows'),('mes','production_plans'),('mes','quality_inspections'),
        ('mes','quality_patrol_items'),('mes','quality_patrols'),
        ('portal','portal_todos'),
        ('ticket','core_ticket_activities'),('ticket','core_ticket_comments'),
        ('ticket','core_ticket_sla_escalations'),('ticket','core_ticket_sla_policies'),
        ('ticket','core_tickets'),('ticket','ticket_automation_rules'),
        ('ticket','ticket_knowledge_articles'));

    -- 幂等重跑：28 张表已全部是目标形状时跳过原策略形状断言
    SELECT count(*) INTO n_converged
      FROM (VALUES
        ('crm','audit_logs'),('erp','audit_logs'),('hrm','audit_logs'),
        ('erp','customers'),('erp','financial_vouchers'),('erp','fixed_assets'),
        ('erp','leave_requests'),('erp','opening_balances'),('erp','payables'),
        ('erp','receivables'),('erp','sales_orders'),('erp','suppliers'),
        ('mes','capacities'),('mes','demand_forecasts'),('mes','process_flow_steps'),
        ('mes','process_flows'),('mes','production_plans'),('mes','quality_inspections'),
        ('mes','quality_patrol_items'),('mes','quality_patrols'),
        ('portal','portal_todos'),
        ('ticket','core_ticket_activities'),('ticket','core_ticket_comments'),
        ('ticket','core_ticket_sla_escalations'),('ticket','core_ticket_sla_policies'),
        ('ticket','core_tickets'),('ticket','ticket_automation_rules'),
        ('ticket','ticket_knowledge_articles')
      ) AS v(s, t)
     WHERE (SELECT count(*) FROM pg_policies p
             WHERE p.schemaname = v.s AND p.tablename = v.t) = 1
       AND EXISTS (SELECT 1 FROM pg_policies p
                    WHERE p.schemaname = v.s AND p.tablename = v.t
                      AND p.policyname = 'rls_tenant_isolation');

    IF n_converged = n_expected THEN
        RAISE NOTICE 'B4-SIX 前置：28 张表已是目标形状，按幂等重跑处理';
    ELSE
        IF n_policies <> 29 THEN
            RAISE EXCEPTION 'B4-SIX 前置不满足：28 表策略数 %，期望 29', n_policies;
        END IF;

        -- 只允许既有 allow_all 命名，外加 process_flow_steps 的旧 rls_tenant_isolation
        SELECT string_agg(p.schemaname || '.' || p.tablename || ':' || p.policyname, ', '
                          ORDER BY p.schemaname, p.tablename, p.policyname)
          INTO bad_policies
          FROM pg_policies p
         WHERE (p.schemaname, p.tablename) IN (VALUES
            ('crm','audit_logs'),('erp','audit_logs'),('hrm','audit_logs'),
            ('erp','customers'),('erp','financial_vouchers'),('erp','fixed_assets'),
            ('erp','leave_requests'),('erp','opening_balances'),('erp','payables'),
            ('erp','receivables'),('erp','sales_orders'),('erp','suppliers'),
            ('mes','capacities'),('mes','demand_forecasts'),('mes','process_flow_steps'),
            ('mes','process_flows'),('mes','production_plans'),('mes','quality_inspections'),
            ('mes','quality_patrol_items'),('mes','quality_patrols'),
            ('portal','portal_todos'),
            ('ticket','core_ticket_activities'),('ticket','core_ticket_comments'),
            ('ticket','core_ticket_sla_escalations'),('ticket','core_ticket_sla_policies'),
            ('ticket','core_tickets'),('ticket','ticket_automation_rules'),
            ('ticket','ticket_knowledge_articles'))
           AND NOT (
                p.policyname = p.schemaname || '_allow_all_' || p.tablename
                OR (p.schemaname = 'mes' AND p.tablename = 'process_flow_steps'
                    AND p.policyname = 'rls_tenant_isolation')
           );

        IF bad_policies IS NOT NULL THEN
            RAISE EXCEPTION 'B4-SIX 前置不满足：存在未知策略 → %', bad_policies;
        END IF;
    END IF;

    -- 28 表均已是 ENABLE + FORCE
    SELECT count(*) INTO n_forced
      FROM pg_class c
      JOIN pg_namespace ns ON ns.oid = c.relnamespace
     WHERE c.relkind = 'r'
       AND c.relrowsecurity AND c.relforcerowsecurity
       AND (ns.nspname, c.relname) IN (VALUES
        ('crm','audit_logs'),('erp','audit_logs'),('hrm','audit_logs'),
        ('erp','customers'),('erp','financial_vouchers'),('erp','fixed_assets'),
        ('erp','leave_requests'),('erp','opening_balances'),('erp','payables'),
        ('erp','receivables'),('erp','sales_orders'),('erp','suppliers'),
        ('mes','capacities'),('mes','demand_forecasts'),('mes','process_flow_steps'),
        ('mes','process_flows'),('mes','production_plans'),('mes','quality_inspections'),
        ('mes','quality_patrol_items'),('mes','quality_patrols'),
        ('portal','portal_todos'),
        ('ticket','core_ticket_activities'),('ticket','core_ticket_comments'),
        ('ticket','core_ticket_sla_escalations'),('ticket','core_ticket_sla_policies'),
        ('ticket','core_tickets'),('ticket','ticket_automation_rules'),
        ('ticket','ticket_knowledge_articles'));

    IF n_forced <> n_expected THEN
        RAISE EXCEPTION 'B4-SIX 前置不满足：ENABLE+FORCE 表数 %，期望 %', n_forced, n_expected;
    END IF;
END
$w7b4six_pre$;

-- ---------- 2. 策略重建 ----------
DO $w7b4six_apply$
DECLARE
    r record;
    pol record;
    qualsql text;
    n_tenant int := 0;
    n_system int := 0;
    n_child int := 0;
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
            ('crm','audit_logs','system',NULL::text,NULL::text),
            ('erp','audit_logs','system',NULL,NULL),
            ('hrm','audit_logs','system',NULL,NULL),
            ('erp','customers','tenant',NULL,NULL),
            ('erp','financial_vouchers','tenant',NULL,NULL),
            ('erp','fixed_assets','tenant',NULL,NULL),
            ('erp','leave_requests','tenant',NULL,NULL),
            ('erp','opening_balances','tenant',NULL,NULL),
            ('erp','payables','tenant',NULL,NULL),
            ('erp','receivables','tenant',NULL,NULL),
            ('erp','sales_orders','tenant',NULL,NULL),
            ('erp','suppliers','tenant',NULL,NULL),
            ('mes','capacities','tenant',NULL,NULL),
            ('mes','demand_forecasts','tenant',NULL,NULL),
            ('mes','process_flow_steps','child','flow_id','mes.process_flows'),
            ('mes','process_flows','tenant',NULL,NULL),
            ('mes','production_plans','tenant',NULL,NULL),
            ('mes','quality_inspections','tenant',NULL,NULL),
            ('mes','quality_patrol_items','child','patrol_id','mes.quality_patrols'),
            ('mes','quality_patrols','tenant',NULL,NULL),
            ('portal','portal_todos','tenant',NULL,NULL),
            ('ticket','core_ticket_activities','child','ticket_id','ticket.core_tickets'),
            ('ticket','core_ticket_comments','child','ticket_id','ticket.core_tickets'),
            ('ticket','core_ticket_sla_escalations','child','ticket_id','ticket.core_tickets'),
            ('ticket','core_ticket_sla_policies','tenant',NULL,NULL),
            ('ticket','core_tickets','tenant',NULL,NULL),
            ('ticket','ticket_automation_rules','tenant',NULL,NULL),
            ('ticket','ticket_knowledge_articles','tenant',NULL,NULL)
        ) AS v(s, t, kind, fk_col, parent_tbl)
        ORDER BY 1, 2
    LOOP
        FOR pol IN
            SELECT policyname FROM pg_policies
             WHERE schemaname = r.s AND tablename = r.t
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, r.s, r.t);
        END LOOP;

        EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', r.s, r.t);
        EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', r.s, r.t);

        IF r.kind = 'system' THEN
            qualsql := 'COALESCE(current_setting(''app.rls_system'', true), ''off'') = ''on''';
            n_system := n_system + 1;
        ELSIF r.kind = 'tenant' THEN
            qualsql := 'COALESCE(current_setting(''app.rls_system'', true), ''off'') = ''on'' '
                    || 'OR tenant_id = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid';
            n_tenant := n_tenant + 1;
        ELSIF r.kind = 'child' THEN
            qualsql := 'COALESCE(current_setting(''app.rls_system'', true), ''off'') = ''on'' '
                    || 'OR EXISTS (SELECT 1 FROM ' || r.parent_tbl || ' p '
                    || 'WHERE p.id = ' || r.s || '.' || r.t || '.' || r.fk_col || ' '
                    || 'AND p.tenant_id = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid)';
            n_child := n_child + 1;
        ELSE
            RAISE EXCEPTION 'B4-SIX 内部错误：未知 kind %', r.kind;
        END IF;

        EXECUTE format(
            'CREATE POLICY rls_tenant_isolation ON %I.%I FOR ALL TO PUBLIC '
            'USING (%s) WITH CHECK (%s)',
            r.s, r.t, qualsql, qualsql
        );
    END LOOP;

    IF n_tenant + n_system + n_child <> 28 THEN
        RAISE EXCEPTION 'B4-SIX 内部错误：重建表数 %，期望 28', n_tenant + n_system + n_child;
    END IF;

    RAISE NOTICE 'B4-SIX 已收敛 28 张表：租户通道 %、系统通道 %、子表父校验 %',
                 n_tenant, n_system, n_child;
END
$w7b4six_apply$;

-- ---------- 3. 形状自检 ----------
DO $w7b4six_verify$
DECLARE
    r record;
    bad int := 0;
    detail text;
    n_residual int;
    n_policies int;
BEGIN
    FOR r IN
        SELECT v.s, v.t, v.kind, v.parent_tbl,
               c.relrowsecurity, c.relforcerowsecurity,
               (SELECT count(*) FROM pg_policies p
                 WHERE p.schemaname = v.s AND p.tablename = v.t) AS pols,
               (SELECT p.policyname FROM pg_policies p
                 WHERE p.schemaname = v.s AND p.tablename = v.t LIMIT 1) AS polname,
               (SELECT p.qual FROM pg_policies p
                 WHERE p.schemaname = v.s AND p.tablename = v.t LIMIT 1) AS qual,
               (SELECT p.with_check FROM pg_policies p
                 WHERE p.schemaname = v.s AND p.tablename = v.t LIMIT 1) AS wc
          FROM (VALUES
            ('crm','audit_logs','system',NULL::text),
            ('erp','audit_logs','system',NULL),
            ('hrm','audit_logs','system',NULL),
            ('erp','customers','tenant',NULL),
            ('erp','financial_vouchers','tenant',NULL),
            ('erp','fixed_assets','tenant',NULL),
            ('erp','leave_requests','tenant',NULL),
            ('erp','opening_balances','tenant',NULL),
            ('erp','payables','tenant',NULL),
            ('erp','receivables','tenant',NULL),
            ('erp','sales_orders','tenant',NULL),
            ('erp','suppliers','tenant',NULL),
            ('mes','capacities','tenant',NULL),
            ('mes','demand_forecasts','tenant',NULL),
            ('mes','process_flow_steps','child','mes.process_flows'),
            ('mes','process_flows','tenant',NULL),
            ('mes','production_plans','tenant',NULL),
            ('mes','quality_inspections','tenant',NULL),
            ('mes','quality_patrol_items','child','mes.quality_patrols'),
            ('mes','quality_patrols','tenant',NULL),
            ('portal','portal_todos','tenant',NULL),
            ('ticket','core_ticket_activities','child','ticket.core_tickets'),
            ('ticket','core_ticket_comments','child','ticket.core_tickets'),
            ('ticket','core_ticket_sla_escalations','child','ticket.core_tickets'),
            ('ticket','core_ticket_sla_policies','tenant',NULL),
            ('ticket','core_tickets','tenant',NULL),
            ('ticket','ticket_automation_rules','tenant',NULL),
            ('ticket','ticket_knowledge_articles','tenant',NULL)
          ) AS v(s, t, kind, parent_tbl)
          JOIN pg_class c ON c.relname = v.t
          JOIN pg_namespace ns ON ns.oid = c.relnamespace AND ns.nspname = v.s
    LOOP
        detail := format('%s.%s rls=%s force=%s pols=%s name=%s',
                         r.s, r.t, r.relrowsecurity, r.relforcerowsecurity, r.pols, r.polname);

        IF NOT r.relrowsecurity OR NOT r.relforcerowsecurity
           OR r.pols <> 1 OR r.polname <> 'rls_tenant_isolation'
           OR r.qual IS NULL OR r.wc IS NULL OR r.qual <> r.wc THEN
            RAISE WARNING 'B4-SIX 校验异常: %', detail;
            bad := bad + 1;
            CONTINUE;
        END IF;

        IF r.qual NOT LIKE '%app.rls_system%' THEN
            RAISE WARNING 'B4-SIX 校验异常: % 缺系统通道', detail;
            bad := bad + 1;
            CONTINUE;
        END IF;

        -- fail-open 残留：IS NULL 放行、nil uuid 放行
        IF r.qual LIKE '%IS NULL%'
           OR r.qual LIKE '%00000000-0000-0000-0000-000000000000%' THEN
            RAISE WARNING 'B4-SIX 校验异常: % 仍含 fail-open 分支', detail;
            bad := bad + 1;
            CONTINUE;
        END IF;

        IF r.kind = 'system' THEN
            IF r.qual LIKE '%app.tenant_id%' THEN
                RAISE WARNING 'B4-SIX 校验异常: % 应仅系统通道', detail;
                bad := bad + 1;
            END IF;
        ELSIF r.kind = 'tenant' THEN
            IF r.qual NOT LIKE '%app.tenant_id%' THEN
                RAISE WARNING 'B4-SIX 校验异常: % 缺租户通道', detail;
                bad := bad + 1;
            END IF;
        ELSIF r.kind = 'child' THEN
            IF r.qual NOT LIKE '%EXISTS%' OR r.qual NOT LIKE '%' || r.parent_tbl || '%' THEN
                RAISE WARNING 'B4-SIX 校验异常: % 子表策略未走父单校验', detail;
                bad := bad + 1;
            END IF;
        END IF;
    END LOOP;

    -- 六 schema 残留 true/true 表必须恰为 23 张（全部是显式排除项）
    SELECT count(DISTINCT (p.schemaname, p.tablename)) INTO n_residual
      FROM pg_policies p
     WHERE p.schemaname IN ('erp','mes','ticket','portal','crm','hrm')
       AND p.qual = 'true' AND p.with_check = 'true';

    IF n_residual <> 23 THEN
        RAISE WARNING 'B4-SIX 校验异常: 六 schema 残留 true/true 表数 %，期望 23', n_residual;
        bad := bad + 1;
    END IF;

    SELECT count(*) INTO n_policies
      FROM pg_policies p
     WHERE p.schemaname IN ('erp','mes','ticket','portal','crm','hrm')
       AND p.qual = 'true' AND p.with_check = 'true';

    IF n_policies <> 23 THEN
        RAISE WARNING 'B4-SIX 校验异常: 六 schema 残留 true/true 策略数 %，期望 23', n_policies;
        bad := bad + 1;
    END IF;

    IF bad > 0 THEN
        RAISE EXCEPTION 'B4-SIX 校验失败：% 处异常（见上方 WARNING）', bad;
    END IF;

    RAISE NOTICE 'B4-SIX 形状自检通过：28 表各 1 条 rls_tenant_isolation；六 schema 残留 fail-open 表 23 张';
END
$w7b4six_verify$;

-- ---------- 4. NULL 行 / 子表孤儿自查（显式系统通道；非 0 即中止） ----------
DO $w7b4six_audit$
DECLARE
    r record;
    n bigint;
    bad_msg text := '';
    row_msg text := '';
    n_orphan bigint;
BEGIN
    -- FORCE RLS 之后属主也受策略约束；显式系统通道保证看到全量行。
    PERFORM set_config('app.rls_system', 'on', true);

    FOR r IN
        SELECT * FROM (VALUES
            ('crm','audit_logs'),('erp','audit_logs'),('hrm','audit_logs'),
            ('erp','customers'),('erp','financial_vouchers'),('erp','fixed_assets'),
            ('erp','leave_requests'),('erp','opening_balances'),('erp','payables'),
            ('erp','receivables'),('erp','sales_orders'),('erp','suppliers'),
            ('mes','capacities'),('mes','demand_forecasts'),('mes','process_flow_steps'),
            ('mes','process_flows'),('mes','production_plans'),('mes','quality_inspections'),
            ('mes','quality_patrol_items'),('mes','quality_patrols'),
            ('portal','portal_todos'),
            ('ticket','core_ticket_activities'),('ticket','core_ticket_comments'),
            ('ticket','core_ticket_sla_escalations'),('ticket','core_ticket_sla_policies'),
            ('ticket','core_tickets'),('ticket','ticket_automation_rules'),
            ('ticket','ticket_knowledge_articles')
        ) AS v(s, t)
        ORDER BY 1, 2
    LOOP
        EXECUTE format('SELECT count(*), count(*) FILTER (WHERE tenant_id IS NULL) FROM %I.%I',
                       r.s, r.t)
           INTO n, n_orphan;

        row_msg := row_msg || format('%s.%s=%s/null=%s; ', r.s, r.t, n, n_orphan);
        IF n_orphan <> 0 THEN
            bad_msg := bad_msg || format('%s.%s tenant_id IS NULL=%s; ', r.s, r.t, n_orphan);
        END IF;
    END LOOP;

    RAISE NOTICE 'B4-SIX 行数自查（系统通道）：%', row_msg;

    -- 子表：父行不存在或父租户不一致
    SELECT count(*) INTO n_orphan FROM mes.process_flow_steps c
     WHERE NOT EXISTS (SELECT 1 FROM mes.process_flows p
                        WHERE p.id = c.flow_id AND p.tenant_id = c.tenant_id);
    IF n_orphan <> 0 THEN
        bad_msg := bad_msg || format('mes.process_flow_steps 孤儿/父租户不一致=%s; ', n_orphan);
    END IF;

    SELECT count(*) INTO n_orphan FROM mes.quality_patrol_items c
     WHERE NOT EXISTS (SELECT 1 FROM mes.quality_patrols p
                        WHERE p.id = c.patrol_id AND p.tenant_id = c.tenant_id);
    IF n_orphan <> 0 THEN
        bad_msg := bad_msg || format('mes.quality_patrol_items 孤儿/父租户不一致=%s; ', n_orphan);
    END IF;

    SELECT count(*) INTO n_orphan FROM ticket.core_ticket_activities c
     WHERE NOT EXISTS (SELECT 1 FROM ticket.core_tickets p
                        WHERE p.id = c.ticket_id AND p.tenant_id = c.tenant_id);
    IF n_orphan <> 0 THEN
        bad_msg := bad_msg || format('ticket.core_ticket_activities 孤儿/父租户不一致=%s; ', n_orphan);
    END IF;

    SELECT count(*) INTO n_orphan FROM ticket.core_ticket_comments c
     WHERE NOT EXISTS (SELECT 1 FROM ticket.core_tickets p
                        WHERE p.id = c.ticket_id AND p.tenant_id = c.tenant_id);
    IF n_orphan <> 0 THEN
        bad_msg := bad_msg || format('ticket.core_ticket_comments 孤儿/父租户不一致=%s; ', n_orphan);
    END IF;

    SELECT count(*) INTO n_orphan FROM ticket.core_ticket_sla_escalations c
     WHERE NOT EXISTS (SELECT 1 FROM ticket.core_tickets p
                        WHERE p.id = c.ticket_id AND p.tenant_id = c.tenant_id);
    IF n_orphan <> 0 THEN
        bad_msg := bad_msg || format('ticket.core_ticket_sla_escalations 孤儿/父租户不一致=%s; ', n_orphan);
    END IF;

    IF bad_msg <> '' THEN
        RAISE EXCEPTION 'B4-SIX 数据自查失败（NULL 行不回填）：%', bad_msg;
    END IF;

    RAISE NOTICE 'B4-SIX 数据自查通过：28 表 tenant_id NULL=0；5 张子表孤儿/父租户不一致=0';
END
$w7b4six_audit$;
