-- ============================================================
-- 20261123150000_erp_orders_company_scope_rls.sql
--
-- W14：erp.sales_orders / erp.purchase_orders 公司级 RLS 策略
--
-- 背景：
--   * 两表已在 W13 第一段补 company_id（20261123140000 / 20261123141000），
--     但策略仍是租户级 rls_tenant_isolation，子公司可互看同租户其他公司订单；
--   * 本迁移只替换策略，不改表结构、不改写入路径、不动数据；
--   * 执行顺序必须在 W13 第二段（回填 → 零 NULL → 影子读）之后：
--     策略谓词依赖稳定的 company_id 归属，残留 NULL/错归属会让可见性不可解释。
--
-- 策略形状（两表一致，permissive 并集，共 3 条/表）：
--   1) <table>_company_read（SELECT）
--        tenant_id = erp.group_tenant_of(app.tenant_id)
--        AND (company_id = erp.current_company_id()
--             OR erp.company_readable(company_id))            -- 本司 + 母公司可见清单
--   2) <table>_company_write（ALL）
--        USING / WITH CHECK 同式：租户匹配 AND company_id 非空
--        AND company_id = erp.current_company_id()          -- 只写本司，父通道不代写
--   3) <table>_system（ALL）
--        app.rls_system='on'                                 -- 平台/迁移/对账通道
--
-- company_id IS NULL 的可见归属（明确定义，不留「取决于谁连」）：
--   * NULL 视为「集团/平台行」；
--   * 读：仅平台通道（app.rls_system='on'）与母公司通道
--         （app.actor_is_parent='on'）可见；子公司一律不可见；
--   * 写：仅平台通道；业务（含母公司）不得写 NULL 行。
--   本迁移执行前提为两表 company_id IS NULL = 0（W13 第二段已回填）；
--   该分支仅作 fail-closed 兜底，不得用于承载未回填订单。
--
-- 写检查（WITH CHECK）依据：
--   订单由业务服务在请求公司上下文下写入，与 monitor_settings/system_settings
--   的公司级范式一致（本司可写、父通道只扩读不扩写，Q-G4 仅审批与下达）；
--   若只做 SELECT 策略而沿用租户级 ALL 策略，写入仍会跨公司放行，等于没改造。
--   因此显式替换租户级 ALL 策略，写策略同时给 USING 与 WITH CHECK。
--
-- 幂等性：策略先按名 DROP IF EXISTS 再建；RLS ENABLE/FORCE 幂等；
--   文件内不含 BEGIN/COMMIT（由 apply-forward / psql --single-transaction 包裹）。
-- 回滚：database/rollback/20261123150000_erp_orders_company_scope_rls.rollback.sql
-- ============================================================

SET lock_timeout = '5s';
SET statement_timeout = '120s';

-- FORCE RLS 下 owner 也受策略约束；统计与断言需要全量可见。
SELECT set_config('app.rls_system', 'on', false);

-- ------------------------------------------------------------
-- 1. 前置断言 + 基线留痕（行数 / NULL 数）
-- ------------------------------------------------------------
DO $w14_pre$
DECLARE
    v_bad_policies integer;
    v_so_rows      bigint;
    v_po_rows      bigint;
    v_so_null      bigint;
    v_po_null      bigint;
