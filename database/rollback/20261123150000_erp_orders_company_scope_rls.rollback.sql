-- ============================================================
-- 20261123150000_erp_orders_company_scope_rls.rollback.sql
--
-- 回滚 W14：只撤本次新增的公司级策略，恢复两表原租户级策略状态。
--
-- 行为：
--   1. 删除 erp.sales_orders / erp.purchase_orders 上本次新增的 3 条策略/表；
--   2. 按迁移前原谓词恢复 rls_tenant_isolation（USING 与 WITH CHECK 同式）；
--   3. 保持 RLS ENABLE + FORCE；
--   4. 清理账本行 20261123150000；
--   5. 后置断言：两表各恰好 1 条 rls_tenant_isolation、W14 公司级新策略 0 条、RLS FORCE；
--      后续迁移引入的 *_public_read 等非公司级策略允许共存，不计入残留。
--
-- 影响（必须知悉）：
--   * 不改任何数据，不动 company_id；回滚后同租户子公司重新可互看；
--   * 生产回滚须在 W13 第二段之后、且确认业务已接受租户级可见性；
--   * 若 W13 第二段也要回退，必须先回滚 W14。
--
-- 幂等性：DROP POLICY IF EXISTS / 存在性守卫；重复执行结果一致。
-- 文件内不含 BEGIN/COMMIT：入口统一用 psql --single-transaction 包裹。
-- ============================================================

SET lock_timeout = '5s';
SET statement_timeout = '120s';

SELECT set_config('app.rls_system', 'on', false);

-- ------------------------------------------------------------
-- 1. 删除本次新增策略
-- ------------------------------------------------------------
DROP POLICY IF EXISTS sales_orders_company_read ON erp.sales_orders;
DROP POLICY IF EXISTS sales_orders_company_write ON erp.sales_orders;
DROP POLICY IF EXISTS sales_orders_system ON erp.sales_orders;

DROP POLICY IF EXISTS purchase_orders_company_read ON erp.purchase_orders;
DROP POLICY IF EXISTS purchase_orders_company_write ON erp.purchase_orders;
DROP POLICY IF EXISTS purchase_orders_system ON erp.purchase_orders;

-- ------------------------------------------------------------
-- 2. 恢复迁移前租户级策略（原谓词原样）
-- ------------------------------------------------------------
DO $restore$
BEGIN
    IF to_regclass('erp.sales_orders') IS NULL OR to_regclass('erp.purchase_orders') IS NULL THEN
        RAISE EXCEPTION '回滚前置断言失败：订单两表不存在';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
         WHERE schemaname = 'erp' AND tablename = 'sales_orders'
           AND policyname = 'rls_tenant_isolation'
    ) THEN
        EXECUTE '
            CREATE POLICY rls_tenant_isolation ON erp.sales_orders
            USING (
                COALESCE(current_setting(''app.rls_system'', true), ''off'') = ''on''
                OR tenant_id = (NULLIF(current_setting(''app.tenant_id'', true), ''''))::uuid
            )
            WITH CHECK (
                COALESCE(current_setting(''app.rls_system'', true), ''off'') = ''on''
                OR tenant_id = (NULLIF(current_setting(''app.tenant_id'', true), ''''))::uuid
            )';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
         WHERE schemaname = 'erp' AND tablename = 'purchase_orders'
           AND policyname = 'rls_tenant_isolation'
    ) THEN
        EXECUTE '
            CREATE POLICY rls_tenant_isolation ON erp.purchase_orders
            USING (
                COALESCE(current_setting(''app.rls_system'', true), ''off'') = ''on''
                OR tenant_id = (NULLIF(current_setting(''app.tenant_id'', true), ''''))::uuid
            )
            WITH CHECK (
                COALESCE(current_setting(''app.rls_system'', true), ''off'') = ''on''
                OR tenant_id = (NULLIF(current_setting(''app.tenant_id'', true), ''''))::uuid
            )';
    END IF;
END
$restore$;

ALTER TABLE erp.sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.sales_orders FORCE ROW LEVEL SECURITY;
ALTER TABLE erp.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.purchase_orders FORCE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- 3. 清理账本行
-- ------------------------------------------------------------
DELETE FROM public._sqlx_migrations WHERE version = 20261123150000;

-- ------------------------------------------------------------
-- 4. 后置断言
-- ------------------------------------------------------------
DO $w14_rb_assert$
DECLARE
    v_tenant   integer;
    v_bad      integer;
BEGIN
    -- 租户级策略：两表各恰 1 条 rls_tenant_isolation。
    SELECT count(*) INTO v_tenant
      FROM pg_policies
     WHERE schemaname = 'erp'
       AND tablename IN ('sales_orders', 'purchase_orders')
       AND policyname = 'rls_tenant_isolation';
    IF v_tenant <> 2 THEN
        RAISE EXCEPTION '回滚后置断言失败：tenant 策略共 % 条，期望 2（每表 1 条）', v_tenant;
    END IF;

    -- W14 公司级策略零残留；后续迁移引入的 *_public_read 等非公司级策略允许共存，不计入残留。
    SELECT count(*) INTO v_bad
      FROM pg_policies
     WHERE schemaname = 'erp'
       AND tablename IN ('sales_orders', 'purchase_orders')
       AND policyname IN (
           'sales_orders_company_read',
           'sales_orders_company_write',
           'sales_orders_system',
           'purchase_orders_company_read',
           'purchase_orders_company_write',
           'purchase_orders_system'
       );
    IF v_bad > 0 THEN
        RAISE EXCEPTION '回滚后置断言失败：仍残留 % 条 W14 公司级策略', v_bad;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = 'erp' AND c.relname = 'sales_orders'
           AND c.relrowsecurity AND c.relforcerowsecurity
    ) OR NOT EXISTS (
        SELECT 1 FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = 'erp' AND c.relname = 'purchase_orders'
           AND c.relrowsecurity AND c.relforcerowsecurity
    ) THEN
        RAISE EXCEPTION '回滚后置断言失败：RLS 未保持 ENABLE+FORCE';
    END IF;

    IF EXISTS (SELECT 1 FROM public._sqlx_migrations WHERE version = 20261123150000) THEN
        RAISE EXCEPTION '回滚后置断言失败：账本仍残留 20261123150000';
    END IF;

    RAISE NOTICE 'W14 回滚完成：两表各恢复 1 条 rls_tenant_isolation，账本残留 0';
END
$w14_rb_assert$;

ANALYZE erp.sales_orders;
ANALYZE erp.purchase_orders;
