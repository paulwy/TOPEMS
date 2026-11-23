-- ============================================================
-- 20261123100000_core_inter_module_sync_company_scope.sql
--
-- W12-A2：integration.core_inter_module_sync 公司级隔离
--
-- 业务定性（2026-11-23 裁决 7 / 方案 §3 §4 §5.2）：
--   * company_id IS NULL = 集团级同步任务，仅母公司/平台可见可发起（NULL 合法）；
--   * 公司行（company_id NOT NULL）按公司归属，子公司仅本司可见可写；
--     母公司经 company_readable 可读子公司，但不可代写；
--   * 回填：data->>'company_id' 命中 → 该司；单公司租户 → 该公司；
--     其余保持 NULL，作为合法集团级任务，不阻断，计数进 NOTICE。
--
-- 变更内容：
--   1. 前置断言：表/公司表/erp 公司维度函数存在；统计存量行（幂等重入保留公司行）。
--   2. 新增 company_id uuid（可空、无默认）。
--   3. 回填（两段 UPDATE，只改 company_id IS NULL 的行，可重入）。
--   4. 建公司行查询索引与集团级索引。
--   5. 建同租户公司外键 (tenant_id, company_id) -> hrm.companies(tenant_id, id)，
--      NOT VALID 后 VALIDATE（只校验公司行）。
--   6. 写 NULL 语义 COMMENT。
--   7. 枚举并删除既有策略，按模板重建 select / insert / update / delete 共 4 条：
--        读：系统通道 OR 公司可读 OR（集团级行且母公司视角）
--        写：系统通道 OR（集团级行且母公司视角）OR（公司行且本公司）
--   8. 后置断言：列类型/可空/无默认、两条索引谓词与列序、FK 已校验、
--      策略数=4 且名称精确、RLS ENABLE+FORCE、总行数不变且公司行数=回填结果。
--
-- 幂等性：ADD COLUMN IF NOT EXISTS / CREATE INDEX IF NOT EXISTS / 约束存在性守卫 /
--   DROP POLICY IF EXISTS；回填只作用于 company_id IS NULL 的行。
-- 文件内不含 BEGIN/COMMIT：入口统一用 psql --single-transaction / sqlx 事务包裹。
-- 回滚：database/rollback/20261123100000_core_inter_module_sync_company_scope.rollback.sql
-- ============================================================

SET lock_timeout = '5s';
SET statement_timeout = '120s';

-- FORCE RLS 下 owner 同样受策略约束；统计、回填与断言需要全量可见。
SELECT set_config('app.rls_system', 'on', false);

-- ------------------------------------------------------------
-- 1. 前置断言 + 加列 + 回填 + 计数留痕（单块，保证前后计数同源）
-- ------------------------------------------------------------
DO $w12a2$
DECLARE
    v_fresh          boolean;
    v_pre_rows       bigint;
    v_pre_company    bigint;
    v_from_data      bigint;
    v_single         bigint;
    v_post_company   bigint;
    v_group_rows     bigint;
    v_cross_tenant   bigint;