BEGIN
    IF to_regclass('erp.sales_orders') IS NULL THEN
        RAISE EXCEPTION '前置断言失败：erp.sales_orders 不存在';
    END IF;
    IF to_regclass('erp.purchase_orders') IS NULL THEN
        RAISE EXCEPTION '前置断言失败：erp.purchase_orders 不存在';
    END IF;

    IF to_regprocedure('erp.group_tenant_of(uuid)') IS NULL
       OR to_regprocedure('erp.current_company_id()') IS NULL
       OR to_regprocedure('erp.company_readable(uuid)') IS NULL THEN
        RAISE EXCEPTION '前置断言失败：erp 公司维度函数缺失（group_tenant_of/current_company_id/company_readable）';
    END IF;

    IF NOT EXISTS (
        SELECT 1
          FROM information_schema.columns
         WHERE table_schema = 'erp'
           AND table_name = 'sales_orders'
           AND column_name = 'company_id'
           AND data_type = 'uuid'
           AND is_nullable = 'YES'
           AND column_default IS NULL
    ) THEN
        RAISE EXCEPTION '前置断言失败：erp.sales_orders.company_id 类型/可空/默认不符合预期';
    END IF;

    IF NOT EXISTS (
        SELECT 1
          FROM information_schema.columns
         WHERE table_schema = 'erp'
           AND table_name = 'purchase_orders'
           AND column_name = 'company_id'
           AND data_type = 'uuid'
           AND is_nullable = 'YES'
           AND column_default IS NULL
    ) THEN
        RAISE EXCEPTION '前置断言失败：erp.purchase_orders.company_id 类型/可空/默认不符合预期';
    END IF;

    -- 只允许「旧租户级策略」或「本次 3 条新策略」，其余策略先停下核对，避免误删。
    SELECT count(*) INTO v_bad_policies
      FROM pg_policies
     WHERE schemaname = 'erp'
       AND tablename IN ('sales_orders', 'purchase_orders')
       AND policyname NOT IN (
           'rls_tenant_isolation',
           'sales_orders_company_read',
           'sales_orders_company_write',
           'sales_orders_system',
           'purchase_orders_company_read',
           'purchase_orders_company_write',
           'purchase_orders_system'
       );
    IF v_bad_policies > 0 THEN
        RAISE EXCEPTION '前置断言失败：订单两表存在 % 条非预期策略，请先人工核对', v_bad_policies;
    END IF;

    SELECT count(*), count(*) FILTER (WHERE company_id IS NULL)
      INTO v_so_rows, v_so_null
      FROM erp.sales_orders;
    SELECT count(*), count(*) FILTER (WHERE company_id IS NULL)
      INTO v_po_rows, v_po_null
      FROM erp.purchase_orders;

    PERFORM set_config('app.w14_pre_so_rows', v_so_rows::text, false);
    PERFORM set_config('app.w14_pre_po_rows', v_po_rows::text, false);
    PERFORM set_config('app.w14_pre_so_null', v_so_null::text, false);
    PERFORM set_config('app.w14_pre_po_null', v_po_null::text, false);

    RAISE NOTICE 'W14 基线：sales_orders % 行（NULL %）、purchase_orders % 行（NULL %）',
        v_so_rows, v_so_null, v_po_rows, v_po_null;

    IF v_so_null > 0 OR v_po_null > 0 THEN
        RAISE WARNING 'W14 前置提示：两表仍有 NULL 归属（sales=% / purchase=%），仅在演练或 W13 第二段未完成时出现；生产窗口不得带 NULL 执行',
            v_so_null, v_po_null;
    END IF;
END
$w14_pre$;

-- ------------------------------------------------------------
-- 2. 替换策略：删除租户级与本迁移 3 条（幂等重入），重建公司级
-- ------------------------------------------------------------
DROP POLICY IF EXISTS rls_tenant_isolation ON erp.sales_orders;
DROP POLICY IF EXISTS sales_orders_company_read ON erp.sales_orders;
DROP POLICY IF EXISTS sales_orders_company_write ON erp.sales_orders;
DROP POLICY IF EXISTS sales_orders_system ON erp.sales_orders;

DROP POLICY IF EXISTS rls_tenant_isolation ON erp.purchase_orders;
DROP POLICY IF EXISTS purchase_orders_company_read ON erp.purchase_orders;
DROP POLICY IF EXISTS purchase_orders_company_write ON erp.purchase_orders;
DROP POLICY IF EXISTS purchase_orders_system ON erp.purchase_orders;

-- 读：本司 + 母公司可见清单；NULL = 集团/平台行，仅母公司通道可见。
CREATE POLICY sales_orders_company_read
    ON erp.sales_orders
    FOR SELECT
    USING (
        tenant_id = erp.group_tenant_of(
            NULLIF(current_setting('app.tenant_id', true), '')::uuid
        )
        AND (
            (
                company_id IS NOT NULL
                AND (
                    company_id = erp.current_company_id()
                    OR erp.company_readable(company_id)
                )
            )
            OR (
                company_id IS NULL
                AND COALESCE(current_setting('app.actor_is_parent', true), 'off') = 'on'
            )
        )
    );

