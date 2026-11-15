-- B 类列补齐（5/7）· monitor · public.alerts（1 表 3 列）
--
-- 口径：B 类 = prod 缺列、且 HEAD 代码已真实读/写该列（docs/database/column-drift-attribution-2026-11-15.md §4.2.2）。
--   本迁移只做 ADD COLUMN，不建索引、不建约束、不改策略、不含 BEGIN/COMMIT。
--
-- 目标定义（以 dev 现有定义为唯一依据）：
--   public.alerts.tenant_id  uuid          NOT NULL  （无默认值）
--   public.alerts.severity   varchar(20)   NOT NULL  （无默认值）
--   public.alerts.status     varchar(20)   NULL      DEFAULT 'active'
--
-- 证据（取证门已回读，行号直接引用）：
--   读：svc/monitor/src/modules/monitor/metrics.rs:474-478
--       SELECT COUNT(*) FILTER (WHERE status='active') AS active,
--              COUNT(*) FILTER (WHERE status='active' AND severity='critical') AS critical,
--              COUNT(*) FILTER (WHERE status='active' AND severity='warning')  AS warning
--         FROM public.alerts WHERE deleted_at IS NULL AND (tenant_id IS NULL OR tenant_id = $1)
--
--   prod 缺列时的失败方式：该聚合在 parse/analyze 阶段报 SQLSTATE 42703 undefined_column
--   （column "status"/"severity"/"tenant_id" does not exist），监控概览的告警计数整块 500；
--   稳定报错，不是"计数为 0"。
--
-- 前置断言：表存在；3 列均不存在；表 0 行（tenant_id/severity 在 dev 为 NOT NULL 且无默认值，
--   非 0 行则拒绝直接加；status 带 DEFAULT 'active'，即使有行也可安全加）。
-- 同名对象冲突：本迁移不创建索引；dev 侧 idx_alerts_severity / idx_alerts_status /
--   idx_alerts_tenant_id 不随本次创建；prod 既有 pkey 不引用这 3 列（列不存在，必然不引用）。
-- 后置断言：3 列形状与 dev 定义逐项一致（含 varchar 长度与 status 的默认值）。
--
-- RLS 副作用核查（prod 实测）：public.alerts 为 relrowsecurity=true / relforcerowsecurity=true，
--   策略 public_allow_all_alerts 谓词为 USING (true)（PERMISSIVE ALL，WITH CHECK 继承 true）。
--   补列不改变谓词：补列前后可见行集合与写入许可均不变，无新增过滤/拒绝。与 dev 的
--   rls_tenant_isolation 差异属后续收紧批次，本迁移不涉及；补列也不会让 prod 的 allow-all
--   变得"更宽松"或"更严格"。
--
-- 残余缺列（不在本批，按 §4.2.3 另行处置）：prod 的 public.alerts 还缺 resolved_at / created_at /
--   acknowledged_at / message / acknowledged_by / title / service_name（7 列，代码无引用）。
--   上面 :474-478 的查询只用到 status / severity / tenant_id / deleted_at，故本迁移后该读路径
--   在列层面即齐备。
--
-- 回滚：database/rollback/20261115141600_b_class_monitor_alerts_3cols.rollback.sql
--   （逐列：仅当列内无任何非空值才删列，有数据则保留并 RAISE NOTICE）。

-- 1. 前置断言
DO $$
DECLARE
    n_rows bigint;
BEGIN
    IF to_regclass('public.alerts') IS NULL THEN
        RAISE EXCEPTION 'B 类前置断言失败：表 public.alerts 不存在';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'alerts'
           AND column_name IN ('tenant_id', 'severity', 'status')
    ) THEN
        RAISE EXCEPTION 'B 类前置断言失败：public.alerts 的 tenant_id/severity/status 已有存在项，本迁移只补缺失列';
    END IF;

    EXECUTE 'SELECT count(*) FROM public.alerts' INTO n_rows;
    IF n_rows <> 0 THEN
        RAISE EXCEPTION 'B 类前置断言失败：public.alerts 有 % 行，tenant_id/severity 在 dev 为 NOT NULL 且无默认值，禁止直接加', n_rows;
    END IF;
END $$;

-- 2. 补列
ALTER TABLE public.alerts
    ADD COLUMN IF NOT EXISTS tenant_id uuid         NOT NULL,
    ADD COLUMN IF NOT EXISTS severity  varchar(20)  NOT NULL,
    ADD COLUMN IF NOT EXISTS status    varchar(20)  DEFAULT 'active';

-- 3. 后置断言：形状与 dev 定义逐项对齐
DO $$
DECLARE
    r record;
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
            ('tenant_id', 'uuid',              NULL::int, 'NO',  NULL::text),
            ('severity',  'character varying', 20,        'NO',  NULL),
            ('status',    'character varying', 20,        'YES', 'active')
        ) AS v(col, typ, maxlen, nullable, dflt)
    LOOP
        PERFORM 1
           FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'alerts'
            AND column_name = r.col
            AND data_type = r.typ
            AND is_nullable = r.nullable
            AND character_maximum_length IS NOT DISTINCT FROM r.maxlen
            AND (
                 (r.dflt IS NULL AND column_default IS NULL)
                 OR (r.dflt IS NOT NULL AND column_default LIKE '''' || r.dflt || '''%')
            );
        IF NOT FOUND THEN
            RAISE EXCEPTION 'B 类后置断言失败：public.alerts.% 形状与目标定义不一致', r.col;
        END IF;
    END LOOP;
END $$;