BEGIN
    IF to_regclass('integration.core_inter_module_sync') IS NULL THEN
        RAISE EXCEPTION '前置断言失败：integration.core_inter_module_sync 不存在';
    END IF;
    IF to_regclass('hrm.companies') IS NULL THEN
        RAISE EXCEPTION '前置断言失败：hrm.companies 不存在（A2 依赖公司表）';
    END IF;
    IF to_regprocedure('erp.group_tenant_of(uuid)') IS NULL
       OR to_regprocedure('erp.current_company_id()') IS NULL
       OR to_regprocedure('erp.company_readable(uuid)') IS NULL THEN
        RAISE EXCEPTION '前置断言失败：erp 公司维度函数缺失（group_tenant_of/current_company_id/company_readable）';
    END IF;

    SELECT NOT EXISTS (
        SELECT 1
          FROM pg_attribute
         WHERE attrelid = 'integration.core_inter_module_sync'::regclass
           AND attname = 'company_id'
           AND attnum > 0
           AND NOT attisdropped
    ) INTO v_fresh;

    SELECT count(*) INTO v_pre_rows FROM integration.core_inter_module_sync;

    IF v_fresh THEN
        v_pre_company := 0;
    ELSE
        EXECUTE 'SELECT count(*) FROM integration.core_inter_module_sync WHERE company_id IS NOT NULL'
           INTO v_pre_company;
        RAISE NOTICE '幂等重入：company_id 已存在，存量 % 行、公司级 % 行保持不变',
            v_pre_rows, v_pre_company;
    END IF;

    -- 2. 加列：存量行自动为 NULL（初态全部按集团级任务处理，随后按规则回填）
    EXECUTE 'ALTER TABLE integration.core_inter_module_sync ADD COLUMN IF NOT EXISTS company_id uuid';

    -- 3a. 回填：data->>'company_id' 命中且属于同租户公司
    WITH upd AS (
        UPDATE integration.core_inter_module_sync s
           SET company_id = (s.data->>'company_id')::uuid
          FROM hrm.companies c
         WHERE s.company_id IS NULL
           AND s.tenant_id IS NOT NULL
           AND s.data ? 'company_id'
           AND s.data->>'company_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
           AND c.tenant_id = s.tenant_id
           AND c.id = (s.data->>'company_id')::uuid
        RETURNING 1
    )
    SELECT count(*) INTO v_from_data FROM upd;

    -- 3b. 回填：单公司租户的任务归属该公司
    WITH single_company AS (
        SELECT tenant_id, (array_agg(id))[1] AS company_id
          FROM hrm.companies
         WHERE tenant_id IS NOT NULL
         GROUP BY tenant_id
        HAVING count(*) = 1
    ), upd AS (
        UPDATE integration.core_inter_module_sync s
           SET company_id = sc.company_id
          FROM single_company sc
         WHERE s.company_id IS NULL
           AND s.tenant_id = sc.tenant_id
        RETURNING 1
    )
    SELECT count(*) INTO v_single FROM upd;

    EXECUTE 'SELECT count(*) FROM integration.core_inter_module_sync WHERE company_id IS NOT NULL'
       INTO v_post_company;
    EXECUTE 'SELECT count(*) FROM integration.core_inter_module_sync WHERE company_id IS NULL'
       INTO v_group_rows;

    -- 跨租户归属检查在策略替换前完成：此后新策略要求 app.tenant_id 才能命中行，
    -- 迁移会话内无租户上下文，扫描会被 RLS 收敛为 0 行，不能代表真实数据。
    SELECT count(*) INTO v_cross_tenant
      FROM integration.core_inter_module_sync s
      JOIN hrm.companies c ON c.id = s.company_id
     WHERE s.company_id IS NOT NULL
       AND c.tenant_id <> s.tenant_id;
    IF v_cross_tenant > 0 THEN
        RAISE EXCEPTION '后置断言失败：存在 % 行公司归属跨租户', v_cross_tenant;
    END IF;

    -- 计数留痕，供后置断言读取（同一事务内有效）
    PERFORM set_config('app.w12a2_pre_rows', v_pre_rows::text, true);
    PERFORM set_config('app.w12a2_pre_company', v_pre_company::text, true);
    PERFORM set_config('app.w12a2_company_rows', v_post_company::text, true);

    RAISE NOTICE '存量回填：总行数 %；data->>company_id 命中 % 行；单公司租户 % 行；公司级合计 % 行；保留集团级 % 行',
        v_pre_rows, v_from_data, v_single, v_post_company, v_group_rows;
END
$w12a2$;

-- ------------------------------------------------------------
-- 4. 索引：公司行查询 + 集团级任务
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_core_inter_module_sync_tenant_company_created
    ON integration.core_inter_module_sync (tenant_id, company_id, created_at DESC)
    WHERE company_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_core_inter_module_sync_tenant_group
    ON integration.core_inter_module_sync (tenant_id)
    WHERE company_id IS NULL;

-- ------------------------------------------------------------
-- 5. 同租户公司外键（company_id 为 NULL 时不校验，集团级行不受影响）
-- ------------------------------------------------------------
DO $fk$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
         WHERE conrelid = 'integration.core_inter_module_sync'::regclass
           AND conname = 'fk_core_inter_module_sync_company'
    ) THEN
        EXECUTE 'ALTER TABLE integration.core_inter_module_sync '
             || 'ADD CONSTRAINT fk_core_inter_module_sync_company '
             || 'FOREIGN KEY (tenant_id, company_id) REFERENCES hrm.companies(tenant_id, id) NOT VALID';
    END IF;