-- 写：只写本司；父通道只扩读、不代写；NULL 行只允许平台通道（system 策略）。
CREATE POLICY sales_orders_company_write
    ON erp.sales_orders
    FOR ALL
    USING (
        tenant_id = erp.group_tenant_of(
            NULLIF(current_setting('app.tenant_id', true), '')::uuid
        )
        AND company_id IS NOT NULL
        AND company_id = erp.current_company_id()
    )
    WITH CHECK (
        tenant_id = erp.group_tenant_of(
            NULLIF(current_setting('app.tenant_id', true), '')::uuid
        )
        AND company_id IS NOT NULL
        AND company_id = erp.current_company_id()
    );

-- 平台/系统通道：迁移、回填、对账、后台任务全量读写。
CREATE POLICY sales_orders_system
    ON erp.sales_orders
    FOR ALL
    USING (COALESCE(current_setting('app.rls_system', true), 'off') = 'on')
    WITH CHECK (COALESCE(current_setting('app.rls_system', true), 'off') = 'on');

CREATE POLICY purchase_orders_company_read
    ON erp.purchase_orders
    FOR SELECT
    USING (
        tenant_id = erp.group_tenant_of(
            NULLIF(current_setting('app.tenant_id', true), '')::uuid
        )
        AND (
            (
                company_id IS NOT NULL
                AND (
                    company_id = erp.current_company_id()
                    OR erp.company_readable(company_id)
                )
            )
            OR (
                company_id IS NULL
                AND COALESCE(current_setting('app.actor_is_parent', true), 'off') = 'on'
            )
        )
    );

CREATE POLICY purchase_orders_company_write
    ON erp.purchase_orders
    FOR ALL
    USING (
        tenant_id = erp.group_tenant_of(
            NULLIF(current_setting('app.tenant_id', true), '')::uuid
        )
        AND company_id IS NOT NULL
        AND company_id = erp.current_company_id()
    )
    WITH CHECK (
        tenant_id = erp.group_tenant_of(
            NULLIF(current_setting('app.tenant_id', true), '')::uuid
        )
        AND company_id IS NOT NULL
        AND company_id = erp.current_company_id()
    );

CREATE POLICY purchase_orders_system
    ON erp.purchase_orders
    FOR ALL
    USING (COALESCE(current_setting('app.rls_system', true), 'off') = 'on')
    WITH CHECK (COALESCE(current_setting('app.rls_system', true), 'off') = 'on');

ALTER TABLE erp.sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.sales_orders FORCE ROW LEVEL SECURITY;
ALTER TABLE erp.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.purchase_orders FORCE ROW LEVEL SECURITY;

COMMENT ON COLUMN erp.sales_orders.company_id IS
    '订单归属公司（W13 回填 / W14 策略）：NULL = 集团/平台行，仅平台与母公司通道可读，子公司不可见；业务读写限本司';
COMMENT ON COLUMN erp.purchase_orders.company_id IS
    '订单归属公司（W13 回填 / W14 策略）：NULL = 集团/平台行，仅平台与母公司通道可读，子公司不可见；业务读写限本司';

-- ------------------------------------------------------------
-- 3. 后置断言
-- ------------------------------------------------------------
DO $w14_post$
DECLARE
    v_policies     integer;
    v_bad_names    integer;
    v_so_rows      bigint;
    v_po_rows      bigint;
    v_so_null      bigint;
    v_po_null      bigint;
    v_qual         text;
