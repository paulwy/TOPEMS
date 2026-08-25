-- V254: Finance 本地金额快照表 — 替代跨Schema直查 ERP
--
-- 背景：Finance 模块原通过跨 Schema 查询 plugin_erp.sales_orders / purchase_orders
--       获取 payable_amount，违反了模块边界隔离原则。
--
-- 方案：ERP 在创建/审批销售订单和采购订单时，通过事件驱动将 payable_amount
--       发布给 Finance；Finance 将其存入本地快照表 source_amount_snapshots，
--       凭证模板预览生成时直接读取本表，不再跨 Schema 查询。
--
-- 可重复执行（IF NOT EXISTS）

CREATE TABLE IF NOT EXISTS plugin_finance.source_amount_snapshots (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_type     VARCHAR(50) NOT NULL,   -- 'sales_order' | 'purchase_order' | 'payment'
    source_id       UUID        NOT NULL,    -- 业务单据 ID
    payable_amount  DOUBLE PRECISION NOT NULL DEFAULT 0,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_source_amount_snapshots_type_id
    ON plugin_finance.source_amount_snapshots (source_type, source_id);

CREATE INDEX IF NOT EXISTS idx_source_amount_snapshots_source_type
    ON plugin_finance.source_amount_snapshots (source_type);