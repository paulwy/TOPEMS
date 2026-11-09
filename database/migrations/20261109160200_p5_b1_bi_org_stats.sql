-- P5 B1：bi.org_stats 物化视图（生产缺失，代码静默降级成 0）
--
-- 依据：svc/analytics/src/routes.rs:930、svc/analytics/src/main.rs:316
--       读取 companies / departments / employees / refreshed_at。
-- 生产现状：bi schema 无该对象（仅本地 init/11_bi_org_stats.sql 建过，未进迁移）。
-- 语义：全租户合计，排除软删；物化快照需刷新。
-- 刷新：REFRESH MATERIALIZED VIEW bi.org_stats;（本迁移末尾执行一次初刷）
-- 幂等：CREATE MATERIALIZED VIEW/INDEX IF NOT EXISTS + 末尾 REFRESH。
-- 回滚：DROP MATERIALIZED VIEW IF EXISTS bi.org_stats;

CREATE MATERIALIZED VIEW IF NOT EXISTS bi.org_stats AS
SELECT
  (SELECT COUNT(*) FROM hrm.companies WHERE deleted_at IS NULL)      AS companies,
  (SELECT COUNT(*) FROM hrm.departments WHERE deleted_at IS NULL)   AS departments,
  (SELECT COUNT(*) FROM hrm.employees WHERE deleted_at IS NULL)     AS employees,
  NOW() AS refreshed_at;

-- 单行快照；唯一索引为将来 REFRESH ... CONCURRENTLY 留出入口。
CREATE UNIQUE INDEX IF NOT EXISTS uq_bi_org_stats_refreshed_at
    ON bi.org_stats (refreshed_at);

-- 先以创建者身份完成初刷，再谈 owner（刷新要求 owner 对 hrm 基表有 SELECT）。
REFRESH MATERIALIZED VIEW bi.org_stats;

DO $$
DECLARE
    svc_role text;
BEGIN
    IF to_regclass('bi.org_stats') IS NULL THEN
        RAISE NOTICE 'P5 B1：bi.org_stats 不存在，跳过 owner/GRANT';
        RETURN;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'topems_prod') THEN
        svc_role := 'topems_prod';
    ELSIF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'topems_app') THEN
        svc_role := 'topems_app';
    ELSE
        RAISE NOTICE 'P5 B1：未找到服务运行角色（topems_prod/topems_app），跳过 owner/GRANT';
        RETURN;
    END IF;

    -- 归一到服务角色，但前提是该角色能刷新物化视图（对 hrm 基表有 SELECT），
    -- 否则保留当前 owner，只做只读授权，避免把刷新能力交给无权限角色。
    IF has_table_privilege(svc_role, 'hrm.companies', 'SELECT')
       AND has_table_privilege(svc_role, 'hrm.departments', 'SELECT')
       AND has_table_privilege(svc_role, 'hrm.employees', 'SELECT') THEN
        EXECUTE format('ALTER MATERIALIZED VIEW bi.org_stats OWNER TO %I', svc_role);
    ELSE
        RAISE NOTICE 'P5 B1：角色 % 对 hrm 基表无 SELECT，保留 bi.org_stats 当前 owner（仅授权读）', svc_role;
    END IF;

    EXECUTE format('GRANT SELECT ON bi.org_stats TO %I', svc_role);
    IF svc_role <> 'topems_app'
       AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'topems_app') THEN
        GRANT SELECT ON bi.org_stats TO topems_app;
    END IF;
END $$;
