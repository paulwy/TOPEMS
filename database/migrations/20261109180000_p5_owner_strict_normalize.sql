-- P5 owner 归一口径收紧（前向补丁，不改已推送迁移）
--
-- 口径（2026-11-09 用户裁决 4）：
--   生产环境（current_database() = 'topems_prod'）必须归一到 topems_prod；
--   取不到该角色直接 RAISE EXCEPTION 中止，不允许静默降级 topems_app。
--   降级 topems_app 仅允许非生产环境。
--
-- 覆盖 20261109160000/160100/160200 新建与改名的对象：
--   六张 finance `_v52` 表、finance.cqrs_snapshots、bi.org_stats（物化视图）。

DO $$
DECLARE
    svc_role text;
    r RECORD;
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'topems_prod') THEN
        svc_role := 'topems_prod';
    ELSIF current_database() = 'topems_prod' THEN
        RAISE EXCEPTION '生产库 % 缺少服务运行角色 topems_prod，拒绝降级为 topems_app', current_database();
    ELSIF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'topems_app') THEN
        svc_role := 'topems_app';
    ELSE
        RAISE NOTICE '非生产库 %：未找到服务运行角色（topems_prod/topems_app），跳过 owner/GRANT', current_database();
        RETURN;
    END IF;

    FOR r IN
        SELECT * FROM (VALUES
            ('finance', 'finance_alert_configs_v52'),
            ('finance', 'finance_alert_history_v52'),
            ('finance', 'finance_anomaly_alerts_v52'),
            ('finance', 'finance_audit_findings_v52'),
            ('finance', 'finance_detection_configs_v52'),
            ('finance', 'finance_audit_rules_v52'),
            ('finance', 'cqrs_snapshots')
        ) AS v(sch, tbl)
    LOOP
        IF to_regclass(format('%I.%I', r.sch, r.tbl)) IS NULL THEN
            RAISE NOTICE 'P5 owner: %.% 不存在，跳过', r.sch, r.tbl;
            CONTINUE;
        END IF;

        EXECUTE format('ALTER TABLE %I.%I OWNER TO %I', r.sch, r.tbl, svc_role);
        EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %I.%I TO %I', r.sch, r.tbl, svc_role);
        RAISE NOTICE 'P5 owner: %.% -> %', r.sch, r.tbl, svc_role;
    END LOOP;

    IF to_regclass('bi.org_stats') IS NOT NULL THEN
        IF NOT (has_table_privilege(svc_role, 'hrm.companies', 'SELECT')
                AND has_table_privilege(svc_role, 'hrm.departments', 'SELECT')
                AND has_table_privilege(svc_role, 'hrm.employees', 'SELECT')) THEN
            IF current_database() = 'topems_prod' THEN
                RAISE EXCEPTION '生产库角色 % 对 hrm 基表无 SELECT，无法刷新 bi.org_stats；请补齐权限后重试', svc_role;
            END IF;
            RAISE NOTICE '非生产库：角色 % 对 hrm 基表无 SELECT，保留 bi.org_stats 当前 owner', svc_role;
        ELSE
            EXECUTE format('ALTER MATERIALIZED VIEW bi.org_stats OWNER TO %I', svc_role);
            RAISE NOTICE 'P5 owner: bi.org_stats -> %', svc_role;
        END IF;
        EXECUTE format('GRANT SELECT ON bi.org_stats TO %I', svc_role);
    ELSE
        RAISE NOTICE 'P5 owner: bi.org_stats 不存在，跳过';
    END IF;
END $$;
