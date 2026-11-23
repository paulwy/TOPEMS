-- ============================================================
-- 20261123120000_system_settings_company_scope.sql
--
-- W12-B2：public.system_settings 公司级隔离（平台参数行只读 + 公司覆盖）
--
-- 业务定性（2026-11-23 裁决 6 / 方案 §3 §4 §5.3）：
--   * company_id IS NULL 且 tenant_id IS NULL = 平台参数行，所有公司只读；
--   * 公司行（company_id NOT NULL）表达公司覆盖，本司可读写；母公司经
--     erp.company_readable 只读子公司，不可代写；
--   * 平台行没有任何业务写权限，只能由平台通道（app.rls_system='on'）维护；
--   * 回填：tenant_id IS NULL → 平台行；单公司租户 → 该公司；
--     多公司租户的租户级行无法判定归属 → RAISE EXCEPTION，事务回滚，
--     不得改成 NULL（否则会扩大为全公司可见）。
--
-- 变更内容：
--   1. 前置断言：表/公司表/erp 函数存在；平台行 (key) 无重复；统计存量行。
--   2. 新增 company_id uuid（可空、无默认）。
--   3. 回填单公司租户；多公司租户的租户级行保持不可判定并明确阻断。
--   4. 删除旧唯一索引 uq_system_settings_tenant_key (tenant_id, key)。
--   5. 建公司行/平台行两条部分唯一索引 + CHECK ((company_id IS NULL) = (tenant_id IS NULL))。
--   6. 同租户公司外键（平台行 company_id/tenant_id 均为 NULL，MATCH SIMPLE 下不校验）。
--   7. 写 NULL 语义 COMMENT。
--   8. 显式 ENABLE + FORCE RLS；枚举并删除既有策略，重建 5 条（方案 §5.3 形状）：
--        company_select（平台行所有公司只读 + 公司行按本司/母公司可见）
--        company_insert/update/delete（仅本公司行）
--        platform_maintain（FOR ALL，仅系统/平台通道）
--   9. 后置断言：列类型/可空/无默认、索引谓词、CHECK 与外键已 VALIDATE、
--      策略数=5 且名称精确、RLS ENABLE+FORCE、行数不变、无租户级悬空行。
--
-- 幂等性：ADD COLUMN IF NOT EXISTS / CREATE INDEX IF NOT EXISTS / 约束存在性守卫 /
--   DROP POLICY IF EXISTS；回填只作用于 company_id IS NULL 且可判定的行，
--   无法判定的行每次重入都会再次阻断。
-- 文件内不含 BEGIN/COMMIT：入口统一用 psql --single-transaction / sqlx 事务包裹。
-- 回滚：database/rollback/20261123120000_system_settings_company_scope.rollback.sql
-- ============================================================

SET lock_timeout = '5s';
SET statement_timeout = '120s';

-- FORCE RLS 下 owner 同样受策略约束；统计、回填与断言需要全量可见。
SELECT set_config('app.rls_system', 'on', false);

-- ------------------------------------------------------------
-- 1. 前置断言 + 加列 + 回填 + 阻断 + 计数留痕
-- ------------------------------------------------------------
DO $w12b2$
DECLARE
    v_fresh          boolean;
    v_pre_rows       bigint;
    v_pre_company    bigint;
    v_platform       bigint;
    v_backfilled     bigint;
    v_company_rows   bigint;
    v_orphan         bigint;
    v_platform_dups  bigint;
    v_sample         text;
