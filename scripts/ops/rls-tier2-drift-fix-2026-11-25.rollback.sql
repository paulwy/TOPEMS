-- ============================================================
-- 档 2 · 五条漂移策略订正补丁 · 回滚脚本（窗口内急停用）
--
-- 批次：tier2-drift-fix-20261125
-- 对应：scripts/ops/rls-tier2-drift-fix-2026-11-25.sql
-- 依据：archive._rls_policy_snapshot 中本批次快照（补丁步 3 写入）
--
-- 用法：psql -v ON_ERROR_STOP=1 -d topems_prod -f scripts/ops/rls-tier2-drift-fix-2026-11-25.rollback.sql
--       （本文件不含 BEGIN/COMMIT；由执行方按窗口事务口径包裹）
--
-- 回滚动作：DROP 补丁重建的基准策略 → 按快照逐条恢复补丁前的原策略
--           （含原 cmd / 角色 / USING / WITH CHECK）。不删快照行，便于复核。
-- 前置：补丁已执行且快照表存在；若快照缺失，回滚中止，不得凭记忆重建 allow-all。
-- ============================================================

\pset pager off

DO $rollback$
DECLARE
    s record;
    v_count int;
    v_perm text;
    v_cmd text;
    v_roles text;
    v_using text;
    v_check text;
    v_sql text;
BEGIN
    SELECT count(*) INTO v_count
      FROM archive._rls_policy_snapshot
     WHERE migration_version = 'tier2-drift-fix-20261125';
    IF v_count = 0 THEN
        RAISE EXCEPTION '回滚中止：快照表无本批次记录（migration_version=tier2-drift-fix-20261125），不得凭记忆重建原策略';
    END IF;

    -- 1. DROP 补丁在五表上新建的基准策略（幂等：仅删当前存在的同名基准策略）
    FOR s IN SELECT DISTINCT schema_name, table_name FROM archive._rls_policy_snapshot
              WHERE migration_version = 'tier2-drift-fix-20261125'
    LOOP
        EXECUTE format(
            'DROP POLICY IF EXISTS rls_system_only ON %I.%I', s.schema_name, s.table_name);
        EXECUTE format(
            'DROP POLICY IF EXISTS rls_global_read ON %I.%I', s.schema_name, s.table_name);
        EXECUTE format(
            'DROP POLICY IF EXISTS rls_system_write ON %I.%I', s.schema_name, s.table_name);
        EXECUTE format(
            'DROP POLICY IF EXISTS rls_tenant_isolation ON %I.%I', s.schema_name, s.table_name);
    END LOOP;

    -- 2. 按快照逐条恢复补丁前原策略
    FOR s IN SELECT * FROM archive._rls_policy_snapshot
              WHERE migration_version = 'tier2-drift-fix-20261125'
    LOOP
        v_perm  := CASE WHEN s.permissive = 'RESTRICTIVE' THEN 'RESTRICTIVE' ELSE 'PERMISSIVE' END;
        v_cmd   := CASE s.cmd WHEN 'SELECT' THEN 'SELECT' WHEN 'INSERT' THEN 'INSERT'
                              WHEN 'UPDATE' THEN 'UPDATE' WHEN 'DELETE' THEN 'DELETE' ELSE 'ALL' END;
        v_roles := CASE WHEN s.roles = ARRAY['PUBLIC'] THEN 'PUBLIC'
                        ELSE array_to_string(s.roles, ', ') END;
        v_using := s.qual;
        v_check := s.with_check;

        v_sql := format('CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s',
            s.polname, s.schema_name, s.table_name, v_perm, v_cmd, v_roles);
        IF v_using IS NOT NULL THEN
            v_sql := v_sql || format(' USING (%s)', v_using);
        END IF;
        IF v_check IS NOT NULL THEN
            v_sql := v_sql || format(' WITH CHECK (%s)', v_check);
        END IF;

        EXECUTE v_sql;
        RAISE NOTICE '已恢复策略 %.%.%（% / %）', s.schema_name, s.table_name, s.polname, v_cmd, v_perm;
    END LOOP;

    RAISE NOTICE '档 2 订正补丁已回滚：五表策略恢复为补丁前快照';
END
$rollback$;
