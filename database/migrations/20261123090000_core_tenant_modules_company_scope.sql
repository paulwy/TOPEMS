-- ============================================================
-- 20261123090000_core_tenant_modules_company_scope.sql
--
-- W12-A1：public.core_tenant_modules 公司级隔离（集团母版 + 公司差异）
--
-- 业务定性（2026-11-23 裁决 2 / 4）：
--   * company_id IS NULL = 集团母版目录项，定义可开通范围；租户内所有公司只读；
--   * 公司行（company_id NOT NULL）表达实际开通，只表达差异、可写；
--   * 存量行全部视为集团母版（company_id 置 NULL），不推断、不拆分、不阻断；
--   * 唯一性拆成两条部分唯一索引：
--       (tenant_id, module_code)              WHERE company_id IS NULL
--       (tenant_id, company_id, module_code)  WHERE company_id IS NOT NULL
--
-- 变更内容：
--   1. 前置断言：表存在；重复 (tenant_id, module_code) 为 0（否则旧唯一约束已保证，
--      仍显式检查以适应重入）；统计存量行数。
--   2. 新增 company_id uuid（可空、无默认）；存量行由 ADD COLUMN 自动为 NULL。
--   3. 删除旧 UNIQUE CONSTRAINT (tenant_id, module_code)。
--   4. 建两条部分唯一索引 + 公司查询索引 (tenant_id, company_id)。
--   5. 建同租户公司外键 (tenant_id, company_id) -> hrm.companies(tenant_id, id)。
--   6. 写 NULL 语义 COMMENT。
--   7. 枚举并删除既有策略，按模板重建 select / insert / update / delete 共 4 条：
--        读：租户内可见母版行；公司行按本司 + 母公司可见（erp.company_readable）
--        写：母版行仅母公司视角或平台通道；公司行仅本公司
--   8. 后置断言：列类型/可空/无默认、旧约束不存在、两条部分唯一索引谓词与列序、
--      公司索引与 FK、策略数=4 且名称精确、RLS ENABLE+FORCE、存量行数与公司级行数不变。
--
-- 幂等性：ADD COLUMN / CREATE INDEX IF NOT EXISTS / DROP ... IF EXISTS / 约束存在性守卫；
--   重入时保留已存在的公司级行（只校验行数不被本迁移改变）。
-- 文件内不含 BEGIN/COMMIT：入口统一用 psql --single-transaction / sqlx 事务包裹。
-- 回滚：database/rollback/20261123090000_core_tenant_modules_company_scope.rollback.sql
-- ============================================================

SET lock_timeout = '5s';
SET statement_timeout = '120s';

-- FORCE RLS 下 owner 同样受策略约束；统计与断言需要全量可见。
SELECT set_config('app.rls_system', 'on', false);

-- ------------------------------------------------------------
-- 1. 前置断言 + 加列 + 唯一约束替换 + 回填校验（单块，保证前后计数一致）
-- ------------------------------------------------------------
DO $w12a1$
DECLARE
    v_fresh          boolean;
    v_pre_rows       bigint;
    v_pre_company    bigint;
    v_post_rows      bigint;
    v_post_company   bigint;
    v_dups           bigint;