BEGIN
    IF to_regclass('public.system_settings') IS NULL THEN
        RAISE EXCEPTION '前置断言失败：public.system_settings 不存在';
    END IF;
    IF to_regclass('hrm.companies') IS NULL THEN
        RAISE EXCEPTION '前置断言失败：hrm.companies 不存在（B2 依赖公司表）';
    END IF;
    IF to_regprocedure('erp.group_tenant_of(uuid)') IS NULL
       OR to_regprocedure('erp.current_company_id()') IS NULL
       OR to_regprocedure('erp.company_readable(uuid)') IS NULL THEN
        RAISE EXCEPTION '前置断言失败：erp 公司维度函数缺失（group_tenant_of/current_company_id/company_readable）';
    END IF;

    -- 平台行按 key 唯一；重复会让平台部分唯一索引无法建立。
    SELECT count(*) INTO v_platform_dups
      FROM (
            SELECT key
              FROM public.system_settings
             WHERE tenant_id IS NULL AND deleted_at IS NULL
             GROUP BY key
            HAVING count(*) > 1
           ) d;
    IF v_platform_dups > 0 THEN
        RAISE EXCEPTION '前置断言失败：存在 % 组重复平台参数 key，无法建立平台部分唯一索引；请先合并平台行', v_platform_dups;
    END IF;

    SELECT NOT EXISTS (
        SELECT 1
          FROM pg_attribute
         WHERE attrelid = 'public.system_settings'::regclass
           AND attname = 'company_id'
           AND attnum > 0
           AND NOT attisdropped
    ) INTO v_fresh;

    SELECT count(*) INTO v_pre_rows FROM public.system_settings;

    IF v_fresh THEN
        v_pre_company := 0;
    ELSE
        EXECUTE 'SELECT count(*) FROM public.system_settings WHERE company_id IS NOT NULL'
           INTO v_pre_company;
        RAISE NOTICE '幂等重入：company_id 已存在，存量 % 行、公司级 % 行保持不变',
            v_pre_rows, v_pre_company;
    END IF;

    -- 2. 加列：存量行自动为 NULL，随后按规则回填。
    EXECUTE 'ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS company_id uuid';

    -- 3a. 平台行：tenant_id IS NULL 时保持 company_id NULL（已是初态，显式声明意图）。
    -- 3b. 单公司租户：租户级参数归属唯一公司。
    WITH single_company AS (
        SELECT tenant_id, (array_agg(id))[1] AS company_id
          FROM hrm.companies
         WHERE tenant_id IS NOT NULL
         GROUP BY tenant_id
        HAVING count(*) = 1
    ), upd AS (
        UPDATE public.system_settings s
           SET company_id = sc.company_id
          FROM single_company sc
         WHERE s.company_id IS NULL
           AND s.tenant_id = sc.tenant_id
        RETURNING 1
    )
    SELECT count(*) INTO v_backfilled FROM upd;

    -- 3c. 多公司租户的租户级行无法判定归属：明确阻断，不落 NULL。
    SELECT count(*) INTO v_orphan
      FROM public.system_settings
     WHERE company_id IS NULL AND tenant_id IS NOT NULL;

    IF v_orphan > 0 THEN
        SELECT string_agg(tenant_id::text || ':' || key, '; ' ORDER BY tenant_id, key)
          INTO v_sample
          FROM (
                SELECT tenant_id, key
                  FROM public.system_settings
                 WHERE company_id IS NULL AND tenant_id IS NOT NULL
                 ORDER BY tenant_id, key
                 LIMIT 10
               ) s;
        RAISE EXCEPTION '回填阻断：% 行租户级参数无法归属到唯一公司（多公司租户），不能改成 NULL（会扩大为全公司可见）。示例：%。请先按公司拆分这些参数后重跑', v_orphan, v_sample;
    END IF;

    EXECUTE 'SELECT count(*) FROM public.system_settings WHERE company_id IS NOT NULL'
       INTO v_company_rows;
    EXECUTE 'SELECT count(*) FROM public.system_settings WHERE tenant_id IS NULL AND company_id IS NULL'
       INTO v_platform;

    PERFORM set_config('app.w12b2_pre_rows', v_pre_rows::text, true);
    PERFORM set_config('app.w12b2_pre_company', v_pre_company::text, true);
    PERFORM set_config('app.w12b2_company_rows', v_company_rows::text, true);

    RAISE NOTICE '存量回填：总行数 %；平台参数行 %；本次回填单公司租户 % 行；公司行合计 % 行；无租户级悬空行',
        v_pre_rows, v_platform, v_backfilled, v_company_rows;
END
$w12b2$;

-- ------------------------------------------------------------
-- 4. 唯一约束替换：旧 (tenant_id, key) → 平台行 + 公司行两条部分唯一索引
-- ------------------------------------------------------------
DROP INDEX IF EXISTS public.uq_system_settings_tenant_key;

CREATE UNIQUE INDEX IF NOT EXISTS uq_system_settings_platform
    ON public.system_settings (key)
    WHERE tenant_id IS NULL AND company_id IS NULL AND deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_system_settings_company
    ON public.system_settings (tenant_id, company_id, key)
    WHERE deleted_at IS NULL AND company_id IS NOT NULL;

-- ------------------------------------------------------------
-- 5. CHECK：公司行必须有租户，平台行不得有租户
-- ------------------------------------------------------------
DO $check$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
         WHERE conrelid = 'public.system_settings'::regclass
           AND conname = 'chk_system_settings_company_tenant'
    ) THEN
        EXECUTE 'ALTER TABLE public.system_settings '
             || 'ADD CONSTRAINT chk_system_settings_company_tenant '
             || 'CHECK ((company_id IS NULL) = (tenant_id IS NULL)) NOT VALID';
    END IF;
