-- 20261119120000_erp_sales_order_items
-- scm.sales_order_items 归属收口：ERP 为权威写者，MRP 改读 ERP 行项目
--
-- 只读核实（2026-11-19；生产元数据 2026-11-18 采集、列快照 2026-11-15）：
--   * scm.sales_order_items 生产 0 行（n_tup_ins=0 / n_live_tup=0），6 列且无 order_id，
--     无触发器、无外键、无二级索引，全仓无任何写入方；
--     唯一读取方是 svc/scm/src/modules/mrp.rs 的 compute_mrp → 销售订单毛需求恒 0。
--   * ERP 侧只有头表 erp.sales_orders，全库不存在行项目承载表。
--
-- 本迁移：
--   1) 新建 erp.sales_order_items（sales_order_id 外键、软删列、RLS fail-closed、索引）；
--   2) scm.sales_order_items 仅加 COMMENT 登记归档，不改数据、不 DROP、不删策略。
--
-- 部署耦合：必须与 svc/erp（创建/更新/批量创建销售订单同事务写行项目）和
--   svc/scm（MRP 改读 erp.sales_order_items）同窗口上线。
--   只上代码 → 缺表报错；只上迁移 → 旧代码不写行项目，MRP 仍为 0。
--
-- 锁影响：新表建表 + 3 个 CREATE INDEX + 2 次 ALTER TABLE（空表，秒级）；
--   scm 侧只加表注释，不取数据锁。
--
-- 回滚：database/rollback/20261119120000_erp_sales_order_items.rollback.sql

-- 1. 前置断言
DO $$
BEGIN
    IF to_regclass('erp.sales_orders') IS NULL THEN
        RAISE EXCEPTION '前置断言失败：erp.sales_orders 不存在';
    END IF;
    IF to_regclass('erp.sales_order_items') IS NOT NULL THEN
        RAISE NOTICE 'erp.sales_order_items 已存在，按幂等继续';
    END IF;
END $$;

-- 2. 建表
CREATE TABLE IF NOT EXISTS erp.sales_order_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid,
    sales_order_id uuid NOT NULL REFERENCES erp.sales_orders(id) ON DELETE CASCADE,
    material_code text NOT NULL,
    material_name text,
    specification text,
    unit text,
    quantity numeric(15,3) NOT NULL,
    unit_price numeric(15,4),
    amount numeric(15,2),
    remark text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz
);

-- 3. 索引（tenant_id / 订单回查 / MRP 按物料聚合）
CREATE INDEX IF NOT EXISTS idx_erp_sales_order_items_tenant_id
    ON erp.sales_order_items (tenant_id);
CREATE INDEX IF NOT EXISTS idx_erp_sales_order_items_order
    ON erp.sales_order_items (sales_order_id);
CREATE INDEX IF NOT EXISTS idx_erp_sales_order_items_material
    ON erp.sales_order_items (tenant_id, material_code);

-- 4. 严格 B 范式 RLS：ENABLE + FORCE + 唯一策略
ALTER TABLE erp.sales_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.sales_order_items FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
         WHERE schemaname = 'erp'
           AND tablename = 'sales_order_items'
           AND policyname = 'rls_tenant_isolation'
    ) THEN
        CREATE POLICY rls_tenant_isolation ON erp.sales_order_items
            FOR ALL TO public
            USING (
                COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
                OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
            )
            WITH CHECK (
                COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
                OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
            );
    END IF;
END $$;

-- 5. SCM 旧表登记归档（不改数据、不 DROP）
COMMENT ON TABLE scm.sales_order_items IS
    '已归档：权威写者为 erp.sales_order_items（2026-11-19 归属收口）';

-- 6. 后置断言
DO $$
DECLARE
    n_pol int;
    v_qual text;
    v_wcheck text;
    rls boolean;
    frls boolean;
    n_idx int;
BEGIN
    SELECT count(*), max(p.qual::text), max(p.with_check::text)
      INTO n_pol, v_qual, v_wcheck
      FROM pg_policies p
     WHERE p.schemaname = 'erp' AND p.tablename = 'sales_order_items';
    IF n_pol <> 1 THEN
        RAISE EXCEPTION '后置断言失败：erp.sales_order_items 策略数 = %（期望 1）', n_pol;
    END IF;
    IF position('app.rls_system' IN coalesce(v_qual, '')) = 0 THEN
        RAISE EXCEPTION '后置断言失败：USING 缺少 app.rls_system 分支：%', v_qual;
    END IF;
    IF position('app.tenant_id' IN coalesce(v_qual, '')) = 0 THEN
        RAISE EXCEPTION '后置断言失败：USING 缺少 app.tenant_id 分支：%', v_qual;
    END IF;
    IF position('app.rls_system' IN coalesce(v_wcheck, '')) = 0 THEN
        RAISE EXCEPTION '后置断言失败：WITH CHECK 缺失或未显式：%', v_wcheck;
    END IF;

    SELECT c.relrowsecurity, c.relforcerowsecurity INTO rls, frls
      FROM pg_class c WHERE c.oid = to_regclass('erp.sales_order_items');
    IF NOT rls OR NOT frls THEN
        RAISE EXCEPTION '后置断言失败：rls/force_rls = %/%（期望 true/true）', rls, frls;
    END IF;

    SELECT count(*) INTO n_idx
      FROM pg_indexes i
     WHERE i.schemaname = 'erp' AND i.tablename = 'sales_order_items';
    IF n_idx < 4 THEN
        RAISE EXCEPTION '后置断言失败：erp.sales_order_items 索引数 = %（期望 >= 4，含主键）', n_idx;
    END IF;

    RAISE NOTICE '后置断言通过：erp.sales_order_items 已严格 RLS，scm.sales_order_items 已登记归档';
END $$;
