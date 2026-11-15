-- 空壳表整表对齐（1/6）· portal · portal.portal_quick_actions（补 11 列 + 3 索引）
--
-- 口径：docs/database/code-schema-gap-2026-11-15.md §7.2 第 6 条、§7.3 索引表。
--   prod 现状 2 列（id、deleted_at）/ 0 行；dev 13 列。本迁移补齐 dev 独有 11 列，
--   使 prod 列集与 dev 一致，并补 3 只 dev 侧索引。
--
-- 边界（本批只做止血，不做治理）：
--   * 只 ADD COLUMN + CREATE INDEX；
--   * 不改任何已有列类型（类型漂移 16 处另走）、不改代码、不改 RLS 策略；
--   * prod 该表策略仍为 portal_allow_all_portal_quick_actions（USING true / WITH CHECK true），
--     与 dev 的 tenant_isolation 差异不在本批收敛。
--
-- 目标定义（以 dev information_schema 实读为唯一依据，2026-11-15）：
--   tenant_id    uuid          NOT NULL  （无默认值）
--   name         varchar(100)  NOT NULL  （无默认值）
--   description  text          可空
--   icon         varchar(50)   可空
--   action_type  varchar(20)   NOT NULL  DEFAULT 'navigate'
--   target_url   varchar(500)  NOT NULL  （无默认值）
--   service_code varchar(50)   可空
--   sort_order   integer       NOT NULL  DEFAULT 0
--   is_active    boolean       NOT NULL  DEFAULT true
--   created_at   timestamptz   NOT NULL  DEFAULT now()
--   updated_at   timestamptz   NOT NULL  DEFAULT now()
--
-- 索引（dev pg_indexes 实读）：
--   idx_quick_actions_active  (is_active)    WHERE deleted_at IS NULL   -- partial
--   idx_quick_actions_service (service_code)
--   idx_quick_actions_tenant  (tenant_id)    WHERE deleted_at IS NULL   -- partial
--
-- 代码证据（prod 缺列时的失败方式）：
--   读：svc/portal/src/modules/quick_actions.rs:90 —— 门户首页快捷入口 SELECT 列清单
--       （tenant_id/name/description/icon/action_type/target_url/service_code/sort_order/is_active）；
--       prod 缺列 → SQLSTATE 42703 undefined_column，门户首屏该接口 500，整条读路径不可用。
--
-- 前置断言：表存在；上述 11 列均不存在；表 0 行。
--   tenant_id / name / target_url 在 dev 为 NOT NULL 且无默认值，非 0 行时无法安全直加 → 拒绝。
-- 后置断言：11 列的类型/长度/可空/默认值逐项对齐 dev；3 索引定义与 dev 逐字一致。
--
-- RLS 副作用核查（prod 实测）：relrowsecurity=true / relforcerowsecurity=true，
--   策略 portal_allow_all_portal_quick_actions 谓词为常量 true，不引用新增列；
--   本迁移不改策略、不改 relrowsecurity，补列前后行可见集合与写入许可均不变。
--
-- 回滚：database/rollback/20261115141900_portal_quick_actions_11cols.rollback.sql
--   （先删本迁移建的 3 只索引，再逐列：仅当列内无非空值才删，有数据保留并 RAISE NOTICE）。

-- 1. 前置断言
DO $$
DECLARE
    n_rows bigint;
BEGIN
    IF to_regclass('portal.portal_quick_actions') IS NULL THEN
        RAISE EXCEPTION '空壳表前置断言失败：表 portal.portal_quick_actions 不存在';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'portal' AND table_name = 'portal_quick_actions'
           AND column_name IN ('tenant_id', 'name', 'description', 'icon', 'action_type',
                               'target_url', 'service_code', 'sort_order', 'is_active',
                               'created_at', 'updated_at')
    ) THEN
        RAISE EXCEPTION '空壳表前置断言失败：portal.portal_quick_actions 已有本次要补的列，本迁移只补缺失列';
    END IF;

    EXECUTE 'SELECT count(*) FROM portal.portal_quick_actions' INTO n_rows;
    IF n_rows <> 0 THEN
        RAISE EXCEPTION '空壳表前置断言失败：portal_quick_actions 有 % 行，tenant_id/name/target_url 为 NOT NULL 且无默认值，禁止直接加', n_rows;
    END IF;
END $$;

