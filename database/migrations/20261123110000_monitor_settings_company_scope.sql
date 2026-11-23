-- ============================================================
-- 20261123110000_monitor_settings_company_scope.sql
--
-- W12-B1：public.monitor_settings 参数分级与公司级隔离（平台/母版/公司三层）
--
-- 业务定性（2026-11-23 回改裁决）：
--   * 三层取值：本司行 > 集团母版行（tenant_id 非空、company_id NULL）>
--     平台默认行（tenant_id/company_id 均 NULL）；
--   * override_policy 三档：platform_only（平台锁定，公司不可覆盖）、
--     company_overridable（公司可覆盖）、company_only（只对公司有意义）；
--   * 存量默认：平台行 platform_only（fail-closed，运维逐个放开）；
--     集团母版行 company_overridable；
--   * 迁移不推断、不阻断：所有存量租户级行保留为集团母版行（company_id 仍 NULL），
--     多公司租户同样保留，不再按公司拆分或中止；
--   * platform_only 的键不允许存在公司行：CHECK（行级）+ 触发器（跨行）双重兜底；
--   * 平台行没有任何业务写权限，只能由平台通道（app.rls_system='on'）维护；
--     公司行本司可读写，母公司经 erp.company_readable 只读子公司、不可代写。
--
-- 变更内容：
--   1. 前置断言：表/公司表/erp 函数存在；平台行与母版行 (tenant,key) 无重复。
--   2. 新增 company_id uuid（可空、无默认）与 override_policy varchar(32)
--      NOT NULL DEFAULT 'platform_only'。
--   3. 统一回填：平台行保持 platform_only；存量租户级行保留为母版并置
--      company_overridable；既有公司行按母版策略归一，platform_only 冲突显式阻断。
--   4. 删除旧唯一索引 uq_monitor_settings_tenant_key (tenant_id, key)。
--   5. 建「母版/平台行」与「公司行」两条部分唯一索引：
--        default: (COALESCE(tenant_id, 零UUID), key) WHERE company_id IS NULL
--        company: (tenant_id, company_id, key) WHERE company_id IS NOT NULL
--      COALESCE 是为了让平台行（tenant_id NULL）也受唯一约束；纯 (tenant_id,key)
--      在 PostgreSQL 下 NULL 互不相等，会让平台重复键漏过。
--   6. CHECK：company_id/tenant_id 空值配对、override_policy 取值、
--      platform_only 不得出现在公司行、company_only 不得出现在母版/平台行。
--   7. 触发器：公司行写入前校验同 key 的母版/平台策略，platform_only 拒绝（42501）。
--   8. 同租户公司外键；company_id / override_policy 语义 COMMENT。
--   9. 显式 ENABLE + FORCE RLS；枚举并删除既有策略，重建 5 条（形状不变）：
--        company_select（平台行所有公司只读 + 公司行按本司/母公司可见）
--        company_insert/update/delete（仅本公司行）
--        platform_maintain（FOR ALL，仅系统/平台通道）
--  10. 后置断言：列类型/可空/默认、索引谓词、CHECK 与外键已 VALIDATE、
--      策略数=5、触发器存在、母版/平台策略归一、RLS ENABLE+FORCE。
--
-- 幂等性：ADD COLUMN IF NOT EXISTS / CREATE INDEX IF NOT EXISTS / 约束与触发器守卫；
--   回填只把母版统一为 company_overridable，不改变 company_id 归属。
-- 文件内不含 BEGIN/COMMIT：入口统一用 psql --single-transaction / sqlx 事务包裹。
-- 回滚：database/rollback/20261123110000_monitor_settings_company_scope.rollback.sql
-- ============================================================

SET lock_timeout = '5s';
SET statement_timeout = '120s';

-- FORCE RLS 下 owner 同样受策略约束；统计、回填与断言需要全量可见。
SELECT set_config('app.rls_system', 'on', false);