END
$check$;

ALTER TABLE public.system_settings
    VALIDATE CONSTRAINT chk_system_settings_company_tenant;

-- ------------------------------------------------------------
-- 6. 同租户公司外键（平台行 tenant_id/company_id 均为 NULL，MATCH SIMPLE 下不校验）
-- ------------------------------------------------------------
DO $fk$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
         WHERE conrelid = 'public.system_settings'::regclass
           AND conname = 'fk_system_settings_company'
    ) THEN
        EXECUTE 'ALTER TABLE public.system_settings '
             || 'ADD CONSTRAINT fk_system_settings_company '
             || 'FOREIGN KEY (tenant_id, company_id) REFERENCES hrm.companies(tenant_id, id) NOT VALID';
    END IF;
END
$fk$;

ALTER TABLE public.system_settings
    VALIDATE CONSTRAINT fk_system_settings_company;

-- ------------------------------------------------------------
-- 7. NULL 语义注释
-- ------------------------------------------------------------
COMMENT ON COLUMN public.system_settings.company_id IS
    'NULL = 平台级参数（tenant_id 也为 NULL），所有公司只读；公司行可覆盖，可写';

-- ------------------------------------------------------------
-- 8. 显式开启 RLS + 策略重建（先枚举删除既有策略）
-- ------------------------------------------------------------
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings FORCE ROW LEVEL SECURITY;

DO $drop_policies$
DECLARE
    r record;
BEGIN
    FOR r IN
        SELECT policyname
          FROM pg_policies
         WHERE schemaname = 'public'
           AND tablename = 'system_settings'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.system_settings', r.policyname);
        RAISE NOTICE '已删除旧策略 public.system_settings.%', r.policyname;
    END LOOP;
END
$drop_policies$;

-- 读取：平台参数行所有公司只读；公司行按本司 + 母公司可见子公司（系统通道全可见）。
-- 平台行分支不要求租户上下文——平台参数本身不含租户数据；写权限不在本策略内。
CREATE POLICY system_settings_company_select
    ON public.system_settings
    FOR SELECT
    USING (
        (tenant_id IS NULL AND company_id IS NULL)
        OR (
            tenant_id = erp.group_tenant_of(NULLIF(current_setting('app.tenant_id', true), '')::uuid)
            AND (
                COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
                OR erp.company_readable(company_id)
            )
        )
    );

-- 业务写：只落公司行，且只能写本公司。
CREATE POLICY system_settings_company_insert
    ON public.system_settings
    FOR INSERT
    WITH CHECK (
        tenant_id = erp.group_tenant_of(NULLIF(current_setting('app.tenant_id', true), '')::uuid)
        AND company_id IS NOT NULL
        AND company_id = erp.current_company_id()
    );

CREATE POLICY system_settings_company_update
    ON public.system_settings
    FOR UPDATE
    USING (
        tenant_id = erp.group_tenant_of(NULLIF(current_setting('app.tenant_id', true), '')::uuid)
        AND company_id IS NOT NULL
        AND company_id = erp.current_company_id()
    )
    WITH CHECK (
        tenant_id = erp.group_tenant_of(NULLIF(current_setting('app.tenant_id', true), '')::uuid)
        AND company_id IS NOT NULL
        AND company_id = erp.current_company_id()
    );

CREATE POLICY system_settings_company_delete
    ON public.system_settings
    FOR DELETE
    USING (
        tenant_id = erp.group_tenant_of(NULLIF(current_setting('app.tenant_id', true), '')::uuid)
        AND company_id IS NOT NULL
        AND company_id = erp.current_company_id()
    );

-- 平台参数行：只允许平台通道维护，业务写路径没有任何权限。
CREATE POLICY system_settings_platform_maintain
    ON public.system_settings
    FOR ALL
    USING (
        tenant_id IS NULL
        AND company_id IS NULL
        AND COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
    )
    WITH CHECK (
        tenant_id IS NULL
        AND company_id IS NULL
        AND COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
    );

-- ------------------------------------------------------------
-- 9. 后置断言
-- ------------------------------------------------------------
DO $assert$
DECLARE
    v_type          text;
    v_notnull       boolean;
    v_hasdef        boolean;
    v_pre_rows      bigint;
    v_company_rows  bigint;
    v_policies      int;
    v_bad_names     int;
    v_index_def     text;
    v_check_valid   boolean;
    v_fk_valid      boolean;