BEGIN
    IF to_regclass('public.core_tenant_modules') IS NULL THEN
        RAISE EXCEPTION '前置断言失败：public.core_tenant_modules 不存在';
    END IF;

    SELECT NOT EXISTS (
        SELECT 1
          FROM pg_attribute
         WHERE attrelid = 'public.core_tenant_modules'::regclass
           AND attname = 'company_id'
           AND attnum > 0
           AND NOT attisdropped
    ) INTO v_fresh;

    SELECT count(*) INTO v_pre_rows FROM public.core_tenant_modules;

    IF v_fresh THEN
        v_pre_company := 0;
    ELSE
        EXECUTE 'SELECT count(*) FROM public.core_tenant_modules WHERE company_id IS NOT NULL'
           INTO v_pre_company;
        RAISE NOTICE '幂等重入：company_id 已存在，存量 % 行、公司级 % 行保持不变',
            v_pre_rows, v_pre_company;
    END IF;

    -- 重名检查：母版索引要求 NULL 行内 (tenant_id, module_code) 唯一。
    SELECT count(*) INTO v_dups
      FROM (
            SELECT tenant_id, module_code
              FROM public.core_tenant_modules
             GROUP BY tenant_id, module_code
            HAVING count(*) > 1
           ) d;
    IF v_dups > 0 THEN
        RAISE EXCEPTION '前置断言失败：存在 % 组重复 (tenant_id, module_code)，无法建立母版部分唯一索引；请先处理重复数据', v_dups;
    END IF;

    -- 2. 加列：存量行自动为 NULL（视为集团母版目录）
    EXECUTE 'ALTER TABLE public.core_tenant_modules ADD COLUMN IF NOT EXISTS company_id uuid';

    -- 3. 删除旧唯一约束（同名索引一并清理，兼容「独立唯一索引」形态）
    EXECUTE 'ALTER TABLE public.core_tenant_modules DROP CONSTRAINT IF EXISTS core_tenant_modules_tenant_id_module_code_key';
    EXECUTE 'DROP INDEX IF EXISTS public.core_tenant_modules_tenant_id_module_code_key';

    -- 4. 两条部分唯一索引 + 公司查询索引
    EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS uq_core_tenant_modules_master '
         || 'ON public.core_tenant_modules (tenant_id, module_code) '
         || 'WHERE company_id IS NULL';
    EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS uq_core_tenant_modules_company '
         || 'ON public.core_tenant_modules (tenant_id, company_id, module_code) '
         || 'WHERE company_id IS NOT NULL';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_core_tenant_modules_tenant_company '
         || 'ON public.core_tenant_modules (tenant_id, company_id) '
         || 'WHERE company_id IS NOT NULL';

    -- 5. 同租户公司外键（company_id 为 NULL 时不校验，母版行不受影响）
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
         WHERE conrelid = 'public.core_tenant_modules'::regclass
           AND conname = 'fk_core_tenant_modules_company'
    ) THEN
        EXECUTE 'ALTER TABLE public.core_tenant_modules '
             || 'ADD CONSTRAINT fk_core_tenant_modules_company '
             || 'FOREIGN KEY (tenant_id, company_id) REFERENCES hrm.companies(tenant_id, id)';
    END IF;

    -- 6. NULL 语义注释
    EXECUTE 'COMMENT ON COLUMN public.core_tenant_modules.company_id IS '
         || '''NULL = 集团母版目录项，定义可开通范围；租户内公司只读；公司行表达实际开通''';

    -- 7. 数据断言：本迁移不增删行，公司级行数保持不变（首次执行必为 0）
    SELECT count(*) INTO v_post_rows FROM public.core_tenant_modules;
    EXECUTE 'SELECT count(*) FROM public.core_tenant_modules WHERE company_id IS NOT NULL'
       INTO v_post_company;

    IF v_post_rows <> v_pre_rows THEN
        RAISE EXCEPTION '后置断言失败：行数由 % 变为 %，迁移不得增删行', v_pre_rows, v_post_rows;
    END IF;
    IF v_post_company <> v_pre_company THEN
        RAISE EXCEPTION '后置断言失败：公司级行数由 % 变为 %，存量行必须保持 NULL（集团母版）',
            v_pre_company, v_post_company;
    END IF;

    RAISE NOTICE '存量回填：总行数 %，集团母版目录行 %，公司级行 %',
        v_post_rows, v_post_rows - v_post_company, v_post_company;
END
$w12a1$;

-- ------------------------------------------------------------
-- 2. 策略重建：先枚举删除既有策略（迁移前为单条 rls_tenant_isolation）
-- ------------------------------------------------------------
DO $drop_policies$
DECLARE
    r record;
BEGIN
    FOR r IN
        SELECT policyname
          FROM pg_policies
         WHERE schemaname = 'public'
           AND tablename = 'core_tenant_modules'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.core_tenant_modules', r.policyname);
        RAISE NOTICE '已删除旧策略 public.core_tenant_modules.%', r.policyname;
    END LOOP;
END
$drop_policies$;

-- 读：母版目录租户内所有公司可见；公司行按本司 + 母公司可见清单
CREATE POLICY core_tenant_modules_company_select
    ON public.core_tenant_modules
    FOR SELECT
    USING (
        tenant_id = erp.group_tenant_of(NULLIF(current_setting('app.tenant_id', true), '')::uuid)
        AND (
            COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
            OR company_id IS NULL
            OR erp.company_readable(company_id)
        )
    );

-- 写：母版行仅母公司视角或平台通道；公司行仅本公司
CREATE POLICY core_tenant_modules_company_insert
    ON public.core_tenant_modules
    FOR INSERT
    WITH CHECK (
        tenant_id = erp.group_tenant_of(NULLIF(current_setting('app.tenant_id', true), '')::uuid)
        AND (
            (
                company_id IS NULL
                AND (
                    COALESCE(current_setting('app.actor_is_parent', true), 'off') = 'on'
                    OR COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
                )
            )
            OR (
                company_id IS NOT NULL
                AND company_id = erp.current_company_id()
            )
        )
    );

CREATE POLICY core_tenant_modules_company_update
    ON public.core_tenant_modules
    FOR UPDATE
    USING (
        tenant_id = erp.group_tenant_of(NULLIF(current_setting('app.tenant_id', true), '')::uuid)
        AND (
            (
                company_id IS NULL
                AND (
                    COALESCE(current_setting('app.actor_is_parent', true), 'off') = 'on'
                    OR COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
                )
            )
            OR (
                company_id IS NOT NULL
                AND company_id = erp.current_company_id()
            )
        )
    )
    WITH CHECK (
        tenant_id = erp.group_tenant_of(NULLIF(current_setting('app.tenant_id', true), '')::uuid)
        AND (
            (
                company_id IS NULL
                AND (
                    COALESCE(current_setting('app.actor_is_parent', true), 'off') = 'on'
                    OR COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
                )
            )
            OR (
                company_id IS NOT NULL
                AND company_id = erp.current_company_id()
            )
        )
    );