-- ------------------------------------------------------------
-- 1. 前置断言 + 加列 + 统一回填（保留集团母版）+ 计数留痕
-- ------------------------------------------------------------
DO $w12b1$
DECLARE
    v_fresh          boolean;
    v_pre_rows       bigint;
    v_pre_company    bigint;
    v_platform       bigint;
    v_master         bigint;
    v_company_rows   bigint;
    v_company_fixed  bigint;
    v_conflict       bigint;
    v_platform_dups  bigint;
    v_master_dups    bigint;
    v_sample         text;
BEGIN
    IF to_regclass('public.monitor_settings') IS NULL THEN
        RAISE EXCEPTION '前置断言失败：public.monitor_settings 不存在';
    END IF;
    IF to_regclass('hrm.companies') IS NULL THEN
        RAISE EXCEPTION '前置断言失败：hrm.companies 不存在（B1 依赖公司表）';
    END IF;
    IF to_regprocedure('erp.group_tenant_of(uuid)') IS NULL
       OR to_regprocedure('erp.current_company_id()') IS NULL
       OR to_regprocedure('erp.company_readable(uuid)') IS NULL THEN
        RAISE EXCEPTION '前置断言失败：erp 公司维度函数缺失（group_tenant_of/current_company_id/company_readable）';
    END IF;

    SELECT NOT EXISTS (
        SELECT 1
          FROM pg_attribute
         WHERE attrelid = 'public.monitor_settings'::regclass
           AND attname = 'company_id'
           AND attnum > 0
           AND NOT attisdropped
    ) INTO v_fresh;

    -- 平台行按 key 唯一；重复会让「母版/平台行」部分唯一索引无法建立。
    SELECT count(*) INTO v_platform_dups
      FROM (
            SELECT key
              FROM public.monitor_settings
             WHERE tenant_id IS NULL AND deleted_at IS NULL
             GROUP BY key
            HAVING count(*) > 1
           ) d;
    IF v_platform_dups > 0 THEN
        RAISE EXCEPTION '前置断言失败：存在 % 组重复平台设置 key，无法建立默认行部分唯一索引；请先合并平台行', v_platform_dups;
    END IF;

    -- 母版行 (tenant_id, key) 唯一；重入时只看 company_id IS NULL 的行。
    IF v_fresh THEN
        SELECT count(*) INTO v_master_dups
          FROM (
                SELECT tenant_id, key
                  FROM public.monitor_settings
                 WHERE tenant_id IS NOT NULL AND deleted_at IS NULL
                 GROUP BY tenant_id, key
                HAVING count(*) > 1
               ) d;
    ELSE
        EXECUTE 'SELECT count(*) FROM (
                   SELECT tenant_id, key
                     FROM public.monitor_settings
                    WHERE tenant_id IS NOT NULL AND company_id IS NULL AND deleted_at IS NULL
                    GROUP BY tenant_id, key
                   HAVING count(*) > 1
                 ) d' INTO v_master_dups;
    END IF;
    IF v_master_dups > 0 THEN
        RAISE EXCEPTION '前置断言失败：存在 % 组重复集团母版设置 (tenant_id, key)，无法建立默认行部分唯一索引；请先合并母版行', v_master_dups;
    END IF;

    SELECT count(*) INTO v_pre_rows FROM public.monitor_settings;

    IF v_fresh THEN
        v_pre_company := 0;
    ELSE
        EXECUTE 'SELECT count(*) FROM public.monitor_settings WHERE company_id IS NOT NULL'
           INTO v_pre_company;
        RAISE NOTICE '幂等重入：company_id 已存在，存量 % 行、公司级 % 行保持不变',
            v_pre_rows, v_pre_company;
    END IF;

    -- 2. 加列：company_id 存量行为 NULL（= 母版/平台），override_policy 默认 platform_only。
    EXECUTE 'ALTER TABLE public.monitor_settings ADD COLUMN IF NOT EXISTS company_id uuid';
    EXECUTE 'ALTER TABLE public.monitor_settings '
         || 'ADD COLUMN IF NOT EXISTS override_policy varchar(32) '
         || 'NOT NULL DEFAULT ''platform_only''';

    -- 3a. 平台行：tenant_id IS NULL 保持 company_id NULL 与 platform_only（默认值）。
    -- 3b. 集团母版行：tenant_id 非空、company_id NULL 一律保留，不推断、不拆分。
    UPDATE public.monitor_settings
       SET override_policy = 'company_overridable'
     WHERE company_id IS NULL
       AND tenant_id IS NOT NULL
       AND override_policy <> 'company_overridable';
    GET DIAGNOSTICS v_master = ROW_COUNT;

    -- 3c. 既有公司行（正常应为 0）：按同 key 的母版/平台策略归一。
    UPDATE public.monitor_settings c
       SET override_policy = CASE
             WHEN EXISTS (
                 SELECT 1
                   FROM public.monitor_settings d
                  WHERE d.deleted_at IS NULL
                    AND d.company_id IS NULL
                    AND d.key = c.key
                    AND (d.tenant_id = c.tenant_id OR d.tenant_id IS NULL)
             ) THEN 'company_overridable'
             ELSE 'company_only'
           END
     WHERE c.company_id IS NOT NULL;
    GET DIAGNOSTICS v_company_fixed = ROW_COUNT;

    -- 3d. platform_only 的键不允许存在公司行：存量冲突明确阻断，不静默改策略。
    SELECT count(*) INTO v_conflict
      FROM public.monitor_settings c
      JOIN public.monitor_settings d
        ON d.deleted_at IS NULL
       AND d.company_id IS NULL
       AND d.key = c.key
       AND (d.tenant_id = c.tenant_id OR d.tenant_id IS NULL)
     WHERE c.company_id IS NOT NULL
       AND d.override_policy = 'platform_only';

    IF v_conflict > 0 THEN
        SELECT string_agg(tenant_id::text || ':' || key, '; ' ORDER BY tenant_id, key)
          INTO v_sample
          FROM (
                SELECT c.tenant_id, c.key
                  FROM public.monitor_settings c
                  JOIN public.monitor_settings d
                    ON d.deleted_at IS NULL
                   AND d.company_id IS NULL
                   AND d.key = c.key
                   AND (d.tenant_id = c.tenant_id OR d.tenant_id IS NULL)
                 WHERE c.company_id IS NOT NULL
                   AND d.override_policy = 'platform_only'
                 ORDER BY c.tenant_id, c.key
                 LIMIT 10
               ) s;
        RAISE EXCEPTION '平台锁定冲突：% 行公司设置对应的母版/平台策略为 platform_only，不允许公司覆盖。示例：%。请先由平台运维放开策略或归档公司行后重跑', v_conflict, v_sample;
    END IF;

    EXECUTE 'SELECT count(*) FROM public.monitor_settings WHERE company_id IS NOT NULL'
       INTO v_company_rows;
    EXECUTE 'SELECT count(*) FROM public.monitor_settings WHERE tenant_id IS NULL AND company_id IS NULL'
       INTO v_platform;

    PERFORM set_config('app.w12b1_pre_rows', v_pre_rows::text, true);
    PERFORM set_config('app.w12b1_pre_company', v_pre_company::text, true);
    PERFORM set_config('app.w12b1_company_rows', v_company_rows::text, true);

    RAISE NOTICE '统一回填：总行数 %；平台默认行 %；集团母版归一 % 行；既有公司行归一 % 行；公司行合计 % 行',
        v_pre_rows, v_platform, v_master, v_company_fixed, v_company_rows;