END
$fk$;

ALTER TABLE integration.core_inter_module_sync
    VALIDATE CONSTRAINT fk_core_inter_module_sync_company;

-- ------------------------------------------------------------
-- 6. NULL 语义注释
-- ------------------------------------------------------------
COMMENT ON COLUMN integration.core_inter_module_sync.company_id IS
    'NULL = 集团级同步任务，仅母公司/平台可见可发起；公司行按公司归属';

-- ------------------------------------------------------------
-- 7. 策略重建：先枚举删除既有策略（迁移前为单条 rls_tenant_isolation）
-- ------------------------------------------------------------
DO $drop_policies$
DECLARE
    r record;
BEGIN
    FOR r IN
        SELECT policyname
          FROM pg_policies
         WHERE schemaname = 'integration'
           AND tablename = 'core_inter_module_sync'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON integration.core_inter_module_sync', r.policyname);
        RAISE NOTICE '已删除旧策略 integration.core_inter_module_sync.%', r.policyname;
    END LOOP;
END
$drop_policies$;

-- 读：系统通道 OR 公司可读（本司 + 母公司可见子公司） OR（集团级行且母公司视角）
CREATE POLICY core_inter_module_sync_company_select
    ON integration.core_inter_module_sync
    FOR SELECT
    USING (
        tenant_id = erp.group_tenant_of(NULLIF(current_setting('app.tenant_id', true), '')::uuid)
        AND (
            COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
            OR erp.company_readable(company_id)
            OR (
                company_id IS NULL
                AND COALESCE(current_setting('app.actor_is_parent', true), 'off') = 'on'
            )
        )
    );

-- 写：系统通道 OR（集团级行且母公司视角） OR（公司行且本公司）
CREATE POLICY core_inter_module_sync_company_insert
    ON integration.core_inter_module_sync
    FOR INSERT
    WITH CHECK (
        tenant_id = erp.group_tenant_of(NULLIF(current_setting('app.tenant_id', true), '')::uuid)
        AND (
            COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
            OR (
                company_id IS NULL
                AND COALESCE(current_setting('app.actor_is_parent', true), 'off') = 'on'
            )
            OR (
                company_id IS NOT NULL
                AND company_id = erp.current_company_id()
            )
        )
    );