CREATE POLICY core_tenant_modules_company_delete
    ON public.core_tenant_modules
    FOR DELETE
    USING (
        tenant_id = erp.group_tenant_of(NULLIF(current_setting('app.tenant_id', true), '')::uuid)
        AND (
            (
                company_id IS NULL
                AND (
                    COALESCE(current_setting('app.actor_is_parent', true), 'off') = 'on'
                    OR COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
                )
            )
            OR (
                company_id IS NOT NULL
                AND company_id = erp.current_company_id()
            )
        )
    );

-- ------------------------------------------------------------
-- 3. 后置断言
-- ------------------------------------------------------------
DO $assert$
DECLARE
    v_type       text;
    v_notnull    boolean;
    v_hasdef     boolean;
    v_policies   int;
    v_bad_names  int;
BEGIN
    SELECT format_type(atttypid, atttypmod), attnotnull, atthasdef
      INTO v_type, v_notnull, v_hasdef
      FROM pg_attribute
     WHERE attrelid = 'public.core_tenant_modules'::regclass
       AND attname = 'company_id'
       AND attnum > 0
       AND NOT attisdropped;

    IF v_type IS DISTINCT FROM 'uuid' THEN
        RAISE EXCEPTION '后置断言失败：company_id 类型为 %，期望 uuid', v_type;
    END IF;
    IF v_notnull THEN
        RAISE EXCEPTION '后置断言失败：company_id 必须可空（NULL = 集团母版）';
    END IF;
    IF v_hasdef THEN
        RAISE EXCEPTION '后置断言失败：company_id 不应有默认值';
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_constraint
         WHERE conrelid = 'public.core_tenant_modules'::regclass
           AND conname = 'core_tenant_modules_tenant_id_module_code_key'
    ) THEN
        RAISE EXCEPTION '后置断言失败：旧唯一约束 core_tenant_modules_tenant_id_module_code_key 仍存在';
    END IF;

    IF NOT EXISTS (
        SELECT 1
          FROM pg_index i
          JOIN pg_class c ON c.oid = i.indexrelid
         WHERE i.indrelid = 'public.core_tenant_modules'::regclass
           AND c.relname = 'uq_core_tenant_modules_master'
           AND i.indisunique
           AND pg_get_expr(i.indpred, i.indrelid) = '(company_id IS NULL)'
           AND strpos(pg_get_indexdef(i.indexrelid), '(tenant_id, module_code)') > 0
    ) THEN
        RAISE EXCEPTION '后置断言失败：母版部分唯一索引缺失、非唯一或谓词/列序不符';
    END IF;

    IF NOT EXISTS (
        SELECT 1
          FROM pg_index i
          JOIN pg_class c ON c.oid = i.indexrelid
         WHERE i.indrelid = 'public.core_tenant_modules'::regclass
           AND c.relname = 'uq_core_tenant_modules_company'
           AND i.indisunique
           AND pg_get_expr(i.indpred, i.indrelid) = '(company_id IS NOT NULL)'
           AND strpos(pg_get_indexdef(i.indexrelid), '(tenant_id, company_id, module_code)') > 0
    ) THEN
        RAISE EXCEPTION '后置断言失败：公司部分唯一索引缺失、非唯一或谓词/列序不符';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
         WHERE schemaname = 'public'
           AND indexname = 'idx_core_tenant_modules_tenant_company'
    ) THEN
        RAISE EXCEPTION '后置断言失败：公司查询索引 idx_core_tenant_modules_tenant_company 缺失';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
         WHERE conrelid = 'public.core_tenant_modules'::regclass
           AND conname = 'fk_core_tenant_modules_company'
    ) THEN
        RAISE EXCEPTION '后置断言失败：公司外键 fk_core_tenant_modules_company 缺失';
    END IF;

    SELECT count(*) INTO v_policies
      FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename = 'core_tenant_modules';
    IF v_policies <> 4 THEN
        RAISE EXCEPTION '后置断言失败：策略数为 %，期望 4', v_policies;
    END IF;

    SELECT count(*) INTO v_bad_names
      FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename = 'core_tenant_modules'
       AND policyname NOT IN (
           'core_tenant_modules_company_select',
           'core_tenant_modules_company_insert',
           'core_tenant_modules_company_update',
           'core_tenant_modules_company_delete'
       );
    IF v_bad_names <> 0 THEN
        RAISE EXCEPTION '后置断言失败：发现 % 条非预期策略', v_bad_names;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_class
         WHERE oid = 'public.core_tenant_modules'::regclass
           AND relrowsecurity
           AND relforcerowsecurity
    ) THEN
        RAISE EXCEPTION '后置断言失败：RLS 未 ENABLE + FORCE';
    END IF;

    RAISE NOTICE '后置通过：company_id(uuid,NULL)、两条部分唯一索引、公司索引与 FK、4 条策略、RLS FORCE';
END
$assert$;

ANALYZE public.core_tenant_modules;