END
$w12b1$;

-- ------------------------------------------------------------
-- 4. 唯一约束替换：旧 (tenant_id, key) → 「母版/平台行」+「公司行」两条部分唯一索引
-- ------------------------------------------------------------
DROP INDEX IF EXISTS public.uq_monitor_settings_tenant_key;
DROP INDEX IF EXISTS public.uq_monitor_settings_platform;
DROP INDEX IF EXISTS public.uq_monitor_settings_company;

-- 母版/平台行：tenant_id 非空 = 集团母版行，NULL = 平台默认行。
-- COALESCE 零 UUID 让平台行（tenant_id NULL）同样受唯一约束；纯 (tenant_id, key)
-- 在 PostgreSQL 下 NULL 互不相等，平台重复键会漏过。
CREATE UNIQUE INDEX IF NOT EXISTS uq_monitor_settings_default
    ON public.monitor_settings (COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid), key)
    WHERE company_id IS NULL AND deleted_at IS NULL;

-- 公司行：本司覆盖行。
CREATE UNIQUE INDEX IF NOT EXISTS uq_monitor_settings_company
    ON public.monitor_settings (tenant_id, company_id, key)
    WHERE company_id IS NOT NULL AND deleted_at IS NULL;

-- ------------------------------------------------------------
-- 5. CHECK：作用域配对、override_policy 取值、策略与作用域一致
-- ------------------------------------------------------------
DO $check$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
         WHERE conrelid = 'public.monitor_settings'::regclass
           AND conname = 'chk_monitor_settings_company_tenant'
    ) THEN
        EXECUTE 'ALTER TABLE public.monitor_settings '
             || 'ADD CONSTRAINT chk_monitor_settings_company_tenant '
             || 'CHECK (company_id IS NULL OR tenant_id IS NOT NULL) NOT VALID';
    END IF;