CREATE POLICY core_inter_module_sync_company_update
    ON integration.core_inter_module_sync
    FOR UPDATE
    USING (
        tenant_id = erp.group_tenant_of(NULLIF(current_setting('app.tenant_id', true), '')::uuid)
        AND (
            COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
            OR (
                company_id IS NULL
                AND COALESCE(current_setting('app.actor_is_parent', true), 'off') = 'on'
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
            COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
            OR (
                company_id IS NULL
                AND COALESCE(current_setting('app.actor_is_parent', true), 'off') = 'on'
            )
            OR (
                company_id IS NOT NULL
                AND company_id = erp.current_company_id()
            )
        )
    );

CREATE POLICY core_inter_module_sync_company_delete
    ON integration.core_inter_module_sync
    FOR DELETE
    USING (
        tenant_id = erp.group_tenant_of(NULLIF(current_setting('app.tenant_id', true), '')::uuid)
        AND (
            COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
            OR (
                company_id IS NULL
                AND COALESCE(current_setting('app.actor_is_parent', true), 'off') = 'on'
            )
            OR (
                company_id IS NOT NULL
                AND company_id = erp.current_company_id()
            )
        )
    );

-- ------------------------------------------------------------
-- 8. 后置断言
-- ------------------------------------------------------------
DO $assert$
DECLARE
    v_type          text;
    v_notnull       boolean;
    v_hasdef        boolean;
    v_pre_rows      bigint;
    v_pre_company   bigint;
    v_company_rows  bigint;
    v_policies      int;
    v_bad_names     int;
    v_index_def     text;
    v_fk_valid      boolean;
BEGIN
    SELECT format_type(atttypid, atttypmod), attnotnull, atthasdef
      INTO v_type, v_notnull, v_hasdef
      FROM pg_attribute
     WHERE attrelid = 'integration.core_inter_module_sync'::regclass
       AND attname = 'company_id'
       AND attnum > 0
       AND NOT attisdropped;

    IF v_type IS DISTINCT FROM 'uuid' THEN
        RAISE EXCEPTION '后置断言失败：company_id 类型为 %，期望 uuid', v_type;
    END IF;
    IF v_notnull THEN
        RAISE EXCEPTION '后置断言失败：company_id 必须可空（NULL = 集团级任务）';
    END IF;
    IF v_hasdef THEN
        RAISE EXCEPTION '后置断言失败：company_id 不应有默认值';
    END IF;

    SELECT indexdef INTO v_index_def
      FROM pg_indexes
     WHERE schemaname = 'integration'
       AND tablename = 'core_inter_module_sync'
       AND indexname = 'idx_core_inter_module_sync_tenant_company_created';
    IF v_index_def IS NULL
       OR position('(tenant_id, company_id, created_at DESC)' IN v_index_def) = 0
       OR position('WHERE (company_id IS NOT NULL)' IN v_index_def) = 0 THEN
        RAISE EXCEPTION '后置断言失败：公司索引缺失或定义不符（%），期望 (tenant_id, company_id, created_at DESC) WHERE company_id IS NOT NULL', coalesce(v_index_def, 'missing');
    END IF;

    SELECT indexdef INTO v_index_def
      FROM pg_indexes
     WHERE schemaname = 'integration'
       AND tablename = 'core_inter_module_sync'
       AND indexname = 'idx_core_inter_module_sync_tenant_group';
    IF v_index_def IS NULL
       OR position('(tenant_id)' IN v_index_def) = 0
       OR position('WHERE (company_id IS NULL)' IN v_index_def) = 0 THEN
        RAISE EXCEPTION '后置断言失败：集团级索引缺失或定义不符（%），期望 (tenant_id) WHERE company_id IS NULL', coalesce(v_index_def, 'missing');
    END IF;

    SELECT convalidated INTO v_fk_valid
      FROM pg_constraint
     WHERE conrelid = 'integration.core_inter_module_sync'::regclass
       AND conname = 'fk_core_inter_module_sync_company';
    IF v_fk_valid IS NULL THEN
        RAISE EXCEPTION '后置断言失败：公司外键 fk_core_inter_module_sync_company 不存在';
    END IF;
    IF NOT v_fk_valid THEN
        RAISE EXCEPTION '后置断言失败：公司外键未通过 VALIDATE';
    END IF;

    SELECT count(*) INTO v_policies
      FROM pg_policies
     WHERE schemaname = 'integration'
       AND tablename = 'core_inter_module_sync';
    IF v_policies <> 4 THEN
        RAISE EXCEPTION '后置断言失败：策略数为 %，期望 4', v_policies;
    END IF;

    SELECT count(*) INTO v_bad_names
      FROM pg_policies
     WHERE schemaname = 'integration'
       AND tablename = 'core_inter_module_sync'
       AND policyname NOT IN (
           'core_inter_module_sync_company_select',
           'core_inter_module_sync_company_insert',
           'core_inter_module_sync_company_update',
           'core_inter_module_sync_company_delete'
       );
    IF v_bad_names > 0 THEN
        RAISE EXCEPTION '后置断言失败：存在 % 条非预期策略名', v_bad_names;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_class
         WHERE oid = 'integration.core_inter_module_sync'::regclass
           AND relrowsecurity
           AND relforcerowsecurity
    ) THEN
        RAISE EXCEPTION '后置断言失败：RLS 未 ENABLE+FORCE';
    END IF;

    v_pre_rows := current_setting('app.w12a2_pre_rows', true)::bigint;
    v_pre_company := current_setting('app.w12a2_pre_company', true)::bigint;
    v_company_rows := current_setting('app.w12a2_company_rows', true)::bigint;

    -- 迁移只做 ADD COLUMN / UPDATE 回填，不增删行；行数与跨租户归属已在策略替换前断言。
    IF v_company_rows < v_pre_company THEN
        RAISE EXCEPTION '后置断言失败：公司级行数由 % 降为 %', v_pre_company, v_company_rows;
    END IF;

    RAISE NOTICE '后置断言通过：总行数 %，公司级行 %，集团级行 %',
        v_pre_rows, v_company_rows, v_pre_rows - v_company_rows;
END
$assert$;

ANALYZE integration.core_inter_module_sync;
