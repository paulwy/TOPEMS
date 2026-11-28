-- ============================================================
-- 20261126160000_erp_public_rows_read_visibility.rollback.sql
--
-- 回滚 erp 公共主数据「读侧」可见性收口：只撤本迁移新增的 5 条
-- *_public_read FOR SELECT 策略，不动其他策略与 RLS 开关。
--
-- 行为：
--   1. 删除 erp.materials / purchase_orders / sales_orders /
--      customers / suppliers 上本迁移新增的 *_public_read 策略；
--   2. 清理账本行 20261126160000；
--   3. 后置断言：五表对应 public_read 策略 0 条、账本无残留。
--
-- 影响（必须知悉）：
--   * 不改任何数据；回滚后公共行（tenant_id IS NULL / 零租户）恢复为
--     仅本租户可见，检索投影侧公共行可能再次「搜得到、点进去看不到」；
--   * 写路径不受影响：写仍由既有 FOR ALL 租户策略约束；
--   * 不改动既有 rls_tenant_isolation / 公司级等其他策略，也不切换 RLS 开关。
--
-- 幂等性：DROP POLICY IF EXISTS / to_regclass 存在性守卫；重复执行结果一致。
-- 文件内不含 BEGIN/COMMIT：入口统一用 psql --single-transaction 包裹。
-- ============================================================

SET lock_timeout = '5s';
SET statement_timeout = '120s';

-- ------------------------------------------------------------
-- 1. 删除本迁移新增的 5 条 public_read 策略
-- ------------------------------------------------------------
DO $drop_public_read$
DECLARE
    t      text;
    pol    text;
    tables constant text[] := ARRAY[
        'erp.materials',
        'erp.purchase_orders',
        'erp.sales_orders',
        'erp.customers',
        'erp.suppliers'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        IF to_regclass(t) IS NULL THEN
            RAISE NOTICE 'skip (relation missing): %', t;
            CONTINUE;
        END IF;
        pol := split_part(t, '.', 2) || '_public_read';
        EXECUTE format('DROP POLICY IF EXISTS %I ON %s', pol, t);
    END LOOP;
END
$drop_public_read$;

-- ------------------------------------------------------------
-- 2. 清理账本行
-- ------------------------------------------------------------
DELETE FROM public._sqlx_migrations WHERE version = 20261126160000;

-- ------------------------------------------------------------
-- 3. 后置断言：五表 public_read 策略零残留、账本无残留
-- ------------------------------------------------------------
DO $public_read_rb_assert$
DECLARE
    t          text;
    pol        text;
    v_bad      integer;
    tables     constant text[] := ARRAY[
        'erp.materials',
        'erp.purchase_orders',
        'erp.sales_orders',
        'erp.customers',
        'erp.suppliers'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        IF to_regclass(t) IS NULL THEN
            CONTINUE;
        END IF;
        pol := split_part(t, '.', 2) || '_public_read';
        SELECT count(*) INTO v_bad
          FROM pg_policies
         WHERE schemaname = split_part(t, '.', 1)
           AND tablename  = split_part(t, '.', 2)
           AND policyname = pol;
        IF v_bad > 0 THEN
            RAISE EXCEPTION '回滚后置断言失败：%.% 仍残留 % 条 %',
                split_part(t, '.', 1), split_part(t, '.', 2), v_bad, pol;
        END IF;
    END LOOP;

    IF EXISTS (SELECT 1 FROM public._sqlx_migrations WHERE version = 20261126160000) THEN
        RAISE EXCEPTION '回滚后置断言失败：账本仍残留 20261126160000';
    END IF;

    RAISE NOTICE 'public-read 回滚完成：五表 *_public_read 已撤，账本残留 0';
END
$public_read_rb_assert$;