END
$check$;

ALTER TABLE public.monitor_settings
    VALIDATE CONSTRAINT chk_monitor_settings_company_tenant;

DO $check_policy$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
         WHERE conrelid = 'public.monitor_settings'::regclass
           AND conname = 'chk_monitor_settings_override_policy_values'
    ) THEN
        EXECUTE 'ALTER TABLE public.monitor_settings '
             || 'ADD CONSTRAINT chk_monitor_settings_override_policy_values '
             || 'CHECK (override_policy IN (''platform_only'', ''company_overridable'', ''company_only'')) NOT VALID';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
         WHERE conrelid = 'public.monitor_settings'::regclass
           AND conname = 'chk_monitor_settings_override_policy_scope'
    ) THEN
        EXECUTE 'ALTER TABLE public.monitor_settings '
             || 'ADD CONSTRAINT chk_monitor_settings_override_policy_scope '
             || 'CHECK ('
             || '(override_policy <> ''platform_only'' OR company_id IS NULL) AND '
             || '(override_policy <> ''company_only'' OR company_id IS NOT NULL)'
             || ') NOT VALID';
    END IF;
END
$check_policy$;

ALTER TABLE public.monitor_settings
    VALIDATE CONSTRAINT chk_monitor_settings_override_policy_values;

ALTER TABLE public.monitor_settings
    VALIDATE CONSTRAINT chk_monitor_settings_override_policy_scope;

-- ------------------------------------------------------------
-- 6. 同租户公司外键（平台行 tenant_id/company_id 均为 NULL，MATCH SIMPLE 下不校验）
-- ------------------------------------------------------------
DO $fk$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
         WHERE conrelid = 'public.monitor_settings'::regclass
           AND conname = 'fk_monitor_settings_company'
    ) THEN
        EXECUTE 'ALTER TABLE public.monitor_settings '
             || 'ADD CONSTRAINT fk_monitor_settings_company '
             || 'FOREIGN KEY (tenant_id, company_id) REFERENCES hrm.companies(tenant_id, id) NOT VALID';
    END IF;
END
$fk$;

ALTER TABLE public.monitor_settings
    VALIDATE CONSTRAINT fk_monitor_settings_company;

-- ------------------------------------------------------------
-- 7. override_policy 跨行约束：母版/平台行 platform_only 时禁止公司行
--    （行级 CHECK 只能保证单行自洽，跨行关系由 BEFORE 触发器兜底）
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.monitor_settings_enforce_override_policy()
RETURNS trigger
LANGUAGE plpgsql
AS $policy_fn$
DECLARE
    v_policy text;
BEGIN
    IF NEW.company_id IS NOT NULL THEN
        -- 同 key 的母版行优先于平台默认行。
        SELECT d.override_policy
          INTO v_policy
          FROM public.monitor_settings d
         WHERE d.deleted_at IS NULL
           AND d.company_id IS NULL
           AND d.key = NEW.key
           AND (d.tenant_id = NEW.tenant_id OR d.tenant_id IS NULL)
         ORDER BY (d.tenant_id IS NULL)
         LIMIT 1;

        IF v_policy = 'platform_only' THEN
            RAISE EXCEPTION '参数 % 的母版/平台策略为 platform_only，公司行不可覆盖', NEW.key
                USING ERRCODE = 'insufficient_privilege',
                      HINT = '请由平台运维放开 override_policy 后再写公司行';
        END IF;
    END IF;

    RETURN NEW;