BEGIN
    SELECT count(*) INTO v_policies
      FROM pg_policies
     WHERE schemaname = 'erp'
       AND tablename IN ('sales_orders', 'purchase_orders');
    IF v_policies <> 6 THEN
        RAISE EXCEPTION '后置断言失败：订单两表策略共 % 条，期望 6（每表 3 条）', v_policies;
    END IF;

    SELECT count(*) INTO v_bad_names
      FROM pg_policies
     WHERE schemaname = 'erp'
       AND tablename IN ('sales_orders', 'purchase_orders')
       AND policyname NOT IN (
           'sales_orders_company_read',
           'sales_orders_company_write',
           'sales_orders_system',
           'purchase_orders_company_read',
           'purchase_orders_company_write',
           'purchase_orders_system'
       );
    IF v_bad_names > 0 THEN
        RAISE EXCEPTION '后置断言失败：存在 % 条非预期策略名（旧 rls_tenant_isolation 未清理？）', v_bad_names;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
         WHERE schemaname = 'erp' AND tablename = 'sales_orders'
           AND policyname = 'sales_orders_company_read' AND cmd = 'SELECT'
    ) OR NOT EXISTS (
        SELECT 1 FROM pg_policies
         WHERE schemaname = 'erp' AND tablename = 'purchase_orders'
           AND policyname = 'purchase_orders_company_read' AND cmd = 'SELECT'
    ) THEN
        RAISE EXCEPTION '后置断言失败：两张表的 company_read 策略缺失或命令不是 SELECT';
    END IF;

    SELECT qual INTO v_qual
      FROM pg_policies
     WHERE schemaname = 'erp' AND tablename = 'sales_orders'
       AND policyname = 'sales_orders_company_read';
    IF v_qual IS NULL
       OR position('group_tenant_of' IN v_qual) = 0
       OR position('current_company_id' IN v_qual) = 0
       OR position('company_readable' IN v_qual) = 0 THEN
        RAISE EXCEPTION '后置断言失败：sales_orders 读策略谓词未引用公司维度函数（%）', coalesce(v_qual, 'missing');
    END IF;

    SELECT qual INTO v_qual
      FROM pg_policies
     WHERE schemaname = 'erp' AND tablename = 'purchase_orders'
       AND policyname = 'purchase_orders_company_read';
    IF v_qual IS NULL
       OR position('group_tenant_of' IN v_qual) = 0
       OR position('current_company_id' IN v_qual) = 0
       OR position('company_readable' IN v_qual) = 0 THEN
        RAISE EXCEPTION '后置断言失败：purchase_orders 读策略谓词未引用公司维度函数（%）', coalesce(v_qual, 'missing');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = 'erp'
           AND c.relname = 'sales_orders'
           AND c.relrowsecurity
           AND c.relforcerowsecurity
    ) OR NOT EXISTS (
        SELECT 1 FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = 'erp'
           AND c.relname = 'purchase_orders'
           AND c.relrowsecurity
           AND c.relforcerowsecurity
    ) THEN
        RAISE EXCEPTION '后置断言失败：订单两表未同时 ENABLE+FORCE RLS';
    END IF;

    SELECT count(*), count(*) FILTER (WHERE company_id IS NULL)
      INTO v_so_rows, v_so_null
      FROM erp.sales_orders;
    SELECT count(*), count(*) FILTER (WHERE company_id IS NULL)
      INTO v_po_rows, v_po_null
      FROM erp.purchase_orders;

    IF v_so_rows <> current_setting('app.w14_pre_so_rows')::bigint
       OR v_po_rows <> current_setting('app.w14_pre_po_rows')::bigint
       OR v_so_null <> current_setting('app.w14_pre_so_null')::bigint
       OR v_po_null <> current_setting('app.w14_pre_po_null')::bigint THEN
        RAISE EXCEPTION '后置断言失败：行数或 NULL 归属发生变化（sales %/%→%/% ，purchase %/%→%/%）',
            current_setting('app.w14_pre_so_rows'), current_setting('app.w14_pre_so_null'), v_so_rows, v_so_null,
            current_setting('app.w14_pre_po_rows'), current_setting('app.w14_pre_po_null'), v_po_rows, v_po_null;
    END IF;

    RAISE NOTICE 'W14 后置断言通过：两表各 3 条策略，行数/NULL 归属不变（sales % 行 NULL %；purchase % 行 NULL %）',
        v_so_rows, v_so_null, v_po_rows, v_po_null;
END
$w14_post$;

ANALYZE erp.sales_orders;
ANALYZE erp.purchase_orders;
