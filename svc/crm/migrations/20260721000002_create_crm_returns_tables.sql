-- CRM 退换货表 - V19.5 新增
-- 此前 aftersales.rs 模块因数据表缺失而未被编译。
-- V19.5 启用编译时补齐缺失表。

CREATE TABLE IF NOT EXISTS crm.returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_no VARCHAR(50) NOT NULL,
    tenant_id UUID NOT NULL,
    customer_id UUID,
    order_id UUID,
    return_type VARCHAR(20) NOT NULL DEFAULT 'return',  -- return/exchange
    reason VARCHAR(200),
    reason_detail TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending/approved/rejected/received/completed/cancelled
    refund_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    exchange_product_id UUID,
    received BOOLEAN NOT NULL DEFAULT FALSE,
    received_at TIMESTAMPTZ,
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ticket_id UUID,
    warehouse_id UUID,
    UNIQUE(return_no, tenant_id)
);

CREATE TABLE IF NOT EXISTS crm.return_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_id UUID NOT NULL REFERENCES crm.returns(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL,
    product_id UUID,
    quantity INT NOT NULL DEFAULT 0,
    unit_price DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_returns_tenant ON crm.returns(tenant_id);
CREATE INDEX IF NOT EXISTS idx_returns_status ON crm.returns(status);
CREATE INDEX IF NOT EXISTS idx_returns_customer ON crm.returns(customer_id);
CREATE INDEX IF NOT EXISTS idx_returns_order ON crm.returns(order_id);
CREATE INDEX IF NOT EXISTS idx_return_items_return ON crm.return_items(return_id);
CREATE INDEX IF NOT EXISTS idx_return_items_tenant ON crm.return_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_return_items_product ON crm.return_items(product_id);