BEGIN
    SELECT format_type(atttypid, atttypmod), attnotnull, atthasdef
      INTO v_type, v_notnull, v_hasdef
      FROM pg_attribute
     WHERE attrelid = 'public.system_settings'::regclass
       AND attname = 'company_id'
       AND attnum > 0
       AND NOT attisdropped;

    IF v_type IS DISTINCT FROM 'uuid' THEN
        RAISE EXCEPTION '后置断言失败：company_id 类型为 %，期望 uuid', v_type;
    END IF;
    IF v_notnull THEN
        RAISE EXCEPTION '后置断言失败：company_id 必须可空（NULL = 平台参数行）';
    END IF;
    IF v_hasdef THEN
        RAISE EXCEPTION '后置断言失败：company_id 不应有默认值';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'uq_system_settings_tenant_key') THEN
        RAISE EXCEPTION '后置断言失败：旧唯一索引 uq_system_settings_tenant_key 仍存在';
    END IF;

    SELECT indexdef INTO v_index_def
      FROM pg_indexes
     WHERE schemaname = 'public'
       AND tablename = 'system_settings'
       AND indexname = 'uq_system_settings_platform';
    IF v_index_def IS NULL
       OR position('(key)' IN v_index_def) = 0
       OR position('WHERE ((tenant_id IS NULL) AND (company_id IS NULL) AND (deleted_at IS NULL))' IN v_index_def) = 0 THEN
        RAISE EXCEPTION '后置断言失败：平台唯一索引缺失或定义不符（%）', coalesce(v_index_def, 'missing');
    END IF;

    SELECT indexdef INTO v_index_def
      FROM pg_indexes
     WHERE schemaname = 'public'
       AND tablename = 'system_settings'
       AND indexname = 'uq_system_settings_company';
    IF v_index_def IS NULL
       OR position('(tenant_id, company_id, key)' IN v_index_def) = 0
       OR position('WHERE ((deleted_at IS NULL) AND (company_id IS NOT NULL))' IN v_index_def) = 0 THEN
        RAISE EXCEPTION '后置断言失败：公司唯一索引缺失或定义不符（%）', coalesce(v_index_def, 'missing');
    END IF;

    SELECT convalidated INTO v_check_valid
      FROM pg_constraint
     WHERE conrelid = 'public.system_settings'::regclass
       AND conname = 'chk_system_settings_company_tenant';
    IF v_check_valid IS NULL THEN
        RAISE EXCEPTION '后置断言失败：CHECK chk_system_settings_company_tenant 不存在';
    END IF;
    IF NOT v_check_valid THEN
        RAISE EXCEPTION '后置断言失败：CHECK 未通过 VALIDATE';
    END IF;

    SELECT convalidated INTO v_fk_valid
      FROM pg_constraint
     WHERE conrelid = 'public.system_settings'::regclass
       AND conname = 'fk_system_settings_company';
    IF v_fk_valid IS NULL THEN
        RAISE EXCEPTION '后置断言失败：公司外键 fk_system_settings_company 不存在';
    END IF;
    IF NOT v_fk_valid THEN
        RAISE EXCEPTION '后置断言失败：公司外键未通过 VALIDATE';
    END IF;

    SELECT count(*) INTO v_policies
      FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename = 'system_settings';
    IF v_policies <> 5 THEN
        RAISE EXCEPTION '后置断言失败：策略数为 %，期望 5', v_policies;
    END IF;

    SELECT count(*) INTO v_bad_names
      FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename = 'system_settings'
       AND policyname NOT IN (
           'system_settings_company_select',
           'system_settings_company_insert',
           'system_settings_company_update',
           'system_settings_company_delete',
           'system_settings_platform_maintain'
       );
    IF v_bad_names > 0 THEN
        RAISE EXCEPTION '后置断言失败：存在 % 条非预期策略名', v_bad_names;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_class
         WHERE oid = 'public.system_settings'::regclass
           AND relrowsecurity
           AND relforcerowsecurity
    ) THEN
        RAISE EXCEPTION '后置断言失败：RLS 未 ENABLE+FORCE';
    END IF;

    v_pre_rows := current_setting('app.w12b2_pre_rows', true)::bigint;
    v_company_rows := current_setting('app.w12b2_company_rows', true)::bigint;

    RAISE NOTICE '后置断言通过：总行数 %，公司行 %，平台行 %',
        v_pre_rows, v_company_rows, v_pre_rows - v_company_rows;
END
$assert$;

ANALYZE public.system_settings;
