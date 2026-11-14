-- ============================================================
-- 回滚：20261114120000_w7_b4_six_schema_rls_fail_closed_forward.sql
--
-- 口径：按 2026-11-14 生产只读快照（topems_prod，账本 668 行 /
--       max 20261113100000）逐表重建本批 28 张表的 29 条原策略，
--       不提供 DISABLE ROW LEVEL SECURITY 路径。
--
--   1. 先 DROP 28 张表上的全部当前策略（含 rls_tenant_isolation）；
--   2. 每张表重建 1 条 <schema>_allow_all_<table>（PERMISSIVE / ALL / PUBLIC，
--      USING true / WITH CHECK true）——与变更前完全一致；
--   3. mes.process_flow_steps 额外重建变更前已存在的 1 条
--      rls_tenant_isolation（fail-open 表达式原样恢复），共 29 条；
--   4. RLS 状态保持 ENABLE + FORCE（变更前即为 ENABLE + FORCE）。
--
-- 用于生产急停：
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
--     -f database/rollback/20261114120000_w7_b4_six_schema_rls_fail_closed_forward.rollback.sql
--
-- 注意：本脚本恢复的是 fail-open 策略，只用于回滚本批；执行后应重新安排收敛窗口。
-- ============================================================

SET lock_timeout = '5s';
SET statement_timeout = '120s';

DO $w7b4six_rb$
DECLARE
    r record;
    pol record;
    n int := 0;
    fail_open_qual constant text :=
        '(current_setting(''app.tenant_id''::text, true) IS NULL) '
        'OR (current_setting(''app.tenant_id''::text, true) = ''''::text) '
        'OR (current_setting(''app.tenant_id''::text, true) = ''00000000-0000-0000-0000-000000000000''::text) '
        'OR (tenant_id IS NULL) '
        'OR (tenant_id = (NULLIF(current_setting(''app.tenant_id''::text, true), ''''::text))::uuid)';
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
            ('crm','audit_logs'),
            ('erp','audit_logs'),
            ('hrm','audit_logs'),
            ('erp','customers'),
            ('erp','financial_vouchers'),
            ('erp','fixed_assets'),
            ('erp','leave_requests'),
            ('erp','opening_balances'),
            ('erp','payables'),
            ('erp','receivables'),
            ('erp','sales_orders'),
            ('erp','suppliers'),
            ('mes','capacities'),
            ('mes','demand_forecasts'),
            ('mes','process_flow_steps'),
            ('mes','process_flows'),
            ('mes','production_plans'),
            ('mes','quality_inspections'),
            ('mes','quality_patrol_items'),
            ('mes','quality_patrols'),
            ('portal','portal_todos'),
            ('ticket','core_ticket_activities'),
            ('ticket','core_ticket_comments'),
            ('ticket','core_ticket_sla_escalations'),
            ('ticket','core_ticket_sla_policies'),
            ('ticket','core_tickets'),
            ('ticket','ticket_automation_rules'),
            ('ticket','ticket_knowledge_articles')
        ) AS v(s, t)
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
        EXECUTE format(
            'CREATE POLICY %I ON %I.%I FOR ALL TO PUBLIC USING (true) WITH CHECK (true)',
            r.s || '_allow_all_' || r.t, r.s, r.t
        );
        n := n + 1;
    END LOOP;

    -- process_flow_steps 变更前另有 1 条 fail-open 策略（共 29 条）。
    -- 原策略只写了 USING、未写 WITH CHECK（pg_policies.with_check 为 NULL，
    -- PostgreSQL 对 ALL 策略默认沿用 USING），此处按原样恢复，保证回滚后逐字节一致。
    EXECUTE format(
        'CREATE POLICY rls_tenant_isolation ON mes.process_flow_steps FOR ALL TO PUBLIC '
        'USING (%s)',
        fail_open_qual
    );
    n := n + 1;

    IF n <> 29 THEN
        RAISE EXCEPTION 'B4-SIX 回滚内部错误：恢复策略数 %，期望 29', n;
    END IF;

    RAISE NOTICE 'B4-SIX 回滚完成：28 张表 / % 条原策略（mes.process_flow_steps 含旧 fail-open 策略）', n;
END
$w7b4six_rb$;

-- 回滚形状自检
DO $w7b4six_rb_verify$
DECLARE
    n_pol int;
    n_tbl int;
BEGIN
    SELECT count(*) INTO n_pol
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

    SELECT count(DISTINCT (p.schemaname, p.tablename)) INTO n_tbl
      FROM pg_policies p
     WHERE p.schemaname IN ('erp','mes','ticket','portal','crm','hrm')
       AND p.qual = 'true' AND p.with_check = 'true';

    IF n_pol <> 29 THEN
        RAISE EXCEPTION 'B4-SIX 回滚校验失败：28 表策略数 %，期望 29', n_pol;
    END IF;

    IF n_tbl <> 51 THEN
        RAISE EXCEPTION 'B4-SIX 回滚校验失败：六 schema true/true 表数 %，期望 51', n_tbl;
    END IF;

    RAISE NOTICE 'B4-SIX 回滚校验通过：28 表 29 条原策略；六 schema true/true 表 51 张';
END
$w7b4six_rb_verify$;
