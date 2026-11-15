-- 回滚入口（B 类 5/7）· 对应 database/migrations/20261115141600_b_class_monitor_alerts_3cols.sql
-- 口径：仅本次新增才删；逐列判断，列内一旦出现非空数据即保留并 RAISE NOTICE。
-- 本迁移未建索引/约束/策略，回滚只涉及列本身；不涉及 pg_policies。

-- 1. public.alerts.tenant_id
-- destructive-gate: allow
-- destructive-kind: DROP COLUMN
-- destructive-reason: 回滚 B 类补列；仅当列内无任何非空 tenant_id 时删列，有数据则保留并 RAISE NOTICE
-- destructive-owner: platform-db
-- destructive-ticket: B-CLASS-20261115
-- destructive-expires: 2027-03-31
-- destructive-rows-at-review: 0
-- destructive-backup: database/rollback/20261115141600_b_class_monitor_alerts_3cols.rollback.sql
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.alerts WHERE tenant_id IS NOT NULL) THEN
        ALTER TABLE public.alerts DROP COLUMN IF EXISTS tenant_id;
    ELSE
        RAISE NOTICE 'public.alerts.tenant_id 存在非空值，保留列';
    END IF;
END $$;

-- 2. public.alerts.severity
-- destructive-gate: allow
-- destructive-kind: DROP COLUMN
-- destructive-reason: 回滚 B 类补列；仅当列内无任何非空 severity 时删列，有数据则保留并 RAISE NOTICE
-- destructive-owner: platform-db
-- destructive-ticket: B-CLASS-20261115
-- destructive-expires: 2027-03-31
-- destructive-rows-at-review: 0
-- destructive-backup: database/rollback/20261115141600_b_class_monitor_alerts_3cols.rollback.sql
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.alerts WHERE severity IS NOT NULL) THEN
        ALTER TABLE public.alerts DROP COLUMN IF EXISTS severity;
    ELSE
        RAISE NOTICE 'public.alerts.severity 存在非空值，保留列';
    END IF;
END $$;

-- 3. public.alerts.status
--    status 带 DEFAULT 'active'：新增后的行即使未显式赋值也是 'active'（非 NULL），
--    因此有数据时本块会保留该列，这是有意的数据保护。
-- destructive-gate: allow
-- destructive-kind: DROP COLUMN
-- destructive-reason: 回滚 B 类补列；仅当列内无任何非空 status 时删列，有数据则保留并 RAISE NOTICE
-- destructive-owner: platform-db
-- destructive-ticket: B-CLASS-20261115
-- destructive-expires: 2027-03-31
-- destructive-rows-at-review: 0
-- destructive-backup: database/rollback/20261115141600_b_class_monitor_alerts_3cols.rollback.sql
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.alerts WHERE status IS NOT NULL) THEN
        ALTER TABLE public.alerts DROP COLUMN IF EXISTS status;
    ELSE
        RAISE NOTICE 'public.alerts.status 存在非空值，保留列';
    END IF;
END $$;