END
$policy_fn$;

DROP TRIGGER IF EXISTS trg_monitor_settings_override_policy ON public.monitor_settings;
CREATE TRIGGER trg_monitor_settings_override_policy
    BEFORE INSERT OR UPDATE OF key, tenant_id, company_id, override_policy
    ON public.monitor_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.monitor_settings_enforce_override_policy();

-- ------------------------------------------------------------
-- 8. NULL 语义注释
-- ------------------------------------------------------------
COMMENT ON COLUMN public.monitor_settings.company_id IS
    'NULL = 集团母版行（tenant_id 非空）或平台默认行（tenant_id 也为 NULL）；非空 = 公司覆盖行';

COMMENT ON COLUMN public.monitor_settings.override_policy IS
    'platform_only=平台锁定公司不可覆盖；company_overridable=公司可覆盖；company_only=只对公司有意义';

-- ------------------------------------------------------------
-- 9. 策略重建：先枚举删除既有策略（迁移前为单条 rls_tenant_isolation）
-- ------------------------------------------------------------
DO $drop_policies$
DECLARE
    r record;
BEGIN
    FOR r IN
        SELECT policyname
          FROM pg_policies
         WHERE schemaname = 'public'
           AND tablename = 'monitor_settings'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.monitor_settings', r.policyname);
        RAISE NOTICE '已删除旧策略 public.monitor_settings.%', r.policyname;
    END LOOP;
END
$drop_policies$;

-- 读取：平台参数行所有公司只读；集团母版行对本集团所有公司只读；
-- 公司行按本司 + 母公司可见子公司（系统通道全可见）。
-- 平台行分支不要求租户上下文——平台参数本身不含租户数据；写权限不在本策略内。
CREATE POLICY monitor_settings_company_select
    ON public.monitor_settings
    FOR SELECT
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR (tenant_id IS NULL AND company_id IS NULL)
        OR (
            tenant_id = erp.group_tenant_of(NULLIF(current_setting('app.tenant_id', true), '')::uuid)
            AND (company_id IS NULL OR erp.company_readable(company_id))
        )
    );

-- 业务写：只落公司行，且只能写本公司。
CREATE POLICY monitor_settings_company_insert
    ON public.monitor_settings
    FOR INSERT
    WITH CHECK (
        tenant_id = erp.group_tenant_of(NULLIF(current_setting('app.tenant_id', true), '')::uuid)
        AND company_id IS NOT NULL
        AND company_id = erp.current_company_id()
    );

CREATE POLICY monitor_settings_company_update
    ON public.monitor_settings
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

CREATE POLICY monitor_settings_company_delete
    ON public.monitor_settings
    FOR DELETE
    USING (
        tenant_id = erp.group_tenant_of(NULLIF(current_setting('app.tenant_id', true), '')::uuid)
        AND company_id IS NOT NULL
        AND company_id = erp.current_company_id()
    );

-- 平台默认行：只允许平台通道维护，业务写路径没有任何权限。
CREATE POLICY monitor_settings_platform_maintain
    ON public.monitor_settings
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
-- 10. 后置断言
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
    v_policy_notnull boolean;
    v_bad_policy    bigint;
    v_bad_platform  bigint;
    v_bad_master    bigint;
    v_conflict      bigint;
