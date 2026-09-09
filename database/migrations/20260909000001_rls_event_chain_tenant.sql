-- =============================================================
-- RLS 事件链路隔离专项 B-2：无租户列表加列 + RLS 启用
-- 日期：2026-09-09
-- 目的：把事件消费者写入的 4 张无 tenant_id 列的表纳入 RLS 隔离，
--       使事件链路写入行与 HTTP 链路一样受租户边界约束。
-- 范围：
--   crm.sales_orders            事件写入方已绑定 tenant（handle_shipping_order_requested）→ FORCE
--   erp.vouchers                事件写入方已绑定 tenant（stock_inbound/outbound）→ FORCE
--   wms.purchase_order_snapshots 事件写入方已绑定 tenant（store_po_snapshot）→ FORCE
--   erp.voucher_items           明细表，事件 INSERT 暂未绑定 tenant → 仅加列 + ENABLE（兼容模式），待绑定后 FORCE
-- 幂等：全部 IF NOT EXISTS / DO 块，可重复执行。
-- =============================================================

-- ---------- 1. 加列 ----------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema='crm' AND table_name='sales_orders' AND column_name='tenant_id') THEN
        ALTER TABLE crm.sales_orders ADD COLUMN tenant_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema='erp' AND table_name='vouchers' AND column_name='tenant_id') THEN
        ALTER TABLE erp.vouchers ADD COLUMN tenant_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema='erp' AND table_name='voucher_items' AND column_name='tenant_id') THEN
        ALTER TABLE erp.voucher_items ADD COLUMN tenant_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema='wms' AND table_name='purchase_order_snapshots' AND column_name='tenant_id') THEN
        ALTER TABLE wms.purchase_order_snapshots ADD COLUMN tenant_id UUID;
    END IF;
END $$;

-- 索引（与既有 RLS 表一致：按租户过滤加速）
CREATE INDEX IF NOT EXISTS idx_crm_sales_orders_tenant ON crm.sales_orders (tenant_id);
CREATE INDEX IF NOT EXISTS idx_erp_vouchers_tenant ON erp.vouchers (tenant_id);
CREATE INDEX IF NOT EXISTS idx_erp_voucher_items_tenant ON erp.voucher_items (tenant_id);
CREATE INDEX IF NOT EXISTS idx_wms_po_snapshots_tenant ON wms.purchase_order_snapshots (tenant_id);

-- ---------- 2. 统一租户隔离策略（与 0015-0018 完全一致） ----------
DROP POLICY IF EXISTS rls_tenant_isolation ON crm.sales_orders;
CREATE POLICY rls_tenant_isolation ON crm.sales_orders
USING (
    (current_setting('app.tenant_id', true) IS NULL)
    OR (current_setting('app.tenant_id', true) = '')
    OR (current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000')
    OR (tenant_id IS NULL)
    OR (tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid)
)
WITH CHECK (
    (current_setting('app.tenant_id', true) IS NULL)
    OR (current_setting('app.tenant_id', true) = '')
    OR (current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000')
    OR (tenant_id IS NULL)
    OR (tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid)
);

DROP POLICY IF EXISTS rls_tenant_isolation ON erp.vouchers;
CREATE POLICY rls_tenant_isolation ON erp.vouchers
USING (
    (current_setting('app.tenant_id', true) IS NULL)
    OR (current_setting('app.tenant_id', true) = '')
    OR (current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000')
    OR (tenant_id IS NULL)
    OR (tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid)
)
WITH CHECK (
    (current_setting('app.tenant_id', true) IS NULL)
    OR (current_setting('app.tenant_id', true) = '')
    OR (current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000')
    OR (tenant_id IS NULL)
    OR (tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid)
);

DROP POLICY IF EXISTS rls_tenant_isolation ON erp.voucher_items;
CREATE POLICY rls_tenant_isolation ON erp.voucher_items
USING (
    (current_setting('app.tenant_id', true) IS NULL)
    OR (current_setting('app.tenant_id', true) = '')
    OR (current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000')
    OR (tenant_id IS NULL)
    OR (tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid)
)
WITH CHECK (
    (current_setting('app.tenant_id', true) IS NULL)
    OR (current_setting('app.tenant_id', true) = '')
    OR (current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000')
    OR (tenant_id IS NULL)
    OR (tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid)
);

DROP POLICY IF EXISTS rls_tenant_isolation ON wms.purchase_order_snapshots;
CREATE POLICY rls_tenant_isolation ON wms.purchase_order_snapshots
USING (
    (current_setting('app.tenant_id', true) IS NULL)
    OR (current_setting('app.tenant_id', true) = '')
    OR (current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000')
    OR (tenant_id IS NULL)
    OR (tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid)
)
WITH CHECK (
    (current_setting('app.tenant_id', true) IS NULL)
    OR (current_setting('app.tenant_id', true) = '')
    OR (current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000')
    OR (tenant_id IS NULL)
    OR (tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid)
);

-- ---------- 3. ENABLE + FORCE ----------
ALTER TABLE crm.sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.voucher_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE wms.purchase_order_snapshots ENABLE ROW LEVEL SECURITY;

ALTER TABLE crm.sales_orders FORCE ROW LEVEL SECURITY;
ALTER TABLE erp.vouchers FORCE ROW LEVEL SECURITY;
ALTER TABLE wms.purchase_order_snapshots FORCE ROW LEVEL SECURITY;
-- erp.voucher_items 不 FORCE：事件 INSERT 尚未绑定 tenant，FORCE 会阻断写入；
-- 待 B-1 明细绑定完成后补 FORCE（见报告 §遗留）。
