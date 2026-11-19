-- Batch G-GUARD · 「有意策略」不变量守卫（纯断言，无 DDL）
--
-- 目的：把两类「有意为之、不做归一」的策略用断言钉住，避免以后有人按账面整齐去收紧：
--   1) public.core_login_logs：按 command 拆分的双策略 ——
--        rls_system_only (ALL)   系统通道全权
--        rls_tenant_read (SELECT) 租户只读
--      不变量：租户侧策略必须是 SELECT；一旦被改成 ALL 即报错（防只读被放大为可写）。
--   2) 共享审计表（bi/flow/gis/iam/qms.audit_logs 及 gis.audit_log）：有意 fail-open，
--      写入方仅来自共享审计服务的系统通道（lib/shared-db/src/audit.rs 按 {schema_prefix}.audit_logs
--      写入，代码注释「仅系统通道」）。不变量：策略保持 ALL + USING(true)；被收紧即报错，强制复核。
--
-- 本迁移只读 pg_catalog，不改变任何策略/数据。可反复执行。
-- 死表清单撞车（2026-11-19）：6 张审计表中 4 张已被同批死表清理 20261119100000/20261119110000 删除
--   （bi.audit_logs、gis.audit_logs、gis.audit_log、qms.audit_logs），链内先删表后本守卫。
-- 存在性守卫：命中 v_dropped → NOTICE 跳过并累计；缺失但不在名单 → RAISE EXCEPTION（清单变更须立刻暴露）；
--   表存在 → 原有 fail-open 断言严格度不变。
-- 回滚：database/rollback/20261119141000_rls_intentional_policies_guard.rollback.sql（空操作）

DO $$
DECLARE
    v_cnt int;
    v_tenant_cmd text;
    v_sys_cmd text;
    v_rls boolean;
BEGIN
    IF to_regclass('public.core_login_logs') IS NULL THEN
        RAISE EXCEPTION '守卫失败：public.core_login_logs 不存在';
    END IF;

    SELECT count(*) INTO v_cnt FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'core_login_logs';
    IF v_cnt <> 2 THEN
        RAISE EXCEPTION '守卫失败：public.core_login_logs 应为「有意双策略」2 条，实际 % 条（若确需变更，请先修订本守卫与文档）', v_cnt;
    END IF;

    SELECT cmd INTO v_sys_cmd FROM pg_policies
     WHERE schemaname='public' AND tablename='core_login_logs' AND policyname='rls_system_only';
    IF v_sys_cmd IS DISTINCT FROM 'ALL' THEN
        RAISE EXCEPTION '守卫失败：core_login_logs 系统通道策略 rls_system_only 应为 ALL，实际 %', coalesce(v_sys_cmd,'缺失');
    END IF;

    SELECT cmd INTO v_tenant_cmd FROM pg_policies
     WHERE schemaname='public' AND tablename='core_login_logs' AND policyname='rls_tenant_read';
    IF v_tenant_cmd IS DISTINCT FROM 'SELECT' THEN
        RAISE EXCEPTION '守卫失败：租户策略 rls_tenant_read 必须保持 SELECT 只读，实际 %；禁止放大为 ALL/写权限', coalesce(v_tenant_cmd,'缺失');
    END IF;

    SELECT relrowsecurity INTO v_rls FROM pg_class WHERE oid='public.core_login_logs'::regclass;
    IF NOT v_rls THEN
        RAISE EXCEPTION '守卫失败：public.core_login_logs 未开启 RLS';
    END IF;

    RAISE NOTICE '守卫通过：public.core_login_logs 双策略（rls_system_only=ALL / rls_tenant_read=SELECT）';
END $$;

DO $$
DECLARE
    v_items text[] := ARRAY[
        'bi.audit_logs|bi_allow_all_audit_logs',
        'flow.audit_logs|flow_allow_all_audit_logs',
        'gis.audit_logs|gis_allow_all_audit_logs',
        'gis.audit_log|gis_allow_all_audit_log',
        'iam.audit_logs|iam_allow_all_audit_logs',
        'qms.audit_logs|qms_allow_all_audit_logs'
    ];
    v_item text;
    v_schema text;
    v_table text;
    v_policy text;
    v_cmd text;
    v_qual text;
    v_rls boolean;
    v_skip int := 0;
    v_total int := 6;
    v_dropped text[] := ARRAY[
        'bi.audit_logs',
        'gis.audit_logs',
        'gis.audit_log',
        'qms.audit_logs'
    ];
BEGIN
    FOREACH v_item IN ARRAY v_items LOOP
        v_schema := split_part(v_item, '.', 1);
        v_table  := split_part(split_part(v_item, '.', 2), '|', 1);
        v_policy := split_part(v_item, '|', 2);

        IF to_regclass(format('%I.%I', v_schema, v_table)) IS NULL THEN
            IF (v_schema || '.' || v_table) = ANY(v_dropped) THEN
                v_skip := v_skip + 1;
                RAISE NOTICE '守卫跳过：%.% 已被前序死表迁移删除（累计 %/% 张）', v_schema, v_table, v_skip, v_total;
                CONTINUE;
            END IF;
            RAISE EXCEPTION '守卫失败：审计表 %.% 不存在，且不在已知死表删除名单（4 张）内；若刚调整 20261119100000/20261119110000 的死表清单，请同步本守卫', v_schema, v_table;
        END IF;

        SELECT cmd, qual INTO v_cmd, v_qual FROM pg_policies
         WHERE schemaname=v_schema AND tablename=v_table AND policyname=v_policy;
        IF v_cmd IS NULL THEN
            RAISE EXCEPTION '守卫失败：%.% 的有意放行策略 % 缺失', v_schema, v_table, v_policy;
        END IF;
        IF v_cmd <> 'ALL' OR v_qual IS DISTINCT FROM 'true' THEN
            RAISE EXCEPTION '守卫失败：%.% 的 % 应为有意 fail-open（ALL/USING(true)），实际 cmd=%, qual=%；若确需收紧请先修订守卫与文档', v_schema, v_table, v_policy, v_cmd, coalesce(v_qual,'null');
        END IF;

        SELECT relrowsecurity INTO v_rls FROM pg_class WHERE oid=format('%I.%I', v_schema, v_table)::regclass;
        IF NOT v_rls THEN
            RAISE EXCEPTION '守卫失败：%.% 未开启 RLS', v_schema, v_table;
        END IF;
    END LOOP;

    RAISE NOTICE '守卫通过：6 张审计表中存在 % 张、跳过 % 张（已删除），保持有意 fail-open（ALL/USING(true)），写入方仅系统通道', v_total - v_skip, v_skip;
END $$;