BEGIN
    SELECT format_type(atttypid, atttypmod), attnotnull, atthasdef
      INTO v_type, v_notnull, v_hasdef
      FROM pg_attribute
     WHERE attrelid = 'public.monitor_settings'::regclass
       AND attname = 'company_id'
       AND attnum > 0
       AND NOT attisdropped;

    IF v_type IS DISTINCT FROM 'uuid' THEN
        RAISE EXCEPTION '后置断言失败：company_id 类型为 %，期望 uuid', v_type;
    END IF;
    IF v_notnull THEN
        RAISE EXCEPTION '后置断言失败：company_id 必须可空（NULL = 母版/平台行）';
    END IF;
    IF v_hasdef THEN
        RAISE EXCEPTION '后置断言失败：company_id 不应有默认值';
    END IF;

    SELECT attnotnull INTO v_policy_notnull
      FROM pg_attribute
     WHERE attrelid = 'public.monitor_settings'::regclass
       AND attname = 'override_policy'
       AND attnum > 0
       AND NOT attisdropped;
    IF v_policy_notnull IS NULL THEN
        RAISE EXCEPTION '后置断言失败：override_policy 列不存在';
    END IF;
    IF NOT v_policy_notnull THEN
        RAISE EXCEPTION '后置断言失败：override_policy 必须 NOT NULL';
    END IF;

    SELECT count(*) INTO v_bad_policy
      FROM public.monitor_settings
     WHERE override_policy NOT IN ('platform_only', 'company_overridable', 'company_only');
    IF v_bad_policy > 0 THEN
        RAISE EXCEPTION '后置断言失败：存在 % 行 override_policy 取值非法', v_bad_policy;
    END IF;

    SELECT count(*) INTO v_bad_platform
      FROM public.monitor_settings
     WHERE tenant_id IS NULL AND company_id IS NULL AND override_policy <> 'platform_only';
    IF v_bad_platform > 0 THEN
        RAISE EXCEPTION '后置断言失败：% 行平台默认行不是 platform_only', v_bad_platform;
    END IF;

    SELECT count(*) INTO v_bad_master
      FROM public.monitor_settings
     WHERE tenant_id IS NOT NULL AND company_id IS NULL AND override_policy <> 'company_overridable';
    IF v_bad_master > 0 THEN
        RAISE EXCEPTION '后置断言失败：% 行集团母版行不是 company_overridable', v_bad_master;
    END IF;

    SELECT count(*) INTO v_conflict
      FROM public.monitor_settings c
      JOIN public.monitor_settings d
        ON d.deleted_at IS NULL
       AND d.company_id IS NULL
       AND d.key = c.key
       AND (d.tenant_id = c.tenant_id OR d.tenant_id IS NULL)
     WHERE c.company_id IS NOT NULL
       AND d.override_policy = 'platform_only';
    IF v_conflict > 0 THEN
        RAISE EXCEPTION '后置断言失败：% 行公司设置对应 platform_only 的母版/平台行', v_conflict;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'uq_monitor_settings_tenant_key') THEN
        RAISE EXCEPTION '后置断言失败：旧唯一索引 uq_monitor_settings_tenant_key 仍存在';
    END IF;

    SELECT indexdef INTO v_index_def
      FROM pg_indexes
     WHERE schemaname = 'public'
       AND tablename = 'monitor_settings'
       AND indexname = 'uq_monitor_settings_default';
    IF v_index_def IS NULL
       OR position('''00000000-0000-0000-0000-000000000000''::uuid' IN v_index_def) = 0
       OR position('WHERE ((company_id IS NULL) AND (deleted_at IS NULL))' IN v_index_def) = 0 THEN
        RAISE EXCEPTION '后置断言失败：母版/平台唯一索引缺失或定义不符（%）', coalesce(v_index_def, 'missing');
    END IF;

    SELECT indexdef INTO v_index_def
      FROM pg_indexes
     WHERE schemaname = 'public'
       AND tablename = 'monitor_settings'
       AND indexname = 'uq_monitor_settings_company';
    IF v_index_def IS NULL
       OR position('(tenant_id, company_id, key)' IN v_index_def) = 0
       OR position('WHERE ((company_id IS NOT NULL) AND (deleted_at IS NULL))' IN v_index_def) = 0 THEN
        RAISE EXCEPTION '后置断言失败：公司唯一索引缺失或定义不符（%）', coalesce(v_index_def, 'missing');
    END IF;

    SELECT convalidated INTO v_check_valid
      FROM pg_constraint
     WHERE conrelid = 'public.monitor_settings'::regclass
       AND conname = 'chk_monitor_settings_company_tenant';
    IF v_check_valid IS NULL THEN
        RAISE EXCEPTION '后置断言失败：CHECK chk_monitor_settings_company_tenant 不存在';
    END IF;
    IF NOT v_check_valid THEN
        RAISE EXCEPTION '后置断言失败：CHECK chk_monitor_settings_company_tenant 未通过 VALIDATE';
    END IF;

    SELECT convalidated INTO v_check_valid
      FROM pg_constraint
     WHERE conrelid = 'public.monitor_settings'::regclass
       AND conname = 'chk_monitor_settings_override_policy_values';
    IF v_check_valid IS NULL THEN
        RAISE EXCEPTION '后置断言失败：CHECK chk_monitor_settings_override_policy_values 不存在';
    END IF;
    IF NOT v_check_valid THEN
        RAISE EXCEPTION '后置断言失败：CHECK chk_monitor_settings_override_policy_values 未通过 VALIDATE';
    END IF;

    SELECT convalidated INTO v_check_valid
      FROM pg_constraint
     WHERE conrelid = 'public.monitor_settings'::regclass
       AND conname = 'chk_monitor_settings_override_policy_scope';
    IF v_check_valid IS NULL THEN
        RAISE EXCEPTION '后置断言失败：CHECK chk_monitor_settings_override_policy_scope 不存在';
    END IF;
    IF NOT v_check_valid THEN
        RAISE EXCEPTION '后置断言失败：CHECK chk_monitor_settings_override_policy_scope 未通过 VALIDATE';
    END IF;

    IF NOT EXISTS (
        SELECT 1
          FROM pg_trigger
         WHERE tgrelid = 'public.monitor_settings'::regclass
           AND tgname = 'trg_monitor_settings_override_policy'
           AND NOT tgisinternal
    ) THEN
        RAISE EXCEPTION '后置断言失败：触发器 trg_monitor_settings_override_policy 不存在';
    END IF;

    IF NOT EXISTS (
        SELECT 1
          FROM pg_proc
         WHERE proname = 'monitor_settings_enforce_override_policy'
           AND pronamespace = 'public'::regnamespace
    ) THEN
        RAISE EXCEPTION '后置断言失败：函数 monitor_settings_enforce_override_policy 不存在';
    END IF;

    SELECT convalidated INTO v_fk_valid
      FROM pg_constraint
     WHERE conrelid = 'public.monitor_settings'::regclass
       AND conname = 'fk_monitor_settings_company';
    IF v_fk_valid IS NULL THEN
        RAISE EXCEPTION '后置断言失败：公司外键 fk_monitor_settings_company 不存在';
    END IF;
    IF NOT v_fk_valid THEN
        RAISE EXCEPTION '后置断言失败：公司外键未通过 VALIDATE';
    END IF;

    SELECT count(*) INTO v_policies
      FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename = 'monitor_settings';
    IF v_policies <> 5 THEN
        RAISE EXCEPTION '后置断言失败：策略数为 %，期望 5', v_policies;
    END IF;

    SELECT count(*) INTO v_bad_names
      FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename = 'monitor_settings'
       AND policyname NOT IN (
           'monitor_settings_company_select',
           'monitor_settings_company_insert',
           'monitor_settings_company_update',
           'monitor_settings_company_delete',
           'monitor_settings_platform_maintain'
       );
    IF v_bad_names > 0 THEN
        RAISE EXCEPTION '后置断言失败：存在 % 条非预期策略名', v_bad_names;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_class
         WHERE oid = 'public.monitor_settings'::regclass
           AND relrowsecurity
           AND relforcerowsecurity
    ) THEN
        RAISE EXCEPTION '后置断言失败：RLS 未 ENABLE+FORCE';
    END IF;

    v_pre_rows := current_setting('app.w12b1_pre_rows', true)::bigint;
    v_company_rows := current_setting('app.w12b1_company_rows', true)::bigint;

    RAISE NOTICE '后置断言通过：总行数 %，公司行 %，母版/平台行 %',
        v_pre_rows, v_company_rows, v_pre_rows - v_company_rows;
END
$assert$;

ANALYZE public.monitor_settings;