-- 2. 补列（列顺序与 dev ordinal_position 一致）
ALTER TABLE portal.portal_quick_actions
    ADD COLUMN IF NOT EXISTS tenant_id    uuid         NOT NULL,
    ADD COLUMN IF NOT EXISTS name         varchar(100) NOT NULL,
    ADD COLUMN IF NOT EXISTS description  text,
    ADD COLUMN IF NOT EXISTS icon         varchar(50),
    ADD COLUMN IF NOT EXISTS action_type  varchar(20)  NOT NULL DEFAULT 'navigate',
    ADD COLUMN IF NOT EXISTS target_url   varchar(500) NOT NULL,
    ADD COLUMN IF NOT EXISTS service_code varchar(50),
    ADD COLUMN IF NOT EXISTS sort_order   integer      NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS is_active    boolean      NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS created_at   timestamptz  NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS updated_at   timestamptz  NOT NULL DEFAULT now();

-- 3. 补索引（与 dev pg_indexes 同定义）
CREATE INDEX IF NOT EXISTS idx_quick_actions_active
    ON portal.portal_quick_actions USING btree (is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_quick_actions_service
    ON portal.portal_quick_actions USING btree (service_code);
CREATE INDEX IF NOT EXISTS idx_quick_actions_tenant
    ON portal.portal_quick_actions USING btree (tenant_id) WHERE deleted_at IS NULL;

-- 4. 后置断言：列形状与 dev 逐项一致
DO $$
DECLARE
    r record;
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
            ('tenant_id',    'uuid',                     NULL::int, 'NO',  NULL::text,               NULL::text),
            ('name',         'character varying',        100,       'NO',  NULL::text,               NULL::text),
            ('description',  'text',                     NULL::int, 'YES', NULL::text,               NULL::text),
            ('icon',         'character varying',        50,        'YES', NULL::text,               NULL::text),
            ('action_type',  'character varying',        20,        'NO',  '''navigate''::character varying', NULL::text),
            ('target_url',   'character varying',        500,       'NO',  NULL::text,               NULL::text),
            ('service_code', 'character varying',        50,        'YES', NULL::text,               NULL::text),
            ('sort_order',   'integer',                  NULL::int, 'NO',  '0',                      NULL::text),
            ('is_active',    'boolean',                  NULL::int, 'NO',  'true',                   NULL::text),
            ('created_at',   'timestamp with time zone', NULL::int, 'NO',  NULL::text,               'now()'),
            ('updated_at',   'timestamp with time zone', NULL::int, 'NO',  NULL::text,               'now()')
        ) AS v(col, typ, maxlen, nullable, dflt_exact, dflt_prefix)
    LOOP
        PERFORM 1
           FROM information_schema.columns
          WHERE table_schema = 'portal'
            AND table_name = 'portal_quick_actions'
            AND column_name = r.col
            AND data_type = r.typ
            AND is_nullable = r.nullable
            AND character_maximum_length IS NOT DISTINCT FROM r.maxlen
            AND (
                 -- 有精确默认值的按精确值比对；只有前缀的按前缀比对；无默认值的必须 IS NULL
                 (r.dflt_exact IS NOT NULL AND column_default = r.dflt_exact)
                 OR (r.dflt_exact IS NULL AND r.dflt_prefix IS NOT NULL AND column_default LIKE r.dflt_prefix || '%')
                 OR (r.dflt_exact IS NULL AND r.dflt_prefix IS NULL AND column_default IS NULL)
            );
        IF NOT FOUND THEN
            RAISE EXCEPTION '空壳表后置断言失败：portal.portal_quick_actions.% 形状与 dev 定义不一致', r.col;
        END IF;
    END LOOP;
END $$;

-- 5. 后置断言：3 只索引定义与 dev 逐字一致
DO $$
DECLARE
    r record;
    actual text;
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
            ('idx_quick_actions_active',
             'CREATE INDEX idx_quick_actions_active ON portal.portal_quick_actions USING btree (is_active) WHERE (deleted_at IS NULL)'),
            ('idx_quick_actions_service',
             'CREATE INDEX idx_quick_actions_service ON portal.portal_quick_actions USING btree (service_code)'),
            ('idx_quick_actions_tenant',
             'CREATE INDEX idx_quick_actions_tenant ON portal.portal_quick_actions USING btree (tenant_id) WHERE (deleted_at IS NULL)')
        ) AS v(idx, def)
    LOOP
        SELECT pg_get_indexdef(to_regclass('portal.' || r.idx)) INTO actual;
        IF actual IS DISTINCT FROM r.def THEN
            RAISE EXCEPTION '空壳表后置断言失败：索引 % 定义与 dev 不一致（实际：%）', r.idx, COALESCE(actual, '<缺失>');
        END IF;
    END LOOP;
END $$;
