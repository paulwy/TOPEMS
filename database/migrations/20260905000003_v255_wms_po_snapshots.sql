-- V255: WMS 采购订单本地快照表（替代跨 schema 读取 plugin_scm.purchase_orders）
-- 通过订阅 PurchaseOrderApproved 事件，WMS 本地存储采购订单信息，消除 WMS→SCM 跨库查询

CREATE TABLE IF NOT EXISTS plugin_wms.purchase_order_snapshots (
    id              UUID PRIMARY KEY,
    order_number    VARCHAR(100) NOT NULL,
    supplier_id     UUID,
    supplier_name   VARCHAR(200),
    total_amount    DOUBLE PRECISION,
    payable_amount  DOUBLE PRECISION,
    status          VARCHAR(50) NOT NULL DEFAULT 'pending',
    approved_by     VARCHAR(200),
    approved_at     TIMESTAMPTZ,
    synced_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wms_po_snapshots_status
    ON plugin_wms.purchase_order_snapshots (status);

CREATE INDEX IF NOT EXISTS idx_wms_po_snapshots_order_number
    ON plugin_wms.purchase_order_snapshots (order_number);

CREATE INDEX IF NOT EXISTS idx_wms_po_snapshots_synced_at
    ON plugin_wms.purchase_order_snapshots (synced_at DESC);