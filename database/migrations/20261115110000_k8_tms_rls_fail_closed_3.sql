-- K8 第一批：tms 3 张表由 fail-open 收紧为 fail-closed
--
-- 目标谓词（USING 与 WITH CHECK 相同，与 20261114200000（22 张 mes）/ 20261114202000（8 张
-- erp/crm/portal）同形）：
--   COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
--   OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
--
-- 现状（prod 只读实测 2026-11-15）：3 张表各 1 条 rls_tenant_isolation（PERMISSIVE/ALL），
-- 谓词含 current_setting(...) IS NULL / = '' / nil UUID / tenant_id IS NULL 四处放行分支，
-- 无租户 GUC 的裸连接可读全表（K8）。3 表 prod 均 0 行、0 行 tenant_id IS NULL。
--
-- 同批附带（0 行表，瞬时）：
--   * tenant_id SET NOT NULL —— 把「无租户写入后静默不可见」提前为写入即失败；
--   * 补租户索引 idx_<表>_tenant。
--
-- 投递门：本迁移只动 tms 三张基础档案，TMS 全部读写路径经请求级 RLS 事务（Db::scope_with /
-- txn_arc），无裸池依赖，可与 crm/erp 的代码修复解耦，独立投递。
-- 回滚见 database/rollback/20261115110000_k8_tms_rls_fail_closed_3.rollback.sql：
-- 恢复 prod 快照策略原文、tenant_id 可空性并删除本迁移新增的索引。
-- 回退顺序：先回策略，再回二进制（详见 rollback 文件头）。

-- 1. 前置断言：表存在、RLS/FORCE 均为 true、无 NULL 租户行、每表恰好 1 条现有策略
DO $$
DECLARE
    t text;
    n_null bigint;
    n_pol int;
    rls boolean;
    frls boolean;
BEGIN
    FOREACH t IN ARRAY ARRAY['tms.tms_carriers', 'tms.tms_drivers', 'tms.tms_vehicles'] LOOP
        SELECT c.relrowsecurity, c.relforcerowsecurity
          INTO rls, frls
          FROM pg_class c
         WHERE c.oid = to_regclass(t);

        IF rls IS NULL THEN
            RAISE EXCEPTION 'K8 前置断言失败：表不存在 %', t;
        END IF;
        IF NOT rls OR NOT frls THEN
            RAISE EXCEPTION 'K8 前置断言失败：% 的 rls/force_rls = %/%（期望 true/true）', t, rls, frls;
        END IF;

        EXECUTE format('SELECT count(*) FROM %s WHERE tenant_id IS NULL', t) INTO n_null;
        IF n_null <> 0 THEN
            RAISE EXCEPTION 'K8 前置断言失败：% 存量 tenant_id IS NULL = % 行，拒绝收紧与 SET NOT NULL', t, n_null;
        END IF;

        SELECT count(*) INTO n_pol
          FROM pg_policies
         WHERE schemaname = split_part(t, '.', 1)
           AND tablename  = split_part(t, '.', 2);
        IF n_pol <> 1 THEN
            RAISE EXCEPTION 'K8 前置断言失败：% 现有策略 % 条（期望 1 条 rls_tenant_isolation）', t, n_pol;
        END IF;
    END LOOP;
END $$;

-- 2. 逐表换策略并收紧

-- 2.1 tms.tms_carriers
DROP POLICY IF EXISTS rls_tenant_isolation ON tms.tms_carriers;
DROP POLICY IF EXISTS tenant_isolation_tms_carriers ON tms.tms_carriers;
CREATE POLICY rls_tenant_isolation ON tms.tms_carriers
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    )
    WITH CHECK (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    );
ALTER TABLE tms.tms_carriers ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tms_carriers_tenant ON tms.tms_carriers (tenant_id);

-- 2.2 tms.tms_drivers
DROP POLICY IF EXISTS rls_tenant_isolation ON tms.tms_drivers;
DROP POLICY IF EXISTS tenant_isolation_tms_drivers ON tms.tms_drivers;
CREATE POLICY rls_tenant_isolation ON tms.tms_drivers
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    )
    WITH CHECK (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    );
ALTER TABLE tms.tms_drivers ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tms_drivers_tenant ON tms.tms_drivers (tenant_id);

-- 2.3 tms.tms_vehicles
DROP POLICY IF EXISTS rls_tenant_isolation ON tms.tms_vehicles;
DROP POLICY IF EXISTS tenant_isolation_tms_vehicles ON tms.tms_vehicles;
CREATE POLICY rls_tenant_isolation ON tms.tms_vehicles
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    )
    WITH CHECK (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    );
ALTER TABLE tms.tms_vehicles ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tms_vehicles_tenant ON tms.tms_vehicles (tenant_id);

-- 3. 后置断言：每表恰好 1 条 rls_tenant_isolation，谓词含 app.rls_system 且无 IS NULL 放行分支；
--    tenant_id NOT NULL；rls/force_rls 仍为 true
DO $$
DECLARE
    t text;
    n_pol int;
    bad_shape int;
    is_notnull boolean;
    rls boolean;
    frls boolean;
BEGIN
    FOREACH t IN ARRAY ARRAY['tms.tms_carriers', 'tms.tms_drivers', 'tms.tms_vehicles'] LOOP
        SELECT count(*),
               count(*) FILTER (
                   WHERE policyname <> 'rls_tenant_isolation'
                      OR qual NOT LIKE '%app.rls_system%'
                      OR qual LIKE '%IS NULL%'
                      OR coalesce(with_check, '') NOT LIKE '%app.rls_system%'
               )
          INTO n_pol, bad_shape
          FROM pg_policies
         WHERE schemaname = split_part(t, '.', 1)
           AND tablename  = split_part(t, '.', 2);

        IF n_pol <> 1 OR bad_shape <> 0 THEN
            RAISE EXCEPTION 'K8 后置断言失败：% 策略 % 条、形状不符 % 条', t, n_pol, bad_shape;
        END IF;

        SELECT a.attnotnull, c.relrowsecurity, c.relforcerowsecurity
          INTO is_notnull, rls, frls
          FROM pg_class c
          JOIN pg_attribute a ON a.attrelid = c.oid AND a.attname = 'tenant_id' AND NOT a.attisdropped
         WHERE c.oid = to_regclass(t);

        IF NOT is_notnull THEN
            RAISE EXCEPTION 'K8 后置断言失败：% tenant_id 仍可空', t;
        END IF;
        IF NOT rls OR NOT frls THEN
            RAISE EXCEPTION 'K8 后置断言失败：% rls/force_rls = %/%', t, rls, frls;
        END IF;

        IF to_regclass(split_part(t, '.', 1) || '.idx_' || split_part(t, '.', 2) || '_tenant') IS NULL THEN
            RAISE EXCEPTION 'K8 后置断言失败：% 缺少租户索引', t;
        END IF;
    END LOOP;
END $$;
